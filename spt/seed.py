# -*- coding: utf-8 -*-
"""SPT – generiranje baze: 1200+ sportaša iz cijelog svijeta, klubovi pod šiframa,
sesije s mjerenjima, i dvije potpune utakmice s pozicijskim okvirima."""
import gzip
import json
import math
import os
import random
import sqlite3
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data_catalog import (SPORTS_RAW, COUNTRIES, NAME_POOLS, FLAG, COMMON_METRICS,
                          TECH_METRICS, DEVICES, METRIC_GROUPS, build_sports)
import matchesim

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "spt.db")
SEED = 42
BASE = date.today()

LEVELS = ["Elitna liga", "Profesionalna liga", "Razvojna akademija", "Amaterska liga", "Olimpijski program"]
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

# sport -> (visina_m, težina_kg, muški) prosjeci
BODY = {
    "nogomet": (182, 77), "kosarka": (198, 93), "rukomet": (189, 89), "odbojka": (193, 83),
    "vaterpolo": (191, 92), "plivanje": (184, 78), "tenis": (185, 79), "stolni_tenis": (177, 70),
    "badminton": (178, 71), "squash": (179, 73), "padel": (180, 75), "futsal": (177, 73),
    "hokej_led": (185, 88), "hokej_trava": (177, 72), "unihokej": (181, 78), "ragbi": (186, 96),
    "ragbi_liga": (185, 94), "americki_nogomet": (188, 104), "australski_nogomet": (187, 88),
    "kriket": (180, 79), "bejzbol": (185, 88), "softbol": (175, 74), "lacrosse": (182, 82),
    "atletika_sprint": (181, 77), "atletika_srednje": (178, 64), "atletika_duge": (170, 57),
    "maraton": (171, 59), "atletika_skokovi": (184, 75), "atletika_bacanja": (190, 105),
    "atletika_viseboj": (188, 87), "biciklizam_cesta": (180, 70), "biciklizam_mt": (177, 68),
    "biciklizam_pista": (182, 78), "bmx": (175, 70), "triatlon": (180, 71), "veslanje": (192, 90),
    "kajak_kanu": (184, 84), "kajak_slalom": (178, 74), "jedrenje": (180, 76), "surfing": (178, 72),
    "windsurf": (180, 75), "kitesurf": (178, 72), "skijanje_alpsko": (183, 85), "skijanje_nordijsko": (180, 72),
    "skijaski_skokovi": (178, 58), "biatlon": (181, 74), "snowboard": (177, 71), "brzo_klizanje": (182, 78),
    "umjetnicko_klizanje": (168, 56), "curling": (178, 78), "bob": (186, 95), "gimnastika": (167, 62),
    "ritmicka_gimnastika": (170, 52), "dizanje_utega": (172, 85), "powerlifting": (178, 95),
    "crossfit": (179, 82), "boks": (177, 70), "hrvanje": (176, 82), "judo": (178, 80),
    "taekwondo": (177, 69), "karate": (175, 70), "mma": (178, 77), "kickboxing": (179, 74),
    "macevanje": (180, 75), "strelicarstvo": (176, 74), "streljastvo": (175, 73), "golf": (181, 80),
    "penjanje": (174, 66), "orijentiring": (178, 68), "moderni_pentatlon": (183, 79),
    "konjicki": (173, 65), "automobilizam": (176, 70), "karting": (170, 60), "motociklizam": (174, 68),
    "kuglanje": (180, 84),
}
# udio žena po sportu (0–1)
FEMALE_RATIO = {"nogomet": 0.10, "kosarka": 0.28, "rukomet": 0.30, "odbojka": 0.52, "vaterpolo": 0.10,
                "plivanje": 0.45, "tenis": 0.40, "stolni_tenis": 0.35, "badminton": 0.40, "squash": 0.25,
                "padel": 0.25, "futsal": 0.10, "hokej_led": 0.08, "hokej_trava": 0.42, "unihokej": 0.35,
                "ragbi": 0.10, "ragbi_liga": 0.06, "americki_nogomet": 0.03, "australski_nogomet": 0.15,
                "kriket": 0.15, "bejzbol": 0.05, "softbol": 0.60, "lacrosse": 0.40, "atletika_sprint": 0.45,
                "atletika_srednje": 0.45, "atletika_duge": 0.40, "maraton": 0.40, "atletika_skokovi": 0.50,
                "atletika_bacanja": 0.50, "atletika_viseboj": 0.50, "biciklizam_cesta": 0.15, "biciklizam_mt": 0.25,
                "biciklizam_pista": 0.35, "bmx": 0.20, "triatlon": 0.30, "veslanje": 0.40, "kajak_kanu": 0.35,
                "kajak_slalom": 0.30, "jedrenje": 0.30, "surfing": 0.25, "windsurf": 0.25, "kitesurf": 0.25,
                "skijanje_alpsko": 0.40, "skijanje_nordijsko": 0.45, "skijaski_skokovi": 0.10, "biatlon": 0.40,
                "snowboard": 0.35, "brzo_klizanje": 0.45, "umjetnicko_klizanje": 0.65, "curling": 0.40,
                "bob": 0.25, "gimnastika": 0.55, "ritmicka_gimnastika": 0.95, "dizanje_utega": 0.40,
                "powerlifting": 0.35, "crossfit": 0.45, "boks": 0.20, "hrvanje": 0.25, "judo": 0.35,
                "taekwondo": 0.35, "karate": 0.40, "mma": 0.10, "kickboxing": 0.20, "macevanje": 0.40,
                "strelicarstvo": 0.50, "streljastvo": 0.35, "golf": 0.30, "penjanje": 0.40,
                "orijentiring": 0.45, "moderni_pentatlon": 0.40, "konjicki": 0.70, "automobilizam": 0.05,
                "karting": 0.10, "motociklizam": 0.05, "kuglanje": 0.45}


