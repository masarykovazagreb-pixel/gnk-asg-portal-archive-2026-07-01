#!/usr/bin/env python3
"""Generate HR/EN Aktual Media column pages from apps/portal/data/kolumne.json."""
from __future__ import annotations

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PORTAL = ROOT / "apps" / "portal"
DATA = PORTAL / "data" / "kolumne.json"
BASE = "https://gnk-asg.hr"
PUBLISHER_LOGO = f"{BASE}/assets/gnk-asg-social-card.png"
AUTHOR_ID = f"{BASE}/#nermin-sefic"
AUTHOR_PROFILE = f"{BASE}/nermin-sefic/"

STYLE = """body{margin:0;background:#F0E6C4;color:#241C0E;font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:40px 20px}h1{font-family:'Arial Black',Impact,sans-serif;font-size:2rem;line-height:1.1}p{font-size:1.05rem;line-height:1.65;margin:0 0 16px}a.natrag,a.alt-jezik{font-family:Arial,sans-serif;font-size:.8rem;font-weight:800;text-transform:uppercase;color:#C81E1E;text-decoration:none;display:inline-block;margin-bottom:6px}.oznaka{font-family:Arial,sans-serif;font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#C81E1E;display:block;margin-bottom:10px}"""

def esc(value: object) -> str:
    return html.escape(str(value or ""), quote=True)

def paragraphs(text: str) -> str:
    return "\n".join(f"  <p>{esc(p).replace(chr(10), ' ')}</p>" for p in text.split("\n\n") if p.strip())

def render(item: dict, lang: str) -> str:
    slug = item["slug"]
    is_en = lang == "en"
    title = item.get("naslov_en" if is_en else "naslov") or item["naslov"]
    seo_title = item.get("seo_naslov_en" if is_en else "seo_naslov") or title
    description = item.get("meta_opis_en" if is_en else "meta_opis") or title
    text = item.get("tekst_en" if is_en else "tekst") or item["tekst"]
    image_path = item.get("slika")
    if not image_path or not image_path.startswith("/assets/people/nermin-sefic/"):
        raise ValueError(f"{slug}: approved Nermin Sefić author image is required")
    image_alt = item.get("slika_alt_en" if is_en else "slika_alt") or f"Nermin Sefić — {title}"
    image_url = image_path if image_path.startswith("http") else f"{BASE}{image_path}"
    hr_path = f"/gnk-aktual/kolumne/{slug}/"
    en_path = f"/en/gnk-aktual/columns/{slug}/"
    canonical_path = en_path if is_en else hr_path
    canonical = f"{BASE}{canonical_path}"
    published = item.get("objavljeno") or ""
    locale = "en_US" if is_en else "hr_HR"
    language = "en" if is_en else "hr"
    back = "/en/gnk-aktual/columns/" if is_en else "/gnk-aktual/kolumne/"
    back_text = "← Back to columns" if is_en else "← Natrag na kolumne"
    alternate = hr_path if is_en else en_path
    alternate_text = "Čitaj na hrvatskom →" if is_en else "Read in English →"
    label = "Column · Nermin Sefić" if is_en else "Kolumna · Nermin Sefić"
    schema = {"@context":"https://schema.org","@type":"OpinionNewsArticle","headline":title,"description":description,"url":canonical,"mainEntityOfPage":{"@type":"WebPage","@id":canonical},"image":{"@type":"ImageObject","url":image_url},"author":{"@type":"Person","@id":AUTHOR_ID,"name":"Nermin Sefić","url":AUTHOR_PROFILE,"image":{"@type":"ImageObject","url":image_url}},"publisher":{"@type":"Organization","name":"GNK ASG d.o.o.","logo":{"@type":"ImageObject","url":PUBLISHER_LOGO}},"datePublished":published,"dateModified":published,"inLanguage":language,"isAccessibleForFree":True}
    schema_json = json.dumps(schema, ensure_ascii=False, separators=(",", ":"))
    return f'''<!doctype html><html lang="{language}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(seo_title)} | AKTUAL MEDIA</title><meta name="description" content="{esc(description)}"><meta name="author" content="Nermin Sefić"><meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="{esc(canonical)}"><link rel="alternate" hreflang="hr" href="{BASE}{hr_path}"><link rel="alternate" hreflang="en" href="{BASE}{en_path}"><link rel="alternate" hreflang="x-default" href="{BASE}{hr_path}">
<meta property="og:type" content="article"><meta property="og:locale" content="{locale}"><meta property="og:site_name" content="AKTUAL MEDIA | GNK ASG"><meta property="og:title" content="{esc(seo_title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{esc(canonical)}"><meta property="og:image" content="{esc(image_url)}"><meta property="article:author" content="Nermin Sefić"><meta property="article:published_time" content="{esc(published)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{esc(seo_title)}"><meta name="twitter:description" content="{esc(description)}"><meta name="twitter:image" content="{esc(image_url)}"><script type="application/ld+json">{schema_json}</script><style>{STYLE}</style></head><body>
<a class="natrag" href="{back}">{back_text}</a><br><a class="alt-jezik" href="{alternate}">{alternate_text}</a><article><span class="oznaka">{label}</span><h1>{esc(title)}</h1><img src="{esc(image_path)}" alt="{esc(image_alt)}" width="1200" height="1500" loading="eager" fetchpriority="high" style="max-width:100%;border:3px solid #241C0E;margin-bottom:20px">
{paragraphs(text)}
</article></body></html>'''

def main() -> None:
    items = json.loads(DATA.read_text(encoding="utf-8")).get("items", [])
    if not items:
        raise SystemExit("No column items found")
    for item in items:
        slug = item["slug"]
        targets = {PORTAL / "gnk-aktual" / "kolumne" / slug / "index.html": render(item, "hr"), PORTAL / "en" / "gnk-aktual" / "columns" / slug / "index.html": render(item, "en")}
        for path, content in targets.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
    print(f"Generated {len(items) * 2} column pages from {DATA.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
