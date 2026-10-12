# -*- coding: utf-8 -*-
"""SPT 2.0 — BioSenzor: analiza glasa, disanja i ritma srca.

Realističan pristup (bez crnutih kutija):
  - GLAS: preglednik snima 8 s mikrofonom (Web Audio API) i računa obilježja:
    RMS energija, osnovni ton (pitch, autocorrelation), varijabilnost tona,
    tempo govora (broj "zglobnih" energijskih naglih skokova).
    Poslužitelj iz obilježja računa indeks stresa glasa (0–100).
  - DISANJE: iz omotnice amplitude zvuka (bez govora) detektira se periodicnost
    0,1–0,7 Hz → frekvencija disanja (disanja/min) i pravilnost.
  - SRCE: ritam srca ne možemo mikorfonom mjeriti pouzdano — SPT koristi
    podatke pulsa iz pojasa/sata (HR + RR intervali) i iz njih računa
    ritam, HRV i zastavice aritmije (prevelika odstupanja RR intervala).
    Ako nema pojasa, prikazuje se model referentnog ritma (označeno!).

Sve vrijednosti uspoređuju se s bazom sportaša i anomalije idu CRVENO.
"""
import math
import random


def analyze_voice_features(f):
    """f: {rms, pitch, pitch_var, tempo, centroid, env_rate, env_reg, dur}
    Vraća indekse + zastavice."""
    stress = 0.0
    stress += min(40, max(0, (f.get("pitch") or 150) - 140) * 0.55)          # viši ton → više stresa
    stress += min(30, (f.get("pitch_var") or 0) * 260)                        # drhtanje tona
    stress += min(20, max(0, (f.get("tempo") or 2.0) - 3.2) * 12)             # ubrzan govor
    stress += min(10, max(0, (f.get("rms") or 0.05) - 0.14) * 60)             # napet, glasan govor
    stress = round(min(100, max(3, stress)), 1)

    br = f.get("env_rate") or 0.0
    breathing = round(br * 60, 1) if 6 < br * 60 < 40 else None               # disanja/min
    br_reg = round(f.get("env_reg") or 0, 2)                                   # 0–1 pravilnost

    out = {
        "stress_index": stress,
        "stress_label": "nizak" if stress < 35 else ("umjeren" if stress < 65 else "visok"),
        "pitch_hz": round(f.get("pitch") or 0, 1),
        "speech_tempo": round(f.get("tempo") or 0, 2),
        "breathing_rate": breathing,
        "breathing_regularity": br_reg,
        "voice_fatigue": round(min(100, max(0, 60 - (f.get("rms") or 0.05) * 300 + (f.get("pitch") or 150) * 0.05)), 1),
        "flags": [],
    }
    if stress >= 70:
        out["flags"].append("VISOK STRES U GLASU — razmotriti razgovor i smanjiti današnje opterećenje")
    if breathing and breathing > 26:
        out["flags"].append("UBRZANO DISANJE U MIROVANJU (" + str(breathing) + "/min) — mogući umor ili tjeskoba")
    if br_reg and br_reg < 0.35:
        out["flags"].append("NEPRAVILNO DISANJE — vježbe disanja prije treninga")
    return out


def analyze_heart(rr_intervals):
    """rr_intervals: lista RR intervala u ms (iz HR pojasa / sata).
    Računa puls, SDNN, RMSSD i zastavice nepravilnosti."""
    if not rr_intervals or len(rr_intervals) < 5:
        return {"hr": None, "flags": ["NEMA PODATAKA O PULSU — spoji pojas/sat"], "note": "referentni prikaz"}
    hr = round(60000 / (sum(rr_intervals) / len(rr_intervals)), 0)
    diffs = [abs(rr_intervals[i] - rr_intervals[i - 1]) for i in range(1, len(rr_intervals))]
    rmssd = round(math.sqrt(sum(d * d for d in diffs) / len(diffs)), 1)
    sd = round(math.sqrt(sum((r - sum(rr_intervals) / len(rr_intervals)) ** 2 for r in rr_intervals) / len(rr_intervals)), 1)
    flags = []
    if hr > 100:
        flags.append(f"TAHIKARDIJA U MIROVANJU ({hr:.0f} bpm) — provjeri oporavak")
    if hr < 40:
        flags.append(f"NISKI PULS ({hr:.0f} bpm) — ako nije za sportaša izdržljivosti, provjeri")
    if any(d > 300 for d in diffs):
        flags.append("ZAPAZENA VELIKA ODSTUPANJA RR INTERVALA — preporučujem liječničku evaluaciju (nije dijagnoza)")
    if rmssd < 20:
        flags.append(f"VRLO NISKA HRV (RMSSD {rmssd} ms) — simpatikus dominira, oporavak upitan")
    return {"hr": hr, "rmssd": rmssd, "sdnn": sd, "flags": flags,
            "series": rr_intervals[:120]}


def demo_rr(seed=1):
    """Referentni (modelirani) RR niz za demo bez pojasa — s respiratornom
    sinus aritmijom (prirodna varijacija pulsa uz disanje)."""
    rnd = random.Random(seed)
    rr = []
    base = 820
    for i in range(90):
        base += rnd.uniform(-3, 3)
        base = max(700, min(980, base))
        rsa = 28 * math.sin(i / 4.7)          # respiratorna sinus aritmija
        v = base + rsa + rnd.uniform(-6, 6)
        if 40 < i < 44:                        # jedna "ekstrasistola" za demo detekcije
            v -= 110
        rr.append(round(v, 1))
    return rr
