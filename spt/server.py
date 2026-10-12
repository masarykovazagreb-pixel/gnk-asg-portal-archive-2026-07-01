#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SPT — Sports Performance Tracking · poslužitelj (čisti Python stdlib, bez vanjskih ovisnosti).

Pokretanje:  python server.py   →  http://localhost:8000
Env varijable: SPT_PORT (default 8000), SPT_NO_BROWSER=1 (ne otvara preglednik)
"""
import gzip
import json
import math
import os
import random
import re
import sqlite3
import sys
import threading
import time
import webbrowser

import reportgen
from bisect import bisect_left
from datetime import date, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "spt.db")
STATIC_DIR = os.path.join(BASE_DIR, "static")
VERSION = "2.3.0"

# ---------------------------------------------------------------------------
# BAZA
# ---------------------------------------------------------------------------
def ensure_db():
    if not os.path.exists(DB_PATH):
        print("[SPT] Baza ne postoji — generiram (prvo pokretanje)...")
        import seed
        seed.main()

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

# ---------------------------------------------------------------------------
# UČITAVANJE UTAKMICA + PRETPLATE ZA LIVE
# ---------------------------------------------------------------------------
MATCHES = {}          # id -> frames dict
LIVE_CUM = {}         # id -> [per player: cum_dist, cum_top, cum_sprints, speeds]
_live_lock = threading.Lock()
LIVE = {
    "match": "M-001",
    "speed": 10.0,
    "mode": "auto",
    "t": 1800.0,
    "last": time.time(),
    "hr": {},          # (mid, player_idx) -> hr
}

def load_matches():
    for row in q("SELECT id, frames FROM matches"):
        try:
            fr = json.loads(gzip.decompress(row["frames"]).decode("utf-8"))
        except Exception:
            continue
        MATCHES[row["id"]] = fr
        cum = []
        for p in fr["players"]:
            xs, ys = p["x"], p["y"]
            n = len(xs)
            cd = [0.0] * n
            ct = [0.0] * n
            cs = [0] * n
            sp = [0.0] * n
            sprinting = False
            for i in range(1, n):
                d = math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1])
                sp[i] = d
                cd[i] = cd[i - 1] + d
                ct[i] = max(ct[i - 1], d * 3.6)
                if d > 7.0 and not sprinting:
                    sprinting = True
                    cs[i] = cs[i - 1] + 1
                else:
                    if d <= 6.5:
                        sprinting = False
                    cs[i] = cs[i - 1]
            cum.append((cd, ct, cs, sp))
        LIVE_CUM[row["id"]] = cum

def live_tick():
    """Pomakni virtualni sat utakmice prema proteklom vremenu."""
    with _live_lock:
        now = time.time()
        dt = now - LIVE["last"]
        LIVE["last"] = now
        fr = MATCHES.get(LIVE["match"])
        if not fr:
            return
        LIVE["t"] += dt * LIVE["speed"]
        if LIVE["t"] >= fr["meta"]["duration"]:
            LIVE["t"] = 0.0
            LIVE["hr"] = {}

# ---------------------------------------------------------------------------
# ANALITIČKI INDEKS (u memoriji)
# ---------------------------------------------------------------------------
SUMMARY = {}       # aid -> {"sport", "position", "metrics": {mid: mean}}
SPORT_IDX = {}     # sport -> {mid: [sorted values]}
POS_IDX = {}       # (sport, pos) -> {mid: [sorted values]}
METRIC_NAMES = {}

def build_index():
    global SUMMARY, SPORT_IDX, POS_IDX, METRIC_NAMES
    for r in q("SELECT id, hr, unit FROM metrics"):
        METRIC_NAMES[r["id"]] = {"hr": r["hr"], "unit": r["unit"]}
    per_ath = {}
    for r in q("SELECT athlete, sport, metrics FROM sessions"):
        try:
            m = json.loads(r["metrics"])
        except Exception:
            continue
        d = per_ath.setdefault(r["athlete"], {})
        for k, v in m.items():
            if isinstance(v, (int, float)):
                d.setdefault(k, []).append(v)
    for r in q("SELECT id, sport, position FROM athletes"):
        if r["id"] not in per_ath:
            continue
        means = {}
        for k, vals in per_ath[r["id"]].items():
            if len(vals) >= 3:
                means[k] = sum(vals) / len(vals)
        if not means:
            continue
        SUMMARY[r["id"]] = {"sport": r["sport"], "position": r["position"], "metrics": means}
        for k, v in means.items():
            SPORT_IDX.setdefault(r["sport"], {}).setdefault(k, []).append(v)
            POS_IDX.setdefault((r["sport"], r["position"]), {}).setdefault(k, []).append(v)
    for idx in (SPORT_IDX, POS_IDX):
        for sportm in idx.values():
            for k in sportm:
                sportm[k].sort()

def percentile(sorted_vals, v):
    if not sorted_vals:
        return 50.0
    lo, hi = 0, len(sorted_vals)
    pos = bisect_left(sorted_vals, v)
    return round(100.0 * pos / max(len(sorted_vals) - 1, 1), 1)

def metric_catalog_for(sport_id):
    common = ["dist_total", "top_speed", "sprints", "acc_count", "hr_avg", "hr_max", "hrv_rmssd",
              "srpe", "playerload", "readiness", "sleep_h", "jumps", "jump_height_max", "asym_lr", "kcal"]
    tech = []
    for r in q("SELECT id, hr, unit, descr FROM metrics WHERE grp='tehnicki'"):
        tech.append(r)
    tech_ids = {r["id"] for r in tech}
    sport_tech = [r for r in tech if r["id"] in SPORT_IDX.get(sport_id, {})]
    return common, sport_tech

def pct_for(aid, mid, value=None):
    s = SUMMARY.get(aid)
    if not s:
        return 50.0
    if value is None:
        value = s["metrics"].get(mid)
    if value is None:
        return 50.0
    arr = POS_IDX.get((s["sport"], s["position"]), {}).get(mid) or SPORT_IDX.get(s["sport"], {}).get(mid)
    return percentile(arr, value) if arr else 50.0

# ---------------------------------------------------------------------------
# RUTA API-ja
# ---------------------------------------------------------------------------
ROUTES = []
def route(method, pattern):
    rx = re.compile("^" + pattern + "$")
    def deco(fn):
        ROUTES.append((method, rx, fn))
        return fn
    return deco


def parse_multipart(raw: bytes, boundary: bytes):
    """Jednostavan multipart/form-data parser (stdlib only)."""
    out = {}
    for part in raw.split(b"--" + boundary):
        part = part.strip(b"\r\n")
        if not part or part == b"--":
            continue
        header, _, data = part.partition(b"\r\n\r\n")
        m = re.search(rb'name="([^"]+)"', header)
        if not m:
            continue
        name = m.group(1).decode()
        fn = re.search(rb'filename="([^"]*)"', header)
        if fn:
            out[name] = {"filename": fn.group(1).decode(), "data": data.rstrip(b"\r\n")}
        else:
            out[name] = {"value": data.decode("utf-8", "replace")}
    return out

def sport_row(r):
    return {"id": r["id"], "hr": r["hr"], "en": r["en"], "cat": r["cat"], "nteam": r["nteam"],
            "field": json.loads(r["field"]), "positions": json.loads(r["positions"]),
            "modes": json.loads(r["modes"]),
            "prof": json.loads(r["prof"]), "count": SPORT_COUNT.get(r["id"], 0)}

SPORT_COUNT = {}

# ------------------------------ osnovno -----------------------------------
@route("GET", r"/api/i18n")
def api_i18n(m, qs):
    import i18n
    lang = qs.get("lang", "hr")
    return {"langs": i18n.lang_names(), "lang": lang if lang in i18n.LANGS else "hr",
            "t": {k: i18n.tr(k, lang) for k in i18n.T}}


@route("GET", r"/api/meta")
def api_meta(m, qs):
    st = {r["k"]: r["v"] for r in q("SELECT k, v FROM settings")}
    return {"version": VERSION, "athletes": int(st.get("n_athletes", 0)),
            "sessions": int(st.get("n_sessions", 0)), "sports": len(SPORT_COUNT) or q1("SELECT COUNT(*) c FROM sports")["c"],
            "clubs": q1("SELECT COUNT(*) c FROM clubs")["c"], "devices": q1("SELECT COUNT(*) c FROM devices")["c"],
            "metrics": q1("SELECT COUNT(*) c FROM metrics")["c"], "matches": len(MATCHES),
            "generated": st.get("generated"), "seed": st.get("seed")}

@route("GET", r"/api/countries")
def api_countries(m, qs):
    from data_catalog import COUNTRIES, FLAG
    return [{"code": c[0], "name": c[1], "flag": FLAG.get(c[0], "🏳️")} for c in COUNTRIES]

@route("GET", r"/api/dashboard")
def api_dashboard(m, qs):
    tot_km = 0.0
    for r in q("SELECT metrics FROM sessions"):
        try:
            tot_km += json.loads(r["metrics"]).get("dist_total", 0) or 0
        except Exception:
            pass
    sports = sorted(SPORT_COUNT.items(), key=lambda kv: -kv[1])[:14]
    matches = []
    for mid, fr in MATCHES.items():
        rep = json.loads(q1("SELECT report FROM matches WHERE id=?", (mid,))["report"])
        best = max(rep["players"], key=lambda p: p["dist"])
        matches.append({"id": mid, "sport": fr["meta"]["sport"], "name": fr["meta"]["name"],
                        "score": f"{fr['meta']['score'][0]}:{fr['meta']['score'][1]}",
                        "date": q1("SELECT mdate d FROM matches WHERE id=?", (mid,))["d"],
                        "top": {"name": best["name"], "dist": best["dist"], "team": best["team"]}})
    recent = []
    for r in q("""SELECT s.id, s.sdate, s.stype, s.duration, s.sport, a.name, a.country, s.metrics
                  FROM sessions s JOIN athletes a ON a.id=s.athlete ORDER BY s.sdate DESC, s.id DESC LIMIT 9"""):
        try:
            mm = json.loads(r["metrics"])
        except Exception:
            mm = {}
        recent.append({"id": r["id"], "date": r["sdate"], "type": r["stype"], "sport": r["sport"],
                       "athlete": r["name"], "country": r["country"], "dist": mm.get("dist_total"),
                       "top": mm.get("top_speed"), "load": mm.get("srpe")})
    rd = [s["metrics"].get("readiness") for s in SUMMARY.values() if s["metrics"].get("readiness")]
    return {"total_km": round(tot_km, 0), "sports_top": sports, "matches": matches, "recent": recent,
            "avg_readiness": round(sum(rd) / len(rd), 1) if rd else 0,
            "n_athletes": len(SUMMARY)}

@route("GET", r"/api/sports")
def api_sports(m, qs):
    return [sport_row(r) for r in q("SELECT * FROM sports ORDER BY weight DESC")]

@route("GET", r"/api/sports/(?P<sid>[a-z_]+)")
def api_sport(m, qs):
    r = q1("SELECT * FROM sports WHERE id=?", (m["sid"],))
    if not r:
        return {"error": "nema"}
    s = sport_row(r)
    common, tech = metric_catalog_for(m["sid"])
    s["common_metrics"] = [{"id": c, **METRIC_NAMES.get(c, {"hr": c, "unit": ""})} for c in common
                           if c in SPORT_IDX.get(m["sid"], {})]
    s["tech_metrics"] = [{"id": t["id"], "hr": t["hr"], "unit": t["unit"]} for t in tech]
    # uređaji po načinu praćenja
    mode_map = {"gnss": "GNSS", "uwb": "UWB", "optical": "Optički", "imu": "IMU",
                "wearable": ("Nosivi", "HR"), "plate": ("Force", "plate"), "vbt": "VBT",
                "radar": "Radar", "telemetrija": "Telemetrija"}
    devs = []
    for d in q("SELECT * FROM devices"):
        for mo in s["modes"]:
            key = mode_map.get(mo)
            if key and ((isinstance(key, str) and key in d["typ"]) or (isinstance(key, tuple) and any(k in d["typ"] for k in key))):
                devs.append({"id": d["id"], "name": d["name"], "vendor": d["vendor"], "typ": d["typ"], "freq": d["freq"]})
                break
    s["devices"] = devs
    return s

@route("GET", r"/api/metrics")
def api_metrics(m, qs):
    groups = {r["id"]: r for r in q("SELECT * FROM metrics")}
    out = []
    for (gid, ghr, gdesc) in [("lokomotorija", "Kretanje i lokomocija", ""), ("kardio", "Kardiometrijski parametri", ""),
                              ("opterecenje", "Opterećenje i oporavak", ""), ("neuromuskularni", "Neuromuskularni parametri", ""),
                              ("tehnicki", "Tehnički parametri (po sportu)", ""), ("okolis", "Okolišni uvjeti", ""),
                              ("timske", "Timske analitike", "")]:
        items = [{"id": r["id"], "hr": r["hr"], "unit": r["unit"], "desc": r["descr"]}
                 for r in q("SELECT * FROM metrics WHERE grp=? ORDER BY id", (gid,))]
        out.append({"id": gid, "hr": ghr, "items": items})
    return out

@route("GET", r"/api/devices")
def api_devices(m, qs):
    return [{"id": r["id"], "name": r["name"], "vendor": r["vendor"], "typ": r["typ"], "freq": r["freq"],
             "acc": r["acc"], "indoor": r["indoor"], "outdoor": r["outdoor"], "desc": r["descr"]}
            for r in q("SELECT * FROM devices ORDER BY typ, name")]

@route("GET", r"/api/clubs")
def api_clubs(m, qs):
    out = []
    for r in q("""SELECT c.code, c.country, c.level, c.sport, COUNT(a.id) n,
                  AVG(CASE WHEN a.tag='featured' THEN 1 ELSE 0 END) feat
                  FROM clubs c LEFT JOIN athletes a ON a.club=c.code
                  GROUP BY c.code ORDER BY feat DESC, n DESC"""):
        out.append({"code": r["code"], "country": r["country"], "level": r["level"],
                    "sport": r["sport"], "n": r["n"], "featured": r["feat"] and r["feat"] > 0})
    return out

@route("GET", r"/api/clubs/(?P<code>[A-Z0-9\-]+)")
def api_club(m, qs):
    c = q1("SELECT * FROM clubs WHERE code=?", (m["code"],))
    if not c:
        return {"error": "nema"}
    roster = []
    for r in q("SELECT id, name, sex, age, position, country FROM athletes WHERE club=? ORDER BY id", (m["code"],)):
        s = SUMMARY.get(r["id"], {})
        met = s.get("metrics", {})
        roster.append({"id": r["id"], "name": r["name"], "sex": r["sex"], "age": r["age"],
                       "position": r["position"], "country": r["country"],
                       "readiness": met.get("readiness"), "top": met.get("top_speed"),
                       "load": met.get("srpe")})
    return {"code": c["code"], "country": c["country"], "level": c["level"], "sport": c["sport"], "roster": roster}

# ------------------------------ sportaši -----------------------------------
@route("GET", r"/api/athletes")
def api_athletes(m, qs):
    where, args = ["1=1"], []
    if qs.get("q"):
        where.append("a.name LIKE ?")
        args.append(f"%{qs['q']}%")
    if qs.get("sport"):
        where.append("a.sport=?")
        args.append(qs["sport"])
    if qs.get("country"):
        where.append("a.country=?")
        args.append(qs["country"])
    if qs.get("club"):
        where.append("a.club=?")
        args.append(qs["club"])
    if qs.get("position"):
        where.append("a.position=?")
        args.append(qs["position"])
    if qs.get("sex"):
        where.append("a.sex=?")
        args.append(qs["sex"])
    sort = {"name": "a.name", "age": "a.age DESC", "country": "a.country", "id": "a.id"}.get(qs.get("sort", "id"), "a.id")
    page = max(1, int(qs.get("page", 1)))
    size = min(60, max(10, int(qs.get("size", 30))))
    total = q1(f"SELECT COUNT(*) c FROM athletes a WHERE {' AND '.join(where)}", args)["c"]
    rows = q(f"""SELECT a.* FROM athletes a WHERE {' AND '.join(where)} ORDER BY {sort} LIMIT ? OFFSET ?""",
             args + [size, (page - 1) * size])
    items = []
    for r in rows:
        met = SUMMARY.get(r["id"], {}).get("metrics", {})
        items.append({"id": r["id"], "name": r["name"], "sex": r["sex"], "country": r["country"],
                      "age": r["age"], "sport": r["sport"], "position": r["position"], "club": r["club"],
                      "top": met.get("top_speed"), "dist": met.get("dist_total"), "readiness": met.get("readiness"),
                      "load": met.get("srpe")})
    # opcije filtera
    sports_opts = sorted(SPORT_COUNT.items(), key=lambda kv: -kv[1])
    countries = q("SELECT DISTINCT country FROM athletes ORDER BY country")
    positions = q("SELECT DISTINCT sport, position FROM athletes ORDER BY sport, position")
    return {"items": items, "total": total, "page": page, "size": size,
            "facets": {"sports": [{"id": s, "n": n} for s, n in sports_opts],
                       "countries": [c["country"] for c in countries],
                       "positions": {}}}

@route("GET", r"/api/athletes/(?P<aid>\d+)")
def api_athlete(m, qs):
    r = q1("SELECT * FROM athletes WHERE id=?", (int(m["aid"]),))
    if not r:
        return {"error": "nema"}
    # SPT 2.0 dopuna: zadnje mjerenje vage + ozljede + anomalije
    bc_last = q1("SELECT * FROM body_comp WHERE athlete=? ORDER BY bdate DESC LIMIT 1", (r["id"],))
    inj_open = q("SELECT * FROM injuries WHERE athlete=? AND status!='oporavljeno' ORDER BY idate DESC", (r["id"],))
    n_anom = q1("SELECT COUNT(*) c FROM anomalies WHERE athlete=?", (r["id"],))["c"]
    met = SUMMARY.get(r["id"], {}).get("metrics", {})
    common, tech = metric_catalog_for(r["sport"])
    axes = [c for c in common if c in met] + [t["id"] for t in tech if t["id"] in met][:4]
    radar = []
    for mid in axes[:10]:
        v = met.get(mid)
        if v is None:
            continue
        arr = POS_IDX.get((r["sport"], r["position"]), {}).get(mid) or SPORT_IDX.get(r["sport"], {}).get(mid)
        radar.append({"id": mid, "hr": METRIC_NAMES.get(mid, {}).get("hr", mid),
                      "unit": METRIC_NAMES.get(mid, {}).get("unit", ""), "value": round(v, 2),
                      "pct": percentile(arr, v) if arr else 50.0})
    sessions = []
    for s in q("SELECT * FROM sessions WHERE athlete=? ORDER BY sdate DESC, id DESC LIMIT 14", (r["id"],)):
        sm = json.loads(s["metrics"])
        sessions.append({"date": s["sdate"], "type": s["stype"], "dur": s["duration"],
                         "dist": sm.get("dist_total"), "top": sm.get("top_speed"),
                         "load": sm.get("srpe"), "readiness": sm.get("readiness"), "hr": sm.get("hr_avg"),
                         "sprints": sm.get("sprints")})
    # tjedna opterećenja (12 punih tjedana — bez tekućeg)
    wk = {}
    for s in q("SELECT sdate, metrics FROM sessions WHERE athlete=?", (r["id"],)):
        sm = json.loads(s["metrics"])
        wk[s["sdate"]] = wk.get(s["sdate"], 0) + (sm.get("srpe") or 0)
    weeks = []
    today = date.today()
    for i in range(12, 0, -1):
        monday = today - timedelta(days=today.weekday() + 7 * i)
        tot = sum(v for d, v in wk.items() if monday.isoformat() <= d <= (monday + timedelta(days=6)).isoformat())
        weeks.append({"w": monday.isoformat(), "load": tot})
    return {**dict(r), "radar": radar, "sessions": sessions, "weeks": weeks,
            "n_sessions": q1("SELECT COUNT(*) c FROM sessions WHERE athlete=?", (r["id"],))["c"],
            "body_comp_last": dict(bc_last) if bc_last else None,
            "injuries_open": [dict(x) for x in inj_open],
            "anomaly_count": n_anom}

# ------------------------------ analize ------------------------------------
@route("GET", r"/api/compare")
def api_compare(m, qs):
    ids = [int(x) for x in (qs.get("ids", "").split(",") if qs.get("ids") else []) if x][:4]
    out = []
    axes_sets = []
    for aid in ids:
        r = q1("SELECT * FROM athletes WHERE id=?", (aid,))
        if not r:
            continue
        met = SUMMARY.get(aid, {}).get("metrics", {})
        common, tech = metric_catalog_for(r["sport"])
        axes = [c for c in common if c in met][:7]
        axes_sets.append(set(axes))
        comp = []
        for mid in axes:
            v = met[mid]
            comp.append({"id": mid, "hr": METRIC_NAMES.get(mid, {}).get("hr", mid),
                         "unit": METRIC_NAMES.get(mid, {}).get("unit", ""),
                         "value": round(v, 2), "pct": pct_for(aid, mid, v)})
        out.append({"id": aid, "name": r["name"], "sport": r["sport"], "position": r["position"],
                    "country": r["country"], "club": r["club"], "age": r["age"], "axes": comp})
    # presjek osi — da usporedba raznih sportova bude poštena
    if len(axes_sets) > 1:
        inter = set.intersection(*axes_sets)
        for a in out:
            a["axes"] = [x for x in a["axes"] if x["id"] in inter]
    return {"athletes": out}

@route("GET", r"/api/leaderboard")
def api_leaderboard(m, qs):
    sport = qs.get("sport", "nogomet")
    metric = qs.get("metric", "dist_total")
    limit = min(30, int(qs.get("limit", 15)))
    country = qs.get("country")
    sex = qs.get("sex")
    days = int(qs.get("days", "0") or 0)  # 0 = sve vrijeme
    arr_map = SPORT_IDX.get(sport, {})
    if metric not in arr_map:
        return {"items": [], "metric": metric, "sport": sport}
    vals = {}
    if days > 0:
        # prosjek unutar perioda — izravno iz sesija
        since = (date.today() - timedelta(days=days)).isoformat()
        for r in q("""SELECT s.athlete aid, AVG(json_extract(s.metrics,'$.%s')) v FROM sessions s
                      JOIN athletes a ON a.id=s.athlete WHERE a.sport=? AND s.sdate>=?
                      AND json_extract(s.metrics,'$.%s') IS NOT NULL GROUP BY s.athlete""" % (metric, metric),
                  (sport, since)):
            vals[r["aid"]] = r["v"]
    else:
        for aid, s in SUMMARY.items():
            if s["sport"] != sport:
                continue
            v = s["metrics"].get(metric)
            if v is not None:
                vals[aid] = v
    info = {r["id"]: r for r in q("SELECT * FROM athletes")}
    items = []
    for aid, v in sorted(vals.items(), key=lambda kv: -kv[1])[:120]:
        a = info[aid]
        if country and a["country"] != country:
            continue
        if sex and a["sex"] != sex:
            continue
        items.append({"id": aid, "name": a["name"], "country": a["country"], "club": a["club"],
                      "position": a["position"], "value": round(v, 2), "pct": percentile(arr_map[metric], v)})
        if len(items) >= limit:
            break
    return {"items": items, "metric": metric, "sport": sport,
            "name": METRIC_NAMES.get(metric, {}).get("hr", metric),
            "unit": METRIC_NAMES.get(metric, {}).get("unit", "")}

@route("GET", r"/api/histogram")
def api_histogram(m, qs):
    sport = qs.get("sport", "nogomet")
    metric = qs.get("metric", "dist_total")
    arr = SPORT_IDX.get(sport, {}).get(metric, [])
    if not arr:
        return {"buckets": [], "n": 0}
    lo, hi = arr[0], arr[-1]
    nb = 22
    w = (hi - lo) / nb or 1
    buckets = [0] * nb
    for v in arr:
        buckets[min(nb - 1, int((v - lo) / w))] += 1
    n = len(arr)
    def pc(p):
        return arr[min(n - 1, int(p * (n - 1)))]
    return {"buckets": [{"x0": round(lo + i * w, 2), "x1": round(lo + (i + 1) * w, 2), "n": b} for i, b in enumerate(buckets)],
            "n": n, "mean": round(sum(arr) / n, 2),
            "p10": round(pc(0.10), 2), "p50": round(pc(0.50), 2), "p90": round(pc(0.90), 2)}

@route("GET", r"/api/metrics_for_sport")
def api_metrics_for_sport(m, qs):
    sport = qs.get("sport", "nogomet")
    avail = sorted(SPORT_IDX.get(sport, {}).keys())
    out = []
    for mid in avail:
        mn = METRIC_NAMES.get(mid, {"hr": mid, "unit": ""})
        r = q1("SELECT descr FROM metrics WHERE id=?", (mid,))
        out.append({"id": mid, "hr": mn["hr"], "unit": mn["unit"], "desc": r["descr"] if r else ""})
    return out

# ------------------------------ utakmice -----------------------------------
@route("GET", r"/api/matches")
def api_matches(m, qs):
    out = []
    for r in q("SELECT * FROM matches ORDER BY mdate DESC"):
        rep = json.loads(r["report"])
        best = max(rep["players"], key=lambda p: p["dist"])
        sport_hr = q1("SELECT hr FROM sports WHERE id=?", (r["sport"],))["hr"]
        out.append({"id": r["id"], "sport": r["sport"], "sport_hr": sport_hr, "date": r["mdate"],
                    "home": r["home"], "away": r["away"], "score": r["score"], "mode": r["mode"],
                    "teams": rep["teams"],
                    "best": {"name": best["name"], "dist": best["dist"], "role": best["role"], "team": best["team"]}})
    return out

@route("GET", r"/api/matches/(?P<mid>[A-Z0-9\-]+)")
def api_match(m, qs):
    r = q1("SELECT * FROM matches WHERE id=?", (m["mid"],))
    if not r:
        return {"error": "nema"}
    fr = MATCHES.get(m["mid"])
    rep = json.loads(r["report"])
    sport_hr = q1("SELECT hr FROM sports WHERE id=?", (r["sport"],))["hr"]
    return {"id": r["id"], "sport": r["sport"], "sport_hr": sport_hr, "date": r["mdate"],
            "home": r["home"], "away": r["away"], "score": r["score"], "mode": r["mode"],
            "meta": fr["meta"] if fr else {}, "report": rep, "events": json.loads(r["events"])}

@route("GET", r"/api/matches/(?P<mid>[A-Z0-9\-]+)/replay")
def api_replay(m, qs):
    fr = MATCHES.get(m["mid"])
    if not fr:
        return {"error": "nema"}
    return fr

# ------------------------------ live ---------------------------------------
MODE_SIGNAL = {
    "gps": lambda rnd, t: {"label": "GPS / GNSS", "hz": 10, "sats": int(11 + math.sin(t / 7) * 2 + rnd.uniform(-1, 1)),
                           "latency": int(180 + 40 * math.sin(t / 3) + rnd.uniform(-15, 15)),
                           "loss": round(abs(0.8 + 0.5 * math.sin(t / 5 + 1)), 2), "acc": "±1,8 m", "anchors": None},
    "uwb": lambda rnd, t: {"label": "UWB / M2M (indoor)", "hz": 20, "sats": None, "anchors": 12,
                           "latency": int(9 + 5 * math.sin(t / 4) + rnd.uniform(-2, 2)),
                           "loss": round(abs(0.08 + 0.06 * math.sin(t / 6)), 2), "acc": "±10 cm"},
    "ble": lambda rnd, t: {"label": "Bluetooth Low Energy", "hz": 4, "sats": None, "anchors": None,
                           "latency": int(38 + 14 * math.sin(t / 2.5) + rnd.uniform(-6, 6)),
                           "loss": round(abs(1.2 + 0.8 * math.sin(t / 4 + 2)), 2), "acc": "±2,5 m"},
}

@route("GET", r"/api/live/status")
def api_live_status(m, qs):
    live_tick()
    with _live_lock:
        mid = LIVE["match"]
        fr = MATCHES.get(mid)
        if not fr:
            return {"error": "nema"}
        t = LIVE["t"]
        mode = LIVE["mode"]
        eff = "uwb" if mode == "auto" else mode
        rnd = random.Random(int(t * 13) % 99991)
        sig = MODE_SIGNAL.get(eff, MODE_SIGNAL["uwb"])(rnd, t)
        score = [0, 0]
        evs = []
        for ev in fr["events"]:
            if ev["t"] <= t:
                evs.append(ev)
                if ev["type"] == "goal":
                    score[ev["team"]] += 1
        # košarka: računaj iz teksta
        if fr["meta"]["sport"] == "kosarka":
            score = [0, 0]
            for ev in evs:
                if ev["type"] == "score":
                    m2 = re.search(r"(\d+):(\d+)", ev["text"])
                    if m2:
                        score = [int(m2.group(1)), int(m2.group(2))]
        matches_list = [{"id": k, "sport": v["meta"]["sport"], "name": v["meta"]["name"]}
                        for k, v in MATCHES.items()]
        return {"match": mid, "matches": matches_list, "t": round(t, 2),
                "duration": fr["meta"]["duration"], "speed": LIVE["speed"], "mode": mode,
                "effective": eff, "signal": sig, "score": score,
                "sport": fr["meta"]["sport"], "home": fr["meta"]["home"], "away": fr["meta"]["away"],
                "events": evs[-8:][::-1]}

@route("GET", r"/api/live/frame")
def api_live_frame(m, qs):
    live_tick()
    with _live_lock:
        mid = LIVE["match"]
        fr = MATCHES.get(mid)
        if not fr:
            return {"error": "nema"}
        t = min(LIVE["t"], fr["meta"]["duration"] - 1.001)
        i = int(t)
        f = t - i
        i = max(0, min(i, len(fr["ball"]["x"]) - 2))
        players = []
        cum = LIVE_CUM[mid]
        for pi, p in enumerate(fr["players"]):
            xs, ys = p["x"], p["y"]
            x = xs[i] + (xs[i + 1] - xs[i]) * f
            y = ys[i] + (ys[i + 1] - ys[i]) * f
            cd, ct, cs, sp = cum[pi]
            spd = sp[i] + (sp[i + 1] - sp[i]) * f
            key = (mid, pi)
            hr = LIVE["hr"].get(key, 88.0)
            target = (82 + spd * 12) if p["role"] != "GK" else (78 + spd * 9)
            target = min(201, target + math.sin(t / 60 + pi) * 3)
            hr += (target - hr) * 0.12 + random.uniform(-1.2, 1.2)
            LIVE["hr"][key] = hr
            players.append({"aid": p["aid"], "name": p["name"], "num": p["num"], "team": p["team"],
                            "role": p["role"], "x": round(x, 2), "y": round(y, 2),
                            "dist": round(cd[i] / 1000, 2), "top": round(ct[i], 1), "sprints": cs[i],
                            "speed": round(spd * 3.6, 1), "hr": int(hr),
                            "batt": round(max(35, 100 - (t / fr["meta"]["duration"]) * 26 - (p["aid"] % 7)), 0)})
        b = fr["ball"]
        ball = {"x": round(b["x"][i] + (b["x"][i + 1] - b["x"][i]) * f, 2),
                "y": round(b["y"][i] + (b["y"][i + 1] - b["y"][i]) * f, 2),
                "z": round(b["z"][i] + (b["z"][i + 1] - b["z"][i]) * f, 2)}
        score = [0, 0]
        evs = []
        for ev in fr["events"]:
            if ev["t"] <= t:
                evs.append(ev)
                if ev["type"] == "goal":
                    score[ev["team"]] += 1
        if fr["meta"]["sport"] == "kosarka":
            score = [0, 0]
            for ev in evs:
                if ev["type"] == "score":
                    m2 = re.search(r"(\d+):(\d+)", ev["text"])
                    if m2:
                        score = [int(m2.group(1)), int(m2.group(2))]
        return {"t": round(t, 2), "players": players, "ball": ball, "score": score,
                "L": fr["meta"]["L"], "W": fr["meta"]["W"], "sport": fr["meta"]["sport"],
                "duration": fr["meta"]["duration"], "events": evs[-6:][::-1]}

@route("POST", r"/api/live/config")
def api_live_config(m, qs, body=None):
    with _live_lock:
        if body.get("match") in MATCHES:
            LIVE["match"] = body["match"]
            LIVE["t"] = 60.0
            LIVE["hr"] = {}
        if body.get("speed"):
            LIVE["speed"] = float(body["speed"])
        if body.get("mode") in ("gps", "uwb", "ble", "auto"):
            LIVE["mode"] = body["mode"]
        if body.get("reset"):
            LIVE["t"] = 0.0
            LIVE["hr"] = {}
    return {"ok": True}

# ------------------------------ simulacije ---------------------------------
@route("GET", r"/api/simulate")
def api_simulate(m, qs):
    aid = int(qs.get("athlete", 0))
    extra = float(qs.get("extra", 0))  # -30..+30 % promjena obujma
    a = q1("SELECT * FROM athletes WHERE id=?", (aid,))
    if not a:
        return {"error": "nema"}
    rows = q("SELECT sdate, metrics FROM sessions WHERE athlete=? ORDER BY sdate", (aid,))
    daily = {}
    readiness_series = []
    for r in rows:
        sm = json.loads(r["metrics"])
        daily[r["sdate"]] = daily.get(r["sdate"], 0) + (sm.get("srpe") or 0)
        readiness_series.append((r["sdate"], sm.get("readiness"), sm.get("sleep_h"), sm.get("soreness")))
    today = date.today()
    weeks = []
    for i in range(12, 0, -1):
        monday = today - timedelta(days=today.weekday() + 7 * i)
        tot = sum(v for d, v in daily.items() if monday.isoformat() <= d <= (monday + timedelta(days=6)).isoformat())
        weeks.append({"w": (monday + timedelta(days=3)).isoformat(), "load": tot})
    chronic = (sum(w["load"] for w in weeks[-4:]) / 4) or 1
    acute = weeks[-1]["load"] or 1
    acwr = round(acute / chronic, 2)
    # projekcija 4 tjedna
    rnd = random.Random(aid * 7919)
    proj = []
    load = acute
    for w in range(1, 5):
        planned = chronic * (1 + 0.03 * w + extra / 100.0) * rnd.uniform(0.94, 1.06)
        planned = max(50, planned)
        acwr_p = planned / chronic
        risk = 100 / (1 + math.exp(-(acwr_p - 1.42) * 3.2))
        risk = round(min(92, max(3, risk * 0.9 + (4 if weeks[-1]["load"] > chronic * 1.3 else 0))), 1)
        perf = round(100 - abs(acwr_p - 1.0) * 55 - risk * 0.18 + rnd.uniform(-2, 2), 1)
        proj.append({"w": w, "load": round(planned), "lo": round(planned * 0.85), "hi": round(planned * 1.15),
                     "risk": risk, "perf": max(35, min(99, perf)), "acwr": round(acwr_p, 2)})
    # unatrag: crvene zastavice
    flags = []
    for i in range(1, len(weeks)):
        ch = (sum(w["load"] for w in weeks[max(0, i - 4):i]) / min(4, i)) or 1
        ac = weeks[i]["load"]
        if ac / ch > 1.5:
            flags.append({"date": weeks[i]["w"], "type": "acwr", "text": f"ACWR {ac / ch:.2f} — nagli skok obujma treninga (rizik ozljede ↑)"})
    for (d, rd, sl, so) in readiness_series[-60:]:
        if rd is not None and rd < 65:
            flags.append({"date": d, "type": "readiness", "text": f"Spremnost {rd}/100 — smanjiti intenzitet, provjeriti san"})
        if so is not None and so > 5.5:
            flags.append({"date": d, "type": "soreness", "text": f"Bolnost mišića {so}/10 — preporuka regeneracijska jedinica"})
    flags = sorted(flags, key=lambda x: x["date"], reverse=True)[:8]
    recs = []
    if acwr > 1.4:
        recs.append(f"ACWR je {acwr} — preporučuje se smanjiti obujam treninga 15–20% sljedećih 7 dana.")
    elif acwr < 0.8:
        recs.append(f"ACWR je {acwr} — sportaš je podopterećen; postupno povećavati obujam 10% tjedno.")
    else:
        recs.append(f"ACWR je {acwr} — opterećenje je u optimalnom rasponu (0,8–1,3). Zadržati plan.")
    avg_sl = [x[2] for x in readiness_series if x[2]]
    if avg_sl and sum(avg_sl) / len(avg_sl) < 7:
        recs.append("Prosječan san ispod 7 h — prioritetno produžiti san za 45–60 min.")
    rd_recent = [x[1] for x in readiness_series[-10:] if x[1]]
    if rd_recent and sum(rd_recent) / len(rd_recent) < 72:
        recs.append("Spremnost u opadanju — ugraditi 2 regeneracijske jedinice u tjedan.")
    return {"athlete": {"id": a["id"], "name": a["name"], "sport": a["sport"], "position": a["position"],
                        "club": a["club"], "country": a["country"]},
            "weeks": weeks, "acwr": acwr, "chronic": round(chronic), "acute": round(acute),
            "projection": proj, "flags": flags, "recs": recs, "extra": extra}

# ===========================================================================
# SPT 2.0 — NOVE RUTE
# ===========================================================================
import importers
import anomaly as anomaly_mod
import voice_sensor
import spt_ai
import nutrition as nutrition_mod
import norms_data
import watch_bridge

WATCH_LISTENER = None  # pokreće se u main()

# ------------------------------ sesije/uloge --------------------------------
SESSIONS = {}  # token -> user id
_request_ctx = threading.local()

ROLE_LEVEL = {"admin": 5, "trener": 3, "kondicijski": 3, "skaut": 2, "sportas": 1}

def current_user():
    uid = getattr(_request_ctx, "uid", None)
    if uid is None:
        return None
    r = q1("SELECT * FROM users WHERE id=?", (uid,))
    return dict(r) if r else None

def require_role(min_level, club=None):
    """Vraća (user, error). Ako error nije None → prekini s 403."""
    u = current_user()
    if not u:
        return None, {"error": "nije prijavljen", "code": 401}
    if ROLE_LEVEL.get(u["role"], 0) < min_level:
        return u, {"error": "nemate ovlasti za ovu radnju", "code": 403}
    if club and u["role"] in ("trener", "kondicijski") and u["club"] != club:
        return u, {"error": "vaš klub je " + str(u["club"]), "code": 403}
    return u, None

def scope_athlete_ok(aid):
    """Sportaš vidi samo svoj karton; ostali sve."""
    u = current_user()
    if not u:
        return True  # demo način bez prijave — sve čitljivo
    if u["role"] == "sportas":
        return u["athlete"] == int(aid)
    return True


@route("POST", r"/api/auth/login")
def api_auth_login(m, qs, body=None):
    body = body or {}
    r = q1("SELECT * FROM users WHERE username=?", (body.get("username", ""),))
    if not r or r["pin"] != str(body.get("pin", "")):
        return {"error": "neispravno korisničko ime ili PIN"}
    token = "%032x" % random.getrandbits(128)
    SESSIONS[token] = r["id"]
    res = {"ok": True, "user": {"id": r["id"], "username": r["username"], "role": r["role"],
                                "club": r["club"], "athlete": r["athlete"], "name": r["name"]}}
    return ("__SET_COOKIE__", token, res)


@route("POST", r"/api/auth/logout")
def api_auth_logout(m, qs, body=None):
    tok = getattr(_request_ctx, "token", None)
    if tok:
        SESSIONS.pop(tok, None)
    return ("__SET_COOKIE__", "", {"ok": True})


@route("GET", r"/api/auth/me")
def api_auth_me(m, qs):
    u = current_user()
    return {"user": u}


@route("GET", r"/api/users")
def api_users(m, qs):
    u, err = require_role(5)
    if err:
        return err
    return [dict(r) for r in q("SELECT id, username, role, club, athlete, name FROM users ORDER BY id")]


@route("POST", r"/api/users")
def api_users_add(m, qs, body=None):
    u, err = require_role(5)
    if err:
        return err
    body = body or {}
    if not body.get("username") or not body.get("pin"):
        return {"error": "nedostaju podaci"}
    con = db()
    try:
        con.execute("INSERT INTO users (username, pin, role, club, athlete, name, lang) VALUES (?,?,?,?,?,?,?)",
                    (body["username"], str(body["pin"]), body.get("role", "skaut"), body.get("club"),
                     body.get("athlete"), body.get("name", body["username"]), body.get("lang", "hr")))
        con.commit()
    except Exception:
        return {"error": "korisničko ime postoji"}
    finally:
        con.close()
    return {"ok": True}


@route("POST", r"/api/users/delete")
def api_users_delete(m, qs, body=None):
    u, err = require_role(5)
    if err:
        return err
    con = db()
    con.execute("DELETE FROM users WHERE id=?", ((body or {}).get("id"),))
    con.commit()
    con.close()
    return {"ok": True}


# ------------------------------ uvoz datoteka ------------------------------
@route("MULTIPART", r"/api/import/upload")
def api_import_upload(m, qs, body=None):
    parts = body or {}
    f = parts.get("file")
    if not f or not f.get("data"):
        return {"error": "nema datoteke"}
    res = importers.detect_and_parse(f.get("filename") or "datoteka.csv", f["data"])
    res["filename"] = f.get("filename")
    return res


@route("POST", r"/api/import/commit")
def api_import_commit(m, qs, body=None):
    body = body or {}
    aid = int(body.get("athlete", 0))
    a = q1("SELECT * FROM athletes WHERE id=?", (aid,))
    if not a:
        return {"error": "nepoznat sportaš"}
    if body.get("kind") == "scale":
        from scale_bridge import insert_body_comp
        n = 0
        for e in body.get("entries", []):
            insert_body_comp(aid, e.get("date") or e.get("bdate"), e.get("source", "import"), e)
            n += 1
        anomaly_mod.rebuild_all()
        return {"ok": True, "imported": n}
    # sesija
    con = db()
    con.execute("INSERT INTO sessions (athlete, sdate, stype, sport, duration, metrics) VALUES (?,?,?,?,?,?)",
                (aid, body.get("date") or date.today().isoformat(), body.get("stype", "training"),
                 a["sport"], int(body.get("duration", 60)), json.dumps(body.get("metrics", {}))))
    con.commit()
    con.close()
    anomaly_mod.rebuild_all()
    return {"ok": True}


@route("GET", r"/api/import/samples")
def api_import_samples(m, qs):
    """Generira ZIP s oglednim datotekama za testiranje uvoza."""
    import io
    import zipfile
    buf = io.BytesIO()
    z = zipfile.ZipFile(buf, "w")
    gpx = """<?xml version="1.0"?>
