#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://gnk-asg.hr/'
DEFAULT_IMAGE = SITE + 'assets/gnk-asg-social-card.png'
PUBLIC_TOOLS = '<script src="/assets/public-tools.js?v=20260527-asg-bpp-share-unique03" defer></script>'
TODAY = datetime.now(timezone.utc).date().isoformat()
ORG_ID = SITE + '#gnk-asg'
GROUP_ID = SITE + '#gnk-dinamo-ltd'
PERSON_ID = SITE + '#nermin-sefic'
WEBSITE_ID = SITE + '#website'
BPP_ID = SITE + '#bitcoin-payment-processor'
PROFILE_HR = SITE + 'nermin-sefic/'
PROFILE_EN = SITE + 'en/nermin-sefic/'

IDENTITY_VARIANTS = ['Nermin Sefić', 'Nermin Sefic', 'Sefić Nermin', 'Sefic Nermin']
CORE_HR = 'GNK ASG d.o.o., GNK ASG doo, GNK ASG, GNK DINAMO Ltd., GNK DINAMO LTD, GNK Dinamo Ltd, GNK Dinamo grupa, Nermin Sefić, Nermin Sefic, Sefić Nermin, Sefic Nermin'
CORE_EN = 'GNK ASG d.o.o., GNK ASG doo, GNK ASG, GNK DINAMO Ltd., GNK DINAMO LTD, GNK Dinamo Ltd, GNK Dinamo group, Nermin Sefić, Nermin Sefic, Sefić Nermin, Sefic Nermin'

SOCIAL_IMAGES = {
    'teme/': 'assets/share-teme.png',
    'financije/': 'assets/share-financije.png',
    'en/finance/': 'assets/share-financije.png',
    'tehnologija/': 'assets/share-tehnologija.png',
    'en/technology/': 'assets/share-tehnologija.png',
    'trzista/': 'assets/share-trzista.png',
    'en/markets/': 'assets/share-trzista.png',
}

PAGE_TERMS = {
    '': 'korporativni portal, korporativni profil, Zagreb, Hrvatska, Boulder Colorado, GNK DINAMO Ltd. Group, 33 povezana društva, 12 planiranih lokacija, globalna mreža društava, FY 2025, financijski pokazatelji, Bitcoin Payment Processor, bpp.is, softversko rješenje, digitalna imovina, poslovne vijesti',
    'en/': 'corporate portal, corporate profile, Zagreb Croatia, Boulder Colorado, GNK DINAMO Ltd. Group, 33 group companies, 12 planned locations, global group network, FY 2025, financial indicators, Bitcoin Payment Processor, bpp.is, software solution, digital assets, business news',
    'nermin-sefic/': 'Nermin Sefić GNK ASG, Nermin Sefic GNK ASG, Sefić Nermin GNK ASG, Sefic Nermin GNK ASG, Nermin Sefić GNK DINAMO Ltd., direktor, javni profil, financije, javni registri, tehnologija, tržišta, javni dokumenti',
    'en/nermin-sefic/': 'Nermin Sefić GNK ASG, Nermin Sefic GNK ASG, Sefić Nermin GNK ASG, Sefic Nermin GNK ASG, Nermin Sefić GNK DINAMO Ltd., director, public profile, finance, public registries, technology, markets, public documents',
    'sadrzaj/': 'sadržaj portala, korporativni podatci, financije, tehnologija, tržišta, Intelligence Desk, tematski monitoring, poslovne vijesti, javni dokumenti',
    'teme/': 'tematski monitoring, ekonomija, gospodarstvo, javne politike, sport, košarka, tenis, sportski savezi, automobilska tehnologija, električna mobilnost, umjetna inteligencija, AI, javne vijesti, Hrvatska, BiH',
    'financije/': 'financijski profil FY 2025, revidirani financijski izvještaji, izvješće neovisnog revizora, EKVILIBRIJ d.o.o., HSFI, ukupni prihodi 504 milijuna EUR, ukupna aktiva, kapital i rezerve, bez dugoročnih obveza, FINA RGFI',
    'en/finance/': 'financial profile FY 2025, audited financial statements, independent auditor report, EKVILIBRIJ d.o.o., revenue EUR 504 million, total assets, equity and reserves, no long-term liabilities, FINA RGFI',
    'tehnologija/': 'tehnologija, umjetna inteligencija, AI, softverske platforme, FinTech, digitalna imovina, blockchain tehnologija, sportska tehnologija, performance tracking, sportska analitika, kibernetička sigurnost, globalne inovacije',
    'en/technology/': 'technology, artificial intelligence, AI, software platforms, FinTech, digital assets, blockchain technology, sports technology, performance tracking, sports analytics, cyber security, global innovation',
    'trzista/': 'Market Intelligence, Bitcoin, BTC, digitalna imovina, stablecoini, kripto burze, globalni burzovni indeksi, 3D Market Constellation, dnevni tržišni osvrt, tržišni podatci',
    'en/markets/': 'Market Intelligence, Bitcoin, BTC, digital assets, stablecoins, crypto exchanges, global equity indices, 3D Market Constellation, daily market brief, market data',
    'intelligence-desk/': 'Intelligence Desk, AI pomoćnik, javni korporativni podatci, financijski pokazatelji, tržišta, istraživanje javnih izvora, poslovne vijesti',
    'en/intelligence-desk/': 'Intelligence Desk, AI assistant, public corporate data, financial indicators, markets, public-source research, business news',
    'registri/': 'javni registri, službeni izvori, Sudski registar RH, FINA RGFI, OIB 75227917632, MBS 081512375, Colorado Business Database, Entity ID 20238180649, EUIPO, ECB, ENISA',
    'en/registries/': 'public registries, official sources, Croatian Court Register, FINA RGFI, OIB 75227917632, MBS 081512375, Colorado Business Database, Entity ID 20238180649, EUIPO, ECB, ENISA',
    'instalacija/': 'GNK ASG aplikacija, instalacija u Chromeu, mobilni korporativni portal, javni korporativni podatci'
}