def make_code(rnd):
    return "KLB-" + "".join(rnd.choice(CODE_ALPHABET) for _ in range(4))


def gen_name(rnd, region, female):
    male, female_names, last = NAME_POOLS[region]
    first = rnd.choice(female_names if female else male)
    return f"{first} {rnd.choice(last)}"


def gen_metrics(rnd, sport, stype, skill, duration, prof):
    """Generira realističan skup mjerenja za jednu sesiju."""
    m = {}
    motor = sport["cat"] == "motor"
    t_mult = {"match": 1.0, "training": rnd.uniform(0.55, 0.95), "gym": 0.12, "recovery": 0.15}[stype]
    dist = prof["dist_match"] * t_mult * skill * rnd.uniform(0.82, 1.18) if not motor else rnd.uniform(0.2, 1.2)
    if stype == "recovery":
        dist = rnd.uniform(1.5, 4.5)
    top = prof["top"] * (rnd.uniform(0.88, 1.05) + 0.10 * (skill - 1)) if not motor else prof["top"] * rnd.uniform(0.85, 1.1)
    if stype in ("gym", "recovery"):
        top = prof["top"] * rnd.uniform(0.35, 0.6)
    # zone (zbroj = dist)
    z = [rnd.uniform(0.18, 0.26), rnd.uniform(0.30, 0.38), rnd.uniform(0.20, 0.26), rnd.uniform(0.10, 0.16), rnd.uniform(0.04, 0.10)]
    s = sum(z)
    for i in range(5):
        m[f"dist_z{i+1}"] = round(dist * z[i] / s, 2)
    m["dist_total"] = round(dist, 2)
    m["top_speed"] = round(top, 1)
    active = duration * rnd.uniform(0.82, 0.95)
    m["avg_speed"] = round(dist * 1000 / max(active * 60, 1) * 3.6, 1)
    m["sprints"] = int(prof["sprints"] * t_mult * skill * rnd.uniform(0.6, 1.4)) if stype in ("match", "training") else 0
    m["sprint_dist"] = int(m["sprints"] * rnd.uniform(14, 26))
    m["acc_count"] = int(m["sprints"] * rnd.uniform(1.6, 2.4)) + int(rnd.uniform(10, 40) * t_mult)
    m["dec_count"] = int(m["acc_count"] * rnd.uniform(0.85, 1.1))
    m["cod_count"] = int(m["sprints"] * rnd.uniform(0.9, 1.5)) + int(rnd.uniform(5, 25) * t_mult)
    m["steps"] = int(dist * 1000 * rnd.uniform(1.15, 1.45)) if not motor else 0
    # kardio
    base_hr = prof["hr"]
    if stype == "recovery":
        base_hr *= 0.72
    if stype == "gym":
        base_hr *= 0.88
    m["hr_avg"] = int(base_hr * rnd.uniform(0.95, 1.05))
    m["hr_max"] = int(min(204, m["hr_avg"] + rnd.uniform(18, 34)))
    zone_min = duration * rnd.uniform(0.75, 0.92)
    m["hr_z3_time"] = round(zone_min * rnd.uniform(0.22, 0.32), 1)
    m["hr_z4_time"] = round(zone_min * rnd.uniform(0.12, 0.24), 1)
    m["hr_z5_time"] = round(zone_min * (rnd.uniform(0.02, 0.12) if stype != "recovery" else rnd.uniform(0, 0.02)), 1)
    m["hrv_rmssd"] = round(max(18, rnd.uniform(52, 98) - (6 if stype == "match" else 0) + rnd.uniform(-10, 10)), 1)
    m["hr_rec60"] = int(rnd.uniform(18, 46) * (1 if stype != "recovery" else 0.7))
    m["kcal"] = int(duration * rnd.uniform(7.5, 12.5) * (1 if not motor else 0.3))
    m["trimp"] = int(duration * rnd.uniform(0.9, 1.6) * (m["hr_avg"] / 150.0) ** 2)
    # opterećenje
    rpe = {"match": rnd.uniform(6.5, 9), "training": rnd.uniform(4, 7), "gym": rnd.uniform(4.5, 7.5), "recovery": rnd.uniform(1.5, 3)}[stype]
    m["srpe"] = int(duration * rpe)
    m["playerload"] = int(dist * 1000 * rnd.uniform(0.9, 1.3) + m["sprints"] * rnd.uniform(6, 11))
    m["readiness"] = int(rnd.uniform(58, 97))
    m["sleep_h"] = round(rnd.uniform(5.6, 9.2), 1)
    m["sleep_score"] = int(rnd.uniform(52, 97))
    m["soreness"] = round(rnd.uniform(1, 5.5), 1)
    m["mood"] = round(rnd.uniform(5, 9.5), 1)
    m["monotony"] = round(rnd.uniform(1.2, 2.6), 2)
    # neuromuskularni (samo dvoranski/skup sportovi)
    if prof["jumps"] > 0 and stype in ("match", "training"):
        m["jumps"] = int(prof["jumps"] * t_mult * rnd.uniform(0.6, 1.4))
        m["jump_height_max"] = round(rnd.uniform(48, 78) * (1 if not motor else 0.5) + (2 if skill > 1.05 else 0), 1)
        m["jump_height_avg"] = round(m["jump_height_max"] * rnd.uniform(0.55, 0.7), 1)
        m["landing_gct"] = int(rnd.uniform(180, 320))
        m["asym_lr"] = round(rnd.uniform(2, 12), 1)
        m["rsi"] = round(rnd.uniform(1.2, 2.8), 2)
    if sport["id"] in ("atletika_sprint", "maraton", "atletika_duge", "atletika_srednje", "orijentiring", "triatlon"):
        m["gct_run"] = int(rnd.uniform(150, 230))
        m["vo_run"] = round(rnd.uniform(65, 105), 1)
    # ---- SPT 2.0 napredne metrike ----
    # mliječna kiselina (laktat) — uzorkovanje prstom pri intervalnim sesijama
    if stype in ("match", "training") and rnd.random() < 0.55:
        base_l = 1.1 if stype == "training" else 1.6
        m["lactate"] = round(max(0.8, rnd.gauss(base_l + (2.2 if sport["cat"] in ("endurance", "field") else 1.2), 1.4)), 1)
    # dužina koraka + vrijeme kontakta stopala (IMU/Garmin running dynamics)
    if sport["cat"] in ("endurance", "field", "individual") and stype in ("match", "training"):
        m["stride_len"] = round(rnd.uniform(0.95, 1.45), 2)   # m
        m["cadence"] = int(rnd.uniform(158, 188))             # koraka/min
        m["gct_l"] = int(rnd.uniform(150, 235))               # ms lijevo
        m["gct_r"] = int(rnd.uniform(150, 235))               # ms desno
        m["gct_asym"] = round(abs(m["gct_l"] - m["gct_r"]) / ((m["gct_l"] + m["gct_r"]) / 2) * 100, 1)  # %
        m["flight_ratio"] = round(rnd.uniform(0.22, 0.38), 2) # omjer faza leta
    # brzina lopte (radar/pametna lopta) za sportove s loptom
    if sport["id"] in ("nogomet", "rukomet", "vaterpolo", "futsal", "hokej_led", "hokej_trava", "tenis", "golf", "odbojka", "bejzbol") and stype in ("match", "training"):
        m["ball_speed_max"] = round(rnd.uniform(60, 128), 1)  # km/h
    # disanje i znojenje (fiziološki senzori)
    if stype in ("match", "training"):
        m["breathing_rate"] = int(rnd.uniform(32, 55))
        m["sweat_rate"] = round(rnd.uniform(0.6, 2.4), 2)     # L/h
    # okoliš
    m["temp"] = round(rnd.uniform(4, 32), 1)
    m["humidity"] = int(rnd.uniform(35, 92))
    m["altitude"] = int(rnd.choice([rnd.uniform(0, 200), rnd.uniform(200, 700), rnd.uniform(700, 2300)]))
    # tehnički
    if sport["tech"] and stype in ("match", "training"):
        for (tid, name, unit, mean, sd) in sport["tech"]:
            if stype == "training":
                mean *= rnd.uniform(0.6, 0.95)
            val = rnd.gauss(mean * (0.85 + 0.15 * skill * 2 - 0.15), sd)
            val = max(0.0, val)
            if unit in ("br.",) or "br." == unit:
                m[tid] = int(round(val))
            elif unit == "%":
                m[tid] = round(min(99.0, val), 1)
            elif unit in ("km/h", "m/s"):
                m[tid] = round(val, 1)
            elif unit in ("m", "yd"):
                m[tid] = round(val, 1)
            else:
                m[tid] = round(val, 2)
    return m


