# -*- coding: utf-8 -*-
"""SPT 2.0 — dodatni podatci: kartoni, ozljede, tjelesni sastav (vaga), testovi,
norme (mjerila), planovi treninga, mlade kategorije (12+), glasovni zapisi."""
import json
import random
from datetime import date, timedelta

import anomaly

BASE = date.today()

INJURY_TYPES = [
    ("Mišićna ozljeda (zadnja loža)", "zadnja loža", "mišić", 18, 8),
    ("Mišićna ozljeda (prednja loža)", "prednja loža", "mišić", 14, 6),
    ("Uganuće gležnja", "gležanj", "ligament", 12, 7),
    ("Uganuće koljena (MCL)", "koljeno", "ligament", 32, 14),
    ("Puknuće ligamenta (ACL)", "koljeno", "ligament", 240, 30),
    ("Prijelom kosti", "potkoljenica", "fraktura", 60, 20),
    ("Potres mozga", "glava", "potres", 21, 10),
    ("Upala Ahilove tetive", "ahil", "tendon", 28, 12),
    ("Upala koljena (skakačko)", "koljeno", "tendon", 35, 14),
    ("Preopterećenje prepona", "prepone", "preopterećenje", 16, 8),
    ("Udarac (kontuzija)", "natkoljenica", "udarac", 5, 3),
    ("Bol u leđima", "leđa", "preopterećenje", 10, 6),
]

DRILLS = {
    "nogomet": [
        ("Zagrijavanje + mobilnost", 15, "nisko", 40),
        ("Rondo 5v2", 20, "srednje", 120),
        ("Posjed 8v8 (tak. igra)", 25, "visoko", 260),
        ("Sprintevi 6×30 m (P90+)", 18, "maksimalno", 210),
        ("Snaga — donji ekstremiteti", 45, "srednje", 180),
        ("Regeneracija — bazen + stretch", 30, "nisko", 30),
        ("Male igre 4v4", 22, "visoko", 240),
        ("Analiza videa", 40, "nisko", 10),
        ("Stabilizacija trupa", 30, "nisko", 80),
        ("Taktička priprema (11v11)", 60, "srednje", 300),
    ],
    "kosarka": [
        ("Zagrijavanje + aktivacije", 15, "nisko", 40),
        ("Šut — 200 prilagođenih šuteva", 30, "srednje", 110),
        ("Pick&roll situacije", 25, "visoko", 220),
        ("Plyometrija — duboki skokovi", 25, "visoko", 200),
        ("Snaga — cijelo tijelo", 50, "srednje", 190),
        ("5v5 kontrolna utakmica", 40, "visoko", 350),
        ("Regeneracija — sauna + foam", 25, "nisko", 20),
        ("Brzina — ljestve + ubrzanja", 20, "maksimalno", 180),
        ("Analiza protivnika", 35, "nisko", 10),
    ],
}

TESTS_BY_CAT = {
    "field": ["sprint10", "sprint30", "cmj", "yoyo", "lactate_test"],
    "court": ["sprint10", "sprint30", "cmj", "yoyo"],
    "racket": ["sprint10", "cmj", "yoyo"],
    "endurance": ["yoyo", "lactate_test", "sprint30"],
    "combat": ["cmj", "sprint10"],
    "water": ["cmj", "lactate_test"],
    "individual": ["sprint10", "sprint30", "cmj"],
    "winter": ["cmj", "sprint10"],
    "strength": ["cmj"],
    "precision": ["cmj"],
    "motor": [],
}

