# -*- coding: utf-8 -*-
"""SPT 2.0 — SPT AI asistent (lokalni inteligențni motor + opcija pravog LLM-a).

Radi potpuno offline: razumije pitanja o bazi (hrvatski i engleski), postavlja
upite nad bazom i generira odgovore s brojkama. Ako korisnik postavi env
varijable SPT_LLM_URL i SPT_LLM_KEY (bilo koji OpenAI-kompatibilni API, npr.
i Arena/Anthropic proxy), pitanje se prosljeđuje pravom modelu s kontekstom
baze — inače odgovara lokalni motor.
"""
import json
import math
import os
import re
import sqlite3
import urllib.request

DB = "spt.db"


def db_con():
    con = sqlite3.connect(DB, timeout=15)
    con.row_factory = sqlite3.Row
    return con


METRIC_ALIASES = {
    "najbrzi": ("top_speed", "desc", "km/h"), "brzina": ("top_speed", "desc", "km/h"),
    "najbrže": ("top_speed", "desc", "km/h"), "fastest": ("top_speed", "desc", "km/h"),
    "trcanje": ("dist_total", "desc", "km"), "trči": ("dist_total", "desc", "km"), "kilometara": ("dist_total", "desc", "km"),
    "km": ("dist_total", "desc", "km"), "udaljenost": ("dist_total", "desc", "km"), "distance": ("dist_total", "desc", "km"),
    "opterecenje": ("srpe", "desc", "AU"), "opterećenje": ("srpe", "desc", "AU"), "load": ("srpe", "desc", "AU"),
    "sprint": ("sprints", "desc", "br."), "sprinteva": ("sprints", "desc", "br."),
    "skok": ("jump_height_max", "desc", "cm"), "skaka": ("jump_height_max", "desc", "cm"), "jump": ("jump_height_max", "desc", "cm"),
    "puls": ("hr_avg", "asc", "bpm"), "najnizi puls": ("hr_avg", "asc", "bpm"),
    "hrv": ("hrv_rmssd", "desc", "ms"), "spremnost": ("readiness", "desc", "/100"), "readiness": ("readiness", "desc", "/100"),
    "laktat": ("lactate", "asc", "mmol/L"), "mlijecna": ("lactate", "asc", "mmol/L"),
    "playerload": ("playerload", "desc", "AU"), "kalorije": ("kcal", "desc", "kcal"),
}
SPORT_ALIASES = {
    "nogomet": "nogomet", "nogometu": "nogomet", "fudbal": "nogomet", "football": "nogomet", "soccer": "nogomet",
    "kosarka": "kosarka", "košarka": "kosarka", "kosarke": "kosarka", "basketball": "kosarka",
    "rukomet": "rukomet", "handball": "rukomet", "odbojka": "odbojka", "volleyball": "odbojka",
    "vaterpolo": "vaterpolo", "tenis": "tenis", "tenisa": "tenis", "plivanje": "plivanje", "swimming": "plivanje",
    "atletika": "atletika_sprint", "sprint": "atletika_sprint", "biciklizam": "biciklizam_cesta", "cycling": "biciklizam_cesta",
    "boks": "boks", "boxing": "boks", "judo": "judo", "skijanje": "skijanje_alpsko",
    "hokej": "hokej_led", "ragbi": "ragbi", "golf": "golf", "triatlon": "triatlon", "maraton": "maraton",
}


def _norm(s):
    return s.lower().replace("č", "c").replace("ć", "c").replace("ž", "z").replace("š", "s").replace("đ", "dj")


def find_athlete(con, q):
    """Traži sportaša po imenu (fuzzy — oba dijela imena)."""
    qn = _norm(q.strip())
    if not qn:
        return None
    for r in con.execute("SELECT * FROM athletes"):
        full = _norm(r["name"])
        if qn == full or qn in full or all(w in full for w in qn.split() if len(w) > 2):
            return r
    return None


def _athlete_summary(con, a, lang):
    r = con.execute("SELECT COUNT(*) c, AVG(json_extract(metrics,'$.dist_total')) d FROM sessions WHERE athlete=?", (a["id"],)).fetchone()
    an = con.execute("SELECT COUNT(*) c FROM anomalies WHERE athlete=?", (a["id"],)).fetchone()["c"]
    inj = con.execute("SELECT COUNT(*) c FROM injuries WHERE athlete=?", (a["id"],)).fetchone()["c"]
    last = con.execute("SELECT sdate, metrics FROM sessions WHERE athlete=? ORDER BY sdate DESC LIMIT 1", (a["id"],)).fetchone()
    if lang == "en":
        return (f"**{a['name']}** ({a['sport']}, {a['position']}, club {a['club']}): {r['c']} sessions in database, "
                f"avg {round(r['d'] or 0, 1)} km per session. Last activity {last['sdate'] if last else '—'}. "
                f"{inj} recorded injuries, {an} anomalies flagged.")
    return (f"**{a['name']}** ({a['sport']}, {a['position']}, klub {a['club']}): {r['c']} sesija u bazi, "
            f"prosjek {round(r['d'] or 0, 1)} km po sesiji. Zadnja aktivnost {last['sdate'] if last else '—'}. "
            f"{inj} zabilježenih ozljeda, {an} anomalija označeno.")