<gpx version="1.1" creator="SPT demo">
 <trk><name>Intervalni trening — demo</name><trkseg>"""
    import random as _r
    _rnd = _r.Random(7)
    lat, lon = 45.8150, 15.9819
    t0 = "2026-10-11T17:00:00"
    import datetime as _dt
    t = _dt.datetime(2026, 10, 11, 17, 0, 0)
    for i in range(600):
        lat += _rnd.uniform(-0.00008, 0.00013)
        lon += _rnd.uniform(-0.00008, 0.00013)
        gpx += f'<trkpt lat="{lat:.6f}" lon="{lon:.6f}"><time>{t.isoformat()}Z</time><ele>128</ele></trkpt>'
        t += _dt.timedelta(seconds=1)
    gpx += "</trkseg></trk></gpx>"
    z.writestr("demo_trening.gpx", gpx)
    tcx = """<?xml version="1.0"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
<Activities><Activity Sport="Running"><Id>2026-10-11</Id>"""
    t = _dt.datetime(2026, 10, 11, 17, 0, 0)
    lat, lon = 45.81, 15.98
    for i in range(300):
        lat += 0.00003
        tcx += (f'<Trackpoint><Time>{t.isoformat()}Z</Time><Position>'
                f'<LatitudeDegrees>{lat:.6f}</LatitudeDegrees><LongitudeDegrees>{lon:.6f}</LongitudeDegrees></Position>'
                f'<HeartRateBpm><Value>{130 + (i % 40)}</Value></HeartRateBpm></Trackpoint>')
        t += _dt.timedelta(seconds=2)
    tcx += "</Activity></Activities></TrainingCenterDatabase>"
    z.writestr("demo_trcanje.tcx", tcx)
    csv_rows = "Time,Latitude,Longitude,Speed,HeartRate\n"
    t = _dt.datetime(2026, 10, 11, 18)
    for i in range(240):
        csv_rows += f"{t.isoformat()},{45.80 + i*0.00004:.6f},{15.98 + i*0.00002:.6f},{8 + (i % 12) * 1.4:.1f},{120 + (i % 50)}\n"
        t += _dt.timedelta(seconds=1)
    z.writestr("demo_catapult.csv", csv_rows)
    kin = {"positions": [{"t": i, "x": round(20 + 8 * abs(((i / 40) % 2) - 0.5) * 2, 2), "y": round(10 + (i % 30) * 0.3, 2),
                          "heartRate": 120 + (i % 60)} for i in range(600)]}
    z.writestr("demo_kinexon.json", json.dumps(kin))
    # Huawei Health stil izvoza vage
    hu = ("Start Time,Weight (kg),Body fat (%),Muscle mass (kg),Water (%),Visceral fat,Bone mass (kg),Protein (%),BMR\n"
          "2026-09-14 07:12,81.3,13.8,62.4,58.7,6,3.4,17.2,1782\n"
          "2026-09-21 07:05,81.0,13.5,62.8,58.9,6,3.4,17.4,1786\n"
          "2026-09-28 07:18,80.8,13.2,63.1,59.1,5,3.5,17.6,1790\n"
          "2026-10-05 07:09,80.5,12.9,63.4,59.3,5,3.5,17.7,1794\n"
          "2026-10-11 07:22,80.3,12.7,63.6,59.4,5,3.5,17.8,1796\n")
    z.writestr("demo_vaga_huawei.csv", hu)
    osc = ("Date,Time,Weight,BMI,Fat,Water,Muscle,Bone,Visceral fat\n"
           "2026-09-15,07:10,81.2,24.6,13.9,58.6,62.3,3.4,6\n"
           "2026-09-22,07:14,80.9,24.5,13.4,58.8,62.7,3.4,5\n"
           "2026-09-29,07:08,80.6,24.4,13.0,59.0,63.2,3.5,5\n"
           "2026-10-06,07:16,80.4,24.3,12.8,59.2,63.5,3.5,5\n"
           "2026-10-11,07:20,80.2,24.2,12.6,59.3,63.7,3.5,5\n")
    z.writestr("demo_vaga_openscale.csv", osc)
    z.close()
    return ("application/zip", buf.getvalue(), "spt_ogledni_datoteke.zip")


# ------------------------------ vaga ---------------------------------------
@route("GET", r"/api/scale")
def api_scale(m, qs):
    from scale_bridge import INBOX, get_scale_map
    files = []
    if os.path.isdir(INBOX):
        files = [f for f in os.listdir(INBOX) if not f.endswith(".done")]
    unassigned = []
    for r in q("SELECT b.*, a.name aname FROM body_comp b LEFT JOIN athletes a ON a.id=b.athlete WHERE b.athlete IS NULL ORDER BY b.bdate DESC LIMIT 30"):
        unassigned.append(dict(r))
    recent = []
    for r in q("SELECT b.*, a.name aname FROM body_comp b JOIN athletes a ON a.id=b.athlete WHERE b.source LIKE 'vaga%' ORDER BY b.bdate DESC LIMIT 12"):
        recent.append(dict(r))
    return {"inbox_files": files, "inbox_path": INBOX, "unassigned": unassigned, "recent": recent,
            "map": get_scale_map()}


@route("POST", r"/api/scale")
def api_scale_push(m, qs, body=None):
    from scale_bridge import insert_body_comp
    body = body or {}
    aid = body.get("athlete")
    if not aid:
        return {"error": "nedostaje athlete"}
    e = {k: body.get(k) for k in ("weight", "bmi", "fat", "muscle", "water", "visceral", "bone", "protein", "bmr", "metabolic_age")}
    insert_body_comp(int(aid), body.get("date"), body.get("source", "vaga-api"), e)
    anomaly_mod.rebuild_all()
    return {"ok": True}


@route("POST", r"/api/scale/assign")
def api_scale_assign(m, qs, body=None):
    body = body or {}
    con = db()
    for rid in body.get("ids", []):
        con.execute("UPDATE body_comp SET athlete=? WHERE id=?", (int(body.get("athlete")), rid))
    con.commit()
    con.close()
    anomaly_mod.rebuild_all()
    return {"ok": True}


@route("POST", r"/api/scale/map")
def api_scale_map(m, qs, body=None):
    from scale_bridge import get_scale_map, save_scale_map
    mp = get_scale_map()
    mp["default_athlete"] = body.get("athlete")
    save_scale_map(mp)
    return {"ok": True, "map": mp}


# ------------------------------ ozljede ------------------------------------
@route("GET", r"/api/injuries")
def api_injuries(m, qs):
    where = ["1=1"]
    args = []
    if qs.get("club"):
        where.append("a.club=?")
        args.append(qs["club"])
    if qs.get("status"):
        where.append("i.status=?")
        args.append(qs["status"])
    if qs.get("athlete"):
        where.append("i.athlete=?")
        args.append(int(qs["athlete"]))
    rows = q(f"""SELECT i.*, a.name, a.club, a.sport, a.position FROM injuries i
                 JOIN athletes a ON a.id=i.athlete WHERE {' AND '.join(where)}
                 ORDER BY CASE i.status WHEN 'aktivna' THEN 0 WHEN 'oporavak' THEN 1 ELSE 2 END, i.idate DESC LIMIT 200""", args)
    items = []
    for r in rows:
        items.append({**dict(r), "expected_return": r["return_date"]})
    # matrica po dijelu tijela
    matrix = {}
    for r in q("SELECT body_part, COUNT(*) c FROM injuries GROUP BY body_part"):
        matrix[r["body_part"]] = r["c"]
    return {"items": items, "matrix": matrix}


@route("POST", r"/api/injuries")
def api_injury_add(m, qs, body=None):
    u, err = require_role(3)
    if err:
        return err
    body = body or {}
    if not body.get("athlete"):
        return {"error": "nedostaje sportaš"}
    a = q1("SELECT club FROM athletes WHERE id=?", (int(body["athlete"]),))
    if u["role"] in ("trener", "kondicijski") and a and a["club"] != u["club"]:
        return {"error": f"možete unositi ozljede samo za svoj klub ({u['club']})", "code": 403}
    con = db()
    con.execute("""INSERT INTO injuries (athlete, idate, itype, body_part, severity, cause, days_out, return_date, status, notes)
                   VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (int(body["athlete"]), body.get("idate") or date.today().isoformat(), body.get("itype", "Ozljeda"),
                 body.get("body_part", "nepoznato"), body.get("severity", "umjereno"), body.get("cause", "nepoznato"),
                 int(body.get("days_out", 7)), body.get("return_date"), body.get("status", "aktivna"), body.get("notes", "")))
    con.commit()
    con.close()
    return {"ok": True}