PAGES = [
    {'path':'','file':'index.html','lang':'hr','locale':'hr_HR','changefreq':'daily','priority':'1.0','alt':('','en/'),'title':'GNK ASG d.o.o. | GNK DINAMO Ltd. grupa | Nermin Sefić','description':'Službeni korporativni portal GNK ASG d.o.o. i GNK DINAMO Ltd. grupe: FY 2025 pokazatelji, globalna mreža, tržišta, vijesti i javni prikaz softverskog rješenja Bitcoin Payment Processor razvijenog za grupu.','type':'WebPage','name':'GNK ASG d.o.o. — Korporativni portal GNK DINAMO Ltd. grupe','crumb':'Početna'},
    {'path':'en/','file':'en/index.html','lang':'en','locale':'en_US','changefreq':'weekly','priority':'0.9','alt':('','en/'),'title':'GNK ASG d.o.o. | GNK DINAMO Ltd. Group | Nermin Sefić','description':'Official corporate portal for GNK ASG d.o.o. and the GNK DINAMO Ltd. group: FY 2025 indicators, global network, markets, news and a public overview of the Bitcoin Payment Processor software solution developed for the group.','type':'WebPage','name':'GNK ASG d.o.o. — GNK DINAMO Ltd. Group Corporate Portal','crumb':'Home'},
    {'path':'nermin-sefic/','file':'nermin-sefic/index.html','lang':'hr','locale':'hr_HR','changefreq':'weekly','priority':'0.9','alt':('nermin-sefic/','en/nermin-sefic/'),'title':'Nermin Sefić (Nermin Sefic) | GNK ASG d.o.o. i GNK DINAMO Ltd.','description':'Javni korporativni profil: Nermin Sefić, Nermin Sefic, Sefić Nermin i Sefic Nermin u kontekstu GNK ASG d.o.o., GNK DINAMO Ltd., financija, tehnologije, tržišta i javnih izvora.','type':'ProfilePage','name':'Nermin Sefić — javni korporativni profil','crumb':'Nermin Sefić'},
    {'path':'en/nermin-sefic/','file':'en/nermin-sefic/index.html','lang':'en','locale':'en_US','changefreq':'weekly','priority':'0.9','alt':('nermin-sefic/','en/nermin-sefic/'),'title':'Nermin Sefić (Nermin Sefic) | GNK ASG d.o.o. and GNK DINAMO Ltd.','description':'Public corporate profile: Nermin Sefić, Nermin Sefic, Sefić Nermin and Sefic Nermin in the context of GNK ASG d.o.o., GNK DINAMO Ltd., finance, technology, markets and public sources.','type':'ProfilePage','name':'Nermin Sefić — public corporate profile','crumb':'Nermin Sefić'},
    {'path':'trzista/','file':'trzista/index.html','lang':'hr','locale':'hr_HR','changefreq':'daily','priority':'0.9','alt':('trzista/','en/markets/'),'title':'Market Intelligence | GNK ASG d.o.o. i GNK DINAMO Ltd. | Nermin Sefić','description':'Market Intelligence portal za GNK ASG d.o.o., GNK DINAMO Ltd. i Nermina Sefića: Bitcoin, digitalna imovina, stablecoini, kripto burze, globalni indeksi i dnevni tržišni osvrt.','type':'CollectionPage','name':'Market Intelligence — GNK ASG d.o.o. i GNK DINAMO Ltd.','crumb':'Tržišta'},
    {'path':'en/markets/','file':'en/markets/index.html','lang':'en','locale':'en_US','changefreq':'daily','priority':'0.9','alt':('trzista/','en/markets/'),'title':'Market Intelligence | GNK ASG d.o.o. and GNK DINAMO Ltd. | Nermin Sefić','description':'Market Intelligence for GNK ASG d.o.o., GNK DINAMO Ltd. and Nermin Sefić: Bitcoin, digital assets, stablecoins, crypto exchanges, global indices and a daily market brief.','type':'CollectionPage','name':'Market Intelligence — GNK ASG d.o.o. and GNK DINAMO Ltd.','crumb':'Markets'},
    {'path':'sadrzaj/','file':'sadrzaj/index.html','lang':'hr','locale':'hr_HR','changefreq':'weekly','priority':'0.8','title':'Sadržaj portala | GNK ASG d.o.o. | GNK DINAMO Ltd. | Nermin Sefić','description':'Pregled javnih sadržaja o subjektima GNK ASG d.o.o., GNK DINAMO Ltd. i Nerminu Sefiću: financije, mreža društava, tehnologija, tematski monitoring, registri, tržišta i vijesti.','type':'CollectionPage','name':'Sadržaj portala GNK ASG d.o.o. i GNK DINAMO Ltd.','crumb':'Sadržaj'},
    {'path':'teme/','file':'teme/index.html','lang':'hr','locale':'hr_HR','changefreq':'daily','priority':'0.8','title':'Tematski monitoring | GNK ASG d.o.o. | GNK DINAMO Ltd. | Nermin Sefić','description':'Javni tematski monitoring portala GNK ASG d.o.o. i GNK DINAMO Ltd. uz korporativni profil Nermina Sefića: ekonomija, javne politike, sport, košarka, tenis, savezi, mobilnost i AI.','type':'CollectionPage','name':'Tematski monitoring — GNK ASG d.o.o., GNK DINAMO Ltd. i Nermin Sefić','crumb':'Teme'},
    {'path':'financije/','file':'financije/index.html','lang':'hr','locale':'hr_HR','changefreq':'weekly','priority':'0.8','alt':('financije/','en/finance/'),'title':'Financijski profil FY 2025 | GNK ASG d.o.o. | GNK DINAMO Ltd. | Nermin Sefić','description':'Javni financijski profil GNK ASG d.o.o.: revidirani FY 2025 pokazatelji, 504,00 mil. EUR prihoda, aktiva i kapital, bez dugoročnih obveza, dokumentacijska i FINA RGFI osnova.','type':'WebPage','name':'Financijski profil FY 2025 — GNK ASG d.o.o.','crumb':'Financije'},
    {'path':'en/finance/','file':'en/finance/index.html','lang':'en','locale':'en_US','changefreq':'weekly','priority':'0.8','alt':('financije/','en/finance/'),'title':'Financial Profile FY 2025 | GNK ASG d.o.o. | GNK DINAMO Ltd. | Nermin Sefić','description':'Public GNK ASG d.o.o. financial profile: audited FY 2025 indicators, EUR 504.00 million revenue, assets and equity, no long-term liabilities, and FINA RGFI reporting basis.','type':'WebPage','name':'Financial Profile FY 2025 — GNK ASG d.o.o.','crumb':'Financials'},
    {'path':'tehnologija/','file':'tehnologija/index.html','lang':'hr','locale':'hr_HR','changefreq':'weekly','priority':'0.8','alt':('tehnologija/','en/technology/'),'title':'Tehnologija, AI i sportska analitika | GNK ASG d.o.o. | GNK DINAMO Ltd.','description':'Tehnološki profil GNK ASG d.o.o. i GNK DINAMO Ltd. grupe: umjetna inteligencija, softverske platforme, FinTech, blockchain, sportska tehnologija, performance tracking i kibernetička sigurnost.','type':'WebPage','name':'Tehnologija, AI i sportska analitika — GNK ASG d.o.o.','crumb':'Tehnologija'},
    {'path':'en/technology/','file':'en/technology/index.html','lang':'en','locale':'en_US','changefreq':'weekly','priority':'0.8','alt':('tehnologija/','en/technology/'),'title':'Technology, AI and Sports Analytics | GNK ASG d.o.o. | GNK DINAMO Ltd.','description':'Technology profile of GNK ASG d.o.o. and the GNK DINAMO Ltd. group: artificial intelligence, software platforms, FinTech, blockchain, sports technology, performance tracking and cyber security.','type':'WebPage','name':'Technology, AI and Sports Analytics — GNK ASG d.o.o.','crumb':'Technology'},
    {'path':'intelligence-desk/','file':'intelligence-desk/index.html','lang':'hr','locale':'hr_HR','changefreq':'weekly','priority':'0.8','alt':('intelligence-desk/','en/intelligence-desk/'),'title':'GNK ASG Intelligence Desk | GNK DINAMO Ltd. | Nermin Sefić','description':'GNK ASG Intelligence Desk za javne podatke povezane s GNK ASG d.o.o., GNK DINAMO Ltd. i Nerminom Sefićem: financije, tehnologija, tržišta i javne vijesti.','type':'WebPage','name':'GNK ASG Intelligence Desk — GNK DINAMO Ltd. i Nermin Sefić','crumb':'Intelligence Desk'},
    {'path':'en/intelligence-desk/','file':'en/intelligence-desk/index.html','lang':'en','locale':'en_US','changefreq':'weekly','priority':'0.8','alt':('intelligence-desk/','en/intelligence-desk/'),'title':'GNK ASG Intelligence Desk | GNK DINAMO Ltd. | Nermin Sefić','description':'GNK ASG Intelligence Desk for public information associated with GNK ASG d.o.o., GNK DINAMO Ltd. and Nermin Sefić: finance, technology, markets and public news.','type':'WebPage','name':'GNK ASG Intelligence Desk — GNK DINAMO Ltd. and Nermin Sefić','crumb':'Intelligence Desk'},
    {'path':'registri/','file':'registri/index.html','lang':'hr','locale':'hr_HR','changefreq':'weekly','priority':'0.8','alt':('registri/','en/registries/'),'title':'Javni registri i FINA RGFI | GNK ASG d.o.o. | GNK DINAMO Ltd. | Nermin Sefić','description':'Javni izvori za provjeru GNK ASG d.o.o., GNK DINAMO Ltd. i Nermina Sefića: OIB i MBS, Sudski registar RH, FINA RGFI, Colorado Business Database, EUIPO, ECB i ENISA.','type':'CollectionPage','name':'Javni registri i službeni izvori — GNK ASG d.o.o. i GNK DINAMO Ltd.','crumb':'Registri'},
    {'path':'en/registries/','file':'en/registries/index.html','lang':'en','locale':'en_US','changefreq':'weekly','priority':'0.8','alt':('registri/','en/registries/'),'title':'Public Registries and FINA RGFI | GNK ASG d.o.o. | GNK DINAMO Ltd. | Nermin Sefić','description':'Official sources for GNK ASG d.o.o., GNK DINAMO Ltd. and Nermin Sefić: OIB and MBS, Croatian Court Register, FINA RGFI, Colorado Business Database, EUIPO, ECB and ENISA.','type':'CollectionPage','name':'Public Registries and Official Sources — GNK ASG d.o.o. and GNK DINAMO Ltd.','crumb':'Registries'},
    {'path':'instalacija/','file':'instalacija/index.html','lang':'hr','locale':'hr_HR','changefreq':'monthly','priority':'0.7','title':'Instaliraj portal | GNK ASG d.o.o. | GNK DINAMO Ltd. | Nermin Sefić','description':'Instalacija korporativnog portala GNK ASG d.o.o. s javnim podatcima o GNK DINAMO Ltd. okviru i Nerminu Sefiću kao aplikacije putem preglednika Google Chrome.','type':'HowTo','name':'Instalacija GNK ASG aplikacije preko Google Chromea','crumb':'Instalacija'}
]


