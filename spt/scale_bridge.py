# -*- coding: utf-8 -*-
"""SPT 2.0 — Most pametne vage: automatski uvoz tjelesnog sastava u karton sportaša.

Kako radi:
  1. Vaga (Huawei Smart Scale, Xiaomi Mi Scale, Medisana BS444, Withings, Garmin
     Index...) mjeri BIA (bio-električna impedanca): težinu, BMI, tjelesnu masnoću,
     vodu, mišićnu masu, koštanu masu, visceralnu mast, proteine i BMR.
  2. Podatak završi u aplikaciji proizvođača (Huawei Health, Zepp/Mi Fit, ViHealth,
     Withings...) — svaka nudi izvoz CSV.
  3. SPT prati mapu `spt/scale_inbox/` — tko god tu spusti CSV izvoz vage, on se
     odmah parsira i upisuje u `body_comp` tablicu → KARTON sportaša se sam ažurira.
  4. Alternativno, bilo koji uređaj može slati JSON direktno na
     POST /api/scale  {"athlete": 123, "weight": 78.4, "fat": 12.1, ...}

Mapiranje korisnika vage → sportaš:
  - settings tablica: ključ "scale_map" = {"ime_na_vazi": athlete_id}
  - ako datoteka ima stupac s imenom i ime je u mapi, upis se vrši automatski
  - inače zapis završi kao "nepotpisano" i dodijeli se ručno u UI-ju (Uvoz → Vaga)
"""
import json
import os
import sqlite3
import threading
import time

import importers

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INBOX = os.path.join(BASE_DIR, "scale_inbox")
DB = os.path.join(BASE_DIR, "spt.db")

SCALE_FIELDS = ["weight", "bmi", "fat", "muscle", "water", "visceral", "bone", "protein", "bmr", "metabolic_age"]


def db_con():
    con = sqlite3.connect(DB, timeout=15)
    con.row_factory = sqlite3.Row
    return con


def get_scale_map(con=None):
    own = con is None
    con = con or db_con()
    try:
        r = con.execute("SELECT v FROM settings WHERE k='scale_map'").fetchone()
        return json.loads(r["v"]) if r else {}
    except Exception:
        return {}
    finally:
        if own:
            con.close()


def save_scale_map(mapping):
    con = db_con()
    con.execute("INSERT OR REPLACE INTO settings VALUES ('scale_map', ?)", (json.dumps(mapping),))
    con.commit()
    con.close()


def insert_body_comp(athlete, date, source, measures):
    con = db_con()
    cols = ["athlete", "bdate", "source"] + SCALE_FIELDS
    vals = [athlete, date or time.strftime("%Y-%m-%d"), source]
    for f in SCALE_FIELDS:
        v = measures.get(f)
        vals.append(v if isinstance(v, (int, float)) else None)
    con.execute(f"INSERT INTO body_comp ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})", vals)
    con.commit()
    con.close()
    return True


def process_scale_file(path):
    """Parsira jednu datoteku iz mape i upisuje mjerenja. Vraća izvještaj."""
    with open(path, "rb") as f:
        data = f.read()
    res = importers.detect_and_parse(os.path.basename(path), data)
    out = {"file": os.path.basename(path), "imported": 0, "unassigned": 0}
    if res.get("kind") == "scale":
        mapping = get_scale_map()
        # pošto CSV često nema imenski stupac, sve upisujemo kao neraspoređeno
        # osim ako postoji mapa "default_athlete"
        default = mapping.get("default_athlete")
        for e in res["entries"]:
            if default:
                insert_body_comp(int(default), e.get("date"), "vaga-auto", e)
                out["imported"] += 1
            else:
                con = db_con()
                cols = ["athlete", "bdate", "source"] + SCALE_FIELDS
                vals = [None, e.get("date") or time.strftime("%Y-%m-%d"), "vaga-nepotpisano"]
                for f2 in SCALE_FIELDS:
                    vals.append(e.get(f2) if isinstance(e.get(f2), (int, float)) else None)
                con.execute(f"INSERT INTO body_comp ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})", vals)
                con.commit()
                con.close()
                out["unassigned"] += 1
    else:
        out["error"] = res.get("error", "nije izvoz vage")
    try:
        os.rename(path, path + ".done")
    except OSError:
        pass
    return out


class ScaleWatcher(threading.Thread):
    """Prati mapu scale_inbox i automatski uvozi nove datoteke."""

    def __init__(self, interval=4.0):
        super().__init__(daemon=True)
        self.interval = interval
        self.running = True
        self.log = []

    def run(self):
        os.makedirs(INBOX, exist_ok=True)
        while self.running:
            try:
                for fn in os.listdir(INBOX):
                    if fn.lower().endswith((".csv", ".json", ".txt")):
                        r = process_scale_file(os.path.join(INBOX, fn))
                        self.log.append({"t": time.strftime("%H:%M:%S"), **r})
                        self.log = self.log[-40:]
            except Exception as e:
                self.log.append({"t": time.strftime("%H:%M:%S"), "error": str(e)})
            time.sleep(self.interval)


def start_watcher():
    w = ScaleWatcher()
    w.start()
    return w


if __name__ == "__main__":
    print(f"[SPT-vaga] Pratim mapu {INBOX}")
    print("[SPT-vaga] Ubaci CSV izvoz (Huawei Health / openScale / Withings) — prepoznajem:")
    print("            težinu, BMI, masnoće, vodu, mišiće, kosti, visceralnu mast, proteine, BMR")
    w = ScaleWatcher(interval=3.0)
    w.run()
