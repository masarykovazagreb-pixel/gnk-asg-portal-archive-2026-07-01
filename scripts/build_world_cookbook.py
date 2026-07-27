#!/usr/bin/env python3
import html, io, json, re, string, time
from collections import defaultdict
from pathlib import Path

import requests
from PIL import Image as PILImage, ImageOps
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, Table, TableStyle, KeepTogether

API='https://www.themealdb.com/api/json/v1/1'
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'world-cookbook'
IMG=OUT/'images'
OUT.mkdir(parents=True,exist_ok=True); IMG.mkdir(exist_ok=True)
PDF=OUT/'GNK_ASG_WORLD_RECIPE_BOOK_EN.pdf'
FLIP=OUT/'index.html'
DATA=OUT/'world-recipes.json'
S=requests.Session(); S.headers.update({'User-Agent':'GNK-ASG-World-Cookbook/1.0'})

EDITOR='Nermin Sefić'
PUB_EU='GNK ASG d.o.o.'
PUB_WORLD='GNK DINAMO Ltd.'
SOURCE_PAGE='https://gnk-asg.hr/trgovina/prehrana/'


def get_json(url,retries=5):
    for i in range(retries):
        try:
            r=S.get(url,timeout=60); r.raise_for_status(); return r.json()
        except Exception:
            if i==retries-1: raise
            time.sleep(2+i)


def clean(v):
    v='' if v is None else str(v)
    v=v.replace('\r','\n'); v=re.sub(r'\n{3,}','\n\n',v); return re.sub(r'[ \t]+',' ',v).strip()


def safe(v): return re.sub(r'[^A-Za-z0-9._-]+','_',str(v)).strip('_')[:90] or 'image'