def url(page):
    return SITE + page['path']


def image(page):
    return SITE + SOCIAL_IMAGES.get(page['path'], 'assets/gnk-asg-social-card.png')


def keywords(page):
    return (CORE_EN if page['lang'] == 'en' else CORE_HR) + ', ' + PAGE_TERMS.get(page['path'], '')


def entities():
    return [
        {'@type':'Organization','@id':ORG_ID,'name':'GNK ASG d.o.o.','alternateName':['GNK ASG doo','GNK ASG'],'url':SITE,'logo':SITE+'assets/logo-gnk-asg.svg','image':DEFAULT_IMAGE,'taxID':'75227917632','knowsAbout':['Technology','Artificial Intelligence','FinTech','Digital Assets','Sports Technology','Market Intelligence','Corporate Transparency','Software Development'],'memberOf':{'@id':GROUP_ID},'address':{'@type':'PostalAddress','streetAddress':'Zagrebačka cesta 130','addressLocality':'Zagreb','addressCountry':'HR'}},
        {'@type':'Organization','@id':GROUP_ID,'name':'GNK DINAMO Ltd.','alternateName':['GNK DINAMO LTD','GNK Dinamo Ltd','GNK DINAMO Ltd. Group'],'url':SITE,'image':DEFAULT_IMAGE,'identifier':'Entity ID 20238180649','location':{'@type':'Place','name':'Boulder, Colorado, USA'}},
        {'@type':'Person','@id':PERSON_ID,'name':'Nermin Sefić','alternateName':IDENTITY_VARIANTS[1:],'url':PROFILE_HR,'jobTitle':'Direktor GNK ASG d.o.o. i ovlašteni predstavnik GNK DINAMO Ltd.','worksFor':{'@id':ORG_ID},'affiliation':{'@id':GROUP_ID}}
    ]


