#!/usr/bin/env python3
"""Idempotentno uključuje SPT članak i SPT stranicu u portalske indekse:
/objave/, /en/publications/, AKTUAL (kolumne.json + statični fallback), editorial-registry,
editorial-sitemap, sitemap-index i robots.txt.

Pokretanje (iz korijena repozitorija):
    /home/user/.venv/bin/python spt/marketing/showcase/integrate_portal.py

produced by GNK ASG · autor: Nermin Sefić
"""
from __future__ import annotations

import html
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
P = ROOT / "apps" / "portal"
SITE = "https://gnk-asg.hr"
SLUG = "spt-sports-performance-tracking-gnk-asg"
HR_PATH, EN_PATH = f"/objave/{SLUG}/", f"/en/publications/{SLUG}/"
PUB = "2026-10-12T11:00:00+02:00"
DAY = "2026-10-12"
IMG = "/spt/img/hero_stadium_usa.webp"
IMG720 = "/spt/img/hero_stadium_usa-720.webp"
OG = SITE + "/spt/img/og/hero-stadium-usa.jpg"

HR = dict(
    title="GNK ASG predstavlja SPT: praćenje sportaša GPS-om, UWB-om i umjetnom inteligencijom",
    seo="SPT: praćenje sportaša GPS-om, UWB-om i umjetnom inteligencijom | GNK ASG",
    desc="SPT spaja GPS 20 Hz, UWB ±10 cm, senzor 1000 Hz i umjetnu inteligenciju u sustav koji prati opterećenje, spremnost i rizik od ozljede sportaša.",
    summary="GPS 20 Hz, UWB ±10 cm i umjetna inteligencija za opterećenje, spremnost i rizik od ozljede — softver koji ugrađuju i drugi proizvođači.",
    lead="SPT (Sports Performance Tracking) povezuje nosivi senzor, sat, prsni pojas i pametnu vagu s platformom koja u stvarnom vremenu računa opterećenje, spremnost i rizik od ozljede. Softver već kupuju i ugrađuju i drugi proizvođači sličnih sustava — ponekad pod svojim brendom, ali uvijek s našim alatima, softverom i serverima.",
    alt="Dan utakmice u SAD-u: igrači praćeni sustavom SPT — ilustracija",
    keywords=["SPT", "Sports Performance Tracking", "praćenje sportaša", "UWB", "ACWR", "prevencija ozljeda", "GNK ASG", "GNK ASG d.o.o.", "GNK DINAMO Ltd."],
    hashtags=["GNKASG", "GNKDINAMOLtd", "NerminSefic", "SPT", "SportsPerformanceTracking", "SportskaAnalitika", "GPStracking", "UWB", "PrevencijaOzljeda"],
)
EN = dict(
    title="GNK ASG unveils SPT: athlete tracking with GPS, UWB and artificial intelligence",
    seo="SPT: athlete tracking with GPS, UWB and AI | GNK ASG",
    desc="SPT combines 20 Hz GPS, ±10 cm UWB, a 1000 Hz sensor and AI to track load, readiness and injury risk — for clubs, coaches and amateur athletes.",
    summary="20 Hz GPS, ±10 cm UWB and AI for load, readiness and injury risk — software that other manufacturers build into their products.",
    lead="SPT (Sports Performance Tracking) connects a wearable sensor, watch, chest strap and smart scale with a platform that calculates load, readiness and injury risk in real time. Its software is already bought and built in by other manufacturers of similar systems — sometimes under their brand, but always with our tools, software and servers.",
    alt="Match day in the USA: players tracked by SPT — illustration",
    keywords=["SPT", "Sports Performance Tracking", "athlete tracking", "UWB", "ACWR", "injury prevention", "GNK ASG", "GNK ASG d.o.o.", "GNK DINAMO Ltd."],
    hashtags=["GNKASG", "GNKDINAMOLtd", "NerminSefic", "SPT", "SportsPerformanceTracking", "SportsAnalytics", "GPStracking", "UWB", "InjuryPrevention"],
)
e = lambda s: html.escape(str(s), quote=True)
changed: list[str] = []


def write(path: Path, text: str) -> None:
    if path.read_text(encoding="utf-8") != text:
        path.write_text(text, encoding="utf-8")
        changed.append(str(path.relative_to(ROOT)))


def card(lang: str) -> str:
    d, hr = (HR, True) if lang == "hr" else (EN, False)
    eyebrow = "Sport i tehnologija · 12. listopada 2026." if hr else "Sport &amp; technology · 12 October 2026"
    cta = "Pročitaj objavu →" if hr else "Open publication →"
    route = HR_PATH if hr else EN_PATH
    return (f'<article class="editorial-card"><img src="{IMG720}" alt="{e(d["alt"])}" title="{e(d["title"])}" width="720" height="402" loading="eager">'
            f'<p class="eyebrow">{eyebrow}</p><h2>{e(d["title"])}</h2><p>{e(d["summary"])}</p><a href="{route}">{cta}</a></article>')


def prepend_card(rel: str, lang: str) -> None:
    path = P / rel
    s = path.read_text(encoding="utf-8")
    route = HR_PATH if lang == "hr" else EN_PATH
    if f'href="{route}"' in s:
        return
    marker = '<section class="editorial-grid">'
    i = s.find(marker)
    if i < 0:
        raise SystemExit(f"editorial-grid nije pronađen: {rel}")
    i += len(marker)
    write(path, s[:i] + card(lang) + s[i:])


