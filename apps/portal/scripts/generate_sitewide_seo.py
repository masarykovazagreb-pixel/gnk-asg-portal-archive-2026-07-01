#!/usr/bin/env python3
from __future__ import annotations
import html,json,re
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urljoin
from xml.sax.saxutils import escape as xe

ROOT=Path(__file__).resolve().parents[1]
SITE='https://www.gnk-asg.hr/'
TODAY=datetime.now(timezone.utc).date().isoformat()
DEFAULT=SITE+'assets/gnk-asg-social-card.png'
ORG=SITE+'#organization'; GROUP=SITE+'#gnk-dinamo-ltd'; PERSON=SITE+'nermin-sefic/#person'; WEBSITE=SITE+'#website'
CORE='GNK ASG d.o.o., GNK ASG, GNK ASG doo, GNK DINAMO Ltd., GNK DINAMO LTD, GNK Dinamo Ltd, GNK DINAMO Ltd. Group, Nermin Sefić, Nermin Sefic, Sefić Nermin, Sefic Nermin'
PRIVATE={'admin','administrator','operator-dashboard','operator-mobile','mail-studio','webmail','campaign-mailer','media-command-center','internal','private','preview','previews','test','tests','sandbox','api','podijeli'}
BAD=('admin','operator','mail-studio','email-template','email_preview','preview','campaign','internal','test','draft')
STANDALONE={'autorske-objave','publications','objave','news','vijesti'}
OV={
'/':('GNK ASG d.o.o. | GNK DINAMO Ltd. Group | Nermin Sefić','Službeni korporativni portal GNK ASG d.o.o. i GNK DINAMO Ltd. Group: profil Nermina Sefića, financije, globalna mreža, tehnologija, tržišta, objave, vijesti i javni dokumenti.','WebPage','1.0','daily'),
'/en/':('GNK ASG d.o.o. | GNK DINAMO Ltd. Group | Nermin Sefić','Official corporate portal of GNK ASG d.o.o. and GNK DINAMO Ltd. Group: Nermin Sefić profile, finance, global network, technology, markets, publications, news and public documents.','WebPage','.95','weekly'),
'/nermin-sefic/':('Nermin Sefić (Nermin Sefic) | GNK ASG d.o.o. i GNK DINAMO Ltd.','Službeni javni korporativni profil Nermina Sefića (Nermin Sefic), direktora GNK ASG d.o.o. i ovlaštenog predstavnika GNK DINAMO Ltd., s povezanim javnim izvorima i dokumentima.','ProfilePage','.95','weekly'),
'/en/nermin-sefic/':('Nermin Sefić (Nermin Sefic) | GNK ASG d.o.o. and GNK DINAMO Ltd.','Official public corporate profile of Nermin Sefić (Nermin Sefic), director of GNK ASG d.o.o. and authorised representative of GNK DINAMO Ltd., with related public sources and documents.','ProfilePage','.95','weekly'),
'/trzista/':('Market Intelligence | GNK ASG d.o.o. i GNK DINAMO Ltd.','', 'CollectionPage','.9','daily'),
'/en/markets/':('Market Intelligence | GNK ASG d.o.o. and GNK DINAMO Ltd.','', 'CollectionPage','.9','daily'),
'/financije/':('Financije i FY 2025 | GNK ASG d.o.o. | GNK DINAMO Ltd.','', 'WebPage','.9','weekly'),
'/en/finance/':('Financial Profile FY 2025 | GNK ASG d.o.o. | GNK DINAMO Ltd.','', 'WebPage','.9','weekly'),
'/tehnologija/':('Tehnologija, AI i sportska analitika | GNK ASG d.o.o.','', 'WebPage','.85','weekly'),
'/en/technology/':('Technology, AI and Sports Analytics | GNK ASG d.o.o.','', 'WebPage','.85','weekly'),
'/vijesti/':('Poslovne i tehnološke vijesti | GNK ASG Intelligence Desk','', 'CollectionPage','.9','daily'),
'/news/':('Business and Technology News | GNK ASG Intelligence Desk','', 'CollectionPage','.9','daily'),
'/objave/':('Objave i dokumenti | GNK ASG d.o.o. | GNK DINAMO Ltd.','', 'CollectionPage','.9','daily'),
'/publications/':('Publications and Documents | GNK ASG d.o.o. | GNK DINAMO Ltd.','', 'CollectionPage','.9','daily'),
'/visual-index/':('Visual Index i galerija | GNK ASG d.o.o. | GNK DINAMO Ltd.','', 'ImageGallery','.85','weekly'),
'/assistant/':('GNK ASG Intelligence Desk | AI pomoć i javni podaci','', 'WebPage','.8','weekly'),
'/contact/':('Kontakt | GNK ASG d.o.o. | GNK DINAMO Ltd.','', 'ContactPage','.8','monthly'),
'/legal/':('Pravne informacije, privatnost i GDPR | GNK ASG d.o.o.','', 'WebPage','.6','monthly'),
'/app/':('GNK ASG korporativna aplikacija | GNK DINAMO Ltd.','', 'WebApplication','.7','monthly'),
'/the-code/':('THE CODE | GNK DINAMO Ltd. Group | GNK ASG d.o.o.','', 'CreativeWork','.9','weekly'),
'/media-application/':('Media Application and Accreditation | GNK ASG Media Center','', 'WebPage','.75','monthly')}
ALT={'/':'/en/','/en/':'/','/nermin-sefic/':'/en/nermin-sefic/','/en/nermin-sefic/':'/nermin-sefic/','/trzista/':'/en/markets/','/en/markets/':'/trzista/','/financije/':'/en/finance/','/en/finance/':'/financije/','/tehnologija/':'/en/technology/','/en/technology/':'/tehnologija/','/vijesti/':'/news/','/news/':'/vijesti/','/objave/':'/publications/','/publications/':'/objave/'}
BEGIN='<!-- SITEWIDE-SEO:BEGIN -->'; END='<!-- SITEWIDE-SEO:END -->'