def bpp_entity(lang):
    return {'@type':'SoftwareApplication','@id':BPP_ID,'name':'Bitcoin Payment Processor','alternateName':'BPP.IS','url':'https://bpp.is/','applicationCategory':'BusinessApplication','description':('Bitcoin Payment Processor software solution developed by GNK ASG d.o.o. for the GNK DINAMO Ltd. group framework. GNK ASG d.o.o. does not operate the system or provide payment processor services through it.' if lang == 'en' else 'Programsko rješenje Bitcoin Payment Processor koje je GNK ASG d.o.o. razvio za poslovni okvir GNK DINAMO Ltd. grupe. GNK ASG d.o.o. ne upravlja sustavom niti putem njega pruža uslugu payment procesora.'),'creator':{'@id':ORG_ID},'about':{'@id':GROUP_ID},'image':SITE+'assets/share-bpp.png'}


def schema(page):
    u = url(page)
    keys = keywords(page)
    page_image = image(page)
    item = {'@type':page['type'],'@id':u+'#webpage','url':u,'name':page['name'],'description':page['description'],'keywords':keys,'inLanguage':page['lang'],'isPartOf':{'@id':WEBSITE_ID},'about':[{'@id':ORG_ID},{'@id':GROUP_ID},{'@id':PERSON_ID}],'mentions':[{'@id':ORG_ID},{'@id':GROUP_ID},{'@id':PERSON_ID}],'primaryImageOfPage':{'@type':'ImageObject','url':page_image}}
    if page['type'] == 'ProfilePage':
        item['mainEntity'] = {'@id':PERSON_ID}
    graph = [{'@type':'WebSite','@id':WEBSITE_ID,'url':SITE,'name':'GNK ASG d.o.o. | GNK DINAMO Ltd. | Nermin Sefić','publisher':{'@id':ORG_ID},'about':[{'@id':ORG_ID},{'@id':GROUP_ID},{'@id':PERSON_ID}],'keywords':keywords(PAGES[0]),'inLanguage':['hr','en']}] + entities() + [item]
    if page['path'] in ('','en/'):
        graph.append(bpp_entity(page['lang']))
        item['mentions'].append({'@id':BPP_ID})
    if page['path'] not in ('','en/'):
        item['breadcrumb']={'@id':u+'#breadcrumb'}
        graph.append({'@type':'BreadcrumbList','@id':u+'#breadcrumb','itemListElement':[{'@type':'ListItem','position':1,'name':'GNK ASG d.o.o.','item':SITE},{'@type':'ListItem','position':2,'name':page['crumb'],'item':u}]})
    if page['type'] == 'HowTo':
        item['step']=[{'@type':'HowToStep','name':'Otvorite portal u Chromeu','text':'Otvorite GNK ASG d.o.o. portal u pregledniku Google Chrome.'},{'@type':'HowToStep','name':'Pokrenite instalaciju','text':'U izborniku preglednika odaberite instalaciju aplikacije ili dodavanje na početni zaslon.'},{'@type':'HowToStep','name':'Potvrdite instalaciju','text':'Potvrdite instalaciju i pokrenite portal kao aplikaciju.'}]
    return {'@context':'https://schema.org','@graph':graph}