def registry() -> None:
    path = P / "data" / "editorial-registry.json"
    r = json.loads(path.read_text(encoding="utf-8"))
    have = {it.get("path") for it in r["items"]}
    new = []
    for lang, d, route, coll in (("hr", HR, HR_PATH, "Objave"), ("en", EN, EN_PATH, "Publications")):
        if route in have:
            continue
        new.append({"slug": SLUG, "type": "objava", "collection": coll, "path": route, "url": SITE + route,
                    "title": d["title"], "description": d["desc"], "keywords": d["keywords"], "hashtags": d["hashtags"],
                    "image": OG, "publishedAt": PUB, "inPlan": False, "seoComplete": True, "language": lang})
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
    write(path, json.dumps(r, ensure_ascii=False, indent=2) + "\n")


def run_node(script: str) -> None:
    """Kanonski generatori repozitorija (CI: publication-sitemap-registry-gate ih reproducira i uspoređuje)."""
    subprocess.run(["node", script], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)


def canonical_registry_and_sitemap() -> None:
    before = {f: (P / f).read_text(encoding="utf-8") for f in ("data/editorial-registry.json", "editorial-sitemap.xml")}
    run_node("scripts/editorial-registry-v1.mjs")
    run_node("scripts/generate-editorial-sitemap-v2.mjs")
    for f, old in before.items():
        if (P / f).read_text(encoding="utf-8") != old:
            changed.append(f"apps/portal/{f} (kanonski generator)")


def approved_mentions() -> None:
    """Odobrenje vlasnika: članci s autorskim boksom moraju biti na popisu (data/approved_mentions.json)."""
    path = P / "data" / "approved_mentions.json"
    d = json.loads(path.read_text(encoding="utf-8"))
    urls = set(d.get("approved_urls", []))
    new = {SITE + HR_PATH, SITE + EN_PATH} - urls
    if not new:
        return
    d["approved_urls"] = sorted(urls | new)
    write(path, json.dumps(d, ensure_ascii=False, indent=2) + "\n")


def sitemap_index() -> None:
    path = P / "sitemap-index.xml"
    s = path.read_text(encoding="utf-8")
    s2 = re.sub(r"(<loc>https://gnk-asg\.hr/editorial-sitemap\.xml</loc>\s*<lastmod>)[^<]+(</lastmod>)", rf"\g<1>{DAY}\g<2>", s)
    if "https://gnk-asg.hr/spt-sitemap.xml" not in s2:
        s2 = s2.replace("</sitemapindex>", f"  <sitemap>\n    <loc>https://gnk-asg.hr/spt-sitemap.xml</loc>\n    <lastmod>{DAY}</lastmod>\n  </sitemap>\n</sitemapindex>", 1)
    write(path, s2)


def robots() -> None:
    path = P / "robots.txt"
    s = path.read_text(encoding="utf-8")
    line = "Sitemap: https://gnk-asg.hr/spt-sitemap.xml"
    if line in s:
        return
    anchor = "Sitemap: https://gnk-asg.hr/world-topics-image-sitemap.xml"
    if anchor in s:
        s = s.replace(anchor, anchor + "\n" + line, 1)
    else:
        s = s.rstrip("\n") + "\n" + line + "\n"
    write(path, s)


def kolumne() -> None:
    path = P / "data" / "kolumne.json"
    arr = json.loads(path.read_text(encoding="utf-8"))
    items = arr if isinstance(arr, list) else arr.get("items", [])
    if any(x.get("url") == SITE + HR_PATH for x in items):
        return
    entry = {
        "slug": SLUG, "naslov": HR["title"], "seo_naslov": HR["seo"], "meta_opis": HR["desc"],
        "slika": IMG, "slika_autor": "GNK ASG d.o.o.", "slika_licenca": "ilustracija sustava SPT · produced by GNK ASG",
        "slika_izvor": None, "objavljeno": "2026-10-12T09:00:00.000Z", "path": HR_PATH, "url": SITE + HR_PATH,
        "tekst": HR["lead"], "naslov_en": EN["title"], "seo_naslov_en": EN["seo"], "meta_opis_en": EN["desc"],
        "tekst_en": EN["lead"], "slika_alt": HR["alt"], "slika_alt_en": EN["alt"],
        "url_en": SITE + EN_PATH, "tag": "SPT · Sports Performance Tracking",
    }
    items.insert(0, entry)
    write(path, json.dumps(arr, ensure_ascii=False, indent=2))  # izvorni format: bez završnog \n


def aktual_fallback(rel: str, lang: str) -> None:
    path = P / rel
    s = path.read_text(encoding="utf-8")
    route = HR_PATH if lang == "hr" else EN_PATH
    title = HR["title"] if lang == "hr" else EN["title"]
    if f'href="{route}"' in s:
        return
    m = re.search(r'<div class="am-editorial-links" id="amEditorialLinks">', s)
    if not m:
        raise SystemExit(f"amEditorialLinks nije pronađen: {rel}")
    i = m.end()
    write(path, s[:i] + f'<a href="{route}">{e(title)}</a>' + s[i:])


def main() -> None:
    for rel in (HR_PATH, EN_PATH):
        if not (P / rel.strip("/") / "index.html").is_file():
            raise SystemExit(f"Članak ne postoji: {rel} — prvo pokreni build_article.py")
    prepend_card("objave/index.html", "hr")
    prepend_card("en/publications/index.html", "en")
    registry()
    approved_mentions()
    sitemap_index()
    robots()
    kolumne()
    aktual_fallback("gnk-aktual/index.html", "hr")
    aktual_fallback("en/gnk-aktual/index.html", "en")
    canonical_registry_and_sitemap()
    print("promijenjeno:", *changed, sep="\n  ") if changed else print("bez promjena (već integrirano)")


if __name__ == "__main__":
    main()