def clean(s):
 s=re.sub(r'<script\b.*?</script>|<style\b.*?</style>',' ',s,flags=re.I|re.S);s=re.sub(r'<[^>]+>',' ',s);return re.sub(r'\s+',' ',html.unescape(s)).strip()
def clip(s,n):
 s=re.sub(r'\s+',' ',s).strip()
 if len(s)<=n:return s
 return s[:n-1].rsplit(' ',1)[0].rstrip(' ,.;:-')+'…'
def first(p,s):
 m=re.search(p,s,flags=re.I|re.S);return clean(m.group(1)) if m else ''
def route(p):
 r=p.relative_to(ROOT); parts={x.lower() for x in r.parts}
 if parts&PRIVATE or r.name.lower()=='404.html':return None
 if r.name.lower()=='index.html':
  d=r.parent.as_posix().strip('.')
  return '/' if not d else '/'+d.strip('/')+'/'
 if r.parts and r.parts[0].lower() in STANDALONE:return '/'+r.as_posix()
 return None
def private(p):
 r=p.relative_to(ROOT).as_posix().lower();return any(x in r for x in BAD) or bool(set(Path(r).parts)&PRIVATE)
def lang(s,r):
 m=re.search(r'<html\b[^>]*\blang=["\']([^"\']+)',s,re.I)
 return m.group(1).split('-')[0].lower() if m else ('en' if r.startswith('/en/') or r in {'/news/','/publications/','/media-application/'} else 'hr')
def absu(r):return urljoin(SITE,r.lstrip('/'))
def title(s,r,l):
 if r in OV:return OV[r][0]
 x=first(r'<title[^>]*>(.*?)</title>',s) or first(r'<h1\b[^>]*>(.*?)</h1>',s) or first(r'<h2\b[^>]*>(.*?)</h2>',s) or (r.strip('/').split('/')[-1].replace('-',' ').title() or 'GNK ASG d.o.o.')
 if not re.search(r'GNK\s+(?:ASG|DINAMO)|Nermin\s+Sefi',x,re.I):x+=' | GNK ASG d.o.o.'
 return clip(x,68)
def desc(s,r,l,t):
 if r in OV and OV[r][1]:return clip(OV[r][1],165)
 x=first(r'<meta\b[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)',s) or first(r'<main\b[^>]*>(.*?)</main>',s) or first(r'<body\b[^>]*>(.*?)</body>',s)
 x=clip(x,115) or t
 if not re.search(r'GNK\s+(?:ASG|DINAMO)',x,re.I):x+=(' Official content from the GNK ASG d.o.o. and GNK DINAMO Ltd. Group portal.' if l=='en' else ' Službeni sadržaj portala GNK ASG d.o.o. i GNK DINAMO Ltd. Group.')
 return clip(x,165)