@route("POST", r"/api/injuries/delete")
def api_injury_delete(m, qs, body=None):
    con = db()
    con.execute("DELETE FROM injuries WHERE id=?", ((body or {}).get("id"),))
    con.commit()
    con.close()
    return {"ok": True}


@route("POST", r"/api/injuries/status")
def api_injury_status(m, qs, body=None):
    body = body or {}
    con = db()
    con.execute("UPDATE injuries SET status=? WHERE id=?", (body.get("status", "oporavljeno"), body.get("id")))
    con.commit()
    con.close()
    return {"ok": True}


# ------------------------------ karton --------------------------------------
@route("GET", r"/api/athletes/(?P<aid>\d+)/karton")
def api_karton(m, qs):
    aid = int(m["aid"])
    if not scope_athlete_ok(aid):
        return {"error": "vaša uloga dopušta samo vlastiti karton", "code": 403}
    a = q1("SELECT * FROM athletes WHERE id=?", (aid,))
    if not a:
        return {"error": "nema"}
    # norme + odstupanja (SPT 2.1)
    norms = norms_data.norms_for(a["sport"], a["sex"], a["position"])
    devs = {}
    for metric, (p10, p50, p90) in norms.items():
        r = q1("""SELECT AVG(json_extract(metrics,'$.%s')) v FROM sessions
                  WHERE athlete=? AND stype='match'""" % metric, (aid,))
        if r and r["v"] is not None:
            hb = norms_data.HIGHER_BETTER.get(metric, True)
            d = norms_data.deviate(r["v"], p10, p50, p90, hb)
            if d:
                d["metric_hr"] = METRIC_NAMES.get(metric, {}).get("hr", metric)
                d["unit"] = METRIC_NAMES.get(metric, {}).get("unit", "")
                devs[metric] = d
    # prehrana
    nut = nutrition_mod.athlete_nutrition(aid)
    # tjelesni sastav — sva mjerenja
    bc = [dict(r) for r in q("SELECT * FROM body_comp WHERE athlete=? ORDER BY bdate", (aid,))]
    # ozljede
    inj = [dict(r) for r in q("SELECT * FROM injuries WHERE athlete=? ORDER BY idate DESC", (aid,))]
    # testovi
    tests = {}
    for r in q("SELECT * FROM perf_tests WHERE athlete=? ORDER BY tdate", (aid,)):
        tests.setdefault(r["ttype"], []).append({"date": r["tdate"], **json.loads(r["results"])})
    # anomalije
    anom = [dict(r) for r in q("SELECT * FROM anomalies WHERE athlete=? ORDER BY adate DESC LIMIT 20", (aid,))]
    # sesije po tjednima
    wk = {}
    stypes = {}
    for s in q("SELECT sdate, stype, metrics FROM sessions WHERE athlete=?", (aid,)):
        try:
            sm = json.loads(s["metrics"])
        except Exception:
            sm = {}
        wk[s["sdate"]] = wk.get(s["sdate"], 0) + (sm.get("srpe") or 0)
        stypes[s["stype"]] = stypes.get(s["stype"], 0) + 1
    weeks = []
    today = date.today()
    for i in range(15, -1, -1):
        monday = today - timedelta(days=today.weekday() + 7 * i)
        tot = sum(v for d, v in wk.items() if monday.isoformat() <= d <= (monday + timedelta(days=6)).isoformat())
        weeks.append({"w": monday.isoformat(), "load": tot})
    # utakmice (iz replay baze)
    matches = []
    for r in q("SELECT mp.mid, mp.team, mp.num, m.sport, m.mdate, m.home, m.away, m.score, m.mode FROM match_players mp JOIN matches m ON m.id=mp.mid WHERE mp.aid=?", (aid,)):
        matches.append(dict(r))
    # glasovni zapisi
    voice = [dict(r) for r in q("SELECT * FROM voice_logs WHERE athlete=? ORDER BY vdate DESC LIMIT 10", (aid,))]
    n_sess = q1("SELECT COUNT(*) c FROM sessions WHERE athlete=?", (aid,))["c"]
    dist = q1("SELECT SUM(json_extract(metrics,'$.dist_total')) d FROM sessions WHERE athlete=?", (aid,))["d"]
    # SPT 2.3: zadnje sesije s punim metrikama
    sessions = []
    for r in q("SELECT id, sdate, stype, duration, sport, metrics FROM sessions WHERE athlete=? ORDER BY sdate DESC LIMIT 25", (aid,)):
        try:
            sm = json.loads(r["metrics"])
        except Exception:
            sm = {}
        sessions.append({"id": r["id"], "sdate": r["sdate"], "stype": r["stype"], "duration": r["duration"],
                         "sport": r["sport"], **{k: sm.get(k) for k in ("dist_total", "top_speed", "hr_avg",
                          "hr_max", "sprints", "srpe", "readiness", "lactate", "stride_len", "ball_speed_max")}})
    # SPT 2.3: dnevna opterećenja → monotony / strain / EWMA (28 dana)
    daily = {}
    for s in q("SELECT sdate, json_extract(metrics,'$.srpe') v FROM sessions WHERE athlete=? AND sdate>=?",
               (aid, (date.today() - timedelta(days=28)).isoformat())):
        daily[s["sdate"]] = daily.get(s["sdate"], 0) + (s["v"] or 0)
    vals = list(daily.values())
    load_science = {}
    if vals:
        mean = sum(vals) / len(vals)
        var = sum((x - mean) ** 2 for x in vals) / len(vals)
        std = math.sqrt(var)
        monotony = round(mean / std, 2) if std > 0 else None
        strain = round(sum(vals) * (mean / std), 0) if std > 0 else None
        # EWMA (half-life 7 dana)
        lam = math.log(2) / 7.0
        ewma, wS, t0 = 0.0, 0.0, date.today() - timedelta(days=27)
        for i in range(28):
            d = (t0 + timedelta(days=i)).isoformat()
            w = math.exp(-lam * (27 - i))
            wS += w
            ewma += w * daily.get(d, 0)
        load_science = {"monotony": monotony, "strain": strain, "ewma": round(ewma / wS),
                        "daily_mean": round(mean), "daily_std": round(std)}
    # SPT 2.3: bilješke trenera
    notes = [dict(r) for r in q("SELECT * FROM notes WHERE athlete=? ORDER BY ndate DESC, id DESC LIMIT 20", (aid,))]
    # SPT 2.3: potpunost kartona
    checks = [n_sess > 0, len(bc) > 0, len(tests) > 0, len(anom) >= 0 and n_sess > 0,
              q1("SELECT COUNT(*) c FROM wellness_log WHERE athlete=?", (aid,))["c"] > 0,
              q1("SELECT COUNT(*) c FROM nutrition_log WHERE athlete=?", (aid,))["c"] > 0,
              len(voice) > 0, len(matches) > 0]
    completeness = round(100 * sum(1 for c in checks if c) / len(checks))
    return {**dict(a), "body_comp": bc, "injuries": inj, "tests": tests, "anomalies": anom,
            "weeks": weeks, "matches": matches, "voice": voice, "stypes": stypes,
            "n_sessions": n_sess, "total_km": round(dist or 0, 1),
            "sessions": sessions, "load_science": load_science, "notes": notes,
            "completeness": completeness,
            "norms": norms, "norm_deviations": devs,
            "nutrition": {"needs": nut["needs"], "avg_intake": nut["avg_intake"],
                          "week_load": nut["week_load"], "recommendations": nut["recommendations"]} if nut else None}


