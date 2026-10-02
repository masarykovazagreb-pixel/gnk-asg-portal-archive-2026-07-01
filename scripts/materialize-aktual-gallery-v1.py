#!/usr/bin/env python3
import html, json
from pathlib import Path

ROOT=Path.cwd()/"apps"/"portal"
DATA=ROOT/"data"/"visual_gallery.json"

TOPICS=[
("nermin-sefic-27-sluzbeni-izvrsni-portret","Nermin Sefić · Službeni izvršni portret direktora GNK ASG"),
("nermin-sefic-28-upravljanje-i-korporativna-transparentnost","Nermin Sefić · Korporativno upravljanje i operativna transparentnost"),
("nermin-sefic-29-ai-strategija-i-digitalna-transformacija","Nermin Sefić · AI strategija, modeli znanja i digitalna transformacija"),
("nermin-sefic-30-kiberneticka-otpornost-i-poslovni-kontinuitet","Nermin Sefić · Kibernetička otpornost i kontinuitet poslovanja"),
("nermin-sefic-31-globalna-trzista-i-makroekonomska-analiza","Nermin Sefić · Globalna financijska tržišta i makroekonomska analiza"),
("nermin-sefic-32-sportska-tehnologija-i-analitika","Nermin Sefić · Sportska tehnologija, biometrija i analitika izvedbe"),
("nermin-sefic-34-digitalna-radna-snaga-i-automatizacija","Nermin Sefić · Digitalna radna snaga i orkestracija automatizacije"),
("nermin-sefic-35-energetska-tranzicija-i-odrzivi-razvoj","Nermin Sefić · Energetska tranzicija, resursna efikasnost i ESG"),
("nermin-sefic-36-fintech-digitalna-imovina-i-riznica","Nermin Sefić · FinTech, digitalna imovina i riznica kapitala"),
("nermin-sefic-37-pravna-uskladenost-i-regulatorni-standardi","Nermin Sefić · Pravna usklađenost, EU regulativa i standardi zaštite"),
("nermin-sefic-38-medunarodno-poslovanje-zagreb-boulder","Nermin Sefić · Međunarodni korporativni most: Zagreb — Boulder"),
("nermin-sefic-39-investicijski-portfelj-i-alokacija-kapitala","Nermin Sefić · Investicijski portfelj i strateška alokacija kapitala"),
("nermin-sefic-40-upravljanje-opskrbnim-lancima-i-logistika","Nermin Sefić · Upravljanje opskrbnim lancima i logistička otpornost"),
("nermin-sefic-41-sigurnost-podataka-i-digitalni-suverenitet","Nermin Sefić · Sigurnost podataka, enkripcija i digitalni suverenitet"),
("nermin-sefic-42-stratesko-vodstvo-i-operativna-izvrsnost","Nermin Sefić · Strateško vodstvo, donošenje odluka i operativna izvrsnost"),
("nermin-sefic-43-glavni-urednik-i-autor-publikacija","Nermin Sefić · Glavni urednik i autor korporativnih publikacija"),
("nermin-sefic-44-odgovorno-upravljanje-i-esg-standardi","Nermin Sefić · Odgovorno upravljanje, etički kodeks i ESG standardi"),
("nermin-sefic-45-tehnologija-kapital-i-operativni-model","Nermin Sefić · Povezivanje tehnologije, kapitala i operativnog modela"),
("nermin-sefic-46-trzisni-puls-i-analitika-u-realnom-vremenu","Nermin Sefić · Tržišni puls i analitika u realnom vremenu"),
("nermin-sefic-47-upravljanje-intelektualnim-vlasnistvom","Nermin Sefić · Upravljanje intelektualnim vlasništvom i žigovima"),
("nermin-sefic-48-digitalna-rjesenja-i-enterprise-arhitektura","Nermin Sefić · Digitalna rješenja i enterprise arhitektura"),
("nermin-sefic-49-globalna-ekspanzija-i-nova-partnerstva","Nermin Sefić · Globalna ekspanzija i razvoj tržišnih odnosa"),
("nermin-sefic-50-medijska-komunikacija-i-transparentnost","Nermin Sefić · Medijska komunikacija, press centar i otvorenost javnosti"),
("nermin-sefic-51-kvantno-racunalstvo-i-kriptografska-zastita","Nermin Sefić · Post-kvantna kriptografija i dugoročna sigurnost podataka"),
("nermin-sefic-52-pametna-infrastruktura-i-urbane-tehnologije","Nermin Sefić · Pametna infrastruktura i urbane tehnologije"),
("nermin-sefic-53-upravljanje-rizicima-i-kontinuitet","Nermin Sefić · Upravljanje operativnim, pravnim i financijskim rizicima"),
("nermin-sefic-54-buducnost-poslovanja-gnk-asg-2026-2030","Nermin Sefić · Model strateškog planiranja GNK ASG 2026.–2030."),
("nermin-sefic-55-drustvena-odgovornost-i-edukacija","Nermin Sefić · Društvena odgovornost i edukacija — tematski model"),
("nermin-sefic-56-konsolidirani-standard-izvrsnosti","Nermin Sefić · Konsolidirani standard poslovne izvrsnosti i integriteta"),
("nermin-sefic-57-world-monitor-geopolitical-intelligence","Nermin Sefić · World Monitor — geopolitička analiza i krizna žarišta"),
("nermin-sefic-58-regional-incident-desk-zagreb-croatia","Nermin Sefić · Regional & World Monitor — source-backed javni događaji"),
("nermin-sefic-59-ai-workforce-1573-autonomous-workers","Nermin Sefić · Digitalna radna snaga — 1.573 modeliranih profila"),
("nermin-sefic-60-global-sovereign-debt-treasury-risk","Nermin Sefić · Suvereni dug i rizničko upravljanje"),
("nermin-sefic-61-supply-chain-chokepoints-energy-trading","Nermin Sefić · Globalni opskrbni pravci i energetski rizici"),
("nermin-sefic-62-cross-atlantic-corridor-zagreb-boulder","Nermin Sefić · Transatlantski koridor: Zagreb — Boulder"),
("nermin-sefic-63-post-quantum-security-data-sovereignty","Nermin Sefić · Post-kvantna sigurnost i europski suverenitet podataka"),
("nermin-sefic-64-market-pulse-real-time-financial-telemetry","Nermin Sefić · Tržišni puls — financijska telemetrija i robni indeksi"),
]