def _leaderboard_answer(con, m, lang):
    mid, order, unit = m
    rows = con.execute("SELECT id, name, sport, position, metrics FROM sessions").fetchall()
    agg = {}
    for r in rows:
        try:
            v = json.loads(r["metrics"]).get(mid)
        except Exception:
            continue
        if isinstance(v, (int, float)):
            cur = agg.get(r["id"])
            if cur is None or (order == "desc" and v > cur[1]) or (order == "asc" and (cur[1] is None or v < cur[1])):
                agg[r["id"]] = (v, r["name"], r["sport"], r["position"])
    items = sorted(agg.items(), key=lambda kv: kv[1][0] if False else kv[1][1], reverse=(order == "desc"))
    # sortiraj po vrijednosti
    items = sorted(agg.items(), key=lambda kv: kv[1][0] if False else kv[1][1])
    vals = sorted(agg.values(), key=lambda x: x[0], reverse=(order == "desc"))[:5]
    if lang == "en":
        head = f"Top 5 by **{mid}** ({unit}):"
        lines = [f"{i+1}. {v[1]} ({v[2]}, {v[3]}) — **{round(v[0],1)} {unit}**" for i, v in enumerate(vals)]
        return head + "\n" + "\n".join(lines) + "\n\n_Open the Analyses → Leaderboards view for details._"
    head = f"Top 5 po **{mid}** ({unit}):"
    lines = [f"{i+1}. {v[1]} ({v[2]}, {v[3]}) — **{round(v[0],1)} {unit}**" for i, v in enumerate(vals)]
    return head + "\n" + "\n".join(lines) + "\n\n_Otvori Analize → Ljestvice za detalje._"