def image(s):
 x=first(r'<meta\b[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']+)',s) or first(r'<img\b[^>]*src=["\']([^"\']+)',s)
 return urljoin(SITE,x) if x and not x.startswith('data:') else DEFAULT
def graph(r,l,t,d,img,typ):
 u=absu(r); page={'@type':typ,'@id':u+'#webpage','url':u,'name':t,'description':d,'inLanguage':l,'isPartOf':{'@id':WEBSITE},'about':[{'@id':ORG},{'@id':GROUP},{'@id':PERSON}],'mentions':[{'@id':ORG},{'@id':GROUP},{'@id':PERSON}],'primaryImageOfPage':{'@type':'ImageObject','url':img}}
 if typ=='ProfilePage':page['mainEntity']={'@id':PERSON}
 g=[{'@type':'WebSite','@id':WEBSITE,'url':SITE,'name':'GNK ASG d.o.o. | GNK DINAMO Ltd. Group','publisher':{'@id':ORG},'inLanguage':['hr','en']},{'@type':'Organization','@id':ORG,'name':'GNK ASG d.o.o.','alternateName':['GNK ASG','GNK ASG doo'],'url':SITE,'logo':SITE+'assets/logo-gnk-asg.svg','taxID':'75227917632','address':{'@type':'PostalAddress','streetAddress':'Zagrebačka cesta 130','addressLocality':'Zagreb','addressCountry':'HR'},'memberOf':{'@id':GROUP}},{'@type':'Organization','@id':GROUP,'name':'GNK DINAMO Ltd.','alternateName':['GNK DINAMO LTD','GNK Dinamo Ltd','GNK DINAMO Ltd. Group'],'url':'https://gnkdinamo.eu/','identifier':'Colorado Entity ID 20238180649','location':{'@type':'Place','name':'Boulder, Colorado, USA'}},{'@type':'Person','@id':PERSON,'name':'Nermin Sefić','alternateName':['Nermin Sefic','Sefić Nermin','Sefic Nermin'],'url':SITE+'nermin-sefic/','jobTitle':'Direktor GNK ASG d.o.o. i ovlašteni predstavnik GNK DINAMO Ltd.','worksFor':{'@id':ORG},'affiliation':{'@id':GROUP}},page]
 if r!='/':
  bid=u+'#breadcrumb';page['breadcrumb']={'@id':bid};g.append({'@type':'BreadcrumbList','@id':bid,'itemListElement':[{'@type':'ListItem','position':1,'name':'GNK ASG d.o.o.','item':SITE},{'@type':'ListItem','position':2,'name':t.split('|')[0].strip(),'item':u}]})
 return {'@context':'https://schema.org','@graph':g}
def metadata(r,l,t,d,img,typ):
 u=absu(r);loc='en_US' if l=='en' else 'hr_HR';other='hr_HR' if l=='en' else 'en_US'; keys=clip(CORE+', '+clean(t.replace('|',','))+', '+r.strip('/').replace('/',' ').replace('-',' '),600);og='profile' if typ=='ProfilePage' else 'website'
 a=[BEGIN,f'  <meta name="description" content="{html.escape(d,quote=True)}">',f'  <meta name="keywords" content="{html.escape(keys,quote=True)}">','  <meta name="author" content="GNK ASG d.o.o.; GNK DINAMO Ltd.; Nermin Sefić">','  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">','  <meta name="googlebot" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">',f'  <link rel="canonical" href="{u}">',f'  <meta property="og:type" content="{og}">',f'  <meta property="og:title" content="{html.escape(t,quote=True)}">',f'  <meta property="og:description" content="{html.escape(d,quote=True)}">',f'  <meta property="og:url" content="{u}">','  <meta property="og:site_name" content="GNK ASG d.o.o. | GNK DINAMO Ltd. Group">',f'  <meta property="og:locale" content="{loc}">',f'  <meta property="og:locale:alternate" content="{other}">',f'  <meta property="og:image" content="{img}">',f'  <meta property="og:image:secure_url" content="{img}">','  <meta property="og:image:width" content="1200">','  <meta property="og:image:height" content="630">',f'  <meta property="og:image:alt" content="{html.escape(t,quote=True)}">','  <meta name="twitter:card" content="summary_large_image">',f'  <meta name="twitter:title" content="{html.escape(t,quote=True)}">',f'  <meta name="twitter:description" content="{html.escape(d,quote=True)}">',f'  <meta name="twitter:image" content="{img}">']
 if r in ALT:
  o=ALT[r];hr=r if l!='en' else o;en=r if l=='en' else o;a += [f'  <link rel="alternate" hreflang="hr" href="{absu(hr)}">',f'  <link rel="alternate" hreflang="en" href="{absu(en)}">',f'  <link rel="alternate" hreflang="x-default" href="{absu(hr)}">']
 a += ['  <script type="application/ld+json">'+json.dumps(graph(r,l,t,d,img,typ),ensure_ascii=False,separators=(',',':'))+'</script>',END];return '\n'.join(a)