def metadata(page):
    u = url(page)
    other = 'en_US' if page['locale']=='hr_HR' else 'hr_HR'
    keys = keywords(page)
    page_image = image(page)
    alt_image = page['title'] + ' — GNK ASG d.o.o.'
    og_type = 'profile' if page['type'] == 'ProfilePage' else 'website'
    lines = ['<!-- SEO:BEGIN generated by scripts/generate_seo.py -->', f'  <meta name="keywords" content="{escape(keys)}">', '  <meta name="author" content="GNK ASG d.o.o.; GNK DINAMO Ltd.; Nermin Sefić">', '  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">', '  <meta name="theme-color" content="#07162d">', f'  <link rel="canonical" href="{u}">', f'  <meta property="og:title" content="{escape(page["title"])}">', f'  <meta property="og:description" content="{escape(page["description"])}">', f'  <meta property="og:type" content="{og_type}">', f'  <meta property="og:url" content="{u}">', '  <meta property="og:site_name" content="GNK ASG d.o.o. | GNK DINAMO Ltd. | Nermin Sefić">', f'  <meta property="og:locale" content="{page["locale"]}">', f'  <meta property="og:locale:alternate" content="{other}">', f'  <meta property="og:image" content="{page_image}">', '  <meta property="og:image:type" content="image/png">', '  <meta property="og:image:width" content="1200">', '  <meta property="og:image:height" content="630">', f'  <meta property="og:image:alt" content="{escape(alt_image)}">', '  <meta name="twitter:card" content="summary_large_image">', f'  <meta name="twitter:title" content="{escape(page["title"])}">', f'  <meta name="twitter:description" content="{escape(page["description"])}">', f'  <meta name="twitter:image" content="{page_image}">', f'  <meta name="twitter:image:alt" content="{escape(alt_image)}">']
    if page.get('alt'):
        hr, english = page['alt']
        lines += [f'  <link rel="alternate" hreflang="hr" href="{SITE+hr}">', f'  <link rel="alternate" hreflang="en" href="{SITE+english}">', f'  <link rel="alternate" hreflang="x-default" href="{SITE+hr}">']
    lines += ['  <script type="application/ld+json">'+json.dumps(schema(page),ensure_ascii=False,separators=(',',':'))+'</script>', '<!-- SEO:END -->']
    return '\n'.join(lines)