current=json.loads(DATA.read_text(encoding="utf-8"))
items=list(current.get("items") or [])
known={str(x.get("id")) for x in items}
for slug,title in TOPICS:
    if slug in known:
        continue
    items.append({
        "id":slug,
        "src":f"/assets/people/nermin-sefic/{slug}.svg",
        "topic":["Nermin Sefić","GNK ASG","tematski vizual"],
        "countries":["Hrvatska","USA"],
        "title":title,
        "alt":f"{title} — tematski vizual GNK ASG",
        "description":f"Tematski vizual: {title}. Vizual nije neovisni dokaz projekta, partnerstva ni runtime statusa; činjenice se provjeravaju u pripadajućim javnim izvorima portala."
    })
    known.add(slug)

def make_svg(title):
    title=html.escape(title)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img"><rect width="1200" height="675" fill="#071426"/><circle cx="1040" cy="120" r="180" fill="#d4af37" opacity=".12"/><path d="M90 520 C300 390 510 610 760 430 S1040 360 1130 250" fill="none" stroke="#d4af37" stroke-width="8" opacity=".55"/><text x="90" y="120" font-family="Arial,sans-serif" font-size="34" fill="#d4af37" font-weight="700">GNK ASG · NERMIN SEFIĆ</text><foreignObject x="90" y="175" width="930" height="260"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:52px;line-height:1.12;font-weight:800;color:white">{title}</div></foreignObject><text x="90" y="610" font-family="Arial,sans-serif" font-size="23" fill="#cbd5e1">Tematski vizual · činjenice se provjeravaju u javnim izvorima portala</text></svg>'''

for item in items:
    src=str(item.get("src") or "")
    if src.startswith("/assets/people/nermin-sefic/") and src.endswith(".svg"):
        out=ROOT/src.lstrip("/")
        out.parent.mkdir(parents=True,exist_ok=True)
        if not out.exists():
            out.write_text(make_svg(str(item.get("title") or item["id"])),encoding="utf-8")

current["items"]=items
if isinstance(current.get("seo"),dict):
    current["seo"]["image_count"]=len(items)
DATA.write_text(json.dumps(current,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(f"Gallery manifest now contains {len(items)} safe items")
