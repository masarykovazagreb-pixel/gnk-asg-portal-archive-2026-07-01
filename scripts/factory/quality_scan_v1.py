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
from html.parser import HTMLParser
import json
import os
import re
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
PORTAL = os.path.join(ROOT, "apps", "portal")
OUT = os.path.join(ROOT, "artifacts", "factory", "quality-scan.json")
SKIP_DIRS = {"node_modules", ".git", "assets", "data"}

RE_VERIFY = re.compile(r"^google[0-9a-f]+\.html$", re.I)
RADIO = "AKTUAL MEDIA RADIO"


class PageMetadata(HTMLParser):
    """Čita HTML atribute bez ovisnosti o redoslijedu, navodnicima ili komentarima."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lang = False
        self.title = ""
        self.desc = ""
        self.h1 = ""
        self.canonical = False
        self.noindex = False
        self.bad_ld = 0
        self._capture = None
        self._parts = []
        self._title_seen = False
        self._h1_seen = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "html":
            self.lang = bool((attrs.get("lang") or "").strip())
        elif tag == "meta":
            name = (attrs.get("name") or "").lower().strip()
            content = (attrs.get("content") or "").strip()
            if name == "description" and not self.desc:
                self.desc = content
            if name in ("robots", "googlebot") and "noindex" in re.split(r"[,\s]+", content.lower()):
                self.noindex = True
        elif tag == "link":
            if "canonical" in (attrs.get("rel") or "").lower().split():
                self.canonical = True
        elif tag == "title" and not self._title_seen and self._capture is None:
            self._title_seen = True
            self._capture, self._parts = "title", []
        elif tag == "h1" and not self._h1_seen and self._capture is None:
            self._h1_seen = True
            self._capture, self._parts = "h1", []
        elif tag == "script" and (attrs.get("type") or "").strip().lower() == "application/ld+json":
            self._capture, self._parts = "script", []

    def handle_data(self, data):
        if self._capture:
            self._parts.append(data)

    def handle_endtag(self, tag):
        if tag != self._capture:
            return
        value = "".join(self._parts).strip()
        if tag == "script":
            try:
                json.loads(value)
            except ValueError:
                self.bad_ld += 1
        else:
            setattr(self, tag, value)
        self._capture, self._parts = None, []


def parse_metadata(html):
    parser = PageMetadata()
    parser.feed(html)
    parser.close()
    return parser


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
        metadata = parse_metadata(h)
        rows.append({
            "verify": bool(RE_VERIFY.match(os.path.basename(path))),
            "noindex": metadata.noindex,
            "page": rel,
            "channel": channel_of(rel),
            "lang": metadata.lang,
            "title": metadata.title,
            "desc": metadata.desc,
            "h1": metadata.h1,
            "canonical": metadata.canonical,
            "bad_ld": metadata.bad_ld,
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