def enhance(page):
    target = ROOT / page['file']
    if not target.exists():
        raise FileNotFoundError(f'Missing SEO target page: {target}')
    content = target.read_text(encoding='utf-8')
    content = re.sub(r'\s*<!-- SEO:BEGIN generated by scripts/generate_seo\.py -->.*?<!-- SEO:END -->\s*', '\n', content, flags=re.S)
    content = re.sub(r'<title>.*?</title>', '<title>'+page['title']+'</title>', content, count=1, flags=re.S)
    content = re.sub(r'<meta\s+name="description"\s+content="[^"]*"\s*/?>', '<meta name="description" content="'+page['description']+'">', content, count=1)
    content = re.sub(r'\s*<meta\s+name="(?:keywords|author|robots|theme-color|twitter:[^"]+)"[^>]*>', '', content)
    content = re.sub(r'\s*<meta\s+property="og:[^"]+"[^>]*>', '', content)
    content = re.sub(r'\s*<link\s+rel="(?:canonical|alternate)"[^>]*>', '', content)
    content = re.sub(r'\s*<script\s+type="application/ld\+json">.*?</script>', '', content, flags=re.S)
    content = content.replace('</head>', '\n'+metadata(page)+'\n</head>', 1)
    if page['path'] not in ('', 'en/') and 'assets/public-tools.js' not in content:
        content = content.replace('</body>', PUBLIC_TOOLS + '</body>', 1)
    target.write_text(content, encoding='utf-8')


