#!/usr/bin/env python3
import html, json, re
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
    # Riječi u meta keywords, oznake u article:tag. Autor se ne stavlja u
    # keywords — ime urednika stoji u meta editor i u JSON-LD čvoru osobe.
    topic_words=[str(t) for t in (item.get("topic") or [])]
    kw_words=[]
    for w in topic_words+["AKTUAL MEDIA","Aktual mediji","GNK ASG","galerija","vizualni indeks"]:
        if w.lower() not in [x.lower() for x in kw_words]:
            kw_words.append(w)
    tags=[]
    for t in topic_words:
        tag="#"+re.sub(r"[^0-9A-Za-zČĆŽŠĐčćžšđ]","",t.replace(" ","").replace("-",""))
        if len(tag)>2 and tag not in tags: tags.append(tag)
    for t in ["#AKTUALMEDIA","#AktualMedia","#GNKASG"]:
        if t not in tags: tags.append(t)
    keywords_meta=", ".join(kw_words)
    tag_meta="\n".join(f'<meta property="article:tag" content="{html.escape(t,quote=True)}">' for t in tags)
    return f'''<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(page_title)}</title><meta name="description" content="{html.escape(desc,quote=True)}"><meta name="keywords" content="{html.escape(keywords_meta,quote=True)}"><meta name="editor" content="Nermin Sefić">{tag_meta}<meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{canonical}">{alternates}<meta property="og:type" content="website"><meta property="og:site_name" content="GNK ASG"><meta property="og:title" content="{html.escape(page_title,quote=True)}"><meta property="og:description" content="{html.escape(desc,quote=True)}"><meta property="og:url" content="{canonical}"><meta property="og:image" content="{html.escape(image_url,quote=True)}"><meta property="og:image:type" content="{fmt(src)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="675"><meta property="og:image:alt" content="{html.escape(alt_text,quote=True)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{html.escape(page_title,quote=True)}"><meta name="twitter:description" content="{html.escape(desc,quote=True)}"><meta name="twitter:image" content="{html.escape(image_url,quote=True)}"><meta name="twitter:image:alt" content="{html.escape(alt_text,quote=True)}"><script type="application/ld+json">{meta}</script><style>body{{margin:0;background:#071426;color:#e8edf3;font-family:Arial,sans-serif}}main{{max-width:1050px;margin:auto;padding:40px 20px}}a{{color:#e0bd69}}article{{background:#0d2038;border:1px solid #31506e;border-radius:16px;padding:24px}}img{{display:block;max-width:100%;height:auto;margin:0 auto 24px;border-radius:10px}}p{{line-height:1.65;color:#cbd5e1}}</style></head><body><main><p><a href="{back}">← {back_label}</a></p><article><img src="{html.escape(src,quote=True)}" alt="{html.escape(alt_text,quote=True)}" width="1200" height="675"><h1>{html.escape(title)}</h1><p>{html.escape(desc)}</p></article></main></body></html>'''


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
gallery_schema={
    "@context":"https://schema.org",
    "@graph":[
        {"@type":"NewsMediaOrganization","@id":"https://gnk-asg.hr/gnk-aktual/#news-organization",
         "name":"AKTUAL MEDIA d.o.o.",
         "alternateName":["AKTUAL MEDIA","Aktual Media","Aktual mediji","Aktual medija"],
         "url":"https://gnk-asg.hr/gnk-aktual/",
         "logo":{"@type":"ImageObject","@id":"https://gnk-asg.hr/assets/brand/aktual-media-hr.svg#logo",
                 "url":"https://gnk-asg.hr/assets/brand/aktual-media-hr.svg",
                 "contentUrl":"https://gnk-asg.hr/assets/brand/aktual-media-hr-1200.webp",
                 "width":1200,"height":345,
                 "caption":"AKTUAL MEDIA — svjetsko izdanje",
                 "encodingFormat":"image/svg+xml"},
         "parentOrganization":{"@type":"Organization","@id":"https://gnk-asg.hr/#gnk-asg","name":"GNK ASG d.o.o.","url":"https://gnk-asg.hr/"},
         "editor":{"@id":"https://gnk-asg.hr/#nermin-sefic"}},
        {"@type":"ImageGallery","@id":"https://gnk-asg.hr/galerija/#gallery",
         "url":"https://gnk-asg.hr/galerija/","name":"GNK ASG / AKTUAL — tematska galerija",
         "description":desc,"inLanguage":"hr",
         "isPartOf":{"@id":"https://gnk-asg.hr/#website"},
         "publisher":{"@id":"https://gnk-asg.hr/gnk-aktual/#news-organization"},
         "about":{"@id":"https://gnk-asg.hr/gnk-aktual/#news-organization"},
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
# SPT-style feature card na vrhu galerije: slika lijevo, tamni panel desno.
brand_css = r"""
.bf{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);border:1px solid #37516d;border-radius:18px;overflow:hidden;background:#0b1a2c;margin:22px 0 34px}
.bf-media{display:flex;align-items:center;justify-content:center;background:#f4f1e8;padding:26px}
.bf-media img{display:block;width:100%;height:auto;border-radius:4px}
.bf-body{padding:26px 26px 24px;background:#0a1524;display:flex;flex-direction:column;gap:14px}
.bf-kicker{margin:0;font:700 .72rem/1.2 system-ui,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#e0bd69}
.bf h3{margin:0;font:600 clamp(1.4rem,2.6vw,2rem)/1.18 Georgia,"Times New Roman",serif;color:#fff}
.bf-spec{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;margin:2px 0 0;padding:0}
.bf-spec li{position:relative;padding-left:16px;font-size:.9rem;color:#c3d0de}
.bf-spec li::before{content:"\2022";position:absolute;left:0;color:#e0bd69}
.bf-acts{display:flex;flex-wrap:wrap;gap:10px;margin-top:4px}
.bf-btn{display:inline-block;padding:10px 16px;border-radius:999px;border:1px solid #3c5a79;color:#e8eef5;text-decoration:none;font:600 .86rem/1 system-ui,Arial,sans-serif}
.bf-btn.solid{background:#4fd1e0;border-color:#4fd1e0;color:#06202b}
.bf-meta{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:6px}
.bf-pill{padding:6px 12px;border-radius:999px;background:#122a43;border:1px solid #31506e;font:700 .75rem/1 system-ui,Arial,sans-serif;color:#f0cf87}
.bf-live{font:700 .72rem/1 system-ui,Arial,sans-serif;letter-spacing:.1em;color:#8fe3a8}
@media(max-width:760px){.bf{grid-template-columns:1fr}.bf-spec{grid-template-columns:1fr}}
"""

# --- Znakovi kuće AKTUAL MEDIA -------------------------------------------
# Sekciju piše ovaj generator jer je on jedini vlasnik /galerija/index.html.
# Podaci dolaze iz istog manifesta koji puni scripts/build-aktual-media-logos-v1.py
BRAND_START = "<!-- BRAND-GALLERY:START -->"
BRAND_END = "<!-- BRAND-GALLERY:END -->"
brand_logos = []
try:
    _logos = json.loads((ROOT / "data" / "aktual-logos-v1.json").read_text(encoding="utf-8"))
    brand_logos = _logos.get("logos", [])
except Exception:
    brand_logos = []

_channels = []
try:
    _ch = json.loads((Path(__file__).resolve().parents[1] / "apps" / "region" / "channels.json").read_text(encoding="utf-8"))
    _channels = _ch.get("channels", [])
except Exception:
    _channels = []


def _tile(slug, image, width, height, caption):
    """slug je puni naziv rute (znak-... za znakove, izdanje-... za naslovnice),
    pa link uvijek pokazuje točno na onu stranicu koju generator izgradi."""
    return (f'<li><a href="/galerija/{esc(slug)}/"><img src="{esc(image)}" alt="{esc(caption)}" '
            f'width="{width}" height="{height}" loading="lazy" decoding="async"><span>{esc(caption)}</span></a></li>')


_logo_tiles = "".join(
    _tile(f'znak-{l["slug"]}', l["webp"], 1200, 345, l["title"]) for l in brand_logos
)
_city_tiles = "".join(
    _tile(f'izdanje-{c["id"]}', f'/assets/izdanja/{c["id"]}-1200.webp', 1200, 675,
          f'{c["city"]} — naslovnica izdanja {c["title"]}') for c in _channels
)

_master = next((l for l in brand_logos if l["slug"] == "aktual-media-hr"), brand_logos[0] if brand_logos else None)

_feature = ""
if _master:
    _feature = f'''<article class="bf" aria-labelledby="bf-title">
  <div class="bf-media"><img src="{esc(_master['webp'])}" alt="{esc(_master['title'])} — {esc(_master.get('tagline',''))}" width="1200" height="345" loading="eager" decoding="async"></div>
  <div class="bf-body">
    <p class="bf-kicker">AKTUAL MEDIA · svjetsko izdanje</p>
    <h3 id="bf-title">Jedan znak, {len(_channels)} izdanja</h3>
    <ul class="bf-spec">
      <li>{len(brand_logos)} znakova u familiji</li>
      <li>SVG vektor + WebP 1200×345</li>
      <li>{len(_channels)} gradskih izdanja</li>
      <li>krem podloga, navy i crvena</li>
    </ul>
    <div class="bf-acts">
      <a class="bf-btn solid" href="/galerija/znak-{esc(_master['slug'])}/">Otvori znak</a>
      <a class="bf-btn" href="/gnk-aktual/">AKTUAL MEDIA</a>
      <a class="bf-btn" href="/galerija/">Sve u galeriji</a>
    </div>
    <div class="bf-meta"><span class="bf-pill">{len(brand_logos)} znakova · {len(_channels)} gradova</span><span class="bf-live">· SVG</span></div>
  </div>
</article>'''

brand_section = f'''{BRAND_START}
{_feature}
<section aria-labelledby="znakovi" style="margin:40px 0 0">
  <h2 id="znakovi">Znakovi kuće AKTUAL MEDIA</h2>
  <p class="lead">Svako izdanje ima svoj znak u istoj familiji: prvi dio imena u navyju, drugi u crvenoj, natpis iznad i slogan ispod. Znakovi su vektorski (SVG) i svaki ima vlastitu stranicu s podacima o upotrebi.</p>
  <ul style="list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px">{_logo_tiles}</ul>
</section>
<section aria-labelledby="naslovnice" style="margin:40px 0 0">
  <h2 id="naslovnice">Naslovnice gradskih izdanja</h2>
  <p class="lead">Fotografija koja stoji na kartici i vrhu svakog gradskog izdanja, izdvojena kao samostalna slika s podacima o izvoru i pravu korištenja.</p>
  <ul style="list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">{_city_tiles}</ul>
</section>
{BRAND_END}'''

gallery_html=f'''<!doctype html>
<html lang="hr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="{esc(desc)}">
<meta name="editor" content="Nermin Sefić">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="https://gnk-asg.hr/galerija/">
<link rel="alternate" hreflang="hr" href="https://gnk-asg.hr/galerija/">
<link rel="alternate" hreflang="x-default" href="https://gnk-asg.hr/galerija/">
<link rel="alternate" type="image/svg+xml" href="/assets/brand/aktual-media-hr.svg" title="AKTUAL MEDIA — svjetsko izdanje">
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
<style>{gallery_css}{brand_css}</style></head><body>
<main><nav aria-label="Putanja"><a href="/">GNK ASG</a> / Galerija</nav>
<header><h1>GNK ASG / AKTUAL — galerija</h1><p class="lead">{esc(desc)}</p></header>
<section aria-labelledby="izdvojeno"><h2 id="izdvojeno">Izdvojeni tematski vizuali</h2><div class="grid">
{featured_cards}
</div></section>
<p class="note">Ilustracije služe uredničkom prikazu tema. Nisu samostalan dokaz financijskih rezultata, partnerstava, vlasništva ili operativnog statusa.</p>
<section aria-labelledby="sve"><h2 id="sve">Sve galerijske stranice</h2><ul class="directory">
{all_links}
</ul></section>
{brand_section}</main></body></html>
'''
(gal_root/"index.html").write_text(gallery_html,encoding="utf-8")
print(f"Generated safe gallery routes for {count} manifest items")