# orijentacijske norme: sport-kategorija, dobna skupina, test, jedinica, P10, P50, P90 (bolje = niže za vrijeme)
BENCHMARKS = [
    ("field", "U14", "sprint30", "s", 5.15, 4.72, 4.38), ("field", "U16", "sprint30", "s", 4.92, 4.48, 4.15),
    ("field", "U18", "sprint30", "s", 4.71, 4.28, 3.98), ("field", "senior", "sprint30", "s", 4.62, 4.18, 3.90),
    ("field", "elita", "sprint30", "s", 4.45, 4.05, 3.80),
    ("court", "U14", "sprint30", "s", 5.05, 4.63, 4.30), ("court", "U16", "sprint30", "s", 4.80, 4.38, 4.06),
    ("court", "U18", "sprint30", "s", 4.60, 4.18, 3.90), ("court", "elita", "sprint30", "s", 4.35, 3.98, 3.72),
    ("field", "U16", "cmj", "cm", 31, 38, 46), ("field", "U18", "cmj", "cm", 35, 43, 52),
    ("field", "senior", "cmj", "cm", 37, 45, 55), ("field", "elita", "cmj", "cm", 42, 51, 61),
    ("court", "elita", "cmj", "cm", 48, 58, 70),
    ("field", "U16", "yoyo", "m", 1200, 1800, 2400), ("field", "senior", "yoyo", "m", 1600, 2200, 2800),
    ("field", "elita", "yoyo", "m", 2000, 2600, 3200),
    ("endurance", "senior", "yoyo", "m", 1800, 2400, 3000),
    ("field", "senior", "lactate_2", "mmol/L", 1.4, 1.9, 2.6),
    ("endurance", "senior", "lactate_2", "mmol/L", 1.2, 1.6, 2.1),
    ("field", "senior", "gct", "ms", 135, 155, 180), ("endurance", "elita", "gct", "ms", 150, 175, 205),
    ("field", "senior", "stride", "m", 1.05, 1.22, 1.42),
]


def _youth_club(con, rnd, country, sport, used):
    code = "KLB-" + "".join(rnd.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(4))
    if code in used:
        return youth_club(con, rnd, country, sport, used)
    used.add(code)
    con.execute("INSERT INTO clubs VALUES (?,?,?,?)", (code, country, "Razvojna akademija", sport))
    return code


def gen_body_comp(rnd, height, weight, age, n_entries, growing=False):
    """Generira povijest mjerenja s BIA vage (kao Huawei/Medisana/Xiaomi)."""
    out = []
    w = weight * rnd.uniform(1.03, 1.10)  # prije 2 godine malo teži/drugačiji sastav
    h = height - (rnd.uniform(6, 16) if growing and age < 18 else 0)
    fat = rnd.uniform(8, 18) + (3 if age < 16 else 0)
    for i in range(n_entries):
        d = BASE - timedelta(days=int(730 * (1 - i / max(1, n_entries - 1))) - rnd.randint(0, 12))
        if growing:
            h += rnd.uniform(0.3, 1.2)  # rast
            w += rnd.uniform(0.1, 0.7)
            fat = max(6.5, fat - rnd.uniform(0, 0.4))
        else:
            w += rnd.uniform(-0.8, 0.8)
            fat += rnd.uniform(-0.5, 0.5)
            fat = max(5.5, min(24, fat))
        muscle = w * (0.42 + rnd.uniform(-0.03, 0.05)) * (1 - fat / 100 * 0.6)
        bmi = w / (h / 100) ** 2
        out.append({
            "bdate": d.isoformat(), "source": rnd.choice(["huawei", "medisana", "mi_scale", "withings", "manual"]),
            "height_cm": round(h, 1), "weight": round(w, 1), "bmi": round(bmi, 1),
            "fat": round(fat, 1), "muscle": round(muscle, 1),
            "water": round(rnd.uniform(55, 63), 1), "visceral": round(rnd.uniform(3, 9), 0),
            "bone": round(w * rnd.uniform(0.035, 0.05), 1), "protein": round(rnd.uniform(15, 19), 1),
            "bmr": int(1500 + w * 8 + rnd.uniform(-60, 60)), "metabolic_age": int(age + rnd.uniform(-4, 6)),
        })
    return out


BC_COLS = ["athlete", "bdate", "source", "height_cm", "weight", "bmi", "fat", "muscle", "water",
           "visceral", "bone", "protein", "bmr", "metabolic_age"]


def insert_bc(con, aid, e):
    vals = [aid, e["bdate"], e["source"], e["height_cm"], e["weight"], e["bmi"], e["fat"], e["muscle"],
            e["water"], e["visceral"], e["bone"], e["protein"], e["bmr"], e["metabolic_age"]]
    con.execute(f"INSERT INTO body_comp ({','.join(BC_COLS)}) VALUES ({','.join('?' * len(vals))})", vals)


