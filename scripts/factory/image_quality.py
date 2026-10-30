#!/usr/bin/env python3
"""Provjera kvalitete fotografija i kartica (tvornica, faza 5). Samo čita.

Za svaku .webp/.jpg/.png sliku pod apps/portal mjeri:
  - dimenzije, veličinu datoteke, srednju svjetlinu i kontrast
  - "tamno_provjeri" : prosječna svjetlina < 30 i kontrast < 22. Može biti namjerno tamni
                       dizajn; samo za ručni pregled, nije greška.
  - "ravna"          : kontrast < 10 (jednolična, vjerojatno prazna)
  - "premala"        : kraća stranica < 300 px (responzivne varijante -240/-440/... su izuzete)
  - "pretezka"       : > 400 KB
  - "duplikat"       : identičan sadržaj (SHA-256) pod različitim osnovnim nazivom
                       (ista slika u više veličina nije duplikat)
  - "necitljiva"     : datoteka se ne može otvoriti

Zapisuje artifacts/factory/image-quality.json. Ne mijenja slike.
Pokretanje: python3 scripts/factory/image_quality.py [--strict]
"""
import collections
import hashlib
import json
import os
import re
import sys
import warnings

from PIL import Image, ImageStat

warnings.filterwarnings("ignore", category=UserWarning)

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
PORTAL = os.path.join(ROOT, "apps", "portal")
OUT = os.path.join(ROOT, "artifacts", "factory", "image-quality.json")
EXTS = (".webp", ".jpg", ".jpeg", ".png")
# Responzivne varijante (-240, -440, -880, -tile-192 ...) su namjerno manje od izvorne slike.
VARIANT = re.compile(r"-(\d{3,4}|tile(-\d+)?|og)\.(webp|jpg|jpeg|png)$", re.I)
STEM = re.compile(r"-(\d{3,4}|tile(-\d+)?|og)$", re.I)

DARK_MEAN, DARK_STD = 30, 22
FLAT_STD = 10
MIN_SIDE = 300
HEAVY_BYTES = 400 * 1024


def ahash(im):
    g = im.convert("L").resize((8, 8), Image.BILINEAR)
    px = list(g.tobytes())
    avg = sum(px) / len(px)
    bits = 0
    for i, p in enumerate(px):
        if p > avg:
            bits |= 1 << i
    return f"{bits:016x}"


def measure(path):
    rec = {"bytes": os.path.getsize(path), "flags": []}
    try:
        with open(path, "rb") as fh:
            rec["sha"] = hashlib.sha256(fh.read()).hexdigest()
        with Image.open(path) as im:
            w, h = im.size
            rec["w"], rec["h"] = w, h
            rgb = im.convert("RGBA").convert("RGB") if im.mode in ("P", "LA", "RGBA") else im.convert("RGB")
            st = ImageStat.Stat(rgb)
            mean = sum(st.mean) / 3
            std = sum(st.stddev) / 3
            rec["mean"] = round(mean, 1)
            rec["std"] = round(std, 1)
            rec["ahash"] = ahash(rgb)
    except Exception as e:  # nečitljiva slika je sama po sebi nalaz
        rec["flags"].append("necitljiva")
        rec["error"] = str(e)[:120]
        return rec
    if rec["mean"] < DARK_MEAN and rec["std"] < DARK_STD:
        rec["flags"].append("tamno_provjeri")
    elif rec["std"] < FLAT_STD:
        rec["flags"].append("ravna")
    if min(rec["w"], rec["h"]) < MIN_SIDE and not VARIANT.search(os.path.basename(path)):
        rec["flags"].append("premala")
    if rec["bytes"] > HEAVY_BYTES:
        rec["flags"].append("pretezka")
    return rec


def main():
    strict = "--strict" in sys.argv
    files = []
    for dp, _, fns in os.walk(PORTAL):
        for fn in fns:
            if fn.lower().endswith(EXTS):
                files.append(os.path.join(dp, fn))
    files.sort()

    records = {}
    for f in files:
        records[os.path.relpath(f, ROOT)] = measure(f)

    # duplikat = identičan sadržaj u istom direktoriju pod različitim osnovnim nazivom
    by_dir = collections.defaultdict(lambda: collections.defaultdict(list))
    for rel, r in records.items():
        if "sha" in r and "necitljiva" not in r["flags"]:
            stem = STEM.sub("", os.path.splitext(os.path.basename(rel))[0])
            by_dir[os.path.dirname(rel)][r["sha"]].append((stem, rel))
    dup_groups = []
    for d, groups in by_dir.items():
        for h, members in groups.items():
            stems = {m[0] for m in members}
            if len(stems) > 1:
                rels = [m[1] for m in members]
                dup_groups.append({"dir": d, "count": len(rels), "stems": sorted(stems), "files": rels[:12]})
                for m in rels:
                    records[m]["flags"].append("duplikat")

    flag_counts = collections.Counter(fl for r in records.values() for fl in r["flags"])
    by_folder = collections.Counter()
    for rel, r in records.items():
        if r["flags"]:
            by_folder[os.path.dirname(rel)] += 1

    summary = {
        "version": "IMAGE_QUALITY_V1",
        "images": len(records),
        "flagged": sum(1 for r in records.values() if r["flags"]),
        "flag_counts": dict(flag_counts),
        "duplicate_groups": len(dup_groups),
        "thresholds": {
            "tamno_provjeri": f"mean<{DARK_MEAN} & std<{DARK_STD}",
            "ravna": f"std<{FLAT_STD}",
            "premala": f"min(w,h)<{MIN_SIDE} (bez responzivnih varijanti)",
            "pretezka": f"bytes>{HEAVY_BYTES}",
        },
        "flagged_by_folder": dict(by_folder.most_common(25)),
    }
    out = {"summary": summary, "duplicate_groups": dup_groups[:200],
           "images": {k: v for k, v in records.items() if v["flags"]}}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    print(json.dumps(summary, ensure_ascii=False, indent=1))
    if strict and flag_counts.get("necitljiva", 0):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
