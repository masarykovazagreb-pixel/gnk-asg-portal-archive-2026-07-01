#!/usr/bin/env python3
import html, json, hashlib
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path.cwd()/"apps"/"portal"
items=json.loads((ROOT/"data/visual_gallery.json").read_text(encoding="utf-8")).get("items",[])

# The existing writer also indexes original local covers from registered articles.
# Never copy external photos, protected assets or generic social cards.
known_sources={str(item.get("src", "")) for item in items}
registry_path=ROOT/"data/editorial-registry.json"
if registry_path.exists():
    for article in json.loads(registry_path.read_text(encoding="utf-8")).get("items",[]):
        parsed=urlsplit(str(article.get("image") or "")); src=parsed.path
        if parsed.netloc not in ("", "gnk-asg.hr") or not src.startswith("/assets/editorial/generated/"):
            continue
        if ".." in Path(src).parts or "\\" in src or not (ROOT/src.lstrip("/")).is_file() or src in known_sources:
            continue
        route=str(article.get("path") or "")
        if not route.startswith("/") or route.startswith("//") or ".." in Path(route).parts:
            continue
        known_sources.add(src)
        items.append({"id":"editorial-"+hashlib.sha256(src.encode()).hexdigest()[:16],
            "src":src,"title":str(article.get("title") or "AKTUAL ilustracija"),
            "description":str(article.get("description") or "Tematska ilustracija iz uredničke arhive GNK ASG."),
            "alt":str(article.get("imageAlt") or article.get("title") or "AKTUAL ilustracija"),
            "source_route":route,"gallery_only":True})

def fmt(src):
    ext=Path(src).suffix.lower()
    return {"svg":"image/svg+xml","webp":"image/webp","jpg":"image/jpeg","jpeg":"image/jpeg","png":"image/png"}.get(ext.lstrip("."),"image/*")

def page(item,en=False,route="visual-index"):
    slug=str(item["id"]); title=str(item.get("title") or slug); desc=str(item.get("description") or "")
    src=str(item.get("src") or ""); lang="en" if en else "hr"
    prefix="/en" if en else ""
    canonical=f"https://gnk-asg.hr{prefix}/{route}/{slug}/"
    page_title=f"{title} | GNK ASG"
    alt_text=str(item.get("alt") or title)
    image_url="https://gnk-asg.hr"+src
    if route=="visual-index":
        alternates=f'<link rel="alternate" hreflang="hr" href="https://gnk-asg.hr/visual-index/{slug}/"><link rel="alternate" hreflang="en" href="https://gnk-asg.hr/en/visual-index/{slug}/"><link rel="alternate" hreflang="x-default" href="https://gnk-asg.hr/visual-index/{slug}/">'
    else:
        alternates=f'<link rel="alternate" hreflang="hr" href="https://gnk-asg.hr/galerija/{slug}/"><link rel="alternate" hreflang="x-default" href="https://gnk-asg.hr/galerija/{slug}/">'
    back=f"{prefix}/visual-index/" if route=="visual-index" else "/galerija/"
    back_label="Back" if en else "Natrag"
    website_id="https://gnk-asg.hr/#website"
    publisher={"@type":"Organization","@id":"https://gnk-asg.hr/#gnk-asg","name":"GNK ASG d.o.o.","url":"https://gnk-asg.hr/"}
    editor={"@type":"Person","@id":"https://gnk-asg.hr/#nermin-sefic","name":"Nermin Sefić","url":"https://gnk-asg.hr/nermin-sefic/"}
    schema={"@context":"https://schema.org","@graph":[
        {"@type":"ImageObject","@id":canonical+"#image","name":title,"description":desc,
         "contentUrl":image_url,"encodingFormat":fmt(src)},
        {"@type":"WebPage","@id":canonical+"#webpage","url":canonical,"name":page_title,
         "description":desc,"inLanguage":lang,"isPartOf":{"@id":website_id},
         "editor":editor,"publisher":publisher},
        {"@type":"WebSite","@id":website_id,"url":"https://gnk-asg.hr/","name":"GNK ASG",
         "inLanguage":["hr","en"],"publisher":publisher}
    ]}
    meta=json.dumps(schema,ensure_ascii=False).replace("<",r"\u003c")
    return f'''<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(page_title)}</title><meta name="description" content="{html.escape(desc,quote=True)}"><meta name="editor" content="Nermin Sefić"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{canonical}">{alternates}<meta property="og:type" content="website"><meta property="og:site_name" content="GNK ASG"><meta property="og:title" content="{html.escape(page_title,quote=True)}"><meta property="og:description" content="{html.escape(desc,quote=True)}"><meta property="og:url" content="{canonical}"><meta property="og:image" content="{html.escape(image_url,quote=True)}"><meta property="og:image:type" content="{fmt(src)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="675"><meta property="og:image:alt" content="{html.escape(alt_text,quote=True)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{html.escape(page_title,quote=True)}"><meta name="twitter:description" content="{html.escape(desc,quote=True)}"><meta name="twitter:image" content="{html.escape(image_url,quote=True)}"><meta name="twitter:image:alt" content="{html.escape(alt_text,quote=True)}"><script type="application/ld+json">{meta}</script><style>body{{margin:0;background:#071426;color:#e8edf3;font-family:Arial,sans-serif}}main{{max-width:1050px;margin:auto;padding:40px 20px}}a{{color:#e0bd69}}article{{background:#0d2038;border:1px solid #31506e;border-radius:16px;padding:24px}}img{{display:block;max-width:100%;height:auto;margin:0 auto 24px;border-radius:10px}}p{{line-height:1.65;color:#cbd5e1}}</style></head><body><main><p><a href="{back}">← {back_label}</a></p><article><img src="{html.escape(src,quote=True)}" alt="{html.escape(alt_text,quote=True)}" width="1200" height="675"><h1>{html.escape(title)}</h1><p>{html.escape(desc)}</p></article></main></body></html>'''