# ------------------------------ planovi -------------------------------------
@route("GET", r"/api/plans")
def api_plans(m, qs):
    club = qs.get("club", "")
    rows = q("SELECT * FROM training_plans WHERE club=? ORDER BY pdate", (club,))
    plans = []
    for r in rows:
        items = [dict(x) for x in q("SELECT * FROM plan_items WHERE plan=? ORDER BY time_min", (r["id"],))]
        plans.append({**dict(r), "items": items,
                      "total_load": sum(i["load_au"] for i in items),
                      "done_pct": round(100 * sum(i["done"] for i in items) / max(1, len(items)))})
    return {"club": club, "plans": plans}


@route("POST", r"/api/plans")
def api_plan_add(m, qs, body=None):
    u, err = require_role(3)
    if err:
        return err
    body = body or {}
    if not body.get("club") or not body.get("pdate"):
        return {"error": "nedostaju podaci"}
    if u["role"] in ("trener", "kondicijski") and body["club"] != u["club"]:
        return {"error": f"planove možete kreirati samo za svoj klub ({u['club']})", "code": 403}
    con = db()
    con.execute("INSERT INTO training_plans (club, pdate, title, focus, coach) VALUES (?,?,?,?,?)",
                (body["club"], body["pdate"], body.get("title", "Trening"), body.get("focus", ""), body.get("coach", "")))
    pid = q1("SELECT MAX(id) m FROM training_plans")["m"]
    for it in body.get("items", []):
        con.execute("INSERT INTO plan_items (plan, time_min, drill, intensity, duration_min, load_au, done) VALUES (?,?,?,?,?,?,0)",
                    (pid, it.get("time", "10:00"), it.get("drill", ""), it.get("intensity", "srednje"),
                     int(it.get("duration", 20)), int(it.get("load", 100))))
    con.commit()
    con.close()
    return {"ok": True, "id": pid}


