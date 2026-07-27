#!/usr/bin/env python3
import html, io, json, re, string, time
from collections import Counter, defaultdict
from pathlib import Path

import requests
from PIL import Image as PILImage, ImageOps, ImageEnhance
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Image,
                                PageBreak, Table, TableStyle, KeepTogether, NextPageTemplate)

API='https://www.themealdb.com/api/json/v1/1'
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'world-cookbook-premium'
IMG=OUT/'images'; LOGOS=OUT/'logos'
OUT.mkdir(parents=True,exist_ok=True); IMG.mkdir(exist_ok=True); LOGOS.mkdir(exist_ok=True)
PDF=OUT/'THE_WORLD_TABLE_GNK_ASG_WORLD_RECIPE_BOOK_EN.pdf'
SESSION=requests.Session(); SESSION.headers.update({'User-Agent':'GNK-ASG-World-Cookbook/1.0'})

GOLD=colors.HexColor('#C9A54B'); DARK=colors.HexColor('#080808'); INK=colors.HexColor('#171717')
CREAM=colors.HexColor('#F5F0E5'); MUTED=colors.HexColor('#6E675D'); PALE=colors.HexColor('#E9E0CD')

CHAPTER_COPY={
'Beef':'From slow braises to fast-seared classics, beef cookery is a study in heat, patience and regional identity. These recipes travel across continents while preserving the deep, savoury character that makes beef a foundation of celebratory and everyday tables.',
'Chicken':'Chicken is the world’s most adaptable culinary canvas. It absorbs spice, smoke, citrus and herbs with equal ease, allowing each cuisine to express its own rhythm through roasting, grilling, frying, simmering and baking.',
'Dessert':'Desserts translate memory into flavour. Fruit, chocolate, pastry, custard and spice become the final gesture of hospitality - sometimes refined, sometimes rustic, always connected to place and occasion.',
'Lamb':'Lamb carries the perfume of open fire, mountain herbs and long family traditions. Across the Mediterranean, Middle East, Central Asia and beyond, it rewards confident seasoning and measured cooking.',
'Miscellaneous':'This chapter celebrates the essential preparations that resist simple classification: sauces, pantry foundations, regional specialties and culinary building blocks that give complete meals their character.',
'Pasta':'Pasta is both technique and language. Shape, sauce, texture and timing work together, turning a small set of ingredients into dishes that range from restrained and elegant to generous and deeply comforting.',
'Pork':'Pork appears in some of the world’s most distinctive food traditions. Fresh, cured, roasted, braised or crisped, it offers a spectrum of textures and flavours shaped by local seasoning and preservation methods.',
'Seafood':'Seafood demands freshness, clarity and restraint. The best dishes respect the ingredient’s natural sweetness and mineral character, supported by acid, herbs, spice, smoke or carefully built sauces.',
'Side':'Side dishes define the architecture of a meal. Vegetables, grains, breads, pulses and salads create contrast, balance and abundance while often carrying some of a cuisine’s most enduring flavours.',
'Starter':'A great beginning sets the tone for the entire table. Starters awaken the appetite through crispness, acidity, fragrance and visual precision, offering a first concise statement of the cuisine to follow.',
'Vegan':'Vegan cooking is at its strongest when plants are treated as complete ingredients rather than substitutes. Grains, legumes, vegetables, nuts, seeds and aromatics build depth through roasting, fermentation, spice and texture.',
'Vegetarian':'Vegetarian food reveals the full expressive range of vegetables, dairy, eggs, grains and pulses. These recipes show how colour, contrast, seasonality and technique can create complete and memorable dishes.',
'Breakfast':'Breakfast is where geography becomes immediately visible. From breads and eggs to grains, fruit, beans and savoury plates, the first meal of the day reflects climate, work, ritual and family life.',
'Goat':'Goat is lean, distinctive and deeply rooted in many culinary traditions. Slow cooking, aromatic spice and careful marination bring out its character while preserving tenderness and balance.'}

