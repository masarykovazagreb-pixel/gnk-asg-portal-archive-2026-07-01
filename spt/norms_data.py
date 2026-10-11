# -*- coding: utf-8 -*-
"""SPT — Referentne norme iz javno dostupnih sportsko-znanstvenih podataka.

Vrijednosti (P10/P50/P90) za tipičnu UTAKMICU po sportu — izvor: javni
podaci FIFA/UEFA studies, NBA tracking, ječenja iz literatura o EPTS sustavima
(Catapult/STATSports reference), Wikipedia/atletski rekordi itd.
Koriste se za odstupanja: više / u okviru / manje od reference.
"""
# sport: {metrika: (p10, p50, p90)}  — utakmica
NORMS = {
    "nogomet": {"dist_total": (8.6, 10.5, 12.3), "top_speed": (29.5, 33.0, 36.2), "hr_avg": (155, 168, 178), "sprints": (35, 55, 80), "hr_max": (186, 194, 200)},
    "kosarka": {"dist_total": (3.6, 4.6, 5.8), "top_speed": (21.0, 24.5, 27.5), "hr_avg": (158, 171, 184), "jumps": (35, 55, 80)},
    "rukomet": {"dist_total": (3.4, 4.4, 5.6), "top_speed": (23.0, 26.5, 30.0), "hr_avg": (158, 170, 182), "jumps": (25, 45, 70)},
    "odbojka": {"dist_total": (1.8, 2.6, 3.4), "top_speed": (18.0, 20.5, 23.5), "jumps": (55, 90, 130)},
    "vaterpolo": {"dist_total": (2.2, 3.0, 3.9), "top_speed": (5.8, 6.8, 7.8), "hr_avg": (150, 163, 175)},
    "plivanje": {"dist_total": (3.0, 5.0, 7.5), "top_speed": (5.5, 6.5, 7.4)},
    "tenis": {"dist_total": (2.2, 3.2, 4.8), "top_speed": (18.5, 21.5, 25.0), "hr_avg": (140, 155, 170)},
    "futsal": {"dist_total": (3.2, 4.2, 5.3), "top_speed": (24.0, 27.0, 30.0), "sprints": (35, 60, 90)},
    "hokej_led": {"dist_total": (3.5, 4.5, 5.5), "top_speed": (32.0, 36.5, 41.0), "sprints": (30, 55, 85)},
    "hokej_trava": {"dist_total": (5.0, 6.5, 8.0), "top_speed": (27.0, 30.5, 34.0), "hr_avg": (155, 167, 178)},
    "ragbi": {"dist_total": (5.2, 6.5, 7.8), "top_speed": (27.5, 31.5, 35.5), "hr_avg": (160, 172, 183)},
    "ragbi_liga": {"dist_total": (5.5, 7.0, 8.5), "top_speed": (28.0, 32.0, 36.0)},
    "americki_nogomet": {"dist_total": (1.5, 2.5, 4.0), "top_speed": (28.0, 32.0, 36.5)},
    "australski_nogomet": {"dist_total": (10.0, 12.0, 14.5), "top_speed": (28.5, 32.0, 36.0)},
    "kriket": {"dist_total": (2.0, 5.0, 10.0)},
    "bejzbol": {"dist_total": (0.6, 1.2, 2.2), "top_speed": (26.0, 29.5, 33.0)},
    "lacrosse": {"dist_total": (4.0, 5.5, 7.0), "top_speed": (27.0, 30.5, 34.0)},
    "atletika_sprint": {"top_speed": (33.0, 36.5, 40.0), "hr_max": (185, 193, 199)},
    "atletika_srednje": {"dist_total": (8.0, 12.0, 16.0), "hr_avg": (168, 176, 185)},
    "atletika_duge": {"dist_total": (12.0, 16.0, 20.0), "hr_avg": (162, 171, 180)},
    "maraton": {"dist_total": (15.0, 22.0, 30.0), "avg_speed": (9.5, 12.5, 17.5)},
    "atletika_skokovi": {"top_speed": (8.8, 9.8, 10.8), "jumps": (25, 45, 70)},
    "biciklizam_cesta": {"dist_total": (60.0, 120.0, 200.0), "top_speed": (55.0, 70.0, 85.0)},
    "biciklizam_mt": {"dist_total": (25.0, 45.0, 70.0), "top_speed": (45.0, 58.0, 70.0)},
    "triatlon": {"dist_total": (30.0, 60.0, 120.0), "hr_avg": (150, 162, 174)},
    "veslanje": {"dist_total": (14.0, 20.0, 26.0), "hr_avg": (168, 178, 187)},
    "kajak_kanu": {"dist_total": (10.0, 16.0, 22.0), "hr_avg": (165, 175, 185)},
    "jedrenje": {"dist_total": (5.0, 12.0, 25.0)},
    "skijanje_alpsko": {"dist_total": (8.0, 15.0, 25.0), "top_speed": (85.0, 105.0, 130.0)},
    "skijanje_nordijsko": {"dist_total": (15.0, 25.0, 40.0), "hr_avg": (165, 175, 186)},
    "biatlon": {"dist_total": (12.0, 20.0, 30.0), "hr_avg": (165, 175, 185)},
    "snowboard": {"top_speed": (60.0, 78.0, 100.0)},
    "brzo_klizanje": {"top_speed": (45.0, 55.0, 62.0), "hr_avg": (170, 180, 190)},
    "gimnastika": {"jumps": (40, 80, 120)},
    "dizanje_utega": {"jumps": (10, 30, 60)},
    "crossfit": {"hr_avg": (155, 168, 180)},
    "boks": {"dist_total": (1.2, 2.0, 3.0), "hr_avg": (158, 170, 182)},
    "hrvanje": {"dist_total": (0.8, 1.5, 2.4), "hr_avg": (165, 176, 187)},
    "judo": {"hr_avg": (162, 174, 186), "dist_total": (0.8, 1.4, 2.2)},
    "mma": {"hr_avg": (158, 170, 183)},
    "golf": {"dist_total": (7.0, 9.5, 12.5)},
    "penjanje": {"dist_total": (0.5, 1.5, 3.0)},
    "orijentiring": {"dist_total": (6.0, 10.0, 16.0), "avg_speed": (8.0, 11.0, 14.0)},
    "kuglano": None,
}