def gen_test(rnd, ttype, cat, age, height):
    """Generira rezultat testa za sportaša."""
    seniority = min(1.0, max(0.4, (age - 12) / 12))
    if ttype == "sprint10":
        base = 2.35 - 0.28 * seniority
        v = base + rnd.gauss(0, 0.09)
        return {"value": round(v, 2), "unit": "s"}
    if ttype == "sprint30":
        base = 5.35 - 0.72 * seniority
        v = base + rnd.gauss(0, 0.13)
        return {"value": round(v, 2), "unit": "s", "splits": {"10m": round(2.35 - 0.28 * seniority + rnd.gauss(0, 0.07), 2),
                                                              "20m": round(3.65 - 0.45 * seniority + rnd.gauss(0, 0.1), 2)}}
    if ttype == "cmj":
        base = 28 + 26 * seniority
        v = base + rnd.gauss(0, 4.5)
        return {"value": round(v, 1), "unit": "cm", "gct_ms": int(rnd.uniform(230, 320)), "rsi": round(rnd.uniform(1.1, 2.4), 2)}
    if ttype == "yoyo":
        base = 900 + 1800 * seniority
        v = max(400, base + rnd.gauss(0, 220))
        return {"value": int(v), "unit": "m"}
    if ttype == "lactate_test":
        # step test 4 stupnja: brzina → laktat + puls
        speeds = [10, 12, 14, 16]
        base_l = 1.1 + (0.6 if cat == "endurance" else 0)
        stages = []
        for i, sp in enumerate(speeds):
            stages.append({"speed_kmh": sp,
                           "lactate": round(base_l + i * rnd.uniform(0.8, 1.5), 1),
                           "hr": int(128 + i * 17 + rnd.uniform(-5, 5))})
        lt_speed = round(11.5 + seniority * 2.2 + rnd.gauss(0, 0.5), 1)
        return {"value": lt_speed, "unit": "km/h", "stages": stages,
                "lactate_at_2": round(rnd.uniform(1.4, 2.4), 1), "hrmax_test": int(188 + rnd.uniform(-6, 8))}
    return None