INGREDIENT_COPY={
'Garlic':'A universal aromatic that shifts from sharp and pungent when raw to sweet and mellow when slowly cooked. Add it early for depth, late for brightness, and roast it when a softer, rounded flavour is required.',
'Olive Oil':'Both cooking medium and seasoning, olive oil carries aroma, binds sauces and completes dishes. Use robust oils for grilling and vegetables, and more delicate oils for finishing seafood, soups and salads.',
'Onion':'The structural base of countless cuisines. Sweated gently, onion provides sweetness and body; browned deeply, it introduces caramel, colour and savoury complexity.',
'Tomato':'Fresh, roasted, dried or preserved, tomato contributes acidity, sweetness and umami. Its balance changes with season and preparation, making tasting and adjustment essential.',
'Lemon':'Lemon brightens rich food, sharpens sauces and lifts herbs and seafood. Zest delivers fragrance without acidity; juice should often be added near the end to preserve freshness.',
'Rice':'Rice is a global staple whose texture depends on variety, washing, hydration and resting. Treat each grain style according to its intended result: separate, creamy, sticky or crisp.',
'Butter':'Butter carries flavour, creates tenderness and provides gloss. Control temperature carefully: low heat for emulsions, moderate heat for sautéing, and browned butter for nutty depth.',
'Chilli':'Chilli offers more than heat. Different varieties bring fruit, smoke, bitterness and floral notes. Build intensity gradually and balance it with fat, sweetness, salt or acidity.',
'Parsley':'Parsley brings clean herbal freshness and a subtle bitter edge. Flat-leaf parsley is especially effective in sauces, grain dishes and finishing mixtures where clarity is needed.',
'Cinnamon':'Cinnamon moves comfortably between sweet and savoury cooking. Used sparingly, it adds warmth and fragrance to meat, grains, fruit and pastry without dominating the dish.',
'Potatoes':'Technique determines whether potatoes become creamy, crisp, fluffy or waxy. Variety matters, as does moisture management: dry surfaces are the key to browning.',
'Coconut Milk':'Coconut milk provides body, sweetness and aromatic richness. Simmer gently to avoid separation and balance with acid, spice and fresh herbs.',
'Chickpeas':'Chickpeas combine protein, texture and a naturally nutty flavour. They respond especially well to cumin, lemon, garlic, tomato, tahini and slow-cooked spice bases.',
'Yogurt':'Yogurt can cool spice, tenderise meat and add bright acidity. Avoid aggressive boiling unless stabilised, and use full-fat yogurt for the smoothest sauces.',
'Basil':'Basil is most expressive when fresh and handled gently. Tear or slice just before serving, and pair it with tomato, olive oil, citrus, cheese and summer vegetables.'}

INTRO=("Food is one of the world’s most immediate forms of cultural knowledge. A recipe records geography, trade, memory, seasonality and the practical intelligence of generations. "
"The World Table brings together recipes from diverse culinary traditions in a single English-language editorial edition, designed for discovery rather than uniformity. "
"Each dish is presented with its own ingredients, method and place of origin, while chapter introductions and ingredient notes provide context for the techniques and flavours that connect the collection.\n\n"
"This book is an editorial compilation prepared from the public culinary catalogue presented through the GNK ASG food platform. It is intended as an accessible international reference for home cooks, culinary enthusiasts and partners interested in the language of food across borders. "
"Recipes should always be adapted to local food-safety requirements, dietary needs, ingredient availability and personal judgement.")


def get_json(url, attempts=4):
    for n in range(attempts):
        try:
            r=SESSION.get(url,timeout=35); r.raise_for_status(); return r.json()
        except Exception:
            if n==attempts-1: raise
            time.sleep(2+n)

def fetch_all():
    cats=get_json(f'{API}/categories.php').get('categories') or []
    meals={}
    for letter in string.ascii_lowercase:
        data=get_json(f'{API}/search.php?f={letter}').get('meals') or []
        for m in data: meals[m['idMeal']]=m
        time.sleep(.08)
    return cats, sorted(meals.values(),key=lambda x:(x.get('strCategory') or '',x.get('strMeal') or ''))