def answer(message, lang="hr", context=None):
    """Glavna funkcija: pitanje → odgovor (string, dopušta **bold** i novi red)."""
    q = _norm(message)
    lang = "en" if lang and lang.startswith("en") else "hr"
    con = db_con()
    try:
        # 1) pomoć
        if any(w in q for w in ("pomoc", "pomozi", "help", "sta znas", "što znaš", "what can you")):
            if lang == "en":
                return ("I'm **SPT AI** — I know the whole database. Try:\n"
                        "• *who is the fastest in football?* / *top by load*\n"
                        "• *summary of Sarah Wagner* (or any athlete)\n"
                        "• *compare Sarah Wagner and Paul Becker*\n"
                        "• *injuries in KLB-XXXX*\n"
                        "• *what is ACWR?* (any metric)\n"
                        "• *anomalies* — current red flags\n"
                        "• *risk for <athlete>* — injury-risk outlook")
            return ("Ja sam **SPT AI** — poznajem cijelu bazu. Probaj:\n"
                    "• *tko je najbrži u nogometu?* / *top po opterećenju*\n"
                    "• *karton Sarah Wagner* (ili bilo kojeg sportaša)\n"
                    "• *usporedi Sarah Wagner i Paul Becker*\n"
                    "• *ozljede u KLB-XXXX*\n"
                    "• *što je ACWR?* (bilo koja metrika)\n"
                    "• *anomalije* — trenutne crvene zastavice\n"
                    "• *rizik za <sportaš>* — procjena rizika ozljede")

        # 2) definicija metrike
        mdef = re.search(r"(sto je|što je|what is|define)\s+(.+?)\??$", message.lower())
        if mdef:
            term = mdef.group(2).strip()
            r = con.execute("SELECT hr, unit, descr FROM metrics WHERE lower(hr) LIKE ?", (f"%{term}%",)).fetchone()
            if not r:
                r = con.execute("SELECT hr, unit, descr FROM metrics WHERE id LIKE ?", (f"%{term}%",)).fetchone()
            if r:
                return f"**{r['hr']}** ({r['unit']}):\n{r['descr']}"
            if "acwr" in term:
                return ("**ACWR** = omjer akutnog (7 dana) i kroničnog (28 dana) opterećenja.\n"
                        "0,8–1,3 = optimalno; > 1,5 = povišen rizik ozljede; < 0,8 = podopterećenost.")
            return None

        # 3) anomalije
        if "anomal" in q or "crven" in q or "zastav" in q:
            rows = con.execute("""SELECT a.msg, x.name, a.severity FROM anomalies a
                                  JOIN athletes x ON x.id=a.athlete
                                  ORDER BY a.adate DESC LIMIT 8""").fetchall()
            if not rows:
                return "Trenutno nema označenih anomalija. ✅"
            head = "🚩 **Najnovije anomalije:**" if lang == "hr" else "🚩 **Latest anomalies:**"
            lines = [f"• {r['name']}: {r['msg']} _({r['severity']})_" for r in rows]
            return head + "\n" + "\n".join(lines)

        # 4) usporedba
        if "usporedi" in q or "compare" in q or " vs " in message.lower():
            names = re.split(r"\busporedi\b|\bcompare\b|\bi\b|\band\b| vs ", message, flags=re.I)
            names = [n.strip(" ?.,") for n in names if n.strip() and _norm(n.strip()) not in ("",)]
            found = []
            for n in names:
                a = find_athlete(con, n)
                if a and all(f["id"] != a["id"] for f in found):
                    found.append(dict(a))
            if len(found) >= 2:
                out = []
                for a in found[:4]:
                    r = con.execute("""SELECT AVG(json_extract(metrics,'$.dist_total')) d, AVG(json_extract(metrics,'$.top_speed')) t,
                                       AVG(json_extract(metrics,'$.srpe')) s, AVG(json_extract(metrics,'$.readiness')) rd
                                       FROM sessions WHERE athlete=?""", (a["id"],)).fetchone()
                    out.append(f"**{a['name']}** ({a['sport']}/{a['position']}): km/ses {round(r['d'] or 0,1)} · "
                               f"max brzina {round(r['t'] or 0,1)} km/h · opterećenje {round(r['s'] or 0)} AU · "
                               f"spremnost {round(r['rd'] or 0)}/100")
                tail = "\n\n_Otvori Analize → Usporedba za radar._" if lang == "hr" else "\n\n_Open Analyses → Compare for the radar._"
                return "\n".join(out) + tail
            if lang == "en":
                return "Name two athletes, e.g. *compare Sarah Wagner and Paul Becker*."
            return "Navedi dva sportaša, npr. *usporedi Sarah Wagner i Paul Becker*."

        # 5) ozljede kluba
        mclub = re.search(r"ozljed\w*\s+(u|in)\s+(klb-[a-z0-9]+)", q)
        if mclub:
            code = mclub.group(2).upper()
            rows = con.execute("""SELECT i.*, x.name FROM injuries i JOIN athletes x ON x.id=i.athlete
                                  WHERE x.club=? ORDER BY i.idate DESC LIMIT 10""", (code,)).fetchall()
            if not rows:
                return f"Klub {code} nema zabilježenih ozljeda. ✅"
            lines = [f"• {r['name']} — {r['itype']} ({r['body_part']}), {r['idate']}, {r['days_out']} dana izvan" for r in rows]
            return f"🏥 **Ozljede u {code}:**\n" + "\n".join(lines)

        # 6) rizik za sportaša
        if "rizik" in q or "risk" in q or "ozljed" in q:
            for part in re.split(r"\bza\b|\bfor\b", message, flags=re.I)[1:]:
                a = find_athlete(con, part)
                if a:
                    an = con.execute("SELECT COUNT(*) c FROM anomalies WHERE athlete=? AND severity='kritično'", (a["id"],)).fetchone()["c"]
                    r = con.execute("""SELECT AVG(json_extract(metrics,'$.readiness')) rd, AVG(json_extract(metrics,'$.hrv_rmssd')) hrv
                                       FROM sessions WHERE athlete=?""", (a["id"],)).fetchone()
                    rd = r["rd"] or 75
                    risk = max(5, min(95, 100 - rd + an * 12))
                    lvl = "nizak" if risk < 35 else ("umjeren" if risk < 65 else "visok")
                    if lang == "en":
                        return (f"**{a['name']}** — injury-risk outlook: **{risk}/100 ({lvl})**.\n"
                                f"Readiness {round(rd)}/100, HRV {round(r['hrv'] or 0)} ms, {an} critical anomalies.\n"
                                "See Simulations for the 4-week projection and WHAT-IF.")
                    return (f"**{a['name']}** — procjena rizika ozljede: **{risk}/100 ({lvl})**.\n"
                            f"Spremnost {round(rd)}/100, HRV {round(r['hrv'] or 0)} ms, {an} kritičnih anomalija.\n"
                            "Detalji i 4-tjedna projekcija: Simulacije (with WHAT-IF klizačem).")
            if lang == "en":
                return "Tell me the athlete, e.g. *risk for Sarah Wagner*."
            return "Reci sportaša, npr. *rizik za Sarah Wagner*."

        # 7) karton / sažetak sportaša
        name_parts = re.split(r"\bkarton\b|\bsummary of\b|\bprofil\b|\bprofile of\b|\bo\s+sportasu\b", message, flags=re.I)
        cand = name_parts[-1].strip(" ?.,") if len(name_parts) > 1 else message.strip(" ?.,")
        a = find_athlete(con, cand)
        if a:
            summ = _athlete_summary(con, a, lang)
            # zadnje ozljede
            inj = con.execute("SELECT itype, body_part, idate FROM injuries WHERE athlete=? ORDER BY idate DESC LIMIT 2", (a["id"],)).fetchall()
            if inj:
                summ += "\n" + ("Ozljede: " if lang == "hr" else "Injuries: ") + "; ".join(f"{r['itype']} ({r['body_part']}, {r['idate']})" for r in inj)
            summ += ("\n\n_Otvori Karton za puni pregled._" if lang == "hr" else "\n\n_Open the Record for the full file._")
            return summ

        # 8) ljestvice po metrici
        for alias, m in METRIC_ALIASES.items():
            if alias in q and any(w in q for w in ("naj", "top", "tko", "who", "best", "most")):
                # sport?
                sport = None
                for sa, sid in SPORT_ALIASES.items():
                    if sa in q:
                        sport = sid
                        break
                return _leaderboard_answer_sport(con, m, sport, lang)

        # 9) fallback — ponudi primjere
        if lang == "en":
            return ("I didn't catch that. Try: *who is the fastest in football*, *summary of <athlete>*, "
                    "*compare A and B*, *anomalies*, *what is ACWR* — or type *help*.")
        return ("Nisam razumio. Probaj: *tko je najbrži u nogometu*, *karton <sportaš>*, "
                "*usporedi A i B*, *anomalije*, *što je ACWR* — ili upiši *pomoć*.")
    finally:
        con.close()