def stripseo(s):
 s=re.sub(r'\s*<!-- SITEWIDE-SEO:BEGIN -->.*?<!-- SITEWIDE-SEO:END -->\s*','\n',s,flags=re.S);s=re.sub(r'\s*<!-- SEO:BEGIN generated by scripts/generate_seo\.py -->.*?<!-- SEO:END -->\s*','\n',s,flags=re.S);m=re.search(r'<head\b[^>]*>(.*?)</head>',s,re.I|re.S)
 if not m:return s
 h=m.group(1);h=re.sub(r'\s*<meta\b[^>]*(?:name=["\'](?:description|keywords|author|robots|googlebot|twitter:[^"\']+)["\']|property=["\']og:[^"\']+["\'])[^>]*>','',h,flags=re.I);h=re.sub(r'\s*<link\b[^>]*rel=["\'](?:canonical|alternate)["\'][^>]*>','',h,flags=re.I);h=re.sub(r'\s*<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>.*?</script>','',h,flags=re.I|re.S);return s[:m.start(1)]+h+s[m.end(1):]
def imgs(s,t):
 found=[];i=0
 def f(m):
  nonlocal i
  tag=m.group(0);q=re.search(r'\bsrc=["\']([^"\']+)',tag,re.I)
  if not q:return tag
  src=q.group(1).strip()
  if src and not src.startswith('data:'):found.append(urljoin(SITE,src))
  if not re.search(r'\balt=',tag,re.I):
   stem=Path(src.split('?',1)[0]).stem.replace('-',' ').replace('_',' ').strip();alt=clip((stem.title()+' — '+t.split('|')[0].strip()) if stem else t,125);tag=tag[:-1].rstrip()+f' alt="{html.escape(alt,quote=True)}">'
  if not re.search(r'\bdecoding=',tag,re.I):tag=tag[:-1].rstrip()+' decoding="async">'
  if i>0 and not re.search(r'\bloading=',tag,re.I) and not re.search(r'(?:hero|logo|brand|above-fold)',tag,re.I):tag=tag[:-1].rstrip()+' loading="lazy">'
  i+=1;return tag
 return re.sub(r'<img\b[^>]*>',f,s,flags=re.I),sorted(set(found))
def nav(s,l):
 if 'data-seo-entity-nav' in s or '</footer>' not in s.lower():return s
 if l=='en':label='Corporate links';links='<a href="/">GNK ASG d.o.o.</a> · <a href="/en/nermin-sefic/">Nermin Sefić</a> · <a href="/en/finance/">Financial profile</a> · <a href="https://gnkdinamo.eu/" rel="external">GNK DINAMO Ltd.</a>'
 else:label='Korporativne poveznice';links='<a href="/">GNK ASG d.o.o.</a> · <a href="/nermin-sefic/">Nermin Sefić</a> · <a href="/financije/">Financijski profil</a> · <a href="https://gnkdinamo.eu/" rel="external">GNK DINAMO Ltd.</a>'
 n=f'<nav data-seo-entity-nav aria-label="{label}" style="margin-top:1rem;font-size:.875rem;line-height:1.6;opacity:.88">{links}</nav>';return re.sub(r'</footer>',n+'</footer>',s,count=1,flags=re.I)
