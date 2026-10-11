# -*- coding: utf-8 -*-
"""SPT — Prehrana po kartonu: dnevne potrebe, unos, višak/manjak.

Izračun (javno dostupne formule):
  BMR — Mifflin-St Jeor: 10·kg + 6,25·cm − 5·godina + 5 (M) / −161 (F)
  TDEE — BMR × aktivnost (faktor iz 7-dnevnog opterećenja sRPE)
  Makronutrijenti:
    - ugljikohidrati 5–10 g/kg (ovisno o volumenu; izdržljivost više)
    - proteini 1,6–2,2 g/kg (trening snage više)
    - masti 0,8–1,2 g/kg
  Hidratacija: 35–40 ml/kg + nadoknada znoja (sweat_rate iz sesija!)
Karton uspoređuje unos (log / procjena) s potrebama → VIŠAK / MANJAK.
"""
import json
import sqlite3

DB = "spt.db"

CAT_FACTORS = {  # kategorija → dodatni udio CHO g/kg po intenzitetu dana
    "endurance": 2.0, "field": 1.4, "court": 1.2, "racket": 1.2,
    "water": 1.2, "winter": 1.6, "combat": 0.8, "strength": 0.6,
    "individual": 1.0, "precision": 0.6, "motor": 0.4,
}


def _con():
    con = sqlite3.connect(DB, timeout=15)
    con.row_factory = sqlite3.Row
    return con


def compute_needs(athlete, bc_last, week_load, sport_cat, sex, weight=None, height=None, age=None):
    """athlete/bc_last: sqlite Redovi; week_load: zbroj sRPE 7 dana."""
    w = weight or (bc_last["weight"] if bc_last else athlete["weight"])
    h = height or ((bc_last["height_cm"] if bc_last and bc_last["height_cm"] else athlete["height"]))
    a = age or athlete["age"]
    bmr = 10 * w + 6.25 * h - 5 * a + (5 if sex == "M" else -161)
    # faktor aktivnosti iz tjednog opterećenja (0–3500 AU → 1,2–1,9)
    factor = 1.2 + min(0.7, week_load / 5000.0)
    tdee = bmr * factor
    # makronutrijenti
    cho_gkg = 4.0 + CAT_FACTORS.get(sport_cat, 1.0) + min(2.0, week_load / 1800.0)
    pro_gkg = 1.9 if sport_cat in ("strength", "combat") else 1.7
    fat_gkg = 1.0
    cho = cho_gkg * w
    pro = pro_gkg * w
    fat = fat_gkg * w
    kcal_from_macros = 4 * cho + 4 * pro + 9 * fat
    # uskladi s TDEE (dodaj/oduzmi CHO)
    cho += max(0, (tdee - kcal_from_macros)) / 4
    water = 0.035 * w * 1000  # ml
    return {
        "bmr": int(bmr), "tdee": int(tdee), "activity_factor": round(factor, 2),
        "cho_g": int(cho), "pro_g": int(pro), "fat_g": int(fat),
        "cho_gkg": round(cho_gkg, 1), "pro_gkg": pro_gkg, "fat_gkg": fat_gkg,
        "water_ml": int(water), "weight": round(w, 1),
    }


def evaluate_day(needs, intake):
    """Uspoređuje unos s potrebama → višak/manjak."""
    out = {"kcal": {}, "cho": {}, "pro": {}, "fat": {}, "water": {}}
    kc_in = intake.get("kcal", 0)
    out["kcal"] = {"need": needs["tdee"], "intake": kc_in,
                   "diff": kc_in - needs["tdee"],
                   "verdict": "višak" if kc_in > needs["tdee"] * 1.07 else ("manjak" if kc_in < needs["tdee"] * 0.93 else "u_ravnotezi")}
    for mac, need_g, kcal_g in (("cho", needs["cho_g"], 4), ("pro", needs["pro_g"], 4), ("fat", needs["fat_g"], 9)):
        v = intake.get(mac, 0)
        out[mac] = {"need": need_g, "intake": v, "diff": round(v - need_g),
                    "verdict": "višak" if v > need_g * 1.12 else ("manjak" if v < need_g * 0.88 else "u_ravnotezi")}
    w_in = intake.get("water_ml", 0)
    out["water"] = {"need": needs["water_ml"], "intake": w_in, "diff": w_in - needs["water_ml"],
                    "verdict": "manjak" if w_in < needs["water_ml"] * 0.9 else "u_ravnotezi"}
    return out