def _leaderboard_answer_sport(con, m, sport, lang):
    mid, order, unit = m
    q = """SELECT a.id, a.name, a.sport, a.position, s.metrics FROM sessions s JOIN athletes a ON a.id=s.athlete"""
    rows = con.execute(q).fetchall()
    agg = {}
    for r in rows:
        if sport and r["sport"] != sport:
            continue
        try:
            v = json.loads(r["metrics"]).get(mid)
        except Exception:
            continue
        if isinstance(v, (int, float)):
            if r["id"] not in agg or (order == "desc" and v > agg[r["id"]][0]) or (order == "asc" and v < agg[r["id"]][0]):
                agg[r["id"]] = (v, r["name"], r["sport"], r["position"])
    vals = sorted(agg.values(), key=lambda x: x[0], reverse=(order == "desc"))[:5]
    sport_hr = sport or "sve"
    if not vals:
        return "Nema podataka za tu metriku." if lang == "hr" else "No data for that metric."
    if lang == "en":
        return f"Top 5 in **{sport_hr}** by {mid} ({unit}):\n" + "\n".join(
            f"{i+1}. {v[1]} — **{round(v[0],1)} {unit}**" for i, v in enumerate(vals))
    return f"Top 5 u **{sport_hr}** po metriku {mid} ({unit}):\n" + "\n".join(
        f"{i+1}. {v[1]} ({v[3]}) — **{round(v[0],1)} {unit}**" for i, v in enumerate(vals))


# ---------------------------------------------------------------------------
# opcionalni pravi LLM (OpenAI-kompatibilan endpoint)
# ---------------------------------------------------------------------------
def ask_llm(message, context_summary, lang):
    url = os.environ.get("SPT_LLM_URL")
    key = os.environ.get("SPT_LLM_KEY")
    if not url or not key:
        return None
    try:
        payload = json.dumps({
            "model": os.environ.get("SPT_LLM_MODEL", "gpt-4o-mini"),
            "messages": [
                {"role": "system", "content": "Ti si SPT AI asistent za sportske performanse. Odgovaraj "
                 + ("hrvatski" if lang != "en" else "in English") + ". Kontekst baze:\n" + context_summary},
                {"role": "user", "content": message},
            ]}).encode()
        req = urllib.request.Request(url, data=payload,
                                     headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"})
        with urllib.request.urlopen(req, timeout=25) as r:
            d = json.loads(r.read().decode())
            return d["choices"][0]["message"]["content"]
    except Exception:
        return None
