#!/usr/bin/env python3
"""Skener kvalitete svih objavljenih HTML stranica (tvornica V1). Samo čita.

Mjeri, po stranici:
  - <html lang> prisutan
  - <title> prisutan i jedinstven među stranicama
  - meta description prisutan, jedinstven, dužine (kratki < 50 znakova)
  - rel=canonical prisutan
  - JSON-LD blokovi parsabilni
  - naslov (h1) duljine > 60 znakova (po kanalu)
  - oznaka "AKTUAL MEDIA RADIO" (aria-label/tekst) i broj stranica s radio-promo blokom

Zapisuje artifacts/factory/quality-scan.json i ispisuje sažetak.
Pokretanje: python3 scripts/factory/quality_scan_v1.py
"""
import collections
import html as htmlmod
import json
import os
import re
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
PORTAL = os.path.join(ROOT, "apps", "portal")
OUT = os.path.join(ROOT, "artifacts", "factory", "quality-scan.json")
SKIP_DIRS = {"node_modules", ".git", "assets", "data"}

RE_LANG = re.compile(r"<html[^>]*\blang=", re.I)
RE_TITLE = re.compile(r"<title>([\s\S]*?)</title>", re.I)
RE_DESC = re.compile(r'<meta\s+name="description"\s+content="([^"]*)"', re.I)
RE_CANON = re.compile(r'<link\b[^>]*\brel="canonical"', re.I)
RE_LD = re.compile(r'<script type="application/ld\+json">([\s\S]*?)</script>', re.I)
RE_H1 = re.compile(r"<h1[^>]*>([\s\S]*?)</h1>", re.I)
RE_NOINDEX = re.compile(r'<meta\s+name="robots"[^>]*noindex', re.I)
RE_VERIFY = re.compile(r"^google[0-9a-f]+\.html$", re.I)
RE_TAGS = re.compile(r"<[^>]+>")
RADIO = "AKTUAL MEDIA RADIO"


def pages():
    for dp, dns, fns in os.walk(PORTAL):
        dns[:] = [d for d in dns if d not in SKIP_DIRS]
        for fn in fns:
            if fn.endswith(".html"):
                yield os.path.join(dp, fn)


def channel_of(rel):
    parts = rel.split(os.sep)
    if len(parts) > 2 and parts[0] == "kanal":
        return parts[1]
    return parts[0] if len(parts) > 1 else "_root"


def main():
    rows = []
    for path in pages():
        rel = os.path.relpath(path, PORTAL)
        with open(path, encoding="utf-8", errors="replace") as f:
            h = f.read()
        title = htmlmod.unescape(RE_TITLE.search(h).group(1).strip()) if RE_TITLE.search(h) else ""
        m = RE_DESC.search(h)
        desc = htmlmod.unescape(m.group(1)).strip() if m else ""
        h1m = RE_H1.search(h)
        h1 = htmlmod.unescape(RE_TAGS.sub("", h1m.group(1))).strip() if h1m else ""
        bad_ld = 0
        for block in RE_LD.findall(h):
            # JSON-LD koji se sastavlja u JavaScriptu (predložak u stringu) nije statički blok.
            if not block.lstrip().startswith(("{", "[")):
                continue
            try:
                json.loads(block)
            except ValueError:
                bad_ld += 1
        rows.append({
            "verify": bool(RE_VERIFY.match(os.path.basename(path))),
            "noindex": bool(RE_NOINDEX.search(h)),
            "page": rel,
            "channel": channel_of(rel),
            "lang": bool(RE_LANG.search(h)),
            "title": title,
            "desc": desc,
            "h1": h1,
            "canonical": bool(RE_CANON.search(h)),
            "bad_ld": bad_ld,
            "radio_label": RADIO in h,
            "radio_promo": "radio-promo-v1" in h,
        })

    title_count = collections.Counter(r["title"] for r in rows if r["title"])
    desc_count = collections.Counter(r["desc"] for r in rows if r["desc"])
    long_h1 = collections.Counter()
    for r in rows:
        if len(r["h1"]) > 60:
            long_h1[r["channel"]] += 1

    summary = {
        "pages": len(rows),
        "missing_lang": sum(1 for r in rows if not r["lang"] and not r["verify"]),
        "missing_title": sum(1 for r in rows if not r["title"] and not r["verify"]),
        "duplicate_title_pages": sum(c for c in title_count.values() if c > 1),
        "distinct_duplicate_titles": sum(1 for c in title_count.values() if c > 1),
        "missing_description": sum(1 for r in rows if not r["desc"]),
        "duplicate_description_pages": sum(c for c in desc_count.values() if c > 1),
        "short_description_under_50": sum(1 for r in rows if r["desc"] and len(r["desc"]) < 50),
        "missing_canonical": sum(1 for r in rows if not r["canonical"] and not r["noindex"] and not r["verify"]),
        "invalid_json_ld_blocks": sum(r["bad_ld"] for r in rows),
        "h1_over_60_chars": sum(long_h1.values()),
        "h1_over_60_by_channel": dict(long_h1.most_common()),
        "radio_label_pages": sum(1 for r in rows if r["radio_label"]),
        "radio_promo_pages": sum(1 for r in rows if r["radio_promo"]),
    }
    detail = {
        "missing_lang": [r["page"] for r in rows if not r["lang"] and not r["verify"]][:200],
        "missing_canonical": [r["page"] for r in rows if not r["canonical"] and not r["noindex"] and not r["verify"]][:200],
        "invalid_json_ld": [r["page"] for r in rows if r["bad_ld"]][:200],
        "short_descriptions": [{"page": r["page"], "desc": r["desc"]} for r in rows if r["desc"] and len(r["desc"]) < 50][:200],
        "noindex_pages_without_canonical": [r["page"] for r in rows if not r["canonical"] and r["noindex"]][:200],
        "top_duplicate_titles": [{"title": t, "pages": c} for t, c in title_count.most_common(20) if c > 1],
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"version": "FACTORY_QUALITY_SCAN_V1", "summary": summary, "detail": detail}, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
