# -*- coding: utf-8 -*-
"""SPT — BYOD most za amaterske pametne satove (Xiaomi/Amazfit/Huawei/Garmin...).

Svijet stvarnih uređaja koji sportaši već imaju:
  - Xiaomi Smart Band / Mi Watch  (Mi Fitness / Zepp Life app → izvoz CSV)
  - Amazfit (Zepp app)
  - Huawei Watch (Huawei Health → izvoz)
  - Garmin Forerunner/Fenix (Garmin Connect → GPX/TCX/FIT; GPX/TCX već podržan)
  - Polar, Coros, Suunto...

SPT prihvaća:
  1. CSV izvoze svih navedenih aplikacija (stupci: puls, koraci, san...)
  2. Generičke tokove: Time,Latitude,Longitude,Speed,HeartRate (Trening u outdoor dijelu)
  3. Dnevne sažetke: Date,Steps,Calories,Sleep,RestingHR  → "watch summary"
  4. BLE GATT profil (za napredne): SPT-ov "Amateur Sensor Profile"
     - SERVICE 6e400001-b5a3-f393-e0a9-e50e24dcca9e (NUS sličan)
     - karakteristika: JSON po liniji {"t":1,"hr":132,"steps":1053,"acc":[x,y,z]}
     - watch_bridge sluša BLE preko uart (demo: TCP) i upisuje sesije u realnom vremenu

Za IND00R/OUTDOOR: sat je "sporedni senzor" — u dvorani bez GPS-a daje puls/korake/
akceleraciju (procjena intenziteta), a poziciju preuzima UWB/M2M grudnjak.
"""
import json
import re
import socket
import threading
import time
from datetime import datetime

# dnevni sažetak pametnog sata: Date,Steps,Calories/Sleep/RestingHR
_WATCH_SUMMARY_KEYS = {
    "steps": ["steps", "koraci", "step count"],
    "kcal_day": ["calories", "calorie", "kcal", "kalorije"],
    "sleep_h": ["sleep", "san", "sleep hours", "sleep(h)"],
    "rhr": ["resting hr", "resting heart rate", "rhr", "mirovni puls", "resting_pulse"],
}


def parse_watch_summary_csv(text):
    import csv
    import io
    rows = [r for r in csv.reader(io.StringIO(text)) if any(c.strip() for c in r)]
    if len(rows) < 2:
        return []
    header = [h.strip().lower() for h in rows[0]]
    colmap = {}
    for field, names in _WATCH_SUMMARY_KEYS.items():
        for i, h in enumerate(header):
            if h in names:
                colmap[field] = i
                break
    date_idx = None
    for i, h in enumerate(header):
        if h in ("date", "datum", "day", "dan"):
            date_idx = i
            break
    if not colmap or date_idx is None:
        return []
    out = []
    for r in rows[1:]:
        e = {"date": r[date_idx]}
        try:
            for f, i in colmap.items():
                if i < len(r) and r[i].strip():
                    e[f] = float(str(r[i]).replace(",", "."))
            out.append(e)
        except ValueError:
            continue
    return out


class WatchListener(threading.Thread):
    """TCP/UDP listener na koji amaterski satovi (ili njihove aplikacije)
    šalju real-time JSON pakete. Demo protokol — isti format koristi i
    productski BLE GATT most preko NUS mosta na mobitelu:

        {"watch":"MI-BAND-8","athlete":123,"t":0,"hr":132,"steps":1053,"acc":[0.1,0.2,9.8]}
        {"watch":"AMAZFIT-GTS","athlete":123,"hr":141,"rr":[812,826]}
    """
    def __init__(self, port=1520, on_packet=None):
        super().__init__(daemon=True)
        self.port = port
        self.buffer = {}
        self.latest = {}
        self.running = True
        self.on_packet = on_packet

    def run(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(1.0)
        s.bind(("0.0.0.0", self.port))
        while self.running:
            try:
                data, addr = s.recvfrom(4096)
                pkt = json.loads(data.decode("utf-8"))
                key = pkt.get("watch", "sat")
                self.latest[key] = {"pkt": pkt, "ts": time.time()}
                if self.on_packet:
                    self.on_packet(pkt)
            except socket.timeout:
                continue
            except Exception:
                continue

    def status(self):
        now = time.time()
        return [{"watch": k, "age_s": round(now - v["ts"], 1), "hr": v["pkt"].get("hr"),
                 "athlete": v["pkt"].get("athlete")} for k, v in self.latest.items()]


# Zepp Life / Mi Fitness izvoz aktivnosti ima stupce:
# "Tip,Vrijeme početka,Vrijeme završetka,Udaljenost(km),Kalorije(kcal),Prosjječni puls"
ZEPP_ALIASES = {
    "udaljenost": "dist_total", "distance": "dist_total",
    "kalorije": "kcal", "calories": "kcal",
    "prosječni puls": "hr_avg", "prosjecni puls": "hr_avg", "average heart rate": "hr_avg", "avg hr": "hr_avg",
}


def parse_zepp_activity_csv(text):
    import csv
    import io
    rows = [r for r in csv.reader(io.StringIO(text)) if any(c.strip() for c in r)]
    if len(rows) < 2:
        return []
    header = [h.strip().lower() for h in rows[0]]
    out = []
    for r in rows[1:]:
        e = {}
        for i, h in enumerate(header):
            for za, metric in ZEPP_ALIASES.items():
                if za in h and i < len(r) and r[i].strip():
                    try:
                        e[metric] = float(str(r[i]).replace(",", "."))
                    except ValueError:
                        pass
            if ("datum" in h or "date" in h or "vrijeme početka" in h or "start time" in h) and i < len(r):
                e["date"] = r[i].split(" ")[0]
        if e.get("dist_total") or e.get("kcal"):
            out.append(e)
    return out


if __name__ == "__main__":
    print("[SPT-watch] Slusam UDP :1520 za pakete pametnih satova (demo protokol)")
    wl = WatchListener(on_packet=lambda p: print("  ←", p))
    wl.start()
    while True:
        time.sleep(10)
        print("[SPT-watch] aktivni satovi:", wl.status())