count=0
for item in items:
    slug=str(item["id"])
    gal=ROOT/"galerija"/slug/"index.html"; gal.parent.mkdir(parents=True,exist_ok=True)
    rendered=page(item,False,"galerija")
    if item.get("source_route"):
        rendered=rendered.replace('content="675"','content="630"').replace('height="675"','height="630"')
        source_link=f'<p><a href="{html.escape(item["source_route"],quote=True)}">Povezani tekst / Related article</a></p>'
        rendered=rendered.replace('</article>',source_link+'</article>')
    gal.write_text(rendered,encoding="utf-8")
    if item.get("gallery_only"):
        count+=1
        continue
    hr=ROOT/"visual-index"/slug/"index.html"; hr.parent.mkdir(parents=True,exist_ok=True)
    if not hr.exists(): hr.write_text(page(item,False,"visual-index"),encoding="utf-8")
    en=ROOT/"en"/"visual-index"/slug/"index.html"; en.parent.mkdir(parents=True,exist_ok=True)
    if not en.exists(): en.write_text(page(item,True,"visual-index"),encoding="utf-8")
    count+=1

gal_root=ROOT/"galerija"; gal_root.mkdir(parents=True,exist_ok=True)
# One canonical writer for the gallery index: keep the source-led catalog
# and the six verified static image previews synchronized at generation time.
featured_ids=["rast-prihoda-gold-navy-01","globalna-mreza-emerald-growth-02","digitalna-transformacija-azure-tech-03","inovacija-i-ai-teal-stability-06","kiberneticka-sigurnost-steel-infrastructure-08","sportska-tehnologija-rose-momentum-07"]
featured=[next(item for item in items if str(item["id"])==slug) for slug in featured_ids]
desc="Tematska galerija GNK ASG: poslovanje, tehnologija, umjetna inteligencija, kibernetička sigurnost i sportska analitika. Izvorne ilustracije uz jasne opise."
title="GNK ASG galerija | Poslovanje, AI i tehnologija"
social_image="https://gnk-asg.hr/assets/seo-gallery/gnk-asg-ai-asistent.jpg"
def esc(value):
    return html.escape(str(value),quote=True)