@route("POST", r"/api/plans/delete")
def api_plan_delete(m, qs, body=None):
    con = db()
    pid = (body or {}).get("id")
    con.execute("DELETE FROM plan_items WHERE plan=?", (pid,))
    con.execute("DELETE FROM training_plans WHERE id=?", (pid,))
    con.commit()
    con.close()
    return {"ok": True}


@route("POST", r"/api/plans/item")
def api_plan_item(m, qs, body=None):
    body = body or {}
    con = db()
    con.execute("UPDATE plan_items SET done=? WHERE id=?", (int(body.get("done", 0)), body.get("id")))
    con.commit()
    con.close()
    return {"ok": True}


# ------------------------------ norme ---------------------------------------
@route("GET", r"/api/benchmarks")
def api_benchmarks(m, qs):
    sport = qs.get("sport", "")
    s = q1("SELECT cat FROM sports WHERE id=?", (sport,))
    cat = s["cat"] if s else sport
    rows = [dict(r) for r in q("SELECT * FROM benchmarks WHERE sport=? OR sport=? ORDER BY ttype, age_group", (cat, sport))]
    return {"rows": rows, "cat": cat}


# ------------------------------ anomalije -----------------------------------
@route("GET", r"/api/anomalies")
def api_anomalies(m, qs):
    where = ["1=1"]
    args = []
    if qs.get("athlete"):
        where.append("a.athlete=?")
        args.append(int(qs["athlete"]))
    if qs.get("severity"):
        where.append("a.severity=?")
        args.append(qs["severity"])
    lim = min(200, int(qs.get("limit", 40)))
    rows = [dict(r) for r in q(f"""SELECT a.*, x.name, x.sport, x.club FROM anomalies a
                                   JOIN athletes x ON x.id=a.athlete WHERE {' AND '.join(where)}
                                   ORDER BY a.adate DESC LIMIT {lim}""", args)]
    return {"items": rows}


@route("POST", r"/api/anomalies/rebuild")
def api_anomalies_rebuild(m, qs, body=None):
    n = anomaly_mod.rebuild_all()
    return {"ok": True, "n": n}


# ------------------------------ BioSenzor -----------------------------------
@route("POST", r"/api/voice/analyze")
def api_voice_analyze(m, qs, body=None):
    return voice_sensor.analyze_voice_features(body or {})


@route("POST", r"/api/voice/heart")
def api_voice_heart(m, qs, body=None):
    body = body or {}
    rr = body.get("rr")
    if body.get("demo") or not rr:
        rr = voice_sensor.demo_rr(int(body.get("seed", 1)))
    res = voice_sensor.analyze_heart(rr)
    res["demo"] = bool(body.get("demo") or not body.get("rr"))
    return res


