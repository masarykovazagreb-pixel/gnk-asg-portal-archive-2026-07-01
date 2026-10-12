#!/usr/bin/env python3
"""Idempotentno uključuje članak „Parametri i analize — 64 parametra koje SPT mjeri” u portal:
kartice na /objave/ i /en/publications/, editorial-registry (HR i EN slug), approved_mentions,
kolumne.json, AKTUAL fallback poveznice, gumb u SPT bloku na AKTUAL MEDIA, poveznicu iz prvog
SPT članka te kanonske generatore registryja i editorial-sitemapa.

Pokretanje (iz korijena repozitorija, NAKON build_params_article.py):
    /home/user/.venv/bin/python spt/marketing/showcase/integrate_params_article.py

produced by GNK ASG · autor: Nermin Sefić
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build_params_article as bp  # noqa: E402
import integrate_portal as ip  # noqa: E402  (isti idempotentni koraci kao za prvi SPT članak)

e = ip.e
HR_PATH, EN_PATH = bp.ROUTES["hr"], bp.ROUTES["en"]
SLUGS = {"hr": bp.SLUG_HR, "en": bp.SLUG_EN}
IMG, IMG720 = "/spt/img/analytics_screen.webp", "/spt/img/analytics_screen-720.webp"
FIRST = bp.FIRST_ARTICLE

HR = dict(
    title=bp.T["hr"]["title"], seo=bp.T["hr"]["seo"], desc=bp.T["hr"]["desc"], lead=bp.T["hr"]["lead"],
    summary="Svih 64 parametra po skupinama — s jedinicom, izvorom i onim što pokazuju — te šest analiza i sve funkcije sustava SPT.",
    alt=bp.T["hr"]["cover_alt"], keywords=bp.T["hr"]["keywords"],
    hashtags=["GNKASG", "GNKDINAMOLtd", "NerminSefic", "SPT", "SportsPerformanceTracking", "SportskaAnalitika", "64Parametra", "ACWR", "HRV", "SportskaPrehrana"],
)
EN = dict(
    title=bp.T["en"]["title"], seo=bp.T["en"]["seo"], desc=bp.T["en"]["desc"], lead=bp.T["en"]["lead"],
    summary="All 64 parameters by group — with the unit, the source and what each one shows — plus the six analyses and every SPT feature.",
    alt=bp.T["en"]["cover_alt"], keywords=bp.T["en"]["keywords"],
    hashtags=["GNKASG", "GNKDINAMOLtd", "NerminSefic", "SPT", "SportsPerformanceTracking", "SportsAnalytics", "64Parameters", "ACWR", "HRV", "SportsNutrition"],
)
AKTUAL_BTN = {"hr": "64 parametra", "en": "64 parameters"}
DEEP = {
    "hr": "<strong>Detaljno:</strong> svih 64 parametra s objašnjenjima, šest analiza i sve funkcije u posebnom članku →",
    "en": "<strong>In depth:</strong> all 64 parameters explained, the six analyses and every feature in a dedicated article →",
}


def card(lang: str) -> str:
    d, hr = (HR, True) if lang == "hr" else (EN, False)
    eyebrow = "Sport i tehnologija · 12. listopada 2026." if hr else "Sport &amp; technology · 12 October 2026"
    cta = "Pročitaj objavu →" if hr else "Open publication →"
    route = HR_PATH if hr else EN_PATH
    return (f'<article class="editorial-card"><img src="{IMG720}" alt="{e(d["alt"])}" title="{e(d["title"])}" width="720" height="393" loading="eager">'
            f'<p class="eyebrow">{eyebrow}</p><h2>{e(d["title"])}</h2><p>{e(d["summary"])}</p><a href="{route}">{cta}</a></article>')


def registry() -> None:
    path = ip.P / "data" / "editorial-registry.json"
    r = json.loads(path.read_text(encoding="utf-8"))
    have = {it.get("path") for it in r["items"]}
    new = []
    for lang, d, route, coll in (("hr", HR, HR_PATH, "Objave"), ("en", EN, EN_PATH, "Publications")):
        if route in have:
            continue
        new.append({"slug": SLUGS[lang], "type": "objava", "collection": coll, "path": route, "url": ip.SITE + route,
                    "title": d["title"], "description": d["desc"], "keywords": d["keywords"], "hashtags": d["hashtags"],
                    "image": ip.OG, "publishedAt": bp.PUB, "inPlan": False, "seoComplete": True, "language": lang})
    if not new:
        return
    r["items"] = new + r["items"]
    items = r["items"]
    r["total"] = len(items)
    by: dict[str, int] = {}
    for it in items:
        by[it.get("type")] = by.get(it.get("type"), 0) + 1
    r["byType"] = {k: by.get(k, 0) for k in r.get("byType", {})} | {k: v for k, v in by.items() if k not in r.get("byType", {})}
    r["inPlan"] = sum(1 for it in items if it.get("inPlan"))
    r["outsidePlan"] = r["total"] - r["inPlan"]
    r["seoIncomplete"] = sum(1 for it in items if not it.get("seoComplete"))
    r["generatedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + "000Z"
    ip.write(path, json.dumps(r, ensure_ascii=False, indent=2) + "\n")


def kolumne() -> None:
    path = ip.P / "data" / "kolumne.json"
    arr = json.loads(path.read_text(encoding="utf-8"))
    items = arr if isinstance(arr, list) else arr.get("items", [])
    if any(x.get("url") == ip.SITE + HR_PATH for x in items):
        return
    entry = {
        "slug": SLUGS["hr"], "naslov": HR["title"], "seo_naslov": HR["seo"], "meta_opis": HR["desc"],
        "slika": IMG, "slika_autor": "GNK ASG d.o.o.", "slika_licenca": "ilustracija sustava SPT · produced by GNK ASG",
        "slika_izvor": None, "objavljeno": "2026-10-12T14:30:00.000Z", "path": HR_PATH, "url": ip.SITE + HR_PATH,
        "tekst": HR["lead"], "naslov_en": EN["title"], "seo_naslov_en": EN["seo"], "meta_opis_en": EN["desc"],
        "tekst_en": EN["lead"], "slika_alt": HR["alt"], "slika_alt_en": EN["alt"],
        "url_en": ip.SITE + EN_PATH, "tag": "SPT · Sports Performance Tracking",
    }
    items.insert(0, entry)
    ip.write(path, json.dumps(arr, ensure_ascii=False, indent=2))  # izvorni format: bez završnog \n


def aktual_spt_button(rel: str, lang: str) -> None:
    """Gumb „64 parametra” u SPT bloku (section.am-spt) na AKTUAL MEDIA."""
    path = ip.P / rel
    s = path.read_text(encoding="utf-8")
    route = HR_PATH if lang == "hr" else EN_PATH
    i = s.find('<section class="am-spt"')
    if i < 0:
        raise SystemExit(f"am-spt blok nije pronađen: {rel}")
    j = s.find('<div class="am-spt-cta">', i)
    k = s.find("</div>", j)
    if j < 0 or k < 0:
        raise SystemExit(f"am-spt-cta nije pronađen: {rel}")
    if f'href="{route}"' in s[j:k]:
        return
    ip.write(path, s[:k] + f'<a href="{route}">{AKTUAL_BTN[lang]}</a>' + s[k:])


def first_article_link(lang: str) -> None:
    """Poveznica iz prvog SPT članka (odjeljak #parametri) na detaljni članak."""
    path = ip.P / FIRST[lang].strip("/") / "index.html"
    s = path.read_text(encoding="utf-8")
    route = HR_PATH if lang == "hr" else EN_PATH
    if f'href="{route}"' in s:
        return
    i = s.find('<h2 id="parametri">')
    if i < 0:
        raise SystemExit(f"#parametri nije pronađen: {path}")
    j = s.find("</p>", s.find("<p>", i))
    if j < 0:
        raise SystemExit(f"uvodni odlomak #parametri nije pronađen: {path}")
    j += len("</p>")
    ip.write(path, s[:j] + f'<p><a href="{route}">{DEEP[lang]}</a></p>' + s[j:])


def columns_itemlist_en() -> None:
    """/en/gnk-aktual/columns/: JSON-LD ItemList zrcali data/kolumne.json (EN URL gdje postoji)."""
    path = ip.P / "en" / "gnk-aktual" / "columns" / "index.html"
    s = path.read_text(encoding="utf-8")
    arr = json.loads((ip.P / "data" / "kolumne.json").read_text(encoding="utf-8"))
    items = arr if isinstance(arr, list) else arr.get("items", [])

    def repl(m: re.Match) -> str:
        t = m.group(1)
        if '"@type":"ItemList"' not in t:
            return m.group(0)
        d = json.loads(t)
        for n in d.get("@graph", [d]):
            if n.get("@type") == "ItemList":
                n["itemListElement"] = [{"@type": "ListItem", "position": i, "url": x.get("url_en") or x["url"],
                                         "name": x.get("naslov_en") or x["naslov"]} for i, x in enumerate(items, 1)]
        return m.group(0).replace(t, json.dumps(d, ensure_ascii=False, separators=(",", ":")))

    ip.write(path, re.sub(r'<script type="application/ld\+json">(.*?)</script>', repl, s, flags=re.S))


def main() -> None:
    for rel in (HR_PATH, EN_PATH):
        if not (ip.P / rel.strip("/") / "index.html").is_file():
            raise SystemExit(f"Članak ne postoji: {rel} — prvo pokreni build_params_article.py")
    ip.SLUG, ip.HR_PATH, ip.EN_PATH, ip.PUB = SLUGS["hr"], HR_PATH, EN_PATH, bp.PUB
    ip.IMG, ip.IMG720, ip.OG, ip.HR, ip.EN = IMG, IMG720, ip.SITE + bp.OG, HR, EN
    ip.card = card  # prepend_card() poziva card() iz modula ip
    ip.prepend_card("objave/index.html", "hr")
    ip.prepend_card("en/publications/index.html", "en")
    registry()
    ip.approved_mentions()
    kolumne()
    ip.aktual_fallback("gnk-aktual/index.html", "hr")
    ip.aktual_fallback("en/gnk-aktual/index.html", "en")
    aktual_spt_button("gnk-aktual/index.html", "hr")
    aktual_spt_button("en/gnk-aktual/index.html", "en")
    first_article_link("hr")
    first_article_link("en")
    columns_itemlist_en()
    ip.canonical_registry_and_sitemap()
    print("promijenjeno:", *ip.changed, sep="\n  ") if ip.changed else print("bez promjena (već integrirano)")


if __name__ == "__main__":
    main()