featured_cards="\n".join(
    f'<article class="tile"><a href="/galerija/{esc(item["id"])}/"><img src="{esc(item["src"])}" alt="{esc(item.get("alt") or item["title"])}" width="1200" height="675" loading="lazy" decoding="async"><div class="caption"><h3>{esc(item["title"])}</h3><p>{esc(item.get("description") or "")}</p><span>Otvori ilustraciju →</span></div></a></article>'
    for item in featured
)
all_links="\n".join(
    f'<li><a href="/galerija/{esc(item["id"])}/">{esc(item.get("title") or item["id"])}</a></li>'
    for item in items
)
# Preserve established gallery destinations outside either manifest.
known_ids={str(item["id"]) for item in items}
for existing in sorted(gal_root.glob("*/index.html")):
    if existing.parent.name not in known_ids:
        all_links+=f'\n<li><a href="/galerija/{esc(existing.parent.name)}/">{esc(existing.parent.name.replace("-", " "))}</a></li>'
gallery_schema={
    "@context":"https://schema.org",
    "@graph":[
        {"@type":"ImageGallery","@id":"https://gnk-asg.hr/galerija/#gallery",
         "url":"https://gnk-asg.hr/galerija/","name":"GNK ASG / AKTUAL — tematska galerija",
         "description":desc,"inLanguage":"hr",
         "isPartOf":{"@id":"https://gnk-asg.hr/#website"},
         "publisher":{"@id":"https://gnk-asg.hr/#gnk-asg"},
         "hasPart":[{"@type":"ImageObject","name":item["title"],"description":item.get("description") or "",
                     "contentUrl":"https://gnk-asg.hr"+item["src"],
                     "url":"https://gnk-asg.hr/galerija/"+item["id"]+"/",
                     "width":1200,"height":675} for item in featured]},
        {"@type":"WebPage","@id":"https://gnk-asg.hr/galerija/#webpage",
         "url":"https://gnk-asg.hr/galerija/","name":title,"description":desc,"inLanguage":"hr",
         "isPartOf":{"@id":"https://gnk-asg.hr/#website"},
         "editor":{"@type":"Person","@id":"https://gnk-asg.hr/#nermin-sefic","name":"Nermin Sefić","url":"https://gnk-asg.hr/nermin-sefic/"},
         "publisher":{"@type":"Organization","@id":"https://gnk-asg.hr/#gnk-asg","name":"GNK ASG d.o.o.","url":"https://gnk-asg.hr/"}},
        {"@type":"WebSite","@id":"https://gnk-asg.hr/#website","url":"https://gnk-asg.hr/","name":"GNK ASG",
         "inLanguage":["hr","en"],"publisher":{"@type":"Organization","@id":"https://gnk-asg.hr/#gnk-asg","name":"GNK ASG d.o.o.","url":"https://gnk-asg.hr/"}},
        {"@type":"BreadcrumbList","@id":"https://gnk-asg.hr/galerija/#breadcrumb",
         "itemListElement":[
           {"@type":"ListItem","position":1,"name":"GNK ASG","item":"https://gnk-asg.hr/"},
           {"@type":"ListItem","position":2,"name":"Galerija","item":"https://gnk-asg.hr/galerija/"}]}
    ]
}
gallery_jsonld=json.dumps(gallery_schema,ensure_ascii=False).replace("<", r"\u003c")
# HTML template is intentionally kept adjacent to the source gallery manifest,
# not maintained independently in an untracked front-end worker.
gallery_css=":root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#071426;color:#edf2f7;font:16px/1.65 system-ui,-apple-system,\"Segoe UI\",Arial,sans-serif}main{max-width:1180px;margin:auto;padding:32px 18px 64px}a{color:#f0cf87}a:focus-visible{outline:3px solid #f7d777;outline-offset:4px}nav{margin-bottom:22px}.lead{max-width:800px;color:#cbd5e1}h1{font-size:clamp(2rem,5vw,3.1rem);line-height:1.2;margin:.3rem 0 1rem}h2{font-size:1.45rem;margin:2rem 0 1rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));gap:20px}.tile{overflow:hidden;border-radius:16px;background:#10253c;border:1px solid #37516d;transition:transform .18s ease,border-color .18s ease}.tile:hover{transform:translateY(-3px);border-color:#d4af37}.tile a{color:inherit;text-decoration:none;display:block;height:100%}.tile img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;background:#162c45}.caption{padding:16px}.caption h3{font-size:1.1rem;margin:0 0 .35rem;color:#fff}.caption p{margin:0 0 .75rem;color:#cedae7;font-size:.91rem}.caption span{color:#f0cf87;font-weight:700}.note{margin-top:20px;padding:14px 18px;border-left:3px solid #d4af37;background:#122a43;color:#d7e1eb}.directory{columns:3;column-gap:28px;padding-left:20px}.directory li{break-inside:avoid;margin-bottom:8px}.directory a{text-decoration-thickness:1px;text-underline-offset:2px}@media(max-width:800px){.directory{columns:2}}@media(max-width:520px){main{padding:24px 16px 48px}.directory{columns:1}}@media(prefers-reduced-motion:reduce){.tile{transition:none}.tile:hover{transform:none}}"
gallery_html=f'''<!doctype html>
<html lang="hr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="{esc(desc)}">
<meta name="editor" content="Nermin Sefić">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="https://gnk-asg.hr/galerija/">
<link rel="alternate" hreflang="hr" href="https://gnk-asg.hr/galerija/">
<link rel="alternate" hreflang="x-default" href="https://gnk-asg.hr/galerija/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="GNK ASG">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="https://gnk-asg.hr/galerija/">
<meta property="og:image" content="{social_image}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="675">
<meta property="og:image:alt" content="GNK ASG — tematska galerija poslovanja i umjetne inteligencije">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(desc)}">
<meta name="twitter:image" content="{social_image}">
<meta name="twitter:image:alt" content="GNK ASG — tematska galerija poslovanja i umjetne inteligencije">
<script type="application/ld+json">{gallery_jsonld}</script>
<link rel="alternate" type="application/rss+xml" title="GNK ASG RSS" href="/feed.xml">
<link rel="alternate" type="application/atom+xml" title="GNK ASG Atom" href="/atom.xml">
<style>{gallery_css}</style></head><body>
<main><nav aria-label="Putanja"><a href="/">GNK ASG</a> / Galerija</nav>
<header><h1>GNK ASG / AKTUAL — galerija</h1><p class="lead">{esc(desc)}</p></header>
<section aria-labelledby="izdvojeno"><h2 id="izdvojeno">Izdvojeni tematski vizuali</h2><div class="grid">
{featured_cards}
</div></section>
<p class="note">Ilustracije služe uredničkom prikazu tema. Nisu samostalan dokaz financijskih rezultata, partnerstava, vlasništva ili operativnog statusa.</p>
<section aria-labelledby="sve"><h2 id="sve">Sve galerijske stranice</h2><ul class="directory">
{all_links}
</ul></section></main></body></html>
'''
(gal_root/"index.html").write_text(gallery_html,encoding="utf-8")
# Add gallery discovery without rebuilding or deleting other publishers' URLs.
ns="http://www.sitemaps.org/schemas/sitemap/0.9"
ins="http://www.google.com/schemas/sitemap-image/1.1"
ET.register_namespace("",ns); ET.register_namespace("image",ins)
for filename,with_image in (("sitemap.xml",False),("image-sitemap.xml",True)):
    target=ROOT/filename
    if not target.exists():
        continue
    tree=ET.parse(target); xmlroot=tree.getroot()
    if xmlroot.tag!="{"+ns+"}urlset":
        raise ValueError("Expected sitemap urlset: "+filename)
    seen={entry.findtext("{"+ns+"}loc") for entry in xmlroot}
    changed=False
    for item in items:
        url="https://gnk-asg.hr/galerija/"+str(item["id"])+"/"
        if url in seen:
            continue
        entry=ET.SubElement(xmlroot,"{"+ns+"}url")
        ET.SubElement(entry,"{"+ns+"}loc").text=url
        if with_image:
            image=ET.SubElement(entry,"{"+ins+"}image")
            ET.SubElement(image,"{"+ins+"}loc").text="https://gnk-asg.hr"+str(item["src"])
        seen.add(url); changed=True
    if changed:
        tree.write(target,encoding="utf-8",xml_declaration=True)
print(f"Generated safe gallery routes for {count} manifest items")
