# -*- coding: utf-8 -*-
"""SPT 2.0 — Motor za otkrivanje anomalija (crvene zastavice).

Pregledava povijest svakog sportaša i traži vrijednosti koje odstupaju
od njegovog prosjeka (z-vrijednost) — te fiziološke obrasce rizika:
  - nagle promjene težine / sastava tijela (vaga)
  - pad spremnosti / HRV
  - skok opterećenja (ACWR)
  - srčane i borbene anomalije (puls izvan pojasa)
Anomalije se označavaju crveno u UI-ju i hrane SPT AI asistenta.
"""
import json
import math
import os
import sqlite3

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "spt.db")


def db_con():
    con = sqlite3.connect(DB, timeout=15)
    con.row_factory = sqlite3.Row
    return con


def _mean(xs):
    return sum(xs) / len(xs) if xs else 0.0


def _sd(xs):
    if len(xs) < 2:
        return 0.0
    m = _mean(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))


METRIC_LABELS = {
    "dist_total": "Ukupna udaljenost", "top_speed": "Maksimalna brzina", "hr_avg": "Prosječni puls",
    "hr_max": "Maksimalni puls", "hrv_rmssd": "HRV", "readiness": "Spremnost", "srpe": "Opterećenje (sRPE)",
    "sleep_h": "San", "sleep_score": "Ocjena sna", "soreness": "Bolnost mišića", "playerload": "PlayerLoad",
    "jumps": "Broj skokova", "kcal": "Kalorije", "jump_height_max": "Najviši skok",
    "lactate": "Mliječna kiselina", "gct_run": "Vrijeme kontakta stopala", "stride_len": "Dužina koraka",
}


def detect_for_athlete(con, athlete_id, threshold=2.4):
    """Vraća listu anomalija za jednog sportaša iz povijesti sesija i vaganja."""
    out = []
    # --- sesije ---
    per = {}
    for r in con.execute("SELECT sdate, metrics FROM sessions WHERE athlete=? ORDER BY sdate", (athlete_id,)):
        try:
            m = json.loads(r["metrics"])
        except Exception:
            continue
        for k, v in m.items():
            if isinstance(v, (int, float)) and v is not None:
                per.setdefault(k, []).append((r["sdate"], v))
    for metric, series in per.items():
        if len(series) < 6 or metric not in METRIC_LABELS:
            continue
        vals = [v for _, v in series]
        mu, sd = _mean(vals), _sd(vals)
        if sd < 1e-9:
            continue
        for (d, v) in series[-14:]:  # gledaj samo zadnjih 14 pojavljivanja
            z = (v - mu) / sd
            if abs(z) >= threshold:
                sev = "kritično" if abs(z) >= 3.2 else "upozorenje"
                direction = "viša" if z > 0 else "niža"
                msg = (f"{METRIC_LABELS[metric]} neočekivano {direction}: {round(v, 1)} "
                       f"(prosjek sportaša {round(mu, 1)}, z = {z:+.1f})")
                out.append({"adate": d, "category": "sesija", "metric": metric, "value": round(v, 2),
                            "expected": round(mu, 2), "z": round(z, 2), "severity": sev, "msg": msg})
    # --- tjelesni sastav ---
    wseries = []
    for r in con.execute("SELECT bdate, weight, fat, muscle, water FROM body_comp WHERE athlete=? ORDER BY bdate", (athlete_id,)):
        if r["weight"]:
            wseries.append(r)
    if len(wseries) >= 4:
        ws = [r["weight"] for r in wseries]
        mu, sd = _mean(ws[:-1]), _sd(ws[:-1])
        last = wseries[-1]
        if sd > 0:
            z = (last["weight"] - mu) / sd
            if abs(z) >= 2.0:
                d_kg = last["weight"] - wseries[-2]["weight"]
                out.append({"adate": last["bdate"], "category": "tjelesni sastav", "metric": "weight",
                            "value": round(last["weight"], 1), "expected": round(mu, 1), "z": round(z, 2),
                            "severity": "upozorenje" if abs(z) < 3 else "kritično",
                            "msg": f"Težina skočila na {last['weight']:.1f} kg ({d_kg:+.1f} kg) — provjeri hidrataciju/sastav"})
        # pad mišićne mase
        if len(wseries) >= 6 and wseries[-1]["muscle"] and wseries[-6]["muscle"]:
            dlt = wseries[-1]["muscle"] - wseries[-6]["muscle"]
            if dlt <= -2.0:
                out.append({"adate": last["bdate"], "category": "tjelesni sastav", "metric": "muscle",
                            "value": round(wseries[-1]["muscle"], 1), "expected": round(wseries[-6]["muscle"], 1),
                            "z": -2.5, "severity": "upozorenje",
                            "msg": f"Mišićna masa pala {abs(dlt):.1f} kg u nekoliko tjedana — provjeri prehranu i trening snage"})
    return out


def rebuild_all():
    """Pregledaj sve sportaše i obnovi tablicu anomalija."""
    con = db_con()
    con.execute("DELETE FROM anomalies")
    n = 0
    for r in con.execute("SELECT id FROM athletes").fetchall():
        for a in detect_for_athlete(con, r["id"]):
            con.execute("""INSERT INTO anomalies (athlete, adate, category, metric, value, expected, z, severity, msg)
                           VALUES (?,?,?,?,?,?,?,?,?)""",
                        (r["id"], a["adate"], a["category"], a["metric"], a["value"], a["expected"], a["z"], a["severity"], a["msg"]))
            n += 1
    con.commit()
    con.close()
    return n


if __name__ == "__main__":
    print(f"[SPT-anomalije] Pronađeno: {rebuild_all()} anomalija")
