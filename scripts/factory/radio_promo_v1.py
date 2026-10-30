#!/usr/bin/env python3
"""Promotivni blok za AKTUAL MEDIA RADIO na vlastitim stranicama (tvornica, faza 6).

Dodaje na svaku indeksabilnu HTML stranicu pod apps/portal jedan jasno označen blok
prije </body>:

  <!-- radio-promo-v1:start --> ... <!-- radio-promo-v1:end -->

Sadržaj: logotip AKTUAL MEDIA, kratki tekst (HR ili EN prema <html lang>), poveznica
na radio (/radio/ ili /en/radio/), urednički voditelj Nermin Sefić, i hashtagovi
(#AktualMediaRadio, #NerminSefić, #NerminSefic, #AktualMedia, #GNKASG).

Pravila:
  - Samo dodaje/zamjenjuje vlastiti blok. Ne dira postojeće slojeve, meta redove
    ni CSS. Stil je inline, da se ne mijenja zajednički CSS.
  - Idempotentno: drugi prolaz ne mijenja ništa.
  - Preskače: radio stranice (/radio/, /en/radio/), putanje podijeli/, stranice s
    noindex, direktorije data/ i assets/.
  - Nema LLM-a: tekst je fiksni predložak (deterministički).

Upotreba:
  python3 scripts/factory/radio_promo_v1.py           # primijeni
  python3 scripts/factory/radio_promo_v1.py --check   # izvijesti, exit 1 ako ima odstupanja
"""
import os
import re
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
PORTAL = os.path.join(ROOT, "apps", "portal")

START = "<!-- radio-promo-v1:start -->"
END = "<!-- radio-promo-v1:end -->"
BLOCK_RE = re.compile(re.escape(START) + r".*?" + re.escape(END), re.S)

SKIP_DIRS = {"data", "assets", "node_modules"}
SKIP_PREFIX = ("podijeli/",)
RADIO_PATHS = ("radio/", "en/radio/")
NOINDEX_RE = re.compile(r'<meta[^>]+name=["\']robots["\'][^>]+noindex', re.I)

TEXT = {
    "hr": {
        "logo": "/assets/brand/aktual-media-hr.svg",
        "logo_alt": "AKTUAL MEDIA",
        "href": "/radio/",
        "title": "AKTUAL MEDIA RADIO",
        "body": ("Internetski audio streamovi uz GNK ASG portal. Player se otvara klikom, "
                 "pamti stanicu i glasnoću i ne prekriva tekst. Stanice trećih strana ostaju njihove."),
        "cta": "Slušaj radio →",
        "editor": "Urednički voditelj: Nermin Sefić.",
    },
    "en": {
        "logo": "/assets/brand/aktual-media-en.svg",
        "logo_alt": "AKTUAL MEDIA",
        "href": "/en/radio/",
        "title": "AKTUAL MEDIA RADIO",
        "body": ("Internet audio streams alongside the GNK ASG portal. The player opens with one click, "
                 "remembers station and volume, and does not cover the text. Third-party stations remain theirs."),
        "cta": "Listen to the radio →",
        "editor": "Editorial lead: Nermin Sefić.",
    },
}
HASHTAGS = "#AktualMediaRadio #NerminSefić #NerminSefic #AktualMedia #GNKASG"


def lang_of(html):
    m = re.search(r"<html[^>]*\blang=[\"']([a-zA-Z-]+)", html)
    return "en" if m and m.group(1).lower().startswith("en") else "hr"


def build_block(lang):
    t = TEXT[lang]
    return (
        f"{START}"
        '<aside class="radio-promo-v1" aria-label="' + t["title"] + '" '
        'style="max-width:1100px;margin:28px auto;padding:18px 20px;border:1px solid rgba(212,175,55,.45);'
        'border-radius:12px;background:#0d2038;color:#e8edf3;font:16px/1.5 Arial,Helvetica,sans-serif;'
        'display:flex;gap:18px;align-items:center;flex-wrap:wrap">'
        f'<img src="{t["logo"]}" alt="{t["logo_alt"]}" width="150" height="40" loading="lazy" '
        'style="height:40px;width:auto">'
        '<div style="flex:1 1 320px;min-width:0">'
        f'<strong style="display:block;color:#ffe08a;letter-spacing:.04em">{t["title"]}</strong>'
        f'<p style="margin:6px 0 8px">{t["body"]}</p>'
        f'<p style="margin:0 0 6px"><a href="{t["href"]}" style="color:#d4af37;font-weight:700">{t["cta"]}</a> '
        f'<span style="opacity:.85">{t["editor"]}</span></p>'
        f'<p style="margin:0;font-size:14px;color:#cbd5e1">{HASHTAGS}</p>'
        "</div></aside>"
        f"{END}"
    )


def is_target(rel, html):
    rel = rel.replace(os.sep, "/")
    parts = rel.split("/")
    if any(p in SKIP_DIRS for p in parts[:-1]):
        return False
    if rel.startswith(SKIP_PREFIX):
        return False
    if any(rel.startswith(p) or ("/" + p) in ("/" + rel) for p in RADIO_PATHS):
        return False
    if NOINDEX_RE.search(html[:4000]):
        return False
    return True


def process(path, rel, write):
    with open(path, encoding="utf-8", errors="replace") as fh:
        html = fh.read()
    if not is_target(rel, html):
        return "skip"
    block = build_block(lang_of(html))
    if START in html:
        new = BLOCK_RE.sub(lambda _m: block, html, count=1)
    else:
        idx = html.rfind("</body>")
        if idx < 0:
            return "no-body"
        new = html[:idx] + block + html[idx:]
    if new == html:
        return "ok"
    if write:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(new)
    return "changed"


def run(write=True):
    counts = {"changed": 0, "ok": 0, "skip": 0, "no-body": 0}
    for dp, dns, fns in os.walk(PORTAL):
        dns[:] = [d for d in dns if d not in SKIP_DIRS]
        for fn in fns:
            if not fn.endswith(".html"):
                continue
            path = os.path.join(dp, fn)
            rel = os.path.relpath(path, PORTAL)
            counts[process(path, rel, write)] += 1
    return counts


def main():
    check = "--check" in sys.argv
    counts = run(write=not check)
    print(counts)
    if check and counts["changed"]:
        print("radio-promo-v1: odstupanja %d (pokreni bez --check)" % counts["changed"])
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
