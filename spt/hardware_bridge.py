# -*- coding: utf-8 -*-
"""SPT — most prema stvarnom hardveru (PRODUKCIJSKO SUČELJE).

Ovaj modul definira kako se SPT spaja na prave uređaje:

  1. UWB / M2M indoor mreža (KINEXON, Inmotio)
     - sidra (anchors) u dvorani šalju pozicije tagova na gateway
     - gateway obično emitira UDP JSON tok, npr.:
         {"tag":"A7:33:91:BC:12:04","x":12.41,"y":3.87,"z":1.2,"t":0.05,"q":0.98}
     - pokreni:  python hardware_bridge.py udp 1511   (port ovisi o vendoru)

  2. GPS / GNSS trackeri (Catapult, STATSports, Polar Team Pro)
     - tipično uvoz CSV/JSON izvoza nakon treninga (pull mode)
     - ili vendor API (pull tipkovno naveden u README-u)

Da bi se most aktivirao u serveru, u server.py postavi:
    from hardware_bridge import UdpSource
    LIVE_SOURCE = UdpSource("0.0.0.0", 1511)
i zamijeni LIVE_CUM pozive s LIVE_SOURCE podacima. Sučelje je namjerno
jednostavno (drop-in) da se integracija svodi na ~30 linija po vendoru.
"""
import json
import socket
import threading


class TrackingSource:
    """Zajedničko sučelje izvora pozicijskih podataka."""

    def start(self):
        pass

    def latest_frame(self):
        """Vraća {tag_id: (x, y, z, speed, hr, ts)} — zadnje poznate vrijednosti."""
        return {}

    def stop(self):
        pass


class UdpSource(TrackingSource):
    """UDP listener za UWB/LPS gateway (KINEXON/Inmotio stil JSON toka)."""

    def __init__(self, host="0.0.0.0", port=1511):
        self.host, self.port = host, port
        self._latest = {}
        self._sock = None
        self._thread = None
        self._running = False

    def start(self):
        self._sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self._sock.bind((self.host, self.port))
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def _loop(self):
        while self._running:
            try:
                data, _ = self._sock.recvfrom(65536)
                pkt = json.loads(data.decode("utf-8"))
                # prihvaća i pojedinačne pakete i liste paketa
                items = pkt if isinstance(pkt, list) else [pkt]
                for it in items:
                    tag = it.get("tag") or it.get("id")
                    if not tag:
                        continue
                    self._latest[tag] = (
                        float(it.get("x", 0)), float(it.get("y", 0)), float(it.get("z", 0)),
                        float(it.get("speed", 0)), int(it.get("hr", 0)), float(it.get("t", 0)))
            except Exception:
                continue  # oštećeni paket — preskoči

    def latest_frame(self):
        return dict(self._latest)

    def stop(self):
        self._running = False
        if self._sock:
            self._sock.close()


class CsvImporter:
    """Uvoz povijesnih izvoza (Catapult/STATSports CSV) u bazu sesija.

    Formati se razlikuju po vendoru; ovdje je primjer za tipični Catapult
    izvoz: stupci Time, Latitude, Longitude, Speed, HeartRate, PlayerLoad.
    """

    def __init__(self, db_path="spt.db"):
        import sqlite3
        self.con = sqlite3.connect(db_path)

    def import_file(self, athlete_id, path, session_type="match"):
        import csv
        import math
        with open(path, newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        dist = 0.0
        top = 0.0
        prev = None
        for r in rows:
            if prev is not None:
                d = math.hypot(float(r["Latitude"]) - prev[0], float(r["Longitude"]) - prev[1]) * 111320
                dist += d
                top = max(top, float(r.get("Speed", 0)))
            prev = (float(r["Latitude"]), float(r["Longitude"]))
        metrics = {"dist_total": round(dist / 1000, 2), "top_speed": round(top, 1),
                   "hr_avg": 0, "srpe": int(dist / 12)}
        self.con.execute(
            "INSERT INTO sessions (athlete, sdate, stype, sport, duration, metrics) VALUES (?,?,?,?,?,?)",
            (athlete_id, rows[0].get("Date", "2026-01-01"), session_type, "nogomet",
             int(len(rows) / 10 / 60), json.dumps(metrics)))
        self.con.commit()
        return metrics


if __name__ == "__main__":
    import sys
    port = int(sys.argv[sys.argv.index("udp") + 1]) if "udp" in sys.argv else 1511
    src = UdpSource(port=port)
    src.start()
    print(f"[SPT-bridge] Slusam UDP {port} — salji KINEXON/Inmotio JSON tokove")
    try:
        while True:
            import time
            time.sleep(5)
            fr = src.latest_frame()
            if fr:
                print(f"[SPT-bridge] {len(fr)} aktivnih tagova; primjer: {list(fr.items())[0]}")
    except KeyboardInterrupt:
        src.stop()
        print("[SPT-bridge] Zaustavljen.")