def match_report(frames):
    """Iz okvira računa lokomotorni izvještaj po igraču + timski agregati."""
    rep = {"players": [], "teams": [{"dist": 0, "sprints": 0}, {"dist": 0, "sprints": 0}]}
    sport = frames["meta"].get("sport", "nogomet")
    spr_thr = 5.2 if sport == "kosarka" else 7.0
    spr_off = 4.6 if sport == "kosarka" else 6.5
    for i, p in enumerate(frames["players"]):
        xs, ys = p["x"], p["y"]
        dist = 0.0
        top = 0.0
        speeds = []
        prev = None
        sprinting = False
        sprints = acc = dec = 0
        prev_sp = 0.0
        for j in range(len(xs)):
            if prev is not None:
                d = math.hypot(xs[j] - prev[0], ys[j] - prev[1])
                dist += d
                sp = d  # m/s pri 1 Hz
                speeds.append(sp)
                top = max(top, sp)
                if sp > spr_thr and not sprinting:
                    sprinting = True
                    sprints += 1
                if sp <= spr_off:
                    sprinting = False
                if j > 1:
                    if sp - prev_sp > 3:
                        acc += 1
                    elif prev_sp - sp > 3:
                        dec += 1
                prev_sp = sp
            prev = (xs[j], ys[j])
        tech = frames["tech"].get(str(i), {})
        entry = {
            "aid": p["aid"], "name": p["name"], "num": p["num"], "team": p["team"], "role": p["role"],
            "dist": round(dist / 1000, 2), "top_speed": round(top * 3.6, 1),
            "sprints": sprints, "acc": acc, "dec": dec,
            "load": int(dist / 1000 * 90 + sprints * 9 + acc * 3),
            "hr_avg": int(150 + top * 2.2 + (2 if p["role"] in ("LW", "RW", "ST") else 0)),
            "tech": tech,
        }
        rep["players"].append(entry)
        rep["teams"][p["team"]]["dist"] += entry["dist"]
        rep["teams"][p["team"]]["sprints"] += sprints
    for t in rep["teams"]:
        t["dist"] = round(t["dist"], 1)
    if "poss" in frames:
        pt = frames["poss"]
        tot = pt[0] + pt[1]
        rep["possession"] = [round(100 * pt[0] / tot, 1), round(100 * pt[1] / tot, 1)]
    return rep