def enhance(p,r):
 s=p.read_text(encoding='utf-8-sig',errors='replace')
 if '<head' not in s.lower() or '</head>' not in s.lower():return None
 l=lang(s,r);t=title(s,r,l);d=desc(s,r,l,t);im=image(s);typ=OV.get(r,('', '', 'WebPage','.7','weekly'))[2];s=stripseo(s)
 if re.search(r'<title\b[^>]*>.*?</title>',s,re.I|re.S):s=re.sub(r'<title\b[^>]*>.*?</title>',f'<title>{html.escape(t)}</title>',s,count=1,flags=re.I|re.S)
 else:s=re.sub(r'<head\b[^>]*>',lambda m:m.group(0)+f'\n<title>{html.escape(t)}</title>',s,count=1,flags=re.I)
 s=s.replace('</head>','\n'+metadata(r,l,t,d,im,typ)+'\n</head>',1);s,ii=imgs(s,t);s=nav(s,l);p.write_text(s,encoding='utf-8');o=OV.get(r,('', '', '', '.7','weekly'));return {'route':r,'url':absu(r),'file':str(p.relative_to(ROOT)),'lang':l,'title':t,'description':d,'image':im,'images':ii,'priority':o[3],'changefreq':o[4]}
def noindex(p):
 s=p.read_text(encoding='utf-8-sig',errors='replace')
 if '<head' not in s.lower() or '</head>' not in s.lower():return
 s=re.sub(r'\s*<meta\b[^>]*name=["\']robots["\'][^>]*>','',s,flags=re.I);s=s.replace('</head>','\n<meta name="robots" content="noindex,nofollow,noarchive">\n</head>',1);p.write_text(s,encoding='utf-8')
def main():
 pages=[];blocked=[]
 for p in sorted(ROOT.rglob('*.html')):
  rel=p.relative_to(ROOT)
  if any(x.startswith('.') for x in rel.parts):continue
  r=route(p)
  if r and not private(p):
   q=enhance(p,r)
   if q:pages.append(q)
  elif private(p) or p.name.lower()=='404.html':noindex(p);blocked.append(rel.as_posix())
 pages.sort(key=lambda x:(x['route']!='/',x['route']))
 if not pages:raise SystemExit('No public HTML pages discovered')
 def se(x):return f"  <url>\n    <loc>{xe(x['url'])}</loc>\n    <lastmod>{TODAY}</lastmod>\n    <changefreq>{x['changefreq']}</changefreq>\n    <priority>{x['priority']}</priority>\n  </url>"
 (ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+'\n'.join(map(se,pages))+'\n</urlset>\n',encoding='utf-8')
 def ie(x):
  ims=[]
  for z in [x['image'],*x['images']]:
   if z and z not in ims:ims.append(z)
  return '  <url>\n    <loc>'+xe(x['url'])+'</loc>\n'+'\n'.join('    <image:image>\n      <image:loc>'+xe(z)+'</image:loc>\n      <image:title>'+xe(x['title'])+'</image:title>\n    </image:image>' for z in ims[:1000])+'\n  </url>'
 (ROOT/'image-sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'+'\n'.join(map(ie,pages))+'\n</urlset>\n',encoding='utf-8')
 (ROOT/'robots.txt').write_text('User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /operator-dashboard/\nDisallow: /operator-mobile/\nDisallow: /mail-studio/\nDisallow: /webmail/\nDisallow: /campaign-mailer/\nDisallow: /podijeli/\nDisallow: /api/\n\nSitemap: '+SITE+'sitemap.xml\nSitemap: '+SITE+'image-sitemap.xml\n',encoding='utf-8')
 (ROOT/'llms.txt').write_text('# GNK ASG d.o.o. and GNK DINAMO Ltd. Group\n\nOfficial public corporate portal. Principal entities: GNK ASG d.o.o.; GNK DINAMO Ltd.; Nermin Sefić (also written Nermin Sefic).\n\nUse canonical public pages and verify financial, legal and corporate claims against linked source documents and official registries.\n\n## Public pages\n'+'\n'.join('- '+x['url']+' — '+x['title'] for x in pages[:100])+'\n',encoding='utf-8')
 d=ROOT/'data';d.mkdir(exist_ok=True);(d/'seo-report.json').write_text(json.dumps({'generatedAt':datetime.now(timezone.utc).isoformat(),'site':SITE,'publicPageCount':len(pages),'noindexFileCount':len(blocked),'publicPages':pages,'noindexFiles':blocked},ensure_ascii=False,indent=2),encoding='utf-8');print(f'Sitewide SEO: {len(pages)} public pages, {len(blocked)} noindex files')
if __name__=='__main__':main()