def image(url,key,size=(900,650)):
    if not url:return None
    p=IMG/(safe(key)+'.jpg')
    if p.exists() and p.stat().st_size>4000:return p
    for candidate in (url+'/medium',url):
        try:
            r=S.get(candidate,timeout=60); r.raise_for_status()
            im=ImageOps.exif_transpose(PILImage.open(io.BytesIO(r.content))).convert('RGB')
            im.thumbnail(size,PILImage.Resampling.LANCZOS)
            canvas=PILImage.new('RGB',size,'white'); canvas.paste(im,((size[0]-im.width)//2,(size[1]-im.height)//2))
            canvas.save(p,'JPEG',quality=72,optimize=True,progressive=True); return p
        except Exception: pass
    return None


def collect():
    categories=get_json(f'{API}/categories.php').get('categories') or []
    meals={}
    for letter in string.ascii_lowercase:
        for m in get_json(f'{API}/search.php?f={letter}').get('meals') or []: meals[m['idMeal']]=m
        time.sleep(.05)
    for c in categories:
        for item in get_json(f"{API}/filter.php?c={requests.utils.quote(c['strCategory'])}").get('meals') or []:
            if item['idMeal'] not in meals:
                detail=get_json(f"{API}/lookup.php?i={item['idMeal']}").get('meals') or []
                if detail: meals[item['idMeal']]=detail[0]
        time.sleep(.05)
    ordered=sorted(meals.values(),key=lambda m:((m.get('strCategory') or 'Other'),(m.get('strArea') or ''),(m.get('strMeal') or '')))
    payload={'editor':EDITOR,'publisher_eu':PUB_EU,'publisher_world':PUB_WORLD,'source_page':SOURCE_PAGE,'categories':categories,'meals':ordered}
    DATA.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
    return categories,ordered


def ingredients(m):
    out=[]
    for i in range(1,21):
        ing=clean(m.get(f'strIngredient{i}')); measure=clean(m.get(f'strMeasure{i}'))
        if ing:out.append((measure,ing))
    return out


def esc(v): return html.escape(clean(v))


def logo_path(candidates):
    for rel in candidates:
        p=ROOT/rel
        if p.exists():return p
    return None


def pdf(categories,meals):
    ss=getSampleStyleSheet()
    cover=ParagraphStyle('cover',parent=ss['Title'],fontName='Helvetica-Bold',fontSize=31,leading=35,alignment=TA_CENTER,textColor=colors.HexColor('#161616'))
    sub=ParagraphStyle('sub',parent=ss['Normal'],fontSize=11.5,leading=17,alignment=TA_CENTER,textColor=colors.HexColor('#5f5a4e'))
    h1=ParagraphStyle('h1',parent=ss['Heading1'],fontName='Helvetica-Bold',fontSize=24,leading=28,textColor=colors.HexColor('#9a741d'))
    h2=ParagraphStyle('h2',parent=ss['Heading2'],fontName='Helvetica-Bold',fontSize=17,leading=21,textColor=colors.HexColor('#171717'))
    body=ParagraphStyle('body',parent=ss['BodyText'],fontSize=9,leading=13,textColor=colors.HexColor('#282828'))
    small=ParagraphStyle('small',parent=body,fontSize=7.6,leading=10,textColor=colors.HexColor('#66625b'))
    ing=ParagraphStyle('ing',parent=body,fontSize=8.1,leading=10.8,spaceAfter=1)
    doc=SimpleDocTemplate(str(PDF),pagesize=A4,leftMargin=15*mm,rightMargin=15*mm,topMargin=15*mm,bottomMargin=17*mm,title='GNK ASG World Recipe Book - English Edition',author=EDITOR)
    story=[]
    asg=logo_path(['apps/portal/assets/logo-gnk-asg.svg','assets/logo-gnk-asg.svg'])
    din=logo_path(['apps/portal/assets/logo-gnk-dinamo-ltd-group.png','assets/logo-gnk-dinamo-ltd-group.png'])
    logos=[]
    for p in (asg,din):
        if p and p.suffix.lower() in ('.png','.jpg','.jpeg'):logos.append(Image(str(p),width=48*mm,height=25*mm))
        elif p: logos.append(Paragraph(p.stem.replace('-',' ').upper(),sub))
    if logos: story+=[Table([logos],colWidths=[80*mm]*len(logos),style=[('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,-1),'MIDDLE')]),Spacer(1,18*mm)]
    story+=[Paragraph('THE WORLD<br/>RECIPE BOOK',cover),Spacer(1,4*mm),Paragraph('English Edition - A global collection of recipes, categories and culinary traditions',sub),Spacer(1,12*mm)]
    covers=[]
    for m in meals[:6]:
        p=image(m.get('strMealThumb'),f"cover-{m.get('idMeal')}")
        if p:covers.append(Image(str(p),width=54*mm,height=39*mm))
    if covers:
        rows=[covers[i:i+3] for i in range(0,len(covers),3)]
        while len(rows[-1])<3:rows[-1].append('')
        t=Table(rows,colWidths=[56*mm]*3,rowHeights=[41*mm]*len(rows)); t.setStyle(TableStyle([('BOX',(0,0),(-1,-1),.6,colors.HexColor('#cfb966')),('INNERGRID',(0,0),(-1,-1),.25,colors.HexColor('#e7dec0')),('ALIGN',(0,0),(-1,-1),'CENTER')]))
        story.append(t)
    story+=[Spacer(1,11*mm),Paragraph(f'Editor: {EDITOR}<br/>Publisher for the European Union: {PUB_EU}<br/>Publisher for the rest of the world: {PUB_WORLD}',sub),PageBreak()]
    intro=("Food is one of humanity's most universal languages. It carries memory, geography, migration, ingenuity and hospitality from one generation to the next. This volume brings together recipes from many culinary traditions in a single English-language edition, organized so readers can move easily from broad food categories to individual dishes and their preparation. "
           "The purpose of this book is not merely to preserve instructions, but to create a practical global reference: a visual journey through ingredients, techniques and regional identities. Each recipe is presented with its source image, category, region, ingredients and preparation method. Readers are encouraged to adapt recipes responsibly to local ingredients while respecting food safety, allergens and cultural context. "
           "This edition forms part of GNK ASG's wider digital publishing and knowledge initiative, connecting structured public data, visual presentation and accessible international distribution.")
    story+=[Paragraph('Editorial Introduction',h1),Paragraph(intro,body),Spacer(1,7*mm),Paragraph('Editorial and publishing statement',h2),Paragraph(f'Edited by {EDITOR}. Published in the European Union by {PUB_EU}; published for all other territories by {PUB_WORLD}. Source catalog: {SOURCE_PAGE}. Culinary data and images are drawn from the public TheMealDB source used by the GNK ASG food application.',body),Spacer(1,6*mm),Paragraph('Important notice',h2),Paragraph('This book is for informational and editorial use. Confirm allergens, ingredient substitutions, cooking temperatures, storage, dietary requirements and local food-safety rules before preparing or serving any dish. Third-party recipe data and imagery remain attributable to their respective source.',small),PageBreak()]
    counts=defaultdict(int)
    for m in meals:counts[m.get('strCategory') or 'Other']+=1
    story+=[Paragraph('Contents by Category',h1)]
    rows=[['Category','Recipes']]+[[c['strCategory'],str(counts[c['strCategory']])] for c in categories]
    tab=Table(rows,colWidths=[140*mm,25*mm],repeatRows=1); tab.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#171717')),('TEXTCOLOR',(0,0),(-1,0),colors.white),('GRID',(0,0),(-1,-1),.3,colors.HexColor('#c8c1ad')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f5f1e6')]),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('ALIGN',(1,1),(1,-1),'RIGHT'),('PADDING',(0,0),(-1,-1),6)])); story+=[tab,PageBreak()]
    cmap={c['strCategory']:c for c in categories}; grouped=defaultdict(list)
    for m in meals:grouped[m.get('strCategory') or 'Other'].append(m)
    for category in [c['strCategory'] for c in categories]:
        c=cmap[category]; cp=image(c.get('strCategoryThumb'),f'category-{category}')
        story+=[Paragraph(category,h1)]
        desc=Paragraph(esc(c.get('strCategoryDescription') or f'A curated selection of {category.lower()} recipes.'),body)
        if cp: story.append(Table([[Image(str(cp),width=72*mm,height=52*mm),desc]],colWidths=[76*mm,96*mm],style=[('VALIGN',(0,0),(-1,-1),'TOP')]))
        else: story.append(desc)
        story+=[Spacer(1,5*mm),Paragraph(f"{len(grouped[category])} recipes",small),PageBreak()]
        for m in grouped[category]:
            name=esc(m.get('strMeal') or 'Untitled recipe'); area=esc(m.get('strArea') or 'International')
            story+=[Paragraph(name,h2),Paragraph(f'{category} | {area}',small),Spacer(1,2*mm)]
            mp=image(m.get('strMealThumb'),f"meal-{m.get('idMeal')}")
            ing_flow=[Paragraph('Ingredients',ParagraphStyle('ih',parent=h2,fontSize=12,leading=15,textColor=colors.HexColor('#9a741d')))]
            for measure,item in ingredients(m): ing_flow.append(Paragraph('• '+(f'<b>{esc(measure)}</b> ' if measure else '')+esc(item),ing))
            if mp: story.append(Table([[Image(str(mp),width=82*mm,height=59*mm),ing_flow]],colWidths=[86*mm,86*mm],style=[('VALIGN',(0,0),(-1,-1),'TOP'),('BOX',(0,0),(-1,-1),.4,colors.HexColor('#d5c9a5')),('BACKGROUND',(1,0),(1,0),colors.HexColor('#faf8f1')),('PADDING',(0,0),(-1,-1),5)]))
            else: story.extend(ing_flow)
            story+=[Spacer(1,3*mm),Paragraph('Preparation',ParagraphStyle('ph',parent=h2,fontSize=12,leading=15,textColor=colors.HexColor('#9a741d'))),Paragraph(esc(m.get('strInstructions') or 'Instructions were not available in the source.'),body)]
            if m.get('strYoutube') or m.get('strSource'):
                links=[]
                if m.get('strSource'):links.append('Source: '+esc(m['strSource']))
                if m.get('strYoutube'):links.append('Video: '+esc(m['strYoutube']))
                story+=[Spacer(1,2*mm),Paragraph('<br/>'.join(links),small)]
            story.append(PageBreak())
    def footer(canvas,doc):
        canvas.saveState(); canvas.setFont('Helvetica',7.5); canvas.setFillColor(colors.HexColor('#77736a')); canvas.drawString(15*mm,9*mm,'GNK ASG World Recipe Book - English Edition'); canvas.drawRightString(195*mm,9*mm,str(doc.page)); canvas.restoreState()
    doc.build(story,onFirstPage=footer,onLaterPages=footer)


def flipbook(categories,meals):
    cards=[]
    for idx,m in enumerate(meals,1):
        p=image(m.get('strMealThumb'),f"meal-{m.get('idMeal')}")
        rel='images/'+p.name if p else ''
        lis=''.join(f'<li><b>{esc(a)}</b> {esc(b)}</li>' for a,b in ingredients(m))
        cards.append(f'''<section class="page recipe"><div class="page-no">{idx}</div><div class="recipe-head"><div><p>{esc(m.get('strCategory'))} · {esc(m.get('strArea') or 'International')}</p><h2>{esc(m.get('strMeal'))}</h2></div></div><div class="recipe-grid">{f'<img src="{rel}" alt="{esc(m.get("strMeal"))}">' if rel else ''}<div><h3>Ingredients</h3><ul>{lis}</ul></div></div><h3>Preparation</h3><p>{esc(m.get('strInstructions')).replace(chr(10),'<br>')}</p></section>''')
    intro="Food is one of humanity's most universal languages. This international edition connects categories, regions, ingredients and preparation methods in a visual reference designed for readers around the world."
    body=''.join(cards)
    FLIP.write_text(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GNK ASG World Recipe Book</title><style>*{{box-sizing:border-box}}body{{margin:0;background:#090909;color:#171717;font-family:Georgia,serif;overflow:hidden}}.book{{height:100vh;display:grid;place-items:center}}.page{{display:none;width:min(92vw,920px);height:min(88vh,700px);overflow:auto;background:#fffdf7;padding:44px 54px;box-shadow:0 25px 90px #000;border:1px solid #cbb978}}.page.active{{display:block}}.cover{{text-align:center;background:linear-gradient(145deg,#111,#312a17);color:#fff;padding-top:110px}}h1{{font-size:64px;line-height:.9;margin:20px}}h2{{font-size:32px;margin:6px 0 18px}}h3{{color:#94701d}}.gold{{color:#e5c665}}.recipe-grid{{display:grid;grid-template-columns:1fr 1fr;gap:28px}}.recipe-grid img{{width:100%;max-height:330px;object-fit:cover;border-radius:4px}}li,p{{line-height:1.5}}.page-no{{float:right;color:#999}}.controls{{position:fixed;inset:auto 0 16px;display:flex;justify-content:center;gap:12px}}button{{background:#d8b85d;border:0;border-radius:999px;padding:12px 20px;font-weight:bold;cursor:pointer}}#counter{{color:#fff;padding:12px}}@media(max-width:700px){{.page{{padding:28px 22px;height:84vh}}.recipe-grid{{grid-template-columns:1fr}}h1{{font-size:42px}}}}</style></head><body><main class="book"><section class="page cover active"><p>GNK ASG d.o.o. · GNK DINAMO Ltd.</p><h1>THE WORLD<br><span class="gold">RECIPE BOOK</span></h1><p>English Edition</p><p>Editor: {EDITOR}<br>EU Publisher: {PUB_EU}<br>Worldwide Publisher: {PUB_WORLD}</p></section><section class="page"><h2>Editorial Introduction</h2><p>{intro}</p><h3>Publishing statement</h3><p>Edited by {EDITOR}. Published in the European Union by {PUB_EU}; published for all other territories by {PUB_WORLD}.</p><p>Source catalog: {SOURCE_PAGE}</p></section>{body}</main><nav class="controls"><button id="prev">← Previous</button><span id="counter"></span><button id="next">Next →</button></nav><script>const p=[...document.querySelectorAll('.page')];let i=0;function show(n){{i=(n+p.length)%p.length;p.forEach((x,j)=>x.classList.toggle('active',j===i));counter.textContent=`${{i+1}} / ${{p.length}}`;}}prev.onclick=()=>show(i-1);next.onclick=()=>show(i+1);addEventListener('keydown',e=>{{if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1)}});show(0);</script></body></html>''',encoding='utf-8')


if __name__=='__main__':
    categories,meals=collect(); pdf(categories,meals); flipbook(categories,meals)
    print(json.dumps({'pdf':str(PDF),'flipbook':str(FLIP),'recipes':len(meals),'categories':len(categories)}))