def main():
    rnd = random.Random(SEED)
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.executescript("""
    CREATE TABLE sports (id TEXT PRIMARY KEY, hr TEXT, en TEXT, cat TEXT, nteam INTEGER,
        field TEXT, positions TEXT, hot TEXT, modes TEXT, weight INTEGER, prof TEXT);
    CREATE TABLE metrics (id TEXT PRIMARY KEY, grp TEXT, hr TEXT, unit TEXT, descr TEXT, hib INTEGER);
    CREATE TABLE devices (id TEXT PRIMARY KEY, name TEXT, vendor TEXT, typ TEXT, freq TEXT,
        acc TEXT, indoor INTEGER, outdoor TEXT, descr TEXT);
    CREATE TABLE clubs (code TEXT PRIMARY KEY, country TEXT, level TEXT, sport TEXT);
    CREATE TABLE athletes (id INTEGER PRIMARY KEY, name TEXT, sex TEXT, country TEXT, age INTEGER,
        sport TEXT, position TEXT, club TEXT, height INTEGER, weight INTEGER, joined TEXT, tag TEXT,
        squad TEXT, dominance TEXT);
    CREATE TABLE sessions (id INTEGER PRIMARY KEY, athlete INTEGER, sdate TEXT, stype TEXT,
        sport TEXT, duration INTEGER, metrics TEXT);
    CREATE TABLE body_comp (id INTEGER PRIMARY KEY, athlete INTEGER, bdate TEXT, source TEXT,
        height_cm REAL, weight REAL, bmi REAL, fat REAL, muscle REAL, water REAL,
        visceral REAL, bone REAL, protein REAL, bmr INTEGER, metabolic_age INTEGER);
    CREATE TABLE injuries (id INTEGER PRIMARY KEY, athlete INTEGER, idate TEXT, itype TEXT,
        body_part TEXT, severity TEXT, cause TEXT, days_out INTEGER, return_date TEXT,
        status TEXT, notes TEXT);
    CREATE TABLE training_plans (id INTEGER PRIMARY KEY, club TEXT, pdate TEXT, title TEXT, focus TEXT, coach TEXT);
    CREATE TABLE plan_items (id INTEGER PRIMARY KEY, plan INTEGER, time_min TEXT, drill TEXT,
        intensity TEXT, duration_min INTEGER, load_au INTEGER, done INTEGER);
    CREATE TABLE perf_tests (id INTEGER PRIMARY KEY, athlete INTEGER, tdate TEXT, ttype TEXT,
        sport TEXT, results TEXT);
    CREATE TABLE benchmarks (sport TEXT, age_group TEXT, ttype TEXT, unit TEXT, p10 REAL, p50 REAL, p90 REAL);
    CREATE TABLE anomalies (id INTEGER PRIMARY KEY, athlete INTEGER, adate TEXT, category TEXT,
        metric TEXT, value REAL, expected REAL, z REAL, severity TEXT, msg TEXT);
    CREATE TABLE voice_logs (id INTEGER PRIMARY KEY, athlete INTEGER, vdate TEXT, stress REAL,
        breathing_rate REAL, breathing_reg REAL, pitch_hz REAL, energy REAL, heart_rhythm REAL, flags TEXT);
    CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, pin TEXT, role TEXT,
        club TEXT, athlete INTEGER, name TEXT, lang TEXT);
    CREATE TABLE nutrition_log (id INTEGER PRIMARY KEY, athlete INTEGER, logdate TEXT,
        kcal INTEGER, cho_g REAL, pro_g REAL, fat_g REAL, water_ml INTEGER, morning_weight REAL, note TEXT);
    CREATE TABLE matches (id TEXT PRIMARY KEY, sport TEXT, mdate TEXT, home TEXT, away TEXT,
        score TEXT, venue TEXT, mode TEXT, frames BLOB, report TEXT, events TEXT, meta TEXT);
    CREATE TABLE match_players (mid TEXT, aid INTEGER, team INTEGER, num INTEGER, role TEXT);
    CREATE TABLE settings (k TEXT PRIMARY KEY, v TEXT);
    """)

    sports = build_sports()
    # --- sportovi ---
    for s in sports:
        cur.execute("INSERT INTO sports VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    (s["id"], s["hr"], s["en"], s["cat"], s["nteam"], json.dumps(s["field"]),
                     json.dumps(s["positions"]), json.dumps(s["hot"]), json.dumps(s["modes"]),
                     s["weight"], json.dumps(s["prof"])))
    # --- mjerenja ---
    for m in COMMON_METRICS:
        cur.execute("INSERT OR IGNORE INTO metrics VALUES (?,?,?,?,?,?)", m)
    for sid, lst in TECH_METRICS.items():
        for (tid, name, unit, mean, sd) in lst:
            cur.execute("INSERT OR IGNORE INTO metrics VALUES (?,?,?,?,?,?)",
                        (tid, "tehnicki", name, unit,
                         f"Tehnički pokazatelj sporta ({sid}): {name}.", 1))
    # --- uređaji ---
    for d in DEVICES:
        cur.execute("INSERT INTO devices VALUES (?,?,?,?,?,?,?,?,?)",
                    (d[0], d[1], d[2], d[3], d[4], d[5], int(d[6]), int(d[7]), d[8]))
    con.commit()

    country_w = [(c[0], c[3]) for c in COUNTRIES]
    cinfo = {c[0]: c for c in COUNTRIES}
    sports_by_id = {s["id"]: s for s in sports}

    def pick_country(sport):
        hot = [h for h in sport["hot"] if h in cinfo]
        if hot and rnd.random() < 0.62:
            ws = [(h, cinfo[h][3]) for h in hot]
        else:
            ws = country_w
        tot = sum(w for _, w in ws)
        r = rnd.uniform(0, tot)
        a = 0.0
        for cc, w in ws:
            a += w
            if a >= r:
                return cc
        return ws[-1][0]

    used_codes = set()
    def new_club(country, level, sport):
        while True:
            code = make_code(rnd)
            if code not in used_codes:
                break
        used_codes.add(code)
        cur.execute("INSERT INTO clubs VALUES (?,?,?,?)", (code, country, level, sport))
        return code

    # --- istaknuti klubovi (2 nogometna, 2 košarkaška) ---
    featured = {}
    for sport_id, n_roster, form in (("nogomet", 18, ["GK", "GK", "RB", "RB", "CB", "CB", "CB", "CB", "LB", "LB",
                                                       "DM", "DM", "CM", "CM", "CM", "RW", "LW", "ST"]),
                                     ("kosarka", 13, ["PG", "PG", "PG", "SG", "SG", "SF", "SF", "PF", "PF", "C", "C", "SG", "PF"])):
        sport = sports_by_id[sport_id]
        clubs = []
        for k in range(2):
            country = rnd.choice(sport["hot"])
            lvl = LEVELS[0] if k == 0 else LEVELS[1]
            code = new_club(country, lvl, sport_id)
            clubs.append((code, country))
        featured[sport_id] = clubs
        for ci, (code, country) in enumerate(clubs):
            for ri in range(n_roster):
                fr = FEMALE_RATIO.get(sport_id, 0.2)
                female = rnd.random() < fr
                name = gen_name(rnd, cinfo[country][2], female)
                h, w = BODY.get(sport_id, (180, 75))
                if female:
                    h, w = h - 13, w - 20
                cur.execute("INSERT INTO athletes (name, sex, country, age, sport, position, club, height, weight, joined, tag) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                            (name, "F" if female else "M", country, rnd.randint(18, 34), sport_id,
                             form[ri], code, int(h + rnd.gauss(0, 5)), int(w + rnd.gauss(0, 5)),
                             (BASE - timedelta(days=rnd.randint(200, 1500))).isoformat(),
                             "featured"))
    con.commit()

    # --- svi ostali sportaši ---
    aid_rows = {}
    total_target = 1260
    cur.execute("SELECT COUNT(*) FROM athletes")
    already = cur.fetchone()[0]
    weights = {s["id"]: s["weight"] for s in sports}
    tw = sum(weights.values()) * (1.0)
    scale = (total_target - already) / tw
    counters = {}
    aid = already
    for s in sports:
        n = max(1, round(s["weight"] * scale))
        counters[s["id"]] = n
    # klubovi po sportu
    club_pool = {s["id"]: [] for s in sports}
    aid = already
    for s in sports:
        need = counters[s["id"]]
        for _ in range(need):
            country = pick_country(s)
            female = rnd.random() < FEMALE_RATIO.get(s["id"], 0.3)
            name = gen_name(rnd, cinfo[country][2], female)
            h, w = BODY.get(s["id"], (180, 75))
            if female:
                h, w = h - 13, w - 20
            position = rnd.choice(s["positions"]) if s["positions"] else "—"
            # klub: grupiraj u klubove veličine ovisne o sportu
            roster = 18 if s["nteam"] >= 9 else (12 if s["nteam"] >= 5 else (7 if s["nteam"] >= 1 else 6))
            if not club_pool[s["id"]] or len(club_pool[s["id"]][-1][1]) >= roster:
                lvl = rnd.choices(LEVELS, weights=[0.18, 0.30, 0.22, 0.18, 0.12])[0]
                code = new_club(country, lvl, s["id"])
                club_pool[s["id"]].append((code, []))
            code, members = club_pool[s["id"]][-1]
            members.append(aid)
            cur.execute("INSERT INTO athletes (name, sex, country, age, sport, position, club, height, weight, joined, tag) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                        (name, "F" if female else "M", country, rnd.randint(16, 36), s["id"], position, code,
                         int(h + rnd.gauss(0, 5)), int(w + rnd.gauss(0, 5)),
                         (BASE - timedelta(days=rnd.randint(120, 2200))).isoformat(), "std"))
            aid += 1
    con.commit()
    cur.execute("SELECT COUNT(*) FROM athletes")
    n_ath = cur.fetchone()[0]

    # --- sesije ---
    print(f"  · {n_ath} sportaša → generiram sesije...")
    cur.execute("SELECT id, sport, position FROM athletes")
    ath_sport = {r[0]: (r[1], r[2]) for r in cur.fetchall()}
    sid = 1
    for a_id, (sp_id, pos) in ath_sport.items():
        s = sports_by_id[sp_id]
        prof = s["prof"]
        skill = min(1.25, max(0.75, rnd.gauss(1.0, 0.09)))
        n_sess = rnd.randint(14, 30)
        for _ in range(n_sess):
            stype = rnd.choices(["match", "training", "gym", "recovery"], weights=prof["mix"])[0]
            d = BASE - timedelta(days=min(98, int(abs(rnd.gauss(0, 38)))))
            if stype == "match":
                dur = int(prof["dur"] * rnd.uniform(0.9, 1.05))
            elif stype == "training":
                dur = int(prof["dur"] * rnd.uniform(0.5, 0.85))
            elif stype == "gym":
                dur = rnd.randint(45, 105)
            else:
                dur = rnd.randint(25, 55)
            m = gen_metrics(rnd, s, stype, skill, dur, prof)
            # vratari: manje trčanja, sprinteva i brzine
            if pos == "GK":
                m["dist_total"] = round(m["dist_total"] * 0.42, 2)
                for i in range(1, 6):
                    m[f"dist_z{i}"] = round(m[f"dist_z{i}"] * (0.5 if i < 5 else 0.2), 2)
                m["top_speed"] = round(min(m["top_speed"], rnd.uniform(22, 27)), 1)
                m["sprints"] = int(m["sprints"] * 0.15)
                m["sprint_dist"] = int(m["sprint_dist"] * 0.15)
                m["jumps"] = max(m.get("jumps", 0), int(rnd.uniform(8, 25)))
            cur.execute("INSERT INTO sessions (id, athlete, sdate, stype, sport, duration, metrics) VALUES (?,?,?,?,?,?,?)",
                        (sid, a_id, d.isoformat(), stype, sp_id, dur, json.dumps(m)))
            sid += 1
    con.commit()
    cur.execute("SELECT COUNT(*) FROM sessions")
    n_sess = cur.fetchone()[0]

    # --- utakmice ---
    print("  · simuliram nogometnu utakmicu 11v11 (90 min, 1 Hz)...")
    fb_clubs = featured["nogomet"]
    def roster(code, form_first_11):
        cur.execute("SELECT id, name, position FROM athletes WHERE club=? ORDER BY id", (code,))
        rows = cur.fetchall()
        by_pos = {}
        for r in rows:
            by_pos.setdefault(r[2], []).append(r)
        out = []
        nums = iter(list(range(1, 30)))
        used_names = []
        for role in form_first_11:
            cand = by_pos.get(role) or rows
            pick = next((c for c in cand if c[0] not in [o[0] for o in out]), None)
            if pick is None:
                pick = rnd.choice(rows)
            out.append(pick)
        return out

    form433 = ["GK", "RB", "CB", "CB", "LB", "DM", "CM", "CM", "RW", "ST", "LW"]
    form442 = ["GK", "RB", "CB", "CB", "LB", "RM", "CM", "CM", "LM", "ST", "ST"]
    home = roster(fb_clubs[0][0], form433)
    away = roster(fb_clubs[1][0], form442)
    num_pool = {}
    def num_for(club_code, a_id):
        key = (club_code, a_id)
        if key not in num_pool:
            num_pool[key] = len([k for k in num_pool if k[0] == club_code]) + 1
        return num_pool[key]
    hp = [(a[0], a[1], num_for(fb_clubs[0][0], a[0]), a[2]) for a in home]
    ap = [(a[0], a[1], num_for(fb_clubs[1][0], a[0]) + 100, a[2]) for a in away]
    frames = matchesim.simulate_football(random.Random(SEED * 3 + 23), hp, ap, fb_clubs[0][0], fb_clubs[1][0])
    rep = match_report(frames)
    mdate = (BASE - timedelta(days=3)).isoformat()
    cur.execute("INSERT INTO matches (id, sport, mdate, home, away, score, venue, mode, frames, report, events, meta) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                ("M-001", "nogomet", mdate, fb_clubs[0][0], fb_clubs[1][0],
                 f"{frames['meta']['score'][0]}:{frames['meta']['score'][1]}",
                 "Stadion ▓▓▓▓ (UWB dvorana je rezervna)", "UWB (M2M indoor)",
                 gzip.compress(json.dumps(frames).encode("utf-8")),
                 json.dumps(rep), json.dumps(frames["events"]),
                 json.dumps({"venue_mode": "uwb", "hz": 20, "athletes": len(frames["players"])})))
    for i, p in enumerate(frames["players"]):
        cur.execute("INSERT INTO match_players VALUES (?,?,?,?,?)",
                    ("M-001", p["aid"], p["team"], p["num"], p["role"]))

    print("  · simuliram košarkašku utakmicu 5v5 (4×10 min, 1 Hz)...")
    bb_clubs = featured["kosarka"]
    formbb = ["PG", "SG", "SF", "PF", "C"]
    bhome = roster(bb_clubs[0][0], formbb)
    baway = roster(bb_clubs[1][0], formbb)
    bhp = [(a[0], a[1], num_for(bb_clubs[0][0], a[0]) % 99, a[2]) for a in bhome]
    bap = [(a[0], a[1], num_for(bb_clubs[1][0], a[0]) % 99, a[2]) for a in baway]
    bframes = matchesim.simulate_basketball(rnd, bhp, bap, bb_clubs[0][0], bb_clubs[1][0])
    brep = match_report(bframes)
    cur.execute("INSERT INTO matches (id, sport, mdate, home, away, score, venue, mode, frames, report, events, meta) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                ("M-002", "kosarka", (BASE - timedelta(days=1)).isoformat(), bb_clubs[0][0], bb_clubs[1][0],
                 f"{bframes['meta']['score'][0]}:{bframes['meta']['score'][1]}",
                 "Dvorana ▓▓▓▓", "UWB (M2M indoor)",
                 gzip.compress(json.dumps(bframes).encode("utf-8")),
                 json.dumps(brep), json.dumps(bframes["events"]),
                 json.dumps({"venue_mode": "uwb", "hz": 20, "athletes": len(bframes["players"])})))
    for i, p in enumerate(bframes["players"]):
        cur.execute("INSERT INTO match_players VALUES (?,?,?,?,?)",
                    ("M-002", p["aid"], p["team"], p["num"], p["role"]))

    cur.execute("INSERT OR REPLACE INTO settings VALUES ('seed', ?)", (str(SEED),))
    cur.execute("INSERT OR REPLACE INTO settings VALUES ('generated', ?)", (BASE.isoformat(),))
    cur.execute("INSERT OR REPLACE INTO settings VALUES ('n_athletes', ?)", (str(n_ath),))
    cur.execute("INSERT OR REPLACE INTO settings VALUES ('n_sessions', ?)", (str(n_sess),))

    # ---- SPT 2.0 dodatni podatci ----
    import seed_extra
    seed_extra.run(con, rnd)
    cur.execute("INSERT OR REPLACE INTO settings VALUES ('n_athletes', ?)",
                (str(cur.execute("SELECT COUNT(*) FROM athletes").fetchone()[0]),))
    con.commit()
    con.close()
    print(f"  · baza spremna: {n_ath} sportaša, {n_sess} sesija, 2 utakmice -> {DB_PATH}")


if __name__ == "__main__":
    print("[SPT] Generiram bazu podataka...")
    main()
    print("[SPT] Gotovo.")