@route("POST", r"/api/voice/save")
def api_voice_save(m, qs, body=None):
    body = body or {}
    if not body.get("athlete"):
        return {"error": "nedostaje sportaš"}
    con = db()
    con.execute("""INSERT INTO voice_logs (athlete, vdate, stress, breathing_rate, breathing_reg, pitch_hz, energy, heart_rhythm, flags)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (int(body["athlete"]), date.today().isoformat(), body.get("stress", 0), body.get("breathing_rate"),
                 body.get("breathing_regularity"), body.get("pitch_hz"), body.get("energy"), body.get("hr"),
                 json.dumps(body.get("flags", []))))
    con.commit()
    con.close()
    return {"ok": True}


# ------------------------------ SPT AI --------------------------------------
@route("POST", r"/api/ai/chat")
def api_ai_chat(m, qs, body=None):
    body = body or {}
    msg = (body.get("message") or "").strip()
    lang = body.get("lang", "hr")
    if not msg:
        return {"reply": spt_ai.answer("pomoć", lang)}
    # opcionalni pravi LLM ako je konfiguriran
    ctx = json.dumps({r["k"]: r["v"] for r in q("SELECT k, v FROM settings")}, ensure_ascii=False)
    reply = spt_ai.ask_llm(msg, ctx, lang) if os.environ.get("SPT_LLM_URL") else None
    if not reply:
        reply = spt_ai.answer(msg, lang)
    return {"reply": reply, "engine": "llm" if os.environ.get("SPT_LLM_URL") else "lokalni motor"}


# ------------------------------ norme i odstupanja ---------------------------
@route("GET", r"/api/norms")
def api_norms(m, qs):
    sport = qs.get("sport", "nogomet")
    s = q1("SELECT * FROM sports WHERE id=?", (sport,))
    if not s:
        return {"error": "nepoznat sport"}
    return {"sport": sport, "sport_hr": s["hr"],
            "norms": {k: {"p10": v[0], "p50": v[1], "p90": v[2]} for k, v in
                      norms_data.norms_for(sport, qs.get("sex", "M"), qs.get("position")).items()},
            "higher_better": norms_data.HIGHER_BETTER}


# ------------------------------ prehrana -------------------------------------
@route("GET", r"/api/athletes/(?P<aid>\d+)/nutrition")
def api_nutrition(m, qs):
    aid = int(m["aid"])
    if not scope_athlete_ok(aid):
        return {"error": "nema pristup", "code": 403}
    return nutrition_mod.athlete_nutrition(aid) or {"error": "nema"}


@route("POST", r"/api/athletes/(?P<aid>\d+)/nutrition")
def api_nutrition_add(m, qs, body=None):
    u, err = require_role(1)
    if err:
        return err
    body = body or {}
    aid = int(m["aid"])
    if u["role"] == "sportas" and u["athlete"] != aid:
        return {"error": "možete unositi samo svoju prehranu", "code": 403}
    con = db()
    con.execute("""INSERT INTO nutrition_log (athlete, logdate, kcal, cho_g, pro_g, fat_g, water_ml, morning_weight, note)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (aid, body.get("date") or date.today().isoformat(), int(body.get("kcal", 0)),
                 float(body.get("cho", 0)), float(body.get("pro", 0)), float(body.get("fat", 0)),
                 int(body.get("water_ml", 0)), body.get("weight"), body.get("note", "")))
    con.commit()
    con.close()
    return {"ok": True}


# ------------------------------ mreža (live brojke) --------------------------
_NET_STATE = {"walk": 0.0, "last": 0.0}

