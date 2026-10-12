# -*- coding: utf-8 -*-
"""SPT 2.0 — Čitači podataka: GPX, TCX, CSV, JSON (KINEXON), pametne vage.

Sve parseske rutine vraćaju normalizirane strukture koje se izravno
upisuju u bazu (sesije / sastav tijela). Bez vanjskih ovisnosti.
"""
import csv
import io
import json
import math
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta


# ---------------------------------------------------------------------------
# pomoćne funkcije
# ---------------------------------------------------------------------------
def _haversine(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _parse_time(s):
    s = (s or "").strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%d.%m.%Y %H:%M", "%d.%m.%Y"):
        try:
            return datetime.strptime(s.replace("+00:00", "Z").replace("Z", ""), fmt[:fmt.index('%z')] if "%z" in fmt else fmt)
        except ValueError:
            continue
    return None


def summarize_track(pts, local=False):
    """pts: [(t, lat, lon, hr, alt)] geografske koordinate;
    local=True: [(t, x_m, y_m, hr, None)] — metri (UWB/LPS tokovi npr. KINEXON)."""
    if len(pts) < 2:
        return None
    dist = 0.0
    top = 0.0
    hrs = []
    alt_gain = 0.0
    prev = None
    for p in pts:
        if prev is not None:
            if local:
                d = math.hypot(p[1] - prev[1], p[2] - prev[2])
            elif prev[1] is not None and abs(prev[1]) <= 90:
                d = _haversine(prev[1], prev[2], p[1], p[2])
            else:
                d = math.hypot(p[1] - prev[1], p[2] - prev[2])
            dist += d
            if prev[0] is not None and p[0] is not None:
                dt = (p[0] - prev[0]).total_seconds()
                if dt > 0:
                    top = max(top, d / dt * 3.6)
        if p[3]:
            hrs.append(p[3])
        if prev is not None and p[4] is not None and prev[4] is not None and p[4] > prev[4]:
            alt_gain += p[4] - prev[4]
        prev = p
    t0, t1 = pts[0][0], pts[-1][0]
    dur = int((t1 - t0).total_seconds()) if (t0 and t1) else max(1, len(pts))
    m = {
        "dist_total": round(dist / 1000, 2),
        "top_speed": round(top, 1),
        "avg_speed": round(dist / max(dur, 1) * 3.6, 1),
        "kcal": int(dur * 0.16),
        "imported": True,
    }
    if hrs:
        m["hr_avg"] = int(sum(hrs) / len(hrs))
        m["hr_max"] = int(max(hrs))
    if alt_gain:
        m["elev_gain"] = round(alt_gain, 0)
    return {"duration": dur, "date": (t0.date().isoformat() if t0 else None), "metrics": m}


# ---------------------------------------------------------------------------
# GPX
# ---------------------------------------------------------------------------
def parse_gpx(data: bytes):
    root = ET.fromstring(data)
    # toleriramo i imenske prostore i bez njih
    def _iter(name):
        for el in root.iter():
            if el.tag.split("}")[-1] == name:
                yield el
    pts = []
    for trkpt in _iter("trkpt"):
        lat = float(trkpt.get("lat"))
        lon = float(trkpt.get("lon"))
        time = None
        hr = None
        ele = None
        for child in trkpt:
            tag = child.tag.split("}")[-1]
            if tag == "time":
                time = _parse_time(child.text)
            elif tag == "ele":
                try:
                    ele = float(child.text)
                except Exception:
                    pass
            elif tag == "extensions":
                for hrel in child.iter():
                    if hrel.tag.endswith("}hr") or hrel.tag.endswith("hr"):
                        try:
                            hr = int(float(hrel.text))
                        except Exception:
                            pass
        pts.append((time, lat, lon, hr, ele))
    name = None
    for n in _iter("name"):
        name = n.text
        break
    s = summarize_track(pts)
    if not s:
        return None
    s["name"] = name
    return s


# ---------------------------------------------------------------------------
# TCX (Garmin Training Center)
# ---------------------------------------------------------------------------
def parse_tcx(data: bytes):
    root = ET.fromstring(data)
    pts = []
    dist_accum = None
    for tp in root.iter():
        if not tp.tag.endswith("}Trackpoint"):
            continue
        time = None
        lat = lon = None
        hr = None
        ele = None
        dist_acc = None
        for ch in tp:
            tag = ch.tag.split("}")[-1]
            if tag == "Time":
                time = _parse_time(ch.text)
            elif tag == "Position":
                for c2 in ch:
                    if c2.tag.endswith("}LatitudeDegrees"):
                        lat = float(c2.text)
                    elif c2.tag.endswith("}LongitudeDegrees"):
                        lon = float(c2.text)
            elif tag == "HeartRateBpm":
                for c2 in ch:
                    if c2.tag.endswith("}Value"):
                        hr = int(float(c2.text))
            elif tag == "AltitudeMeters":
                try:
                    ele = float(ch.text)
                except Exception:
                    pass
            elif tag == "DistanceMeters":
                try:
                    dist_acc = float(ch.text)
                except Exception:
                    pass
        if dist_acc is not None:
            dist_accum = dist_acc
        pts.append((time, lat, lon, hr, ele))
    s = summarize_track(pts)
    if not s and dist_accum is not None:
        s = {"duration": max(60, int(len(pts))), "date": None,
             "metrics": {"dist_total": round(dist_accum / 1000, 2), "imported": True}}
    if not s:
        return None
    if dist_accum is not None and pts and pts[0][0] is None:
        s["metrics"]["dist_total"] = round(dist_accum / 1000, 2)
    return s


# ---------------------------------------------------------------------------
# CSV — generički (Garmin/Polar/STATSports/Catapult izvozi)
# ---------------------------------------------------------------------------
_CSV_KEYS = {
    "time": ["time", "timestamp", "date", "vrijeme", "datum", "start time", "start_time"],
    "lat": ["latitude", "lat", "širina"],
    "lon": ["longitude", "lon", "lng", "dužina"],
    "hr": ["heart rate", "hr", "heartrate", "puls", "heart_rate(bpm)", "hr (bpm)"],
    "speed": ["speed", "brzina", "speed (km/h)", "velocity", "km/h"],
    "dist": ["distance", "dist", "udaljenost", "distance (m)", "total distance"],
    "ele": ["altitude", "ele", "elevation", "visina", "altitude (m)"],
    "lat_local": ["x", "pos_x", "x (m)"],
    "lon_local": ["y", "pos_y", "y (m)"],
    "weight": ["weight", "težina", "weight (kg)", "kg", "masa"],
}


def _map_cols(header):
    idx = {}
    hlow = [h.strip().lower() for h in header]
    for key, names in _CSV_KEYS.items():
        for i, h in enumerate(hlow):
            if h in names or any(h.startswith(n) for n in names):
                idx[key] = i
                break
    return idx


def parse_csv(data: bytes):
    """Pokušava parsirati CSV kao tok podataka (trčanje/vožnja) ILI kao izvoz vagе.
    Vraća {"kind": "session"|"scale"|"unknown", ...}."""
    text = data.decode("utf-8-sig", errors="replace")
    rows = list(csv.reader(io.StringIO(text)))
    rows = [r for r in rows if any(c.strip() for c in r)]
    if len(rows) < 2:
        return {"kind": "unknown", "error": "prazan CSV"}
    header = rows[0]
    idx = _map_cols(header)

    # ---- izvoz pametne vage? ----
    hlow = " ".join(h.strip().lower() for h in header)
    if "weight" in idx or "težina" in hlow or "weight (kg)" in hlow:
        sc = parse_scale_csv(data)
        if sc:
            return {"kind": "scale", "entries": sc}

    # ---- tok podataka ----
    has_geo = ("lat" in idx and "lon" in idx) or ("lat_local" in idx and "lon_local" in idx)
    has_dist = "dist" in idx
    has_speed = "speed" in idx
    if not (has_geo or has_dist or has_speed):
        return {"kind": "unknown", "error": "nema poznatih stupaca (vrijeme/lat/lon/brzina/udaljenost/težina)"}

    pts = []
    dist_acc = 0.0
    speeds = []
    hrs = []
    for r in rows[1:]:
        try:
            t = _parse_time(r[idx["time"]]) if "time" in idx and idx["time"] < len(r) else None
            hr = None
            if "hr" in idx and idx["hr"] < len(r) and r[idx["hr"]].strip():
                hr = int(float(r[idx["hr"]]))
            hrs.append(hr) if hr else None
            if "speed" in idx and idx["speed"] < len(r) and r[idx["speed"]].strip():
                speeds.append(float(str(r[idx["speed"]]).replace(",", ".")))
            if has_geo:
                if "lat" in idx:
                    lat = float(str(r[idx["lat"]]).replace(",", "."))
                    lon = float(str(r[idx["lon"]]).replace(",", "."))
                    ele = float(str(r[idx["ele"]]).replace(",", ".")) if "ele" in idx and idx["ele"] < len(r) and r[idx["ele"]].strip() else None
                else:
                    lat = float(str(r[idx["lat_local"]]).replace(",", ".")) + 200.0  # lokalne koordinate → lažne geografske
                    lon = float(str(r[idx["lon_local"]]).replace(",", ".")) + 200.0
                    ele = None
                pts.append((t, lat, lon, hr, ele))
            elif has_dist and "dist" in idx and idx["dist"] < len(r) and r[idx["dist"]].strip():
                d = float(str(r[idx["dist"]]).replace(",", "."))
                if d < dist_acc:  # resetirao se brojač — nova sesija
                    dist_acc = 0.0
                dist_acc = max(dist_acc, d)
        except (ValueError, IndexError):
            continue

    if pts:
        s = summarize_track(pts)
        if s:
            s.setdefault("metrics", {})["imported"] = True
            return {"kind": "session", **s}
    if dist_acc > 0 or speeds:
        dur = len(rows) - 1
        m = {"dist_total": round(dist_acc / 1000, 2), "imported": True}
        if speeds:
            m["top_speed"] = round(max(speeds), 1)
            m["avg_speed"] = round(sum(speeds) / len(speeds), 1)
        if hrs:
            m["hr_avg"] = int(sum(hrs) / len(hrs))
        return {"kind": "session", "duration": dur, "date": None, "metrics": m}
    return {"kind": "unknown", "error": "nije uspjelo raščlaniti retke"}


# ---------------------------------------------------------------------------
# JSON — KINEXON LPS tok / generički
# ---------------------------------------------------------------------------
def parse_json(data: bytes):
    try:
        d = json.loads(data.decode("utf-8"))
    except Exception:
        return {"kind": "unknown", "error": "neispravan JSON"}
    # KINEXON stil: {"positions": [{"t": s, "x": m, "y": m, "heartRate": bpm}]}
    items = d.get("positions") or d.get("frames") or d.get("data")
    if isinstance(items, list) and items and isinstance(items[0], dict) and "x" in items[0]:
        pts = []
        t0 = datetime(2026, 1, 1)
        for it in items:
            t = None
            if "t" in it or "time" in it:
                tt = it.get("t", it.get("time"))
                if isinstance(tt, (int, float)):
                    t = datetime.fromtimestamp(tt) if tt > 1e9 else (t0 + timedelta(seconds=float(tt)))
                else:
                    t = _parse_time(str(tt))
            pts.append((t, float(it.get("x", 0)), float(it.get("y", 0)),
                        int(it.get("heartRate", it.get("hr", 0)) or 0) or None, None))
        s = summarize_track(pts, local=True)
        if s:
            s["metrics"]["imported"] = True
            return {"kind": "session", **s}
    # rezimirana sesija u JSON-u
    if isinstance(d, dict) and any(k in d for k in ("duration", "metrics", "dist_total")):
        m = d.get("metrics", d)
        out = {"kind": "session", "duration": int(d.get("duration", m.get("duration", 60))),
               "date": d.get("date"), "metrics": dict(m, imported=True)}
        return out
    return {"kind": "unknown", "error": "nepoznata JSON struktura"}


# ---------------------------------------------------------------------------
# PAMETNE VAGE — Huawei Health / openScale (Xiaomi, Medisana...) / Withings
# ---------------------------------------------------------------------------
_SCALE_FIELDS = {
    "weight": ["weight", "težina", "weight (kg)", "kg", "masa", "weight_kg"],
    "bmi": ["bmi", "body mass index"],
    "fat": ["fat", "body fat", "body fat (%)", "tjelesna masnoća", "mast", "fat(%)", "körperwasser" + "_no", "fat_rate"],
    "muscle": ["muscle", "muscle mass", "muscle (kg)", "mišići", "mišićna masa", "muscle_mass"],
    "water": ["water", "water (%)", "tbw", "tjelesna voda", "voda", "body water", "hydration"],
    "visceral": ["visceral", "visceral fat", "visceral fat (level)", "visceralna mast"],
    "bone": ["bone", "bone mass", "koštana masa", "kost"],
    "protein": ["protein", "proteini", "protein (%)"],
    "bmr": ["bmr", "basal metabolism", "bazalni metabolizam", "kcal"],
    "metabolic_age": ["metabolic age", "metabolička dob", "body age"],
    "score": ["body score", "score", "bodovi"],
}


def parse_scale_csv(data: bytes):
    """Parsira CSV izvoze pametnih vaga (BIA). Vraća listu {date, source, ...mjere}."""
    text = data.decode("utf-8-sig", errors="replace")
    rows = list(csv.reader(io.StringIO(text)))
    rows = [r for r in rows if any(c.strip() for c in r)]
    if len(rows) < 2:
        return []
    # pronađi redak zaglavlja (nekad ima uvodnih redaka)
    hrow = 0
    for i, r in enumerate(rows[:5]):
        joined = " ".join(c.lower() for c in r)
        if any(k in joined for k in ("weight", "težina", "kg")):
            hrow = i
            break
    header = [h.strip().lower() for h in rows[hrow]]
    colmap = {}
    for field, names in _SCALE_FIELDS.items():
        for i, h in enumerate(header):
            if h in names:
                colmap[field] = i
                break
    if "weight" not in colmap:
        return []
    entries = []
    # stupac s datumom
    date_idx = None
    for i, h in enumerate(header):
        if h in ("date", "datum", "start time", "time", "vrijeme", "timestamp", "measurement time"):
            date_idx = i
            break
    for r in rows[hrow + 1:]:
        try:
            w = float(str(r[colmap["weight"]]).replace(",", "."))
        except (ValueError, IndexError):
            continue
        e = {"weight": w}
        for field in ("bmi", "fat", "muscle", "water", "visceral", "bone", "protein", "bmr", "metabolic_age"):
            i = colmap.get(field)
            if i is not None and i < len(r) and r[i].strip():
                try:
                    v = float(str(r[i]).replace(",", "."))
                    if field == "metabolic_age":
                        v = int(v)
                    e[field] = v
                except ValueError:
                    pass
        if date_idx is not None and date_idx < len(r):
            dt = _parse_time(r[date_idx])
            e["date"] = dt.date().isoformat() if dt else None
        e.setdefault("date", None)
        entries.append(e)
    return entries


def detect_and_parse(filename: str, data: bytes):
    """Glavni ulaz: odredi tip datoteke i parsiraj."""
    fn = filename.lower()
    if fn.endswith(".gpx"):
        r = parse_gpx(data)
        return {"kind": "session", **r} if r else {"kind": "unknown", "error": "GPX bez točaka"}
    if fn.endswith(".tcx"):
        r = parse_tcx(data)
        return {"kind": "session", **r} if r else {"kind": "unknown", "error": "TCX bez točaka"}
    if fn.endswith(".json"):
        return parse_json(data)
    if fn.endswith(".csv"):
        return parse_csv(data)
    # pokušaj po sadržaju
    head = data[:512].lstrip()
    if head.startswith(b"<?xml") or head.startswith(b"<gpx"):
        r = parse_gpx(data)
        if r:
            return {"kind": "session", **r}
        r = parse_tcx(data)
        if r:
            return {"kind": "session", **r}
    if head.startswith(b"{") or head.startswith(b"["):
        return parse_json(data)
    return parse_csv(data)