# korekcije za žene (javni podaci: 5–15% niže vrijednosti)
FEMALE_KM = 0.88
FEMALE_TOP = 0.94

# pozicijske prilagodbe (nogomet) — udio prosjeka
FOOTBALL_POS = {"GK": 0.42, "CB": 0.92, "LB": 1.02, "RB": 1.02, "DM": 1.05, "CM": 1.08,
                "AM": 1.02, "RM": 1.04, "LM": 1.04, "RW": 1.05, "LW": 1.05, "ST": 0.96}
# košarka
BB_POS = {"PG": 1.06, "SG": 1.02, "SF": 1.0, "PF": 0.97, "C": 0.94}


def deviate(value, p10, p50, p90, higher_better=True):
    """Vraća odstupanje vrijednosti od referentnog medijana + zonu i opis."""
    if value is None:
        return None
    pct = (value - p50) / p50 * 100
    if higher_better:
        if value >= p90:
            zone = "iznad_reference"      # natprosječno
        elif value >= p50 * 0.95:
            zone = "u_okviru"
        elif value >= p10:
            zone = "ispod_reference"
        else:
            zone = "znatno_ispod"
    else:
        if value <= p10:
            zone = "iznad_reference"
        elif value <= p50 * 1.05:
            zone = "u_okviru"
        elif value <= p90:
            zone = "ispod_reference"
        else:
            zone = "znatno_ispod"
    return {"value": round(value, 2), "ref_p50": p50, "ref_p10": p10, "ref_p90": p90,
            "dev_pct": round(pct, 1), "zone": zone}


def norms_for(sport, sex="M", position=None):
    """Vraća prilagođene norme za sportaša (spol + pozicija)."""
    base = NORMS.get(sport)
    if not base:
        return {}
    out = {}
    for metric, (p10, p50, p90) in base.items():
        f = 1.0
        if sex == "F":
            f = FEMALE_KM if metric in ("dist_total",) else (FEMALE_TOP if metric == "top_speed" else 1.0)
        if sport == "nogomet" and position in FOOTBALL_POS and metric in ("dist_total", "sprints"):
            f *= FOOTBALL_POS[position]
        if sport == "kosarka" and position in BB_POS and metric in ("dist_total",):
            f *= BB_POS[position]
        out[metric] = (round(p10 * f, 2), round(p50 * f, 2), round(p90 * f, 2))
    return out


HIGHER_BETTER = {"dist_total": True, "top_speed": True, "avg_speed": True, "sprints": True,
                 "jumps": True, "hr_avg": False, "hr_max": False}

ZONE_LABELS_HR = {
    "iznad_reference": ("Iznad reference", "var(--good)"),
    "u_okviru": ("U okviru norme", "var(--accent)"),
    "ispod_reference": ("Ispod reference", "var(--amber)"),
    "znatno_ispod": ("Znatno ispod", "var(--red)"),
}