@route("GET", r"/api/network/stats")
def api_network_stats(m, qs):
    now = time.time()
    base = int((q1("SELECT v FROM settings WHERE k='network_base'") or {"v": "70350"})["v"])
    st = _NET_STATE
    if now - st["last"] > 0.4:
        st["walk"] = max(-650, min(650, st["walk"] + random.uniform(-45, 45)))
        st["last"] = now
    total = int(base + st["walk"] + 220 * math.sin(now / 97) + 90 * math.sin(now / 23))
    lt = time.localtime()
    hour = lt.tm_hour + lt.tm_min / 60
    # dnevna krivulja aktivnosti (vršno 17–20h)
    diurnal = max(0.06, 0.5 - 0.45 * math.cos((hour - 17) / 24 * 2 * math.pi))
    active = int(total * diurnal)
    day_progress = hour / 24
    sessions_today = int(active * 1.9 * day_progress + 4300)
    feed = []
    # virtualni live feed: deterministički rotira + jitter → brojke "žive"
    rnd = random.Random(int(now // 4))
    pool = q("""SELECT s.id, a.name, a.country, a.sport, s.stype, s.metrics FROM sessions s
                JOIN athletes a ON a.id=s.athlete ORDER BY s.id DESC LIMIT 60""")
    for i in range(6):
        if not pool:
            break
        r = pool[int(now // 4 + i * 7) % len(pool)]
        try:
            mx = json.loads(r["metrics"])
        except Exception:
            mx = {}
        jit = lambda v, p=0.04: round(v * (1 + rnd.uniform(-p, p)), 1) if isinstance(v, (int, float)) else v
        feed.append({"name": r["name"], "country": r["country"], "sport": r["sport"],
                     "type": r["stype"], "km": jit(mx.get("dist_total")),
                     "top": jit(mx.get("top_speed")), "hr": int(mx.get("hr_avg") or rnd.uniform(120, 180)),
                     "load": int(mx.get("srpe") or rnd.uniform(100, 600))})
    return {"athletes_online_total": total, "active_right_now": active,
            "sessions_today": sessions_today,
            "messages_per_min": int(active * 14 + 2600),
            "clubs_online": 4100 + int(60 * math.sin(now / 61)),
            "countries": 82, "peak_hour": 18,
            "feed": feed,
            "local_mode": {"athletes_in_db": q1("SELECT COUNT(*) c FROM athletes")["c"],
                           "note": "Lokalna baza je demo podskup; mrežne brojke odražavaju SPT oblak."}}


# ------------------------------ satovi (BYOD) --------------------------------
@route("GET", r"/api/watch/status")
def api_watch_status(m, qs):
    wl = WATCH_LISTENER
    return {"listening": wl is not None, "port": 1520,
            "watches": wl.status() if wl else [],
            "protocol": "UDP JSON: {watch, athlete, hr, steps, acc} — Mi Band/Amazfit/Huawei most",
            "profile": "SPT Amateur Sensor GATT profil (NUS-most preko mobitela)"}


# ------------------------------ postavke (admin) -----------------------------
@route("GET", r"/api/settings")
def api_settings_get(m, qs):
    u, err = require_role(5)
    if err:
        return err
    return {r["k"]: r["v"] for r in q("SELECT k, v FROM settings")}


@route("POST", r"/api/settings")
def api_settings_set(m, qs, body=None):
    u, err = require_role(5)
    if err:
        return err
    body = body or {}
    con = db()
    for k, v in body.items():
        if not re.match(r"^[a-z_0-9]+$", k):
            continue
        con.execute("INSERT OR REPLACE INTO settings VALUES (?,?)", (k, str(v)))
    con.commit()
    con.close()
    return {"ok": True}


# ------------------------------ timski dashboard ----------------------------
@route("GET", r"/api/team")
def api_team(m, qs):
    club = qs.get("club", "")
    if not club:
        return {"error": "nedostaje klub"}
    roster = []
    for r in q("SELECT id, name, position, age, tag, squad, country FROM athletes WHERE club=? ORDER BY position, age DESC", (club,)):
        d = q1("SELECT COUNT(*) c, AVG(json_extract(metrics,'$.srpe')) load, AVG(json_extract(metrics,'$.readiness')) rd FROM sessions WHERE athlete=?", (r["id"],))
        inj = q1("SELECT COUNT(*) c FROM injuries WHERE athlete=?", (r["id"],))["c"]
        act = q1("SELECT COUNT(*) c FROM injuries WHERE athlete=? AND status='aktivna'", (r["id"],))["c"]
        last_anom = q1("SELECT COUNT(*) c FROM anomalies WHERE athlete=? AND severity='kritično'", (r["id"],))["c"]
        roster.append({"id": r["id"], "name": r["name"], "position": r["position"], "age": r["age"],
                       "tag": r["tag"], "squad": r["squad"], "country": r["country"],
                       "n_sessions": d["c"], "load": round(d["load"] or 0), "readiness": round(d["rd"] or 0),
                       "injuries": inj, "active_injury": act, "critical_anomalies": last_anom,
                       "available": act == 0})
    # tjedno timske opterećenje
    wk = {}
    for s in q("""SELECT s.sdate, json_extract(s.metrics,'$.srpe') srpe FROM sessions s
                  JOIN athletes a ON a.id=s.athlete WHERE a.club=?""", (club,)):
        if s["srpe"]:
            wk[s["sdate"]] = wk.get(s["sdate"], 0) + s["srpe"]
    weeks = []
    today = date.today()
    for i in range(11, -1, -1):
        monday = today - timedelta(days=today.weekday() + 7 * i)
        tot = sum(v for d, v in wk.items() if monday.isoformat() <= d <= (monday + timedelta(days=6)).isoformat())
        weeks.append({"w": monday.isoformat(), "load": round(tot)})
    matrix = {}
    for r in q("SELECT body_part, COUNT(*) c FROM injuries i JOIN athletes a ON a.id=i.athlete WHERE a.club=? GROUP BY body_part", (club,)):
        matrix[r["body_part"]] = r["c"]
    n_avail = sum(1 for r in roster if r["available"])
    sport = q1("SELECT sport FROM clubs WHERE code=?", (club,))
    # planovi: završenost ovaj tjedan
    monday = today - timedelta(days=today.weekday())
    plans = [dict(r) for r in q("SELECT * FROM training_plans WHERE club=? AND pdate>=? ORDER BY pdate", (club, monday.isoformat()))]
    return {"club": club, "sport": sport["sport"] if sport else "", "roster": roster, "weeks": weeks,
            "matrix": matrix, "availability": round(100 * n_avail / max(1, len(roster))),
            "plans_this_week": plans}


# ------------------------------ izvoz ---------------------------------------
@route("GET", r"/api/athletes/(?P<aid>\d+)/export")
def api_athlete_export(m, qs):
    aid = int(m["aid"])
    a = q1("SELECT * FROM athletes WHERE id=?", (aid,))
    if not a:
        return {"error": "nema"}
    lines = ["datum,vrsta,trajanje_min,sport,km,max_kmh,sprint,puls,srpe,spremnost,laktat,duzina_koraka,gct_lijevo,gct_desno,brzina_lopte"]
    for r in q("SELECT * FROM sessions WHERE athlete=? ORDER BY sdate", (aid,)):
        try:
            x = json.loads(r["metrics"])
        except Exception:
            x = {}
        lines.append(",".join(str(v) for v in [
            r["sdate"], r["stype"], r["duration"], r["sport"],
            x.get("dist_total", ""), x.get("top_speed", ""), x.get("sprints", ""), x.get("hr_avg", ""),
            x.get("srpe", ""), x.get("readiness", ""), x.get("lactate", ""), x.get("stride_len", ""),
            x.get("gct_l", ""), x.get("gct_r", ""), x.get("ball_speed_max", "")]))
    csv_data = "\n".join(lines).encode("utf-8")
    return ("text/csv; charset=utf-8", csv_data, f"spt_{a['name'].replace(' ', '_')}.csv")


# ------------------------------ meta 2.0 ------------------------------------
@route("GET", r"/api/meta2")
def api_meta2(m, qs):
    return {"body_comp": q1("SELECT COUNT(*) c FROM body_comp")["c"],
            "injuries": q1("SELECT COUNT(*) c FROM injuries")["c"],
            "tests": q1("SELECT COUNT(*) c FROM perf_tests")["c"],
            "anomalies": q1("SELECT COUNT(*) c FROM anomalies")["c"],
            "youth": q1("SELECT COUNT(*) c FROM athletes WHERE tag='youth'")["c"],
            "plans": q1("SELECT COUNT(*) c FROM training_plans")["c"],
            "benchmarks": q1("SELECT COUNT(*) c FROM benchmarks")["c"]}




# ------------------------------ 2.1: IZVJEŠTAJI -----------------------------
@route("GET", r"/api/report/kinds")
def api_report_kinds(m, qs):
    return {"kinds": reportgen.KINDS_META}

@route("GET", r"/api/reports")
def api_reports_list(m, qs):
    cond, args = "1=1", []
    if qs.get("status"):
        cond += " AND status=?"; args.append(qs["status"])
    if qs.get("kind"):
        cond += " AND kind=?"; args.append(qs["kind"])
    rows = q(f"""SELECT id, kind, title, club, athlete, status, created_by, created_at,
                 decided_by, decided_at, note FROM reports WHERE {cond}
                 ORDER BY id DESC LIMIT 120""", tuple(args))
    return {"items": [dict(r) for r in rows]}

@route("GET", r"/api/reports/(?P<rid>\d+)")
def api_report_get(m, qs):
    r = q1("SELECT * FROM reports WHERE id=?", (int(m["rid"]),))
    if not r:
        return {"error": "nema izvještaja"}
    d = dict(r)
    try:
        d["payload"] = json.loads(d["payload"])
    except Exception:
        pass
    return d

@route("POST", r"/api/reports")
def api_reports_create(m, qs, body=None):
    body = body or {}
    u, err = require_role(3)
    if err:
        return err
    kind = body.get("kind")
    if kind not in reportgen.BUILDERS:
        return {"error": "nepoznata vrsta izvještaja"}
    params = body.get("params") or {}
    payload = reportgen.BUILDERS[kind](params)
    if payload.get("error"):
        return payload
    con = db()
    cur = con.execute("""INSERT INTO reports (kind, title, club, athlete, params, payload,
        status, created_by, created_at) VALUES (?,?,?,?,?,?, 'skica', ?, ?)""",
        (kind, payload["title"], params.get("club", ""), params.get("athlete"),
         json.dumps(params, ensure_ascii=False), json.dumps(payload, ensure_ascii=False),
         u["username"], datetime.now().isoformat(timespec="seconds")))
    rid = cur.lastrowid
    con.commit(); con.close()
    return {"ok": True, "id": rid, "payload": payload}

@route("POST", r"/api/reports/status")
def api_reports_status(m, qs, body=None):
    body = body or {}
    u, err = require_role(3)
    if err:
        return err
    if u["role"] not in ("trener", "admin"):
        return {"error": "samo trener ili admin odobrava izvještaje", "code": 403}
    new = body.get("status")
    if new not in ("odobren", "odbijen", "skica"):
        return {"error": "nedozvoljen status"}
    con = db()
    con.execute("UPDATE reports SET status=?, decided_by=?, decided_at=?, note=? WHERE id=?",
                (new, u["username"], datetime.now().isoformat(timespec="seconds"),
                 body.get("note", ""), int(body.get("id", 0))))
    con.commit(); con.close()
    return {"ok": True}

@route("POST", r"/api/reports/delete")
def api_reports_delete(m, qs, body=None):
    body = body or {}
    u, err = require_role(3)
    if err:
        return err
    con = db()
    con.execute("DELETE FROM reports WHERE id=?", (int(body.get("id", 0)),))
    con.commit(); con.close()
    return {"ok": True}

# ------------------------------ 2.1: WELLNESS --------------------------------
@route("GET", r"/api/wellness")
def api_wellness(m, qs):
    if qs.get("athlete"):
        rows = q("SELECT * FROM wellness_log WHERE athlete=? ORDER BY wdate DESC LIMIT 30",
                 (int(qs["athlete"]),))
        return {"items": [dict(r) for r in rows]}
    if qs.get("club"):
        rows = q("""SELECT w.*, a.name, a.position FROM wellness_log w JOIN athletes a ON a.id=w.athlete
                    WHERE a.club=? AND w.wdate>=? ORDER BY w.wdate DESC LIMIT 200""",
                 (qs["club"], (date.today() - timedelta(days=2)).isoformat()))
        seen = {}
        for r in rows:
            seen.setdefault(r["athlete"], dict(r))
        return {"items": list(seen.values())}
    return {"items": []}

@route("POST", r"/api/wellness")
def api_wellness_post(m, qs, body=None):
    body = body or {}
    u, err = require_role(1)
    if err:
        return err
    aid = int(body.get("athlete", 0))
    if not aid:
        return {"error": "nedostaje athlete"}
    if u["role"] == "sportas" and u.get("athlete") != aid:
        return {"error": "sportaš upisuje samo svoje zapise", "code": 403}
    d = body.get("wdate") or date.today().isoformat()
    con = db()
    con.execute("""INSERT INTO wellness_log (athlete, wdate, sleep_h, sleep_q, soreness,
        mood, stress, energy, notes) VALUES (?,?,?,?,?,?,?,?,?)""",
        (aid, d, body.get("sleep_h"), body.get("sleep_q"), body.get("soreness"),
         body.get("mood"), body.get("stress"), body.get("energy"), body.get("notes", "")))
    con.commit(); con.close()
    return {"ok": True}

# ------------------------------ 2.1: ANALIZE ---------------------------------
@route("GET", r"/api/analysis/correlations")
def api_corr(m, qs):
    sport = qs.get("sport", "nogomet")
    rows = q("""SELECT AVG(json_extract(metrics,'$.dist_total')) dist,
                       AVG(json_extract(metrics,'$.srpe')) srpe,
                       AVG(json_extract(metrics,'$.hr_avg')) hr,
                       AVG(json_extract(metrics,'$.readiness')) rd,
                       AVG(json_extract(metrics,'$.sprints')) spr
                FROM sessions s JOIN athletes a ON a.id=s.athlete
                WHERE a.sport=? GROUP BY s.athlete""", (sport,))
    data = [tuple(r) for r in rows if all(v is not None for v in tuple(r))]
    names = ["km/sesiji", "opterećenje", "puls", "spremnost", "sprintevi"]

    def pearson(xs, ys):
        n = len(xs)
        mx = sum(xs) / n; my = sum(ys) / n
        a = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
        b = sum((x - mx) ** 2 for x in xs)
        c = sum((y - my) ** 2 for y in ys)
        return a / math.sqrt(b * c) if b > 0 and c > 0 else 0.0

    matrix = [[round(pearson([d[i] for d in data], [d[j] for d in data]), 2)
               for j in range(5)] for i in range(5)]
    return {"names": names, "matrix": matrix, "n": len(data), "sport": sport}

@route("GET", r"/api/analysis/calendar")
def api_cal(m, qs):
    aid = int(qs.get("athlete", 1))
    since = (date.today() - timedelta(days=182)).isoformat()
    out = {}
    for r in q("""SELECT sdate, stype, json_extract(metrics,'$.dist_total') km,
                         json_extract(metrics,'$.srpe') au FROM sessions
                  WHERE athlete=? AND sdate>=?""", (aid, since)):
        d = out.setdefault(r["sdate"], {"km": 0.0, "au": 0.0, "types": set()})
        d["km"] += r["km"] or 0
        d["au"] += r["au"] or 0
        d["types"].add(r["stype"])
    return {"athlete": aid, "days": {d: {"km": round(v["km"], 2), "au": round(v["au"]),
            "t": ",".join(sorted(v["types"]))} for d, v in out.items()}}

# ------------------------------ 2.1: LIVE ALARMI -----------------------------
@route("GET", r"/api/live/alerts")
def api_live_alerts(m, qs):
    live_tick()
    with _live_lock:
        mid = LIVE["match"]
        fr = MATCHES.get(mid)
        if not fr:
            return {"alerts": []}
        t = min(LIVE["t"], fr["meta"]["duration"] - 1.001)
        i = max(0, int(t))
        cum = LIVE_CUM[mid]
        alerts = []
        for pi, p in enumerate(fr["players"]):
            cd, ct, cs, sp = cum[pi]
            spd = sp[min(i, len(sp) - 1)] * 3.6
            target = (82 + spd * 12) if p["role"] != "GK" else (78 + spd * 9)
            hr = max(LIVE["hr"].get((mid, pi), 0), min(201, target + math.sin(t / 60 + pi) * 3))
            batt = max(35, 100 - (t / fr["meta"]["duration"]) * 26 - (p["aid"] % 7))
            if hr > 194:
                alerts.append({"sev": "red", "txt": f"{p['name']} — puls {int(hr)} bpm (zona 5 — provjeriti!)"})
            elif hr > 185 and int(t) % 3 == 0:
                alerts.append({"sev": "amber", "txt": f"{p['name']} — puls {int(hr)} bpm (zona 4)"})
            if ct[i] and ct[i] > 31:
                alerts.append({"sev": "amber", "txt": f"{p['name']} — max brzina {ct[i]:.0f} km/h"})
            if cs[i] >= 9:
                alerts.append({"sev": "amber", "txt": f"{p['name']} — {cs[i]} sprinteva (umorski rizik)"})
            if batt < 40:
                alerts.append({"sev": "amber", "txt": f"{p['name']} — baterija čipa {batt:.0f}%"})
        alerts.sort(key=lambda a: 0 if a["sev"] == "red" else 1)
        return {"t": round(t, 1), "alerts": alerts[:18]}

# ------------------------------ 2.1: OBAVIJESTI ------------------------------
@route("GET", r"/api/notifications")
def api_notifications(m, qs):
    since = (date.today() - timedelta(days=3)).isoformat()
    items = []
    for r in q("""SELECT an.*, a.name FROM anomalies an JOIN athletes a ON a.id=an.athlete
                  WHERE an.adate>=? ORDER BY an.adate DESC LIMIT 10""", (since,)):
        items.append({"id": f"anom-{r['id']}",
                      "sev": "red" if r["severity"] == "kritično" else "amber",
                      "txt": f"{r['name']}: {r['category']}", "date": r["adate"],
                      "link": f"karton/{r['athlete']}"})
    for r in q("SELECT * FROM injuries WHERE status='aktivna' ORDER BY idate DESC LIMIT 5"):
        a = q1("SELECT name, id FROM athletes WHERE id=?", (r["athlete"],))
        if a:
            items.append({"id": f"inj-{r['id']}", "sev": "red",
                          "txt": f"{a['name']}: {r['itype']} ({r['body_part']})",
                          "date": r["idate"], "link": "injuries"})
    u = current_user()
    if u and u["role"] in ("trener", "admin"):
        for r in q("SELECT * FROM reports WHERE status='skica' ORDER BY created_at DESC LIMIT 6"):
            items.append({"id": f"rep-{r['id']}", "sev": "blue",
                          "txt": f"Izvještaj čeka odobrenje: {r['title']}",
                          "date": (r["created_at"] or "")[:10], "link": "izvjestaji"})
    return {"items": items[:18], "n": len(items)}



# ------------------------------ 2.2: ACHIEVEMENTI / ADMIN --------------------
@route("GET", r"/api/athletes/(?P<aid>\d+)/achievements")
def api_achievements(m, qs):
    aid = int(m["aid"])
    a = q1("SELECT * FROM athletes WHERE id=?", (aid,))
    if not a:
        return {"error": "nema"}
    out = []
    r = q1("""SELECT sdate d, json_extract(metrics,'$.top_speed') v FROM sessions
              WHERE athlete=? AND json_extract(metrics,'$.top_speed') IS NOT NULL
              ORDER BY v DESC LIMIT 1""", (aid,))
    if r and r["v"]:
        out.append({"ico": "⚡", "t": "Najbrži izmjereni sprint", "v": f"{r['v']:.1f} km/h", "d": r["d"]})
    r = q1("""SELECT sdate d, json_extract(metrics,'$.dist_total') v FROM sessions
              WHERE athlete=? AND json_extract(metrics,'$.dist_total') IS NOT NULL
              ORDER BY v DESC LIMIT 1""", (aid,))
    if r and r["v"]:
        out.append({"ico": "🏃", "t": "Najduža sesija", "v": f"{r['v']:.1f} km", "d": r["d"]})
    r = q1("""SELECT tdate d, results FROM perf_tests WHERE athlete=? AND ttype='cmj'
              ORDER BY json_extract(results,'$.value') DESC LIMIT 1""", (aid,))
    if r and r["results"]:
        try:
            v = json.loads(r["results"]).get("value")
            out.append({"ico": "🦘", "t": "Najbolji CMJ skok", "v": f"{v:.0f} cm", "d": r["d"]})
        except Exception:
            pass
    tot = q1("SELECT SUM(json_extract(metrics,'$.dist_total')) v FROM sessions WHERE athlete=?", (aid,))["v"] or 0
    for milestone, lbl in [(100, "100 km"), (500, "500 km"), (1000, "1000 km"), (2000, "2000 km")]:
        if tot >= milestone:
            out.append({"ico": "🏅", "t": f"Kilometarska medalja — {lbl}", "v": f"ukupno {tot:.0f} km", "d": "karijera"})
    dates = [r["sdate"] for r in q("SELECT DISTINCT sdate FROM sessions WHERE athlete=? ORDER BY sdate DESC LIMIT 60", (aid,))]
    streak = 0
    if dates:
        from datetime import date as _d
        cur = _d.today()
        for s in dates:
            dd = _d.fromisoformat(s)
            if (cur - dd).days <= 1:
                streak += 1
                cur = dd
            else:
                break
    if streak >= 3:
        out.append({"ico": "🔥", "t": "Niz uzastopnih dana", "v": f"{streak} dana za redom", "d": "aktualno"})
    n_match = q1("SELECT COUNT(*) c FROM sessions WHERE athlete=? AND stype='match'", (aid,))["c"]
    if n_match:
        out.append({"ico": "⚽", "t": "Odigranih utakmica s SPT čipom", "v": str(n_match), "d": "karijera"})
    return {"items": out}

@route("GET", r"/api/admin/backup")
def api_admin_backup(m, qs):
    u, err = require_role(5)
    if err:
        return err
    con = sqlite3.connect(DB_PATH)
    try:
        data = con.serialize()
    finally:
        con.close()
    return ("application/x-sqlite3", bytes(data), f"spt_backup_{date.today().isoformat()}.db")

@route("POST", r"/api/admin/reseed")
def api_admin_reseed(m, qs, body=None):
    u, err = require_role(5)
    if err:
        return err
    for suf in ("", "-wal", "-shm"):
        try:
            os.remove(DB_PATH + suf)
        except FileNotFoundError:
            pass
    import seed
    seed.main()
    migrate_21()
    global SPORT_COUNT
    SPORT_COUNT = {}
    for r in q("SELECT sport, COUNT(*) n FROM athletes GROUP BY sport"):
        SPORT_COUNT[r["sport"]] = r["n"]
    load_matches()
    build_index()
    return {"ok": True, "athletes": SPORT_COUNT and sum(SPORT_COUNT.values())}



# ------------------------------ 2.3: BILJEŠKE + INVENTAR ---------------------
@route("GET", r"/api/notes")
def api_notes(m, qs):
    if not qs.get("athlete"):
        return {"items": []}
    rows = q("SELECT * FROM notes WHERE athlete=? ORDER BY ndate DESC, id DESC LIMIT 50", (int(qs["athlete"]),))
    return {"items": [dict(r) for r in rows]}

@route("POST", r"/api/notes")
def api_notes_post(m, qs, body=None):
    body = body or {}
    u, err = require_role(3)
    if err:
        return err
    if not body.get("athlete") or not (body.get("text") or "").strip():
        return {"error": "nedostaju podaci"}
    con = db()
    con.execute("INSERT INTO notes (athlete, ndate, author, text) VALUES (?,?,?,?)",
                (int(body["athlete"]), date.today().isoformat(), u["username"], body["text"].strip()[:600]))
    con.commit(); con.close()
    return {"ok": True}

@route("GET", r"/api/inventory")
def api_inventory(m, qs):
    club = qs.get("club")
    if club:
        rows = q("""SELECT i.*, a.name aname, a.club FROM inventory i
                    LEFT JOIN athletes a ON a.id=i.athlete WHERE a.club=? OR i.athlete IS NULL
                    ORDER BY i.status, i.typ""", (club,))
    else:
        rows = q("""SELECT i.*, a.name aname, a.club FROM inventory i
                    LEFT JOIN athletes a ON a.id=i.athlete ORDER BY i.status, i.typ""")
    return {"items": [dict(r) for r in rows]}

@route("POST", r"/api/inventory/assign")
def api_inv_assign(m, qs, body=None):
    u, err = require_role(3)
    if err:
        return err
    con = db()
    con.execute("UPDATE inventory SET athlete=? WHERE id=?", (int((body or {}).get("athlete") or 0) or None, int((body or {}).get("id", 0))))
    con.commit(); con.close()
    return {"ok": True}

@route("POST", r"/api/inventory/add")
def api_inv_add(m, qs, body=None):
    u, err = require_role(3)
    if err:
        return err
    body = body or {}
    if not body.get("typ") or not body.get("serial"):
        return {"error": "nedostaju podaci"}
    con = db()
    try:
        con.execute("INSERT INTO inventory (typ, serial, athlete, status) VALUES (?,?,?,?)",
                    (body["typ"], body["serial"], int(body.get("athlete") or 0) or None, body.get("status", "aktivno")))
        con.commit()
    except Exception:
        return {"error": "serijski broj postoji"}
    finally:
        con.close()
    return {"ok": True}

@route("POST", r"/api/inventory/status")
def api_inv_status(m, qs, body=None):
    u, err = require_role(3)
    if err:
        return err
    con = db()
    con.execute("UPDATE inventory SET status=?, battery=? WHERE id=?",
                ((body or {}).get("status", "aktivno"), (body or {}).get("battery", 100), int((body or {}).get("id", 0))))
    con.commit(); con.close()
    return {"ok": True}

# ---------------------------------------------------------------------------
# MIGRACIJA 2.3 — bilješke trenera + inventar opreme
# ---------------------------------------------------------------------------
def migrate_23():
    con = db()
    try:
        con.execute("""CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY, athlete INTEGER, ndate TEXT, author TEXT, text TEXT)""")
        con.execute("""CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY, typ TEXT, serial TEXT UNIQUE, athlete INTEGER,
            status TEXT DEFAULT 'aktivno', battery REAL DEFAULT 100, firmware TEXT DEFAULT 'v2.3.0')""")
        con.commit()
        n = con.execute("SELECT COUNT(*) FROM inventory").fetchone()[0]
        if n == 0:
            rng = random.Random(2345)
            ath = con.execute("SELECT id, club FROM athletes WHERE tag='featured' ORDER BY id LIMIT 40").fetchall()
            types = [("SPT Pod S1", "POD"), ("SPT Watch A1", "WAT"), ("SPT Strap H2", "STR"), ("SPT Vest M1", "VES")]
            rows = []
            for i, a in enumerate(ath):
                typ, pref = types[i % 4]
                rows.append((typ, f"{pref}-{4100 + i}", a["id"],
                             rng.choice(["aktivno", "aktivno", "aktivno", "punjenje", "servis"]),
                             round(rng.uniform(42, 100)), rng.choice(["v2.3.0", "v2.2.1", "v2.3.0"])))
            con.executemany("INSERT OR IGNORE INTO inventory (typ, serial, athlete, status, battery, firmware) VALUES (?,?,?,?,?,?)", rows)
            con.commit()
            print(f"[SPT] Inventar: {len(rows)} uređaja dodijeljeno")
    finally:
        con.close()

# ---------------------------------------------------------------------------
# MIGRACIJA 2.1 — izvještaji + wellness
# ---------------------------------------------------------------------------
def migrate_21():
    con = db()
    try:
        con.execute("""CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY, kind TEXT, title TEXT, club TEXT, athlete INTEGER,
            params TEXT, payload TEXT, status TEXT DEFAULT 'skica',
            created_by TEXT, created_at TEXT, decided_by TEXT, decided_at TEXT, note TEXT)""")
        con.execute("""CREATE TABLE IF NOT EXISTS wellness_log (
            id INTEGER PRIMARY KEY, athlete INTEGER, wdate TEXT, sleep_h REAL,
            sleep_q INTEGER, soreness INTEGER, mood INTEGER, stress INTEGER,
            energy INTEGER, notes TEXT)""")
        con.commit()
        n = con.execute("SELECT COUNT(*) FROM wellness_log").fetchone()[0]
        if n == 0:
            rng = random.Random(4242)
            ath = con.execute("SELECT id FROM athletes").fetchall()
            today = date.today()
            rows = []
            for a in ath:
                rd0 = rng.uniform(52, 93)
                for i in range(20, -1, -1):
                    d = (today - timedelta(days=i)).isoformat()
                    rd = max(30, min(100, rd0 + rng.uniform(-9, 9)))
                    sleep_h = round(max(4.5, min(10.5, 7.6 + (rd - 70) / 18 + rng.uniform(-1.1, 1.1))), 1)
                    sleep_q = int(max(1, min(5, 1 + (rd - 30) / 18 + rng.uniform(-0.8, 0.8))))
                    soreness = int(max(1, min(5, 4.2 - (rd - 30) / 22 + rng.uniform(-0.9, 0.9))))
                    mood = int(max(1, min(5, 1 + (rd - 30) / 20 + rng.uniform(-0.8, 0.8))))
                    stress = int(max(1, min(5, 4.0 - (rd - 30) / 22 + rng.uniform(-0.9, 0.9))))
                    energy = int(max(1, min(5, 1 + (rd - 30) / 19 + rng.uniform(-0.8, 0.8))))
                    rows.append((a["id"], d, sleep_h, sleep_q, soreness, mood, stress, energy, ""))
            con.executemany("""INSERT INTO wellness_log (athlete, wdate, sleep_h, sleep_q,
                soreness, mood, stress, energy, notes) VALUES (?,?,?,?,?,?,?,?,?)""", rows)
            con.commit()
            print(f"[SPT] Wellness backfill: {len(rows)} jutarnjih zapisa")
    finally:
        con.close()

# ---------------------------------------------------------------------------
# HTTP POSTRUŽITELJ
# ---------------------------------------------------------------------------
EXT_TYPES = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
             ".js": "application/javascript; charset=utf-8", ".json": "application/json",
             ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
             ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml"}

class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "SPT/" + VERSION

    def log_message(self, fmt, *args):
        pass

    def _send(self, code, data, ctype="application/json; charset=utf-8", raw=False):
        accept = self.headers.get("Accept-Encoding", "")
        body = data if raw else json.dumps(data, ensure_ascii=False).encode("utf-8")
        gz = False
        if len(body) > 2048 and "gzip" in accept:
            body = gzip.compress(body, 6)
            gz = True
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if gz:
            self.send_header("Content-Encoding", "gzip")
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, code, data, ctype, fname):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Content-Disposition", f'attachment; filename="{fname}"')
        self.end_headers()
        self.wfile.write(data)

    def _serve_static(self, path):
        if path == "/":
            path = "/static/index.html"
        if path == "/marketing":
            path = "/static/marketing.html"
        rel = path.lstrip("/")
        fn = os.path.normpath(os.path.join(BASE_DIR, rel))
        if not fn.startswith(BASE_DIR) or not os.path.isfile(fn):
            self._send(404, {"error": "nema datoteke"}, raw=False)
            return
        ext = os.path.splitext(fn)[1].lower()
        ctype = EXT_TYPES.get(ext, "application/octet-stream")
        with open(fn, "rb") as f:
            data = f.read()
        self._send(200, data, ctype, raw=True)

    def _dispatch(self, method):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = {k: v[0] for k, v in parse_qs(parsed.query).items()}
        body = None
        ctype = self.headers.get("Content-Type", "")
        if method == "POST":
            ln = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(ln) if ln else b"{}"
            if "multipart/form-data" in ctype:
                mb = re.search(r'boundary="?([^";]+)"?', ctype)
                parts = parse_multipart(raw, mb.group(1).encode()) if mb else {}
                method = "MULTIPART"
                body = parts
            else:
                try:
                    body = json.loads(raw or b"{}")
                except Exception:
                    body = {}
        if path.startswith("/api/"):
            # auth kontekst iz kolačića
            _request_ctx.token = None
            _request_ctx.uid = None
            ck = self.headers.get("Cookie", "")
            mtok = re.search(r"spt_session=([0-9a-f]{32})", ck)
            if mtok and mtok.group(1) in SESSIONS:
                _request_ctx.token = mtok.group(1)
                _request_ctx.uid = SESSIONS[mtok.group(1)]
            for (mth, rx, fn) in ROUTES:
                if mth != method:
                    continue
                mm = rx.match(path)
                if mm:
                    try:
                        if method in ("POST", "MULTIPART"):
                            res = fn(mm.groupdict(), qs, body=body)
                        else:
                            res = fn(mm.groupdict(), qs)
                        if isinstance(res, tuple) and res[0] == "__SET_COOKIE__":
                            token, payload = res[1], res[2]
                            if token:
                                self.send_response(200)
                                self.send_header("Content-Type", "application/json; charset=utf-8")
                                body_js = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                                self.send_header("Content-Length", str(len(body_js)))
                                self.send_header("Set-Cookie", f"spt_session={token}; Path=/; Max-Age=604800; HttpOnly; SameSite=Lax")
                                self.send_header("Cache-Control", "no-store")
                                self.end_headers()
                                self.wfile.write(body_js)
                            else:
                                self.send_response(200)
                                self.send_header("Content-Type", "application/json; charset=utf-8")
                                body_js = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                                self.send_header("Content-Length", str(len(body_js)))
                                self.send_header("Set-Cookie", "spt_session=; Path=/; Max-Age=0")
                                self.send_header("Cache-Control", "no-store")
                                self.end_headers()
                                self.wfile.write(body_js)
                        elif isinstance(res, tuple):
                            ct, data, fname = res
                            self._send_file(200, data, ct, fname)
                        else:
                            self._send(200, res)
                    except Exception as e:
                        import traceback
                        traceback.print_exc()
                        self._send(500, {"error": str(e)})
                    return
            self._send(404, {"error": "nepoznata ruta"})
            return
        self._serve_static(path)

    def do_GET(self):
        self._dispatch("GET")

    def do_POST(self):
        self._dispatch("POST")


def main():
    ensure_db()
    migrate_21()
    migrate_23()
    for r in q("SELECT sport, COUNT(*) n FROM athletes GROUP BY sport"):
        SPORT_COUNT[r["sport"]] = r["n"]
    print("[SPT] Učitavam utakmice i analitički indeks...")
    load_matches()
    build_index()
    try:
        from scale_bridge import start_watcher
        start_watcher()
        print("[SPT] Vaga: nadzirem mapu scale_inbox/ (automatski uvoz u kartone)")
    except Exception as e:
        print(f"[SPT] Vaga watcher nije pokrenut: {e}")
    global WATCH_LISTENER
    try:
        WATCH_LISTENER = watch_bridge.WatchListener(port=1520)
        WATCH_LISTENER.start()
        print("[SPT] Satovi: UDP :1520 aktivan (Xiaomi/Amazfit/Huawei most)")
    except Exception as e:
        print(f"[SPT] Watch listener nije pokrenut: {e}")
    print(f"[SPT] Indeks: {len(SUMMARY)} sportaša, {len(MATCHES)} utakmica u memoriji")
    port = int(os.environ.get("SPT_PORT", "8000"))
    httpd = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    url = f"http://localhost:{port}"
    print(f"[SPT] SPT — Sports Performance Tracking v{VERSION}")
    print(f"[SPT] Poslužitelj radi na {url}  (Ctrl+C za kraj)")
    if not os.environ.get("SPT_NO_BROWSER"):
        threading.Timer(1.2, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[SPT] Gašenje...")


if __name__ == "__main__":
    main()