def recommendations(eval_day, sport_hr="sport"):
    recs = []
    d = eval_day["kcal"]
    if d["verdict"] == "manjak":
        recs.append(f"Kalorijski manjak {abs(d['diff'])} kcal — dodaj 1–2 obroka s ugljikohidratima (riža, tjestenina, zob) prije treninga.")
    elif d["verdict"] == "višak":
        recs.append(f"Kalorijski višak {d['diff']} kcal — smanji grickalice/šećer; održavaj raspored glavnih obroka.")
    if eval_day["cho"]["verdict"] in ("manjak",):
        recs.append(f"Ugljikohidrati niski ({eval_day['cho']['intake']}/{eval_day['cho']['need']} g) — gorivo za {sport_hr}; +80–120 g CHO na dane treninga.")
    if eval_day["pro"]["verdict"] == "manjak":
        recs.append(f"Proteini niski ({eval_day['pro']['intake']}/{eval_day['pro']['need']} g) — dodaj 30 g (piletina/sir/whey) za oporavak mišića.")
    if eval_day["fat"]["verdict"] == "višak":
        recs.append("Masti iznad cilja — zamijeni dio masnih namirnica povrćem i nemasnim proteinima.")
    if eval_day["water"]["verdict"] == "manjak":
        recs.append(f"Dehidracija! Popij još {abs(eval_day['water']['diff']) // 100} dcl vode do kraja dana.")
    if not recs:
        recs.append("Unos je u ravnoteži s potrebama — odlično, nastavi isto. 💪")
    return recs


def athlete_nutrition(aid):
    """Sve o prehrani sportaša: potrebe + zadnjih 7 dana unosa + prosjek."""
    con = _con()
    try:
        a = con.execute("SELECT * FROM athletes WHERE id=?", (aid,)).fetchone()
        if not a:
            return None
        bc = con.execute("SELECT * FROM body_comp WHERE athlete=? ORDER BY bdate DESC LIMIT 1", (aid,)).fetchone()
        cat_row = con.execute("SELECT cat FROM sports WHERE id=?", (a["sport"],)).fetchone()
        cat = cat_row["cat"] if cat_row else "individual"
        # tjedno opterećenje
        wl = 0
        for r in con.execute("SELECT metrics FROM sessions WHERE athlete=? AND sdate >= date('now','-7 day')", (aid,)):
            try:
                wl += json.loads(r["metrics"]).get("srpe") or 0
            except Exception:
                pass
        needs = compute_needs(a, bc, wl, cat, a["sex"])
        days = [dict(r) for r in con.execute(
            "SELECT * FROM nutrition_log WHERE athlete=? ORDER BY logdate DESC LIMIT 7", (aid,))]
        days.reverse()
        evals = []
        for d in days:
            intake = {"kcal": d["kcal"], "cho": d["cho_g"], "pro": d["pro_g"], "fat": d["fat_g"], "water_ml": d["water_ml"]}
            ev = evaluate_day(needs, intake)
            evals.append({"date": d["logdate"], "intake": intake, "eval": ev, "weight": d["morning_weight"]})
        avg = {}
        if evals:
            avg = {"kcal": int(sum(e["intake"]["kcal"] for e in evals) / len(evals)),
                   "cho": int(sum(e["intake"]["cho"] for e in evals) / len(evals)),
                   "pro": int(sum(e["intake"]["pro"] for e in evals) / len(evals)),
                   "fat": int(sum(e["intake"]["fat"] for e in evals) / len(evals)),
                   "water_ml": int(sum(e["intake"]["water_ml"] for e in evals) / len(evals))}
        latest = evals[-1] if evals else None
        recs = recommendations(latest["eval"], a["sport"]) if latest else []
        return {"athlete": dict(a), "needs": needs, "days": evals, "avg_intake": avg,
                "week_load": int(wl), "recommendations": recs, "body_comp_last": dict(bc) if bc else None}
    finally:
        con.close()
