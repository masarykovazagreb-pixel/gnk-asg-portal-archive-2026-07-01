#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SPT — generator izvještaja (reportgen).
Gradi strukturirane payload-e za 7 vrsta izvještaja; server ih sprema u tablicu reports,
a frontend ih renderira generički (KPI, tablice, grafikoni) i može ih printati/uvoziti.
"""
import json
import math
import os
import sqlite3
from datetime import date, datetime, timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "spt.db")


def db():
    con = sqlite3.connect(DB_PATH, timeout=15)
    con.row_factory = sqlite3.Row
    return con


def q(sql, args=()):
    con = db()
    try:
        return con.execute(sql, args).fetchall()
    finally:
        con.close()


def q1(sql, args=()):
    rows = q(sql, args)
    return rows[0] if rows else None


def _mx(metrics, key):
    try:
        x = json.loads(metrics or "{}")
    except Exception:
        return None
    v = x.get(key)
    return v if isinstance(v, (int, float)) else None


def _fmt(v, nd=1):
    if v is None:
        return "—"
    if isinstance(v, float):
        return f"{v:,.{nd}f}".replace(",", " ").replace(".", ",")
    return str(v)


def _hr_sport(sport_id):
    r = q1("SELECT hr FROM sports WHERE id=?", (sport_id,))
    return r["hr"] if r else sport_id


# ---------------------------------------------------------------------------
# ACWR: akutno (7 dana) / kronično (28 dana) opterećenje
# ---------------------------------------------------------------------------
def acwr(aid, today=None):
    today = today or date.today()
    rows = q("SELECT sdate, json_extract(metrics,'$.srpe') v FROM sessions WHERE athlete=? AND json_extract(metrics,'$.srpe') IS NOT NULL ORDER BY sdate", (aid,))
    daily = {}
    for r in rows:
        daily[r["sdate"]] = daily.get(r["sdate"], 0) + (r["v"] or 0)
    acute = sum(v for d, v in daily.items() if (today - timedelta(days=7)).isoformat() <= d <= today.isoformat())
    chronic = sum(v for d, v in daily.items() if (today - timedelta(days=28)).isoformat() <= d <= today.isoformat())
    if not chronic:
        return None
    ratio = (acute / 7.0) / max(0.1, chronic / 28.0)
    flag = "visok rizik" if ratio > 1.5 else ("nisko opterećenje" if ratio < 0.8 else "u okviru")
    return {"acute": round(acute), "chronic": round(chronic), "ratio": round(ratio, 2), "flag": flag}


# ---------------------------------------------------------------------------
# 1) IZVJEŠTAJ O SPORTAŠU
# ---------------------------------------------------------------------------
def athlete_report(aid, days=90):
    a = q1("SELECT * FROM athletes WHERE id=?", (aid,))
    if not a:
        return {"error": "nema sportaša"}
    since = (date.today() - timedelta(days=days)).isoformat()
    sess = q("SELECT * FROM sessions WHERE athlete=? AND sdate>=? ORDER BY sdate", (aid, since))
    agg = {}
    for s in sess:
        for k in ("dist_total", "top_speed", "hr_avg", "sprints", "srpe", "readiness", "lactate"):
            v = _mx(s["metrics"], k)
            if v is not None:
                agg.setdefault(k, []).append(v)
    n = len(sess)
    avg = {k: sum(v) / len(v) for k, v in agg.items()}
    ac = acwr(aid)
    inj = q("SELECT * FROM injuries WHERE athlete=? ORDER BY idate DESC", (aid,))
    tests = q("SELECT * FROM perf_tests WHERE athlete=? ORDER BY tdate DESC LIMIT 12", (aid,))
    bc = q("SELECT * FROM body_comp WHERE athlete=? ORDER BY bdate DESC LIMIT 8", (aid,))
    wl = q("SELECT * FROM wellness_log WHERE athlete=? ORDER BY wdate DESC LIMIT 21", (aid,))
    anomalies = q("SELECT * FROM anomalies WHERE athlete=? ORDER BY adate DESC LIMIT 10", (aid,))

    # norme (percentili unutar sport+spol+pozicija, godine ±2)
    peers = [r for r in q("""SELECT s.metrics FROM sessions s JOIN athletes a2 ON a2.id=s.athlete
                             WHERE a2.sport=? AND a2.sex=? AND a2.position=? AND ABS(a2.age-?)<=2""",
                          (a["sport"], a["sex"], a["position"], a["age"]))]
    norms = {}
    for k in ("dist_total", "top_speed", "hr_avg", "sprints"):
        vals = sorted([v for r in peers for v in [_mx(r["metrics"], k)] if v is not None])
        if vals:
            mine = avg.get(k)
            p = 100 * sum(1 for x in vals if x <= mine) / len(vals) if mine is not None else None
            norms[k] = {"p50": vals[len(vals) // 2], "mine": mine, "pct": round(p) if p is not None else None}

    # tjedno opterećenje
    weeks = {}
    for s in sess:
        d = date.fromisoformat(s["sdate"])
        monday = d - timedelta(days=d.weekday())
        weeks.setdefault(monday.isoformat(), {"load": 0, "km": 0, "n": 0})
        v = _mx(s["metrics"], "srpe")
        if v:
            weeks[monday.isoformat()]["load"] += v
        weeks[monday.isoformat()]["km"] += _mx(s["metrics"], "dist_total") or 0
        weeks[monday.isoformat()]["n"] += 1
    wl_avg = {k: (sum((r[k] or 0) for r in wl) / len(wl)) if wl else 3 for k in ("sleep_q", "soreness", "mood", "energy")}

    sections = []
    if weeks:
        ks = sorted(weeks)
        sections.append({"h": "Tjedno opterećenje", "chart": {
            "labels": [k[5:] for k in ks],
            "series": [{"name": "opterećenje (AU)", "values": [round(weeks[k]["load"]) for k in ks], "color": "#38d6f5"}]}})
    if norms:
        rows = [[k, _fmt(norms[k]["p50"], 1), _fmt(norms[k]["mine"], 1),
                 (str(norms[k]["pct"]) + ". percentil") if norms[k]["pct"] is not None else "—"]
                for k in norms]
        sections.append({"h": "Usporedba s normama (sport/spol/pozicija/godine)", "table": {
            "cols": ["Metrika", "Medijana vršnjaka", "Sportaš", "Percentil"], "rows": rows}})
    if tests:
        trows = []
        for t in tests[:8]:
            try:
                res = json.loads(t["results"] or "{}")
            except Exception:
                res = {}
            trows.append([t["tdate"], t["ttype"], _fmt(res.get("value")), res.get("unit", "")])
        sections.append({"h": "Testiranja", "table": {
            "cols": ["Datum", "Test", "Vrijednost", "Jedinica"], "rows": trows}})
    if wl:
        rows = [[w["wdate"], _fmt(w["sleep_h"]), str(w["sleep_q"]), str(w["soreness"]), str(w["mood"]), str(w["energy"])]
                for w in wl[:10]]
        sections.append({"h": "Wellness (zadnjih 10 jutara)", "table": {
            "cols": ["Datum", "San (h)", "Kvaliteta sna", "Bolnost", "Raspoloženje", "Energija"], "rows": rows}})
    recs = []
    if ac:
        if ac["ratio"] > 1.5:
            recs.append(f"ACWR {ac['ratio']} — nagli skok opterećenja; preporuči regeneracijski ciklus 3–5 dana.")
        elif ac["ratio"] < 0.8:
            recs.append(f"ACWR {ac['ratio']} — sportaš je podzopterećen; postupno povećaj obujam 10%/tjedno.")
    if wl_avg.get("sleep_q", 3) < 2.5:
        recs.append("Prosječna kvaliteta sna niska (<2,5/5) — razmotriti protokol spavanja i manje ekrana navečer.")
    if wl_avg.get("soreness", 1) > 3:
        recs.append("Visoka jutarnja bolnost — provjeriti obujam sila u treningu (skokovi, sprintevi).")
    if anomalies:
        recs.append(f"{len(anomalies)} anomalija u evidenciji — pregledati kronologiju u kartonu.")
    if not recs:
        recs.append("Svi parametri unutar okvira — nastaviti s tekućim planom.")

    return {
        "kind": "athlete", "title": f"Izvještaj o sportašu — {a['name']}",
        "subtitle": f"{a['club']} · {_hr_sport(a['sport'])} · {a['position']} · {a['age']} g · period {days} dana",
        "kpis": [["Sesija", str(n)], ["Kilometara", _fmt(avg.get("dist_total", 0) * n, 0) + " km"],
                 ["Prosječno opterećenje", _fmt(avg.get("srpe"), 0) + " AU"],
                 ["Spremnost", _fmt(avg.get("readiness"), 0) + "/100"],
                 ["ACWR", (str(ac["ratio"]) + " (" + ac["flag"] + ")") if ac else "—"]],
        "sections": sections,
        "recommendations": recs,
        "footer": "SPT · Sports Performance Tracking · produced by GNK ASG · sintetski demo-podaci",
    }


# ---------------------------------------------------------------------------
# 2) KLUPSKI IZVJEŠTAJ
# ---------------------------------------------------------------------------
def club_report(club, days=90):
    c = q1("SELECT * FROM clubs WHERE code=?", (club,))
    if not c:
        return {"error": "nema kluba"}
    since = (date.today() - timedelta(days=days)).isoformat()
    roster = q("SELECT * FROM athletes WHERE club=? ORDER BY position", (club,))
    per = []
    for a in roster:
        d = q1("""SELECT COUNT(*) n, AVG(json_extract(metrics,'$.srpe')) load,
                  AVG(json_extract(metrics,'$.readiness')) rd, SUM(json_extract(metrics,'$.dist_total')) km
                  FROM sessions WHERE athlete=? AND sdate>=?""", (a["id"], since))
        act = q1("SELECT COUNT(*) c FROM injuries WHERE athlete=? AND status='aktivna'", (a["id"],))["c"]
        per.append({"a": a, "n": d["n"], "load": d["load"] or 0, "rd": d["rd"] or 0, "km": d["km"] or 0, "inj": act})
    avail = round(100 * sum(1 for p in per if not p["inj"]) / max(1, len(per)))
    anomalies = q("""SELECT an.* FROM anomalies an JOIN athletes a ON a.id=an.athlete
                     WHERE a.club=? AND an.adate>=? ORDER BY an.adate DESC LIMIT 15""", (club, since))
    inj_rows = q("""SELECT i.* FROM injuries i JOIN athletes a ON a.id=i.athlete
                    WHERE a.club=? AND i.idate>=?""", (club, since))
    # tjedno
    wk = {}
    for s in q("""SELECT s.sdate, json_extract(s.metrics,'$.srpe') v FROM sessions s
                  JOIN athletes a ON a.id=s.athlete WHERE a.club=? AND s.sdate>=?""", (club, since)):
        if s["v"]:
            d = date.fromisoformat(s["sdate"])
            monday = d - timedelta(days=d.weekday())
            wk[monday.isoformat()] = wk.get(monday.isoformat(), 0) + s["v"]
    top_load = sorted(per, key=lambda p: -p["load"])[:5]
    top_rd = sorted(per, key=lambda p: p["rd"])[:5]
    return {
        "kind": "club", "title": f"Klupski izvještaj — {club}",
        "subtitle": f"{_hr_sport(c['sport'])} · {c['country']} · {len(roster)} sportaša · period {days} dana",
        "kpis": [["Dostupnost", str(avail) + "%"], ["Sportaša", str(len(roster))],
                 ["Ozljeda u periodu", str(len(inj_rows))], ["Anomalija", str(len(anomalies))],
                 ["Kolektivni km", _fmt(sum(p["km"] for p in per), 0) + " km"]],
        "sections": [
            {"h": "Kolektivno opterećenje po tjednima", "chart": {
                "labels": [k[5:] for k in sorted(wk)],
                "series": [{"name": "AU/tjedan", "values": [round(wk[k]) for k in sorted(wk)], "color": "#38d6f5"}]}},
            {"h": "Top 5 po opterećenju", "table": {
                "cols": ["Sportaš", "Sesija", "AU/sesiju", "km", "Spremnost"],
                "rows": [[p["a"]["name"], str(p["n"]), _fmt(p["load"], 0), _fmt(p["km"], 1), _fmt(p["rd"], 0)]
                         for p in top_load]}},
            {"h": "Najniža spremnost (pažnja!)", "table": {
                "cols": ["Sportaš", "Pozicija", "Spremnost", "Aktivna ozljeda"],
                "rows": [[p["a"]["name"], p["a"]["position"], _fmt(p["rd"], 0), "DA" if p["inj"] else "ne"]
                         for p in top_rd]}},
            {"h": f"Anomalije ({len(anomalies)})", "table": {
                "cols": ["Datum", "Kategorija", "Ozbiljnost"],
                "rows": [[an["adate"], an["category"], an["severity"]] for an in anomalies[:10]]}},
        ],
        "recommendations": [
            f"Dostupnost rostera {avail}% — " + ("iznad cilja (≥85%)" if avail >= 85 else "ispod cilja; pregledati opterećenja i oporavak"),
            "Kronično podzopterećene sportaše (ACWR<0,8) postupno teretiti jače.",
            "Sportaše s crvenim anomalijama razdvojiti u regeneracijsku grupu.",
        ],
        "footer": "SPT · Sports Performance Tracking · produced by GNK ASG · sintetski demo-podaci",
    }


# ---------------------------------------------------------------------------
# 3) IZVJEŠTAJ O OZLJEDAMA
# ---------------------------------------------------------------------------
def injuries_report(club=None, days=365):
    since = (date.today() - timedelta(days=days)).isoformat()
    if club:
        rows = q("""SELECT i.*, a.name, a.club, a.position FROM injuries i JOIN athletes a ON a.id=i.athlete
                    WHERE a.club=? AND i.idate>=? ORDER BY i.idate DESC""", (club, since))
    else:
        rows = q("""SELECT i.*, a.name, a.club, a.position FROM injuries i JOIN athletes a ON a.id=i.athlete
                    WHERE i.idate>=? ORDER BY i.idate DESC LIMIT 400""", (since,))
    by_part = {}
    by_type = {}
    by_cause = {}
    durations = []
    for r in rows:
        by_part[r["body_part"]] = by_part.get(r["body_part"], 0) + 1
        by_type[r["itype"]] = by_type.get(r["itype"], 0) + 1
        cause = r["cause"] if "cause" in r.keys() else None
        if cause:
            by_cause[cause] = by_cause.get(cause, 0) + 1
        if r["status"] == "oporavljeno" and r["return_date"]:
            try:
                durations.append((date.fromisoformat(r["return_date"]) - date.fromisoformat(r["idate"])).days)
            except Exception:
                pass
    active = [r for r in rows if r["status"] == "aktivna"]
    avg_dur = round(sum(durations) / len(durations)) if durations else None
    top_part = sorted(by_part.items(), key=lambda x: -x[1])[:8]
    return {
        "kind": "injuries", "title": "Izvještaj o ozljedama" + (f" — {club}" if club else ""),
        "subtitle": f"period {days} dana · {len(rows)} slučajeva · {len(active)} aktivnih",
        "kpis": [["Ukupno", str(len(rows))], ["Aktivnih", str(len(active))],
                 ["Najčešći dio", top_part[0][0] if top_part else "—"],
                 ["Prosječan oporavak", (str(avg_dur) + " dana") if avg_dur is not None else "—"]],
        "sections": [
            {"h": "Po dijelu tijela", "chart": {
                "labels": [t[0] for t in top_part],
                "series": [{"name": "slučajeva", "values": [t[1] for t in top_part], "color": "#ff5a5f"}],
                "type": "bar"}},
            {"h": "Po vrsti", "table": {
                "cols": ["Vrsta", "Slučajeva"],
                "rows": sorted(by_type.items(), key=lambda x: -x[1])[:8]}},
            {"h": "Zadnji slučajevi", "table": {
                "cols": ["Datum", "Sportaš", "Klub", "Dio", "Vrsta", "Status"],
                "rows": [[r["idate"], r["name"], r["club"], r["body_part"], r["itype"], r["status"]] for r in rows[:12]]}},
        ],
        "recommendations": [
            "Dijelovi tijela s najviše slučajeva → uvesti preventivne vježbe (Nordic, Copenhagen, jačanje core).",
            "Pratiti ACWR kod sportaša s ponovljenim ozljedama istog dijela tijela.",
            "Aktivne ozljede: uskladiti RTP protokol s wellness zapisima.",
        ],
        "footer": "SPT · Sports Performance Tracking · produced by GNK ASG · sintetski demo-podaci",
    }


# ---------------------------------------------------------------------------
# 4) TEST BATERIJA
# ---------------------------------------------------------------------------
def tests_report(club=None):
    if club:
        rows = q("""SELECT t.*, a.name, a.club, a.position, a.age FROM perf_tests t
                    JOIN athletes a ON a.id=t.athlete WHERE a.club=? ORDER BY t.tdate DESC""", (club,))
    else:
        rows = q("""SELECT t.*, a.name, a.club, a.position, a.age FROM perf_tests t
                    JOIN athletes a ON a.id=t.athlete ORDER BY t.tdate DESC LIMIT 300""")
    by_type = {}
    for t in rows:
        try:
            res = json.loads(t["results"] or "{}")
        except Exception:
            res = {}
        by_type.setdefault(t["ttype"], []).append(
            {"name": t["name"], "club": t["club"], "tdate": t["tdate"],
             "value": res.get("value"), "unit": res.get("unit", "")})
    sections = []
    for tt, items in sorted(by_type.items()):
        desc = all(isinstance(x["value"], (int, float)) for x in items)
        best = sorted(items, key=lambda x: (x["value"] if desc else 0), reverse=desc)[:8]
        sections.append({"h": tt, "table": {
            "cols": ["Sportaš", "Klub", "Datum", "Vrijednost", "Jedinica"],
            "rows": [[t["name"], t["club"], t["tdate"], _fmt(t["value"]), t["unit"]] for t in best]}})
    return {
        "kind": "tests", "title": "Izvještaj testne baterije" + (f" — {club}" if club else ""),
        "subtitle": f"{len(rows)} testova · {len(by_type)} vrsta testova",
        "kpis": [["Testova", str(len(rows))], ["Vrsta", str(len(by_type))],
                 ["Najčešći", max(by_type.items(), key=lambda x: len(x[1]))[0] if by_type else "—"]],
        "sections": sections[:6],
        "recommendations": ["Usporediti s benchmark tablicom po dobi (P10/P50/P90).",
                            "Pad >5% između dvije baterije → provjeriti opterećenje i prehranu."],
        "footer": "SPT · Sports Performance Tracking · produced by GNK ASG · sintetski demo-podaci",
    }


# ---------------------------------------------------------------------------
# 5) SPREMNOST I RIZIK
# ---------------------------------------------------------------------------
def readiness_report(club):
    roster = q("SELECT * FROM athletes WHERE club=?", (club,))
    rows = []
    for a in roster:
        rd = q1("SELECT AVG(json_extract(metrics,'$.readiness')) v FROM sessions WHERE athlete=?", (a["id"],))
        ac = acwr(a["id"])
        wls = q("SELECT AVG(sleep_q) sq, AVG(soreness) so FROM wellness_log WHERE athlete=? AND wdate>=?",
                (a["id"], (date.today() - timedelta(days=14)).isoformat()))
        wl = wls[0] if wls else None
        risk = 0
        if ac:
            if ac["ratio"] > 1.5:
                risk += 40
            elif ac["ratio"] > 1.3:
                risk += 20
            elif ac["ratio"] < 0.8:
                risk += 10
        rdv = rd["v"] or 70
        if rdv < 65:
            risk += 35
        elif rdv < 75:
            risk += 15
        if wl and wl["sq"] is not None and wl["sq"] < 2.5:
            risk += 15
        if wl and wl["so"] is not None and wl["so"] > 3:
            risk += 10
        rows.append({"name": a["name"], "pos": a["position"], "rd": round(rdv), "acwr": ac["ratio"] if ac else None,
                     "sleep": round(wl["sq"], 1) if wl and wl["sq"] is not None else None,
                     "sore": round(wl["so"], 1) if wl and wl["so"] is not None else None,
                     "risk": min(100, risk)})
    rows.sort(key=lambda r: -r["risk"])
    return {
        "kind": "readiness", "title": f"Spremnost i rizik — {club}",
        "subtitle": f"{len(rows)} sportaša · rizik = ACWR + spremnost + wellness",
        "kpis": [["Prosječna spremnost", _fmt(sum(r["rd"] for r in rows) / max(1, len(rows)), 0) + "/100"],
                 ["Visok rizik (>50)", str(sum(1 for r in rows if r["risk"] > 50))],
                 ["ACWR van okvira", str(sum(1 for r in rows if r["acwr"] and (r["acwr"] > 1.5 or r["acwr"] < 0.8)))]],
        "sections": [
            {"h": "Rang lista po riziku", "table": {
                "cols": ["Sportaš", "Poz.", "Spremnost", "ACWR", "San (14d)", "Bolnost (14d)", "Rizik"],
                "rows": [[r["name"], r["pos"], str(r["rd"]), _fmt(r["acwr"], 2), _fmt(r["sleep"], 1), _fmt(r["sore"], 1), str(r["risk"])]
                         for r in rows]}},
        ],
        "recommendations": ["Sportaši s rizikom >50: smanjiti obujam, dodati regeneraciju, provjeriti san.",
                            "ACWR >1,5 = naglo povećanje — najveći poznati čimbenik nekontakt ozljeda."],
        "footer": "SPT · Sports Performance Tracking · produced by GNK ASG · sintetski demo-podaci",
    }


# ---------------------------------------------------------------------------
# 6) ANALIZA UTAKMICE
# ---------------------------------------------------------------------------
def match_report(mid):
    import gzip as _gz
    r = q1("SELECT * FROM matches WHERE id=?", (mid,))
    if not r:
        return {"error": "nema utakmice"}
    fr = json.loads(_gz.decompress(r["frames"]).decode("utf-8"))
    meta = fr["meta"]
    stats = []
    for p in fr["players"]:
        xs, ys = p["x"], p["y"]
        cd = 0.0
        ct = 0.0
        for i in range(1, len(xs)):
            d = math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1])
            cd += d
            ct = max(ct, d * 3.6)
        stats.append({"name": p["name"], "num": p["num"], "team": p["team"], "role": p["role"],
                      "km": cd / 1000, "top": ct})
    stats.sort(key=lambda s: -s["km"])
    goals = [e for e in fr["events"] if e["type"] in ("goal", "score")]
    return {
        "kind": "match", "title": f"Analiza utakmice — {meta['name']}",
        "subtitle": f"{meta['sport']} · {meta['home']} : {meta['away']} · {r['mdate']}",
        "kpis": [["Ukupno km", _fmt(sum(s["km"] for s in stats), 1) + " km"],
                 ["Najveća brzina", _fmt(max(s["top"] for s in stats)) + " km/h"],
                 ["Događaja", str(len(fr["events"]))],
                 ["Golova", str(len(goals))]],
        "sections": [
            {"h": "Igrači po prijeđenom kilometražom", "table": {
                "cols": ["#", "Igrač", "Momčad", "Uloga", "km", "max km/h"],
                "rows": [[str(s["num"]), s["name"], str(s["team"]), s["role"], _fmt(s["km"], 2), _fmt(s["top"])]
                         for s in stats]}},
            {"h": "Ključni događaji", "table": {
                "cols": ["Min", "Događaj"],
                "rows": [[str(int(e["t"] // 60)), e["text"]] for e in fr["events"][:15]]}},
        ],
        "recommendations": ["Usporediti kilometražu s ligaškim prosjekom pozicije.",
                            "Igrače >11 km provjeriti na opterećenje nakon 48 h (DOMS)."],
        "footer": "SPT · Sports Performance Tracking · produced by GNK ASG · sintetski demo-podaci",
    }


# ---------------------------------------------------------------------------
# 7) TREND SASTAVA TIJELA
# ---------------------------------------------------------------------------
def bodycomp_report(club=None, days=180):
    since = (date.today() - timedelta(days=days)).isoformat()
    if club:
        rows = q("""SELECT b.*, a.name, a.club FROM body_comp b JOIN athletes a ON a.id=b.athlete
                    WHERE a.club=? AND b.bdate>=? ORDER BY b.bdate""", (club, since))
    else:
        rows = q("""SELECT b.*, a.name, a.club FROM body_comp b JOIN athletes a ON a.id=b.athlete
                    WHERE b.bdate>=? ORDER BY b.bdate LIMIT 1500""", (since,))
    by_ath = {}
    for r in rows:
        by_ath.setdefault(r["athlete"], {"name": r["name"], "pts": []})["pts"].append(r)
    trends = []
    for aid, d in by_ath.items():
        pts = d["pts"]
        if len(pts) >= 2 and pts[0]["weight"] and pts[-1]["weight"]:
            dw = pts[-1]["weight"] - pts[0]["weight"]
            df = (pts[-1]["fat"] or 0) - (pts[0]["fat"] or 0)
            trends.append({"name": d["name"], "n": len(pts), "dw": round(dw, 1), "df": round(df, 1)})
    biggest_drop = sorted([t for t in trends if t["df"] < 0], key=lambda t: t["df"])[:6]
    biggest_gain = sorted([t for t in trends if t["dw"] > 0], key=lambda t: -t["dw"])[:6]
    return {
        "kind": "bodycomp", "title": "Trend sastava tijela" + (f" — {club}" if club else ""),
        "subtitle": f"{len(rows)} mjerenja · {len(by_ath)} sportaša · period {days} dana",
        "kpis": [["Mjerenja", str(len(rows))], ["Sportaša", str(len(by_ath))],
                 ["Najveći pad masnoće", (biggest_drop[0]["name"] + " " + _fmt(biggest_drop[0]["df"]) + "%") if biggest_drop else "—"]],
        "sections": [
            {"h": "Najveći pad masnoće (%)", "table": {
                "cols": ["Sportaš", "Mjerenja", "Δ masnoća", "Δ težina"],
                "rows": [[t["name"], str(t["n"]), _fmt(t["df"]) + " pp", _fmt(t["dw"]) + " kg"] for t in biggest_drop]}},
            {"h": "Najveći dobitak težine (hipertrofija?)", "table": {
                "cols": ["Sportaš", "Mjerenja", "Δ težina", "Δ masnoća"],
                "rows": [[t["name"], str(t["n"]), _fmt(t["dw"]) + " kg", _fmt(t["df"]) + " pp"] for t in biggest_gain]}},
        ],
        "recommendations": ["Pad težine + pad masnoće + pad performansi → provjeriti kalorijski unos.",
                            "Dobitak težine uz rast masnoće → prilagoditi prehranu (manjak ~300 kcal/dan)."],
        "footer": "SPT · Sports Performance Tracking · produced by GNK ASG · sintetski demo-podaci",
    }


BUILDERS = {
    "athlete": lambda p: athlete_report(int(p.get("athlete", 1)), int(p.get("days", 90))),
    "club": lambda p: club_report(p.get("club", ""), int(p.get("days", 90))),
    "injuries": lambda p: injuries_report(p.get("club") or None, int(p.get("days", 365))),
    "tests": lambda p: tests_report(p.get("club") or None),
    "readiness": lambda p: readiness_report(p.get("club", "")),
    "match": lambda p: match_report(p.get("match", "M-001")),
    "bodycomp": lambda p: bodycomp_report(p.get("club") or None, int(p.get("days", 180))),
}

KINDS_META = [
    {"id": "athlete", "hr": "Izvještaj o sportašu", "desc": "Norme, opterećenje, testovi, wellness, ACWR, preporuke", "params": ["athlete", "days"]},
    {"id": "club", "hr": "Klupski izvještaj", "desc": "Dostupnost, kolektivno opterećenje, anomalije, top liste", "params": ["club", "days"]},
    {"id": "readiness", "hr": "Spremnost i rizik", "desc": "ACWR + spremnost + wellness → rang lista rizika", "params": ["club"]},
    {"id": "injuries", "hr": "Ozljede", "desc": "Po dijelu tijela, vrsti, uzroku, trajanju oporavka", "params": ["club", "days"]},
    {"id": "tests", "hr": "Testna baterija", "desc": "CMJ, sprint, yo-yo, laktat — najbolji rezultati", "params": ["club"]},
    {"id": "match", "hr": "Analiza utakmice", "desc": "Kilometraža igrača, brzine, događaji", "params": ["match"]},
    {"id": "bodycomp", "hr": "Sastav tijela", "desc": "Trendovi težine i masnoće po sportašima", "params": ["club", "days"]},
]
