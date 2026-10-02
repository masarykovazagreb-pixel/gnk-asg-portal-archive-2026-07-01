#!/usr/bin/env python3
import html, json
from pathlib import Path
ROOT=Path.cwd()/"apps"/"portal"
items=json.loads((ROOT/"data/visual_gallery.json").read_text(encoding="utf-8")).get("items",[])

def fmt(src):
    ext=Path(src).suffix.lower()
    return {"svg":"image/svg+xml","webp":"image/webp","jpg":"image/jpeg","jpeg":"image/jpeg","png":"image/png"}.get(ext.lstrip("."),"image/*")

def page(item,en=False,route="visual-index"):
    slug=str(item["id"]); title=str(item.get("title") or slug); desc=str(item.get("description") or "")
    src=str(item.get("src") or ""); lang="en" if en else "hr"
    prefix="/en" if en else ""
    canonical=f"https://gnk-asg.hr{prefix}/{route}/{slug}/"
    other=f"https://gnk-asg.hr/{route}/{slug}/" if en else f"https://gnk-asg.hr/en/{route}/{slug}/"
    meta=json.dumps({"@context":"https://schema.org","@type":"ImageObject","name":title,"description":desc,"contentUrl":"https://gnk-asg.hr"+src,"encodingFormat":fmt(src)},ensure_ascii=False)
    back=f"{prefix}/visual-index/" if route=="visual-index" else "/galerija/"
    return f'''<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)} | GNK ASG</title><meta name="description" content="{html.escape(desc,quote=True)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{canonical}"><link rel="alternate" hreflang="hr" href="https://gnk-asg.hr/{route}/{slug}/"><link rel="alternate" hreflang="en" href="https://gnk-asg.hr/en/{route}/{slug}/"><link rel="alternate" hreflang="x-default" href="https://gnk-asg.hr/{route}/{slug}/"><meta property="og:image" content="https://gnk-asg.hr{html.escape(src,quote=True)}"><script type="application/ld+json">{meta}</script><style>body{{margin:0;background:#071426;color:#e8edf3;font-family:Arial,sans-serif}}main{{max-width:1050px;margin:auto;padding:40px 20px}}a{{color:#e0bd69}}article{{background:#0d2038;border:1px solid #31506e;border-radius:16px;padding:24px}}img{{display:block;max-width:100%;height:auto;margin:0 auto 24px;border-radius:10px}}p{{line-height:1.65;color:#cbd5e1}}</style></head><body><main><p><a href="{back}">← {"Back" if en else "Natrag"}</a></p><article><img src="{html.escape(src,quote=True)}" alt="{html.escape(str(item.get("alt") or title),quote=True)}" width="1200" height="675"><h1>{html.escape(title)}</h1><p>{html.escape(desc)}</p></article></main></body></html>'''

count=0
for item in items:
    slug=str(item["id"])
    gal=ROOT/"galerija"/slug/"index.html"; gal.parent.mkdir(parents=True,exist_ok=True); gal.write_text(page(item,False,"galerija"),encoding="utf-8")
    hr=ROOT/"visual-index"/slug/"index.html"; hr.parent.mkdir(parents=True,exist_ok=True)
    if not hr.exists(): hr.write_text(page(item,False,"visual-index"),encoding="utf-8")
    en=ROOT/"en"/"visual-index"/slug/"index.html"; en.parent.mkdir(parents=True,exist_ok=True)
    if not en.exists(): en.write_text(page(item,True,"visual-index"),encoding="utf-8")
    count+=1

gal_root=ROOT/"galerija"; gal_root.mkdir(parents=True,exist_ok=True)
cards="".join(f'<li><a href="/galerija/{html.escape(str(x["id"]))}/">{html.escape(str(x.get("title") or x["id"]))}</a></li>' for x in items)
(gal_root/"index.html").write_text(f'''<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Galerija | GNK ASG</title><link rel="canonical" href="https://gnk-asg.hr/galerija/"><style>body{{background:#071426;color:#e8edf3;font-family:Arial,sans-serif}}main{{max-width:1050px;margin:auto;padding:40px 20px}}a{{color:#e0bd69}}li{{margin:10px 0}}</style></head><body><main><h1>GNK ASG galerija</h1><p>Tematski vizuali. Vizual sam po sebi nije dokaz projekta, partnerstva ni runtime statusa.</p><ul>{cards}</ul></main></body></html>''',encoding="utf-8")
print(f"Generated safe gallery routes for {count} manifest items")