def safe_name(s): return re.sub(r'[^A-Za-z0-9._-]+','_',s)[:100]
def download(url,path):
    if path.exists() and path.stat().st_size>500: return path
    r=SESSION.get(url,timeout=40); r.raise_for_status(); path.write_bytes(r.content); return path

def prep_image(url,key,size=(1100,760)):
    path=IMG/f'{safe_name(key)}.jpg'
    if path.exists() and path.stat().st_size>1000: return path
    raw=SESSION.get(url,timeout=45).content
    im=PILImage.open(io.BytesIO(raw)).convert('RGB')
    im=ImageOps.fit(im,size,method=PILImage.Resampling.LANCZOS,centering=(.5,.5))
    im=ImageEnhance.Contrast(im).enhance(1.04)
    im.save(path,'JPEG',quality=84,optimize=True,progressive=True)
    return path

def ingredients(m):
    out=[]
    for i in range(1,21):
        a=(m.get(f'strIngredient{i}') or '').strip(); q=(m.get(f'strMeasure{i}') or '').strip()
        if a: out.append((q,a))
    return out

def clean_text(s):
    s=(s or '').replace('\r','\n'); s=re.sub(r'\n{3,}','\n\n',s); return s.strip()

def register_fonts():
    candidates=[('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','Body'),('/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf','Serif'),('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','Bold')]
    for p,n in candidates:
        if Path(p).exists(): pdfmetrics.registerFont(TTFont(n,p))
    return ('Body' if 'Body' in pdfmetrics.getRegisteredFontNames() else 'Helvetica', 'Serif' if 'Serif' in pdfmetrics.getRegisteredFontNames() else 'Times-Roman', 'Bold' if 'Bold' in pdfmetrics.getRegisteredFontNames() else 'Helvetica-Bold')

class BookDoc(BaseDocTemplate):
    def __init__(self,*a,**k):
        super().__init__(*a,**k)
        frame=Frame(18*mm,18*mm,A4[0]-36*mm,A4[1]-36*mm,id='normal')
        self.addPageTemplates([PageTemplate(id='normal',frames=frame,onPage=self.page_deco)])
    def page_deco(self,c,doc):
        if doc.page<=4:return
        c.saveState(); c.setStrokeColor(PALE); c.line(18*mm,14*mm,A4[0]-18*mm,14*mm)
        c.setFont(BODY,7); c.setFillColor(MUTED)
        c.drawString(18*mm,9*mm,'THE WORLD TABLE · GNK ASG d.o.o. · GNK DINAMO Ltd.')
        c.drawRightString(A4[0]-18*mm,9*mm,str(doc.page)); c.restoreState()

def cover_canvas(c, title, subtitle=None, img=None):
    c.saveState(); c.setFillColor(DARK); c.rect(0,0,A4[0],A4[1],fill=1,stroke=0)
    if img:
        try:
            im=PILImage.open(img); w,h=im.size; ratio=max(A4[0]/w,A4[1]/h); dw,dh=w*ratio,h*ratio
            c.drawImage(str(img),(A4[0]-dw)/2,(A4[1]-dh)/2,dw,dh,mask='auto')
            c.setFillColor(colors.Color(0,0,0,.54)); c.rect(0,0,A4[0],A4[1],fill=1,stroke=0)
        except: pass
    c.setStrokeColor(GOLD); c.setLineWidth(1.2); c.rect(14*mm,14*mm,A4[0]-28*mm,A4[1]-28*mm,fill=0,stroke=1)
    c.setFillColor(GOLD); c.setFont(BOLD,10); c.drawCentredString(A4[0]/2,A4[1]-36*mm,'GNK ASG d.o.o.  ×  GNK DINAMO Ltd.')
    c.setFillColor(colors.white); c.setFont(SERIF,34); y=A4[1]*.57
    for line in title.split('\n'): c.drawCentredString(A4[0]/2,y,line); y-=15*mm
    if subtitle:
        c.setFont(BODY,11); c.setFillColor(CREAM); c.drawCentredString(A4[0]/2,y-4*mm,subtitle)
    c.setFont(BODY,8); c.setFillColor(PALE); c.drawCentredString(A4[0]/2,28*mm,'EDITOR · NERMIN SEFIĆ')
    c.restoreState()