def ensure_profile_link(path, href, label):
    target = ROOT / path
    content = target.read_text(encoding='utf-8')
    if href in content:
        return
    marker = '<a href="#news">Business News</a>'
    if marker in content:
        content = content.replace(marker, marker + f'<a href="{href}">{label}</a>', 1)
    else:
        content = content.replace('</footer>', f'<p class="seo-profile-link"><a href="{href}">{label}</a></p></footer>', 1)
    target.write_text(content, encoding='utf-8')


def entry(page):
    lines = ['  <url>', '    <loc>'+escape(url(page))+'</loc>']
    if page.get('alt'):
        hr, english = page['alt']
        lines += [f'    <xhtml:link rel="alternate" hreflang="hr" href="{escape(SITE+hr)}" />', f'    <xhtml:link rel="alternate" hreflang="en" href="{escape(SITE+english)}" />', f'    <xhtml:link rel="alternate" hreflang="x-default" href="{escape(SITE+hr)}" />']
    lines += [f'    <lastmod>{TODAY}</lastmod>', f'    <changefreq>{page["changefreq"]}</changefreq>', f'    <priority>{page["priority"]}</priority>', '  </url>']
    return '\n'.join(lines)


for page in PAGES:
    enhance(page)
ensure_profile_link('index.html', 'nermin-sefic/', 'Nermin Sefić — javni profil')
ensure_profile_link('en/index.html', 'nermin-sefic/', 'Nermin Sefić — public profile')
(ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'+'\n'.join(entry(page) for page in PAGES)+'\n</urlset>\n', encoding='utf-8')
(ROOT/'robots.txt').write_text('User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /webmail/\nDisallow: /podijeli/\n\nSitemap: '+SITE+'sitemap.xml\n', encoding='utf-8')