def run(con, rnd):
    import sqlite3
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    print("  · mlade kategorije (12–17) + akademije...")
    # ---- mladi sportaši ----
    youth_sports = [("nogomet", 40), ("kosarka", 26), ("plivanje", 22), ("atletika_sprint", 20), ("tenis", 16), ("rukomet", 16), ("odbojka", 14), ("biciklizam_cesta", 10)]
    used_codes = set(r["code"] for r in cur.execute("SELECT code FROM clubs"))
    from data_catalog import COUNTRIES, NAME_POOLS
    cinfo = {c[0]: c for c in COUNTRIES}

    def yname(country):
        male, female_n, last = NAME_POOLS[cinfo[country][2]]
        return f"{rnd.choice(male)} {rnd.choice(last)}"

    from data_catalog import build_sports
    sports_by_id = {s["id"]: s for s in build_sports()}
    aid = cur.execute("SELECT MAX(id) FROM athletes").fetchone()[0] + 1
    youth_ids = []
    for (sid, n) in youth_sports:
        s = sports_by_id[sid]
        for k in range(n):
            country = rnd.choice(s["hot"]) if rnd.random() < 0.6 else rnd.choice(COUNTRIES)[0]
            age = rnd.randint(12, 17)
            squad = f"U{min(19, (age // 2) * 2 + 2)}"
            # klub po kohorti
            code = None
            for r in cur.execute("SELECT code FROM clubs WHERE sport=? AND level='Razvojna akademija'", (sid,)).fetchall():
                n_in = cur.execute("SELECT COUNT(*) FROM athletes WHERE club=?", (r["code"],)).fetchone()[0]
                if n_in < 16:
                    code = r["code"]
                    break
            if not code:
                code = _youth_club(con, rnd, country, sid, used_codes)
            female = rnd.random() < 0.4
            h = rnd.uniform(150, 185) - (10 if age < 15 else 4) - (11 if female else 0)
            w = h * 0.36 + rnd.uniform(-6, 8) - (12 if female else 0)
            name = yname(country)
            if female:
                male, female_n, last = NAME_POOLS[cinfo[country][2]]
                name = f"{rnd.choice(female_n)} {rnd.choice(last)}"
            cur.execute("""INSERT INTO athletes (name, sex, country, age, sport, position, club, height, weight, joined, tag, squad, dominance)
                           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                        (name, "F" if female else "M", country, age, sid,
                         rnd.choice(s["positions"]), code, int(h), int(w),
                         (BASE - timedelta(days=rnd.randint(90, 900))).isoformat(), "youth",
                         squad, rnd.choice(["D", "L", "D", "D"])))
            youth_ids.append((aid, sid, age, int(h), int(w)))
            aid += 1
    con.commit()

    # ---- tjelesni sastav za SVE ----
    print("  · tjelesni sastav (pametna vaga, 2 godine povijesti)...")
    aths = cur.execute("SELECT id, height, weight, age, tag FROM athletes").fetchall()
    for (a_id, h, w, age, tag) in aths:
        growing = tag == "youth"
        n = rnd.randint(6, 10) if not growing else rnd.randint(10, 14)
        for e in gen_body_comp(rnd, h, w, age, n, growing):
            insert_bc(con, a_id, e)
    con.commit()

    # ---- testovi ----
    print("  · testovi performansi (sprint, CMJ, yo-yo, laktatni test)...")
    for (a_id, sport, age, h, w) in cur.execute("SELECT id, sport, age, height, weight FROM athletes").fetchall():
        cat = sports_by_id.get(sport, {}).get("cat", "individual")
        tests = TESTS_BY_CAT.get(cat, [])
        if not tests:
            continue
        if rnd.random() < 0.25:
            continue
        for ttype in tests:
            n_dates = rnd.randint(2, 4)
            for j in range(n_dates):
                d = (BASE - timedelta(days=rnd.randint(20, 700))).isoformat()
                res = gen_test(rnd, ttype, cat, age - (j * 0.4), h)
                if res:
                    cur.execute("INSERT INTO perf_tests (athlete, tdate, ttype, sport, results) VALUES (?,?,?,?,?)",
                                (a_id, d, ttype, sport, json.dumps(res)))
    con.commit()

    # ---- ozljede ----
    print("  · ozljede (povijest, ručni unos)...")
    all_ids = [r["id"] for r in cur.execute("SELECT id FROM athletes ORDER BY RANDOM()").fetchall()]
    injured = all_ids[:int(len(all_ids) * 0.09)]  # ~9% sportaša ima ozljedu u povijesti
    for a_id in injured:
        n_inj = rnd.choices([1, 2, 3], weights=[0.62, 0.28, 0.10])[0]
        for _ in range(n_inj):
            (name, part, typ, days, sd) = rnd.choices(INJURY_TYPES, weights=[0.16, 0.07, 0.18, 0.10, 0.03, 0.04, 0.06, 0.08, 0.05, 0.08, 0.09, 0.06])[0]
            days_out = max(2, int(rnd.gauss(days, sd)))
            d0 = BASE - timedelta(days=rnd.randint(days_out + 10, 900))
            status = "oporavljeno" if (BASE - d0).days > days_out + 14 else ("oporavak" if (BASE - d0).days > days_out else "aktivna")
            ret = (d0 + timedelta(days=days_out)).isoformat() if status != "aktivna" else None
            cur.execute("""INSERT INTO injuries (athlete, idate, itype, body_part, severity, cause, days_out, return_date, status, notes)
                           VALUES (?,?,?,?,?,?,?,?,?,?)""",
                        (a_id, d0.isoformat(), name, part,
                         "teško" if days_out > 60 else ("umjereno" if days_out > 14 else "lako"),
                         rnd.choice(["trening", "utakmica", "treniranje bez zagrijavanja", "kontakt s igračem", "postepeno preopterećenje", "nepoznato"]),
                         days_out, ret, status,
                         rnd.choice(["", "MRI potvrdio", "fizioterapija 2×/tjedno", "program povratka RTP-3", "praćeno dnevno"])))
    con.commit()

    # par trenutno AKTIVNIH ozljeda (istaknuti klubovi)
    featured_ids = [r["id"] for r in cur.execute("SELECT id FROM athletes WHERE tag='featured' ORDER BY RANDOM() LIMIT 8").fetchall()]
    for a_id in featured_ids:
        (name, part, typ, days, sd) = rnd.choices(INJURY_TYPES, weights=[0.25, 0.08, 0.2, 0.12, 0.02, 0.03, 0.05, 0.05, 0.05, 0.05, 0.1, 0.02])[0]
        days_out = max(5, int(rnd.gauss(days, sd * 0.6)))
        d0 = BASE - timedelta(days=max(1, int(days_out * rnd.uniform(0.15, 0.7))))
        cur.execute("""INSERT INTO injuries (athlete, idate, itype, body_part, severity, cause, days_out, return_date, status, notes)
                       VALUES (?,?,?,?,?,?,?,?,?,?)""",
                    (a_id, d0.isoformat(), name, part,
                     "teško" if days_out > 60 else ("umjereno" if days_out > 14 else "lako"),
                     rnd.choice(["utakmica", "trening", "kontakt s igračem", "postepeno preopterećenje"]),
                     days_out, None, "aktivna", " RTP protokol pokrenut"))
    con.commit()
    print("  · planovi treninga za istaknute klubove...")
    featured = [r["code"] for r in cur.execute("SELECT DISTINCT a.club AS code FROM athletes a WHERE a.tag='featured'").fetchall()]
    for code in featured:
        sport = cur.execute("SELECT sport FROM clubs WHERE code=?", (code,)).fetchone()["sport"]
        drills = DRILLS.get(sport, DRILLS["nogomet"])
        for wk_off in (0, -1):  # ovaj i prošli tjedan
            monday = BASE - timedelta(days=BASE.weekday() + 7 * -wk_off)
            for day in range(7):
                d = monday + timedelta(days=day)
                if d > BASE:
                    break
                if rnd.random() < 0.25:
                    continue  # slobodan dan
                title = rnd.choice(["Trening — snaga", "Trening — brzina", "Trening — taktika", "Trening — regeneracija", "Trening — intenzitet", "Trening — tehnika"])
                cur.execute("INSERT INTO training_plans (club, pdate, title, focus, coach) VALUES (?,?,?,?,?)",
                            (code, d.isoformat(), title, rnd.choice(["priprema utakmice", "razvoj", "oporavak", "intenzitet"]),
                             rnd.choice(["Trener A.", "Kondicijski trener B.", "Trener C."])))
                pid = cur.execute("SELECT MAX(id) FROM training_plans").fetchone()[0]
                tmin = 9
                n_drills = rnd.randint(4, 6)
                for (drill, dur, inten, load) in rnd.sample(drills, min(n_drills, len(drills))):
                    done = 1 if (d < BASE or rnd.random() < 0.6) else 0
                    cur.execute("INSERT INTO plan_items (plan, time_min, drill, intensity, duration_min, load_au, done) VALUES (?,?,?,?,?,?,?)",
                                (pid, f"{tmin:02d}:00", drill, inten, dur, load, done))
                    tmin += 1
    con.commit()

    # ---- norme (mjerila) ----
    print("  · mjerila i norme...")
    for (cat, grp, ttype, unit, p10, p50, p90) in BENCHMARKS:
        cur.execute("INSERT INTO benchmarks (sport, age_group, ttype, unit, p10, p50, p90) VALUES (?,?,?,?,?,?,?)",
                    (cat, grp, ttype, unit, p10, p50, p90))
    con.commit()

    # ---- glasovni zapisi (BioSenzor) ----
    for (a_id,) in cur.execute("SELECT id FROM athletes WHERE tag='featured' ORDER BY id LIMIT 12").fetchall():
        for j in range(rnd.randint(2, 4)):
            d = (BASE - timedelta(days=rnd.randint(1, 30))).isoformat()
            stress = round(rnd.uniform(8, 82), 1)
            cur.execute("INSERT INTO voice_logs (athlete, vdate, stress, breathing_rate, breathing_reg, pitch_hz, energy, heart_rhythm, flags) VALUES (?,?,?,?,?,?,?,?,?)",
                        (a_id, d, stress, round(rnd.uniform(11, 27), 1), round(rnd.uniform(0.25, 0.85), 2),
                         round(rnd.uniform(110, 205), 1), round(rnd.uniform(0.02, 0.2), 3),
                         round(rnd.uniform(50, 95), 0),
                         json.dumps(["VISOK STRES U GLASU"] if stress > 70 else [])))
    con.commit()

    # ---- prehrana (dnevnik unosa — zadnjih 7 dana) ----
    print("  · dnevnik prehrane (potrebe vs unos)...")
    import nutrition
    n_nut = 0
    ath_rows = cur.execute("SELECT * FROM athletes WHERE tag IN ('featured','youth') OR id % 6 = 0").fetchall()
    for a in ath_rows:
        bc = cur.execute("SELECT * FROM body_comp WHERE athlete=? ORDER BY bdate DESC LIMIT 1", (a["id"],)).fetchone()
        cat_row = cur.execute("SELECT cat FROM sports WHERE id=?", (a["sport"],)).fetchone()
        cat = cat_row["cat"] if cat_row else "individual"
        wl = cur.execute("SELECT metrics FROM sessions WHERE athlete=? AND sdate >= date('now','-7 day')", (a["id"],)).fetchall()
        wl_sum = 0
        for r in wl:
            try:
                wl_sum += json.loads(r["metrics"]).get("srpe") or 0
            except Exception:
                pass
        needs = nutrition.compute_needs(a, bc, wl_sum, cat, a["sex"])
        for k in range(6, -1, -1):
            d = BASE - timedelta(days=k)
            drift = rnd.gauss(0, 0.07)
            if rnd.random() < 0.18:
                drift = rnd.choice((-0.22, 0.18))
            kcal = int(needs["tdee"] * (1 + drift))
            cho = int(needs["cho_g"] * (1 + drift + rnd.gauss(0, 0.06)))
            pro = int(needs["pro_g"] * (1 + rnd.gauss(0, 0.1)))
            fat = int(needs["fat_g"] * (1 + drift * 0.5 + rnd.gauss(0, 0.12)))
            water = int(needs["water_ml"] * (1 + rnd.gauss(0.08, 0.15)))
            cur.execute("""INSERT INTO nutrition_log (athlete, logdate, kcal, cho_g, pro_g, fat_g, water_ml, morning_weight, note)
                           VALUES (?,?,?,?,?,?,?,?,?)""",
                        (a["id"], d.isoformat(), kcal, cho, pro, fat, max(400, water),
                         round((bc["weight"] if bc else a["weight"]) + rnd.gauss(0, 0.4), 1),
                         rnd.choice(["", "dan utakmice", "porast apetita", "doručak preskočen", ""])))
            n_nut += 1
    con.commit()
    print(f"    → {n_nut} dnevnih unosa")

    # ---- korisnici i uloge ----
    print("  · korisnici i uloge (admin/trener/kondicijski/sportaš/skaut)...")
    feat_club = cur.execute("SELECT club FROM athletes WHERE tag='featured' LIMIT 1").fetchone()["club"]
    feat_id = cur.execute("SELECT id FROM athletes WHERE tag='featured' LIMIT 1").fetchone()["id"]
    for (u, p, role, club, ath, name) in [
        ("admin", "admin123", "admin", None, None, "Administrator sustava"),
        ("trener", "1234", "trener", feat_club, None, "Trener"),
        ("kondicija", "1234", "kondicijski", feat_club, None, "Kondicijski trener"),
        ("sportas", "1234", "sportas", None, feat_id, "Sportaš (demo)"),
        ("skaut", "1234", "skaut", None, None, "Skaut"),
    ]:
        cur.execute("INSERT OR IGNORE INTO users (username, pin, role, club, athlete, name, lang) VALUES (?,?,?,?,?,?, 'hr')",
                    (u, p, role, club, ath, name))
    con.commit()

    # ---- anomalije ----
    print("  · detekcija anomalija...")
    n_anom = anomaly.rebuild_all()
    print(f"    → {n_anom} anomalija označeno")