def styles():
    ss=getSampleStyleSheet()
    return {
      'h1':ParagraphStyle('h1',fontName=SERIF,fontSize=29,leading=33,textColor=INK,spaceAfter=8*mm),
      'h2':ParagraphStyle('h2',fontName=SERIF,fontSize=19,leading=23,textColor=INK,spaceAfter=4*mm),
      'body':ParagraphStyle('body',fontName=BODY,fontSize=9.2,leading=14,textColor=INK,spaceAfter=3*mm),
      'small':ParagraphStyle('small',fontName=BODY,fontSize=7.8,leading=11,textColor=MUTED),
      'kicker':ParagraphStyle('kicker',fontName=BOLD,fontSize=8.2,leading=10,textColor=GOLD,spaceAfter=2*mm),
      'recipe':ParagraphStyle('recipe',fontName=BODY,fontSize=8.1,leading=11.2,textColor=INK),
      'chapter':ParagraphStyle('chapter',fontName=SERIF,fontSize=36,leading=40,textColor=colors.white,alignment=TA_CENTER),
    }

def build_pdf(cats,meals,images):
    global BODY,SERIF,BOLD
    BODY,SERIF,BOLD=register_fonts(); S=styles()
    first_img=images.get(meals[0]['idMeal']) if meals else None
    doc=BookDoc(str(PDF),pagesize=A4,leftMargin=18*mm,rightMargin=18*mm,topMargin=18*mm,bottomMargin=18*mm,title='The World Table',author='Nermin Sefić')
    story=[]
    # custom cover as full-page flowable approximation
    class CoverFlow(Spacer):
        def __init__(self): super().__init__(1,A4[1]-36*mm)
        def draw(self): cover_canvas(self.canv,'THE WORLD\nTABLE','A GLOBAL RECIPE COLLECTION · ENGLISH EDITION',first_img)
    story += [CoverFlow(),PageBreak()]
    story += [Paragraph('THE WORLD TABLE',S['h1']),Paragraph('A Global Recipe Collection',S['h2']),Spacer(1,7*mm),
              Paragraph('<b>Editor</b><br/>Nermin Sefić',S['body']),Spacer(1,3*mm),
              Paragraph('<b>Publisher for the European Union</b><br/>GNK ASG d.o.o., Zagreb, Croatia',S['body']),Spacer(1,3*mm),
              Paragraph('<b>Publisher for the Rest of the World</b><br/>GNK DINAMO Ltd., Boulder, Colorado, USA',S['body']),Spacer(1,12*mm),
              Paragraph('Editorial compilation based on the public culinary catalogue presented through the GNK ASG food platform. Recipe data and source imagery are attributed to TheMealDB and the original source links identified in the underlying catalogue.',S['small']),PageBreak()]
    story += [Paragraph('EDITORIAL INTRODUCTION',S['kicker']),Paragraph('Food as a Global Language',S['h1'])]
    for p in INTRO.split('\n\n'): story.append(Paragraph(html.escape(p),S['body']))
    story += [Spacer(1,5*mm),Paragraph('Nermin Sefić<br/><font size="8">Editor</font>',S['body']),PageBreak()]
    counts=Counter(m.get('strCategory') or 'Miscellaneous' for m in meals)
    story += [Paragraph('CONTENTS',S['kicker']),Paragraph('Chapters',S['h1'])]
    rows=[]
    order=[]
    for c in cats:
        n=c['strCategory']; order.append(n); rows.append([Paragraph(n,S['body']),Paragraph(str(counts[n])+' recipes',S['small'])])
    t=Table(rows,colWidths=[120*mm,35*mm]); t.setStyle(TableStyle([('LINEBELOW',(0,0),(-1,-1),.25,PALE),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),('TOPPADDING',(0,0),(-1,-1),3*mm),('BOTTOMPADDING',(0,0),(-1,-1),3*mm)])); story += [t,PageBreak()]
    bycat=defaultdict(list)
    for m in meals: bycat[m.get('strCategory') or 'Miscellaneous'].append(m)
    spotlight_used=set()
    for ci,cat in enumerate(order):
        cms=bycat.get(cat,[])
        if not cms: continue
        chapter_img=images.get(cms[0]['idMeal'])
        class ChapterFlow(Spacer):
            def __init__(self,cat=cat,img=chapter_img,count=len(cms)): self.cat=cat;self.img=img;self.count=count;super().__init__(1,A4[1]-36*mm)
            def draw(self):
                cover_canvas(self.canv,self.cat.upper(),f'{self.count} RECIPES · CHAPTER {ci+1:02d}',self.img)
        story += [ChapterFlow(),PageBreak(),Paragraph(cat.upper(),S['kicker']),Paragraph(cat,S['h1']),Paragraph(CHAPTER_COPY.get(cat,'A chapter of distinctive recipes, techniques and regional flavours presented for international discovery.'),S['body'])]
        # choose up to two ingredient spotlights based on frequency
        freq=Counter()
        for m in cms:
            for _,a in ingredients(m): freq[a.title()]+=1
        selected=[]
        for key,_ in freq.most_common(20):
            base=next((k for k in INGREDIENT_COPY if k.lower() in key.lower() or key.lower() in k.lower()),None)
            if base and base not in spotlight_used: selected.append(base); spotlight_used.add(base)
            if len(selected)==2: break
        if selected:
            cells=[]
            for ing in selected: cells.append(Paragraph(f'<font color="#C9A54B"><b>INGREDIENT NOTE · {ing.upper()}</b></font><br/>{INGREDIENT_COPY[ing]}',S['small']))
            tt=Table([cells],colWidths=[77*mm]*len(cells),hAlign='LEFT'); tt.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#F1EBDD')),('BOX',(0,0),(-1,-1),.5,GOLD),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),5*mm),('RIGHTPADDING',(0,0),(-1,-1),5*mm),('TOPPADDING',(0,0),(-1,-1),4*mm),('BOTTOMPADDING',(0,0),(-1,-1),4*mm)])); story += [Spacer(1,4*mm),tt]
        story += [PageBreak()]
        for idx,m in enumerate(cms,1):
            img=images.get(m['idMeal']); title=m.get('strMeal') or 'Untitled Recipe'; area=m.get('strCountry') or m.get('strArea') or 'International'
            story += [Paragraph(f'{cat.upper()} · {idx:02d}',S['kicker']),Paragraph(html.escape(title),S['h1'])]
            if img: story.append(Image(str(img),width=174*mm,height=103*mm,kind='proportional'))
            story += [Spacer(1,3*mm),Paragraph(f'<b>Origin</b> · {html.escape(area)} &nbsp;&nbsp; <b>Category</b> · {html.escape(cat)}',S['small']),Spacer(1,4*mm)]
            ing=ingredients(m)
            left='<br/>'.join(f'<b>{html.escape(q)}</b> {html.escape(a)}' for q,a in ing[:10]) or 'See method.'
            right='<br/>'.join(f'<b>{html.escape(q)}</b> {html.escape(a)}' for q,a in ing[10:])
            cols=[Paragraph(left,S['recipe'])]
            widths=[76*mm]
            if right: cols.append(Paragraph(right,S['recipe'])); widths=[76*mm,76*mm]
            tab=Table([cols],colWidths=widths,hAlign='LEFT'); tab.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#F7F3EA')),('BOX',(0,0),(-1,-1),.45,PALE),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),4*mm),('RIGHTPADDING',(0,0),(-1,-1),4*mm),('TOPPADDING',(0,0),(-1,-1),4*mm),('BOTTOMPADDING',(0,0),(-1,-1),4*mm)]))
            story += [Paragraph('INGREDIENTS',S['kicker']),tab,Spacer(1,5*mm),Paragraph('METHOD',S['kicker'])]
            method=clean_text(m.get('strInstructions'))
            for p in re.split(r'\n\s*\n',method):
                if p.strip(): story.append(Paragraph(html.escape(p.strip()).replace('\n','<br/>'),S['body']))
            source=m.get('strSource') or 'TheMealDB catalogue'
            story += [Spacer(1,2*mm),Paragraph(f'<b>Source reference:</b> {html.escape(source)}',S['small']),PageBreak()]
    story += [Paragraph('COLOPHON',S['kicker']),Paragraph('Editorial and Publishing Information',S['h1']),Paragraph('Editor: Nermin Sefić<br/>Publisher for the European Union: GNK ASG d.o.o.<br/>Publisher for the Rest of the World: GNK DINAMO Ltd.<br/><br/>English-language world edition. The collection is prepared as an editorial reference. Ingredient availability, allergen information, cooking temperatures and food-safety requirements must be independently verified by the reader.',S['body'])]
    doc.build(story)

def build_flipbook(cats,meals,images):
    data=[]
    for m in meals:
        data.append({'id':m['idMeal'],'name':m.get('strMeal'),'category':m.get('strCategory'),'origin':m.get('strCountry') or m.get('strArea') or 'International','image':'images/'+images[m['idMeal']].name,'ingredients':[{'measure':q,'ingredient':a} for q,a in ingredients(m)],'method':clean_text(m.get('strInstructions')),'source':m.get('strSource')})
    (OUT/'world-recipes.json').write_text(json.dumps({'title':'The World Table','editor':'Nermin Sefić','publishers':{'EU':'GNK ASG d.o.o.','World':'GNK DINAMO Ltd.'},'categories':cats,'meals':data},ensure_ascii=False),encoding='utf-8')
    payload=json.dumps(data,ensure_ascii=False).replace('</','<\\/')
    chapters=json.dumps(CHAPTER_COPY,ensure_ascii=False).replace('</','<\\/')
    index=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>The World Table</title><style>
    *{{box-sizing:border-box}}body{{margin:0;background:#080808;color:#f7f1e5;font-family:Arial,sans-serif;overflow:hidden}}.app{{height:100vh;display:grid;grid-template-rows:auto 1fr auto}}header,footer{{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-color:#4b3b17;background:#0c0c0c}}header{{border-bottom:1px solid #4b3b17}}footer{{border-top:1px solid #4b3b17}}.brand{{font-family:Georgia,serif;font-size:20px;letter-spacing:.08em}}.gold{{color:#d6b65d}}.book{{perspective:1800px;display:grid;place-items:center;padding:18px}}.page{{width:min(900px,92vw);height:min(78vh,720px);background:#f7f3e9;color:#171717;border-radius:8px;box-shadow:0 30px 70px #000;overflow:auto;transform-origin:left center;animation:turn .5s ease}}@keyframes turn{{from{{transform:rotateY(-12deg);opacity:.25}}to{{transform:none;opacity:1}}}}.cover{{height:100%;min-height:620px;background:linear-gradient(#0008,#000c),url('images/{images[meals[0]['idMeal']].name}') center/cover;display:grid;place-items:center;text-align:center;color:white;padding:50px;border:1px solid #c9a54b}}h1,h2{{font-family:Georgia,serif}}.cover h1{{font-size:clamp(44px,8vw,88px);line-height:.9;margin:20px}}.content{{padding:34px}}.recipe-grid{{display:grid;grid-template-columns:1fr 1fr;gap:28px}}.hero{{width:100%;height:330px;object-fit:cover;border-radius:4px}}.meta,.kicker{{color:#9b7627;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px}}ul{{padding-left:20px}}li{{margin:5px 0}}p{{line-height:1.55}}button,select{{background:#111;color:#fff;border:1px solid #b89543;border-radius:4px;padding:10px 14px}}button{{cursor:pointer}}.counter{{font-size:13px;color:#bdb5a8}}@media(max-width:720px){{.page{{height:80vh}}.recipe-grid{{grid-template-columns:1fr}}.hero{{height:230px}}.content{{padding:22px}}}}
    </style></head><body><div class="app"><header><div class="brand">THE WORLD TABLE <span class="gold">· GNK ASG × GNK DINAMO</span></div><select id="chapter"><option value="">All chapters</option></select></header><main class="book"><article id="page" class="page"></article></main><footer><button id="prev">← Previous</button><span id="counter" class="counter"></span><button id="next">Next →</button></footer></div><script>const meals={payload},chapters={chapters};let filtered=meals,index=-1;const page=document.getElementById('page'),counter=document.getElementById('counter'),sel=document.getElementById('chapter');[...new Set(meals.map(x=>x.category))].sort().forEach(c=>sel.add(new Option(c,c)));function esc(s){{return String(s??'').replace(/[&<>"']/g,m=>({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}}[m]))}}function render(){{page.classList.remove('page');void page.offsetWidth;page.classList.add('page');if(index<0){{page.innerHTML=`<div class="cover"><div><div class="kicker">GNK ASG d.o.o. × GNK DINAMO Ltd.</div><h1>THE WORLD<br>TABLE</h1><p>A Global Recipe Collection · English Edition</p><p>Editor · Nermin Sefić</p></div></div>`;counter.textContent=`Cover · ${{filtered.length}} recipes`;return}}const m=filtered[index];page.innerHTML=`<div class="content"><div class="kicker">${{esc(m.category)}} · ${{esc(m.origin)}}</div><h1>${{esc(m.name)}}</h1><img class="hero" src="${{esc(m.image)}}" alt="${{esc(m.name)}}"><div class="recipe-grid"><section><h2>Ingredients</h2><ul>${{m.ingredients.map(i=>`<li><b>${{esc(i.measure)}}</b> ${{esc(i.ingredient)}}</li>`).join('')}}</ul></section><section><h2>Method</h2>${{m.method.split(/\n\s*\n/).map(p=>`<p>${{esc(p)}}</p>`).join('')}}</section></div><p class="meta">${{esc(m.source||'TheMealDB catalogue')}}</p></div>`;counter.textContent=`${{index+1}} / ${{filtered.length}}`}}document.getElementById('next').onclick=()=>{{if(index<filtered.length-1)index++;render()}};document.getElementById('prev').onclick=()=>{{if(index>-1)index--;render()}};sel.onchange=()=>{{filtered=sel.value?meals.filter(x=>x.category===sel.value):meals;index=-1;render()}};addEventListener('keydown',e=>{{if(e.key==='ArrowRight')document.getElementById('next').click();if(e.key==='ArrowLeft')document.getElementById('prev').click()}});render();</script></body></html>'''
    (OUT/'index.html').write_text(index,encoding='utf-8')

def main():
    cats,meals=fetch_all(); print('categories',len(cats),'meals',len(meals))
    images={}
    for i,m in enumerate(meals,1):
        try: images[m['idMeal']]=prep_image(m['strMealThumb'],m['idMeal']+'_'+m['strMeal'])
        except Exception as e: print('image failed',m['idMeal'],e)
        if i%25==0: print('images',i,'/',len(meals))
    meals=[m for m in meals if m['idMeal'] in images]
    build_pdf(cats,meals,images); build_flipbook(cats,meals,images)
    manifest={'categories':len(cats),'recipes':len(meals),'pdf':PDF.name,'editor':'Nermin Sefić','publisherEU':'GNK ASG d.o.o.','publisherWorld':'GNK DINAMO Ltd.'}
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding='utf-8')
    print(json.dumps(manifest,ensure_ascii=False))
if __name__=='__main__': main()
