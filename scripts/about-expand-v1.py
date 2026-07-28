#!/usr/bin/env python3
"""Prosirenje stranice O nama, hrvatski i engleski.

Postojeca prica ostaje netaknuta — dodaju se cjeline o drustvu, financijama,
devet projekata, THE CODE-u, tehnologiji, sadrzaju portala i infrastrukturi.
Sve brojke dolaze iz stvarnih podataka repozitorija, ne iz procjene.
"""
import html
import json
import re

ROADMAP = json.load(open("apps/portal/data/strategic-project-roadmap.json"))
ZNANJE = json.load(open("apps/portal/data/knowledge-base.json"))


def e(t):
    return html.escape(str(t), quote=False)


def kartica(pill, naslov, tekst, slika=None, alt=""):
    img = (f'<img class="about-img" src="{slika}" alt="{e(alt)}" loading="lazy">'
           if slika else "")
    return (f'<article class="card">{img}<span class="pill">{e(pill)}</span>'
            f'<h2>{e(naslov)}</h2>{tekst}</article>')


def p(t):
    return f"<p>{e(t)}</p>"


def popis(stavke):
    return "<ul class=\"about-list\">" + "".join(f"<li>{e(x)}</li>" for x in stavke) + "</ul>"


# ── SADRŽAJ ───────────────────────────────────────────────────────────
def cjeline(en=False):
    out = []

    # 1 · Društvo i grupa
    out.append('<section class="about-band"><div class="about-head">'
               f'<p class="eyebrow">{"Corporate identity" if en else "Korporativni identitet"}</p>'
               f'<h2>{"The company and the group" if en else "Društvo i grupa"}</h2>'
               f'<p>{"Two entities, one system. The Croatian company operates locally; the parent company holds the group structure." if en else "Dva subjekta, jedan sustav. Hrvatsko društvo posluje lokalno, matično drži strukturu grupe."}</p>'
               '</div><div class="grid">')
    out.append(kartica(
        "GNK ASG d.o.o.", "Zagreb, Hrvatska" if not en else "Zagreb, Croatia",
        popis([
            "OIB 75227917632 · MBS 081512375",
            "Zagrebačka cesta 130, Zagreb" if not en else "Zagrebacka cesta 130, Zagreb",
            "Osnovano 12. svibnja 2023." if not en else "Incorporated 12 May 2023",
            "Djelatnost NKD 93.19.0" if not en else "Activity code NKD 93.19.0",
            "Direktor i stvarni vlasnik: Nermin Sefić" if not en else "Director and beneficial owner: Nermin Sefić",
            "Član društva: Sports Performance Tracking d.o.o., Beograd" if not en else "Member: Sports Performance Tracking d.o.o., Belgrade",
        ])))
    out.append(kartica(
        "GNK DINAMO Ltd.", "Boulder, Colorado, SAD" if not en else "Boulder, Colorado, USA",
        popis([
            "Entity ID 20238180649",
            "33 postojeća društva" if not en else "33 existing companies",
            "12 planiranih pozicija za 2026." if not en else "12 planned positions for 2026",
            "45 lokacija nakon širenja" if not en else "45 locations after expansion",
            "30 država, 6 kontinenata" if not en else "30 countries, 6 continents",
            "Ovlašteni predstavnik i UBO: Nermin Sefić" if not en else "Authorised representative and UBO: Nermin Sefić",
        ])))
    out.append(kartica(
        "Doseg" if not en else "Reach",
        "Mreža u brojkama" if not en else "The network in numbers",
        popis([
            "33 jedinstvena grada danas" if not en else "33 unique cities today",
            "45 gradova nakon širenja 2026." if not en else "45 cities after the 2026 expansion",
            "Europa 7, Azija 9, Amerika 10, Afrika 5, Oceanija 2" if not en else "Europe 7, Asia 9, Americas 10, Africa 5, Oceania 2",
            "Doseg stanovništva gradova: 317,3 mil." if not en else "City population reach: 317.3 million",
            "Doseg tržišta: 4,72 mlrd." if not en else "Market reach: 4.72 billion",
        ]) + p("Orijentacijski demografski doseg; grad ili tržište pribraja se samo jednom."
               if not en else
               "Indicative demographic reach; a city or market is counted only once.")))
    out.append("</div></section>")

    # 2 · Financije
    out.append('<section class="about-band"><div class="about-head">'
               f'<p class="eyebrow">{"Audited indicators · FY 2025" if en else "Revidirani pokazatelji · FY 2025"}</p>'
               f'<h2>{"Financial foundation" if en else "Financijska osnova"}</h2>'
               f'<p>{"Separate audited figures for the Croatian company, and consolidated group figures which are management-certified rather than independently audited. The difference matters and is stated plainly." if en else "Samostalni revidirani podatci hrvatskog društva i konsolidirani grupni podatci koji su upravljački potvrđeni, ne neovisno revidirani. Ta razlika postoji i navodimo je otvoreno."}</p>'
               '</div><div class="about-kpi">')
    for oznaka, vrijednost, nota in ([
        ("Total revenue", "EUR 504.00 m", "2025 sales revenue"),
        ("Total assets", "EUR 46.40 m", "as at 31 Dec 2025"),
        ("Equity and reserves", "EUR 46.21 m", "99.60 % of assets"),
        ("Current liabilities", "EUR 184.50 k", "no long-term debt"),
    ] if en else [
        ("Ukupni prihodi", "504,00 mil. EUR", "prihodi od prodaje 2025."),
        ("Ukupna aktiva", "46,40 mil. EUR", "na dan 31.12.2025."),
        ("Kapital i rezerve", "46,21 mil. EUR", "99,60 % aktive"),
        ("Kratkoročne obveze", "184,50 tis. EUR", "bez dugoročnih obveza"),
    ]):
        out.append(f'<div class="kpi"><span>{e(oznaka)}</span><strong>{e(vrijednost)}</strong>'
                   f'<small>{e(nota)}</small></div>')
    out.append("</div><div class=\"grid\">")
    out.append(kartica(
        "Revizija" if not en else "Audit",
        "Neovisno revidirano" if not en else "Independently audited",
        p("EKVILIBRIJ d.o.o. izrazio je mišljenje da godišnji financijski izvještaji za 2025. "
          "istinito i fer prezentiraju financijski položaj, uspješnost i novčane tokove društva, "
          "u skladu sa Zakonom o računovodstvu i Hrvatskim standardima financijskog izvještavanja."
          if not en else
          "EKVILIBRIJ d.o.o. expressed the opinion that the 2025 annual financial statements "
          "present truly and fairly the financial position, performance and cash flows of the "
          "company, in accordance with the Accounting Act and Croatian Financial Reporting Standards.")
        + popis(["Dobit prije oporezivanja 21.584,16 EUR", "Dobit razdoblja 16.076,47 EUR",
                 "Nematerijalna imovina i softver 30.000.000,00 EUR"]
                if not en else
                ["Profit before tax EUR 21,584.16", "Profit for the year EUR 16,076.47",
                 "Intangible assets and software EUR 30,000,000.00"])))
    out.append(kartica(
        "Grupa" if not en else "Group",
        "Konsolidirani prikaz" if not en else "Consolidated view",
        popis(["Prihodi grupe 4,7046 mlrd. EUR", "Neto dobit 982,48 mil. EUR",
               "Ukupna aktiva 3,4830 mlrd. EUR", "Kapital i rezerve 3,4140 mlrd. EUR",
               "Obveze 69,04 mil. EUR", "Udio kapitala 98,02 %"]
              if not en else
              ["Group revenue EUR 4.7046 bn", "Net profit EUR 982.48 m",
               "Total assets EUR 3.4830 bn", "Equity and reserves EUR 3.4140 bn",
               "Liabilities EUR 69.04 m", "Equity ratio 98.02 %"])
        + p("Upravljački potvrđen i interno pregledan prikaz, podnesen u Colorado javnu "
            "evidenciju. Nije predstavljen kao neovisno revidiran izvještaj GNK ASG d.o.o."
            if not en else
            "A management-certified and internally reviewed statement filed for Colorado public "
            "disclosure. It is not presented as an independently audited GNK ASG d.o.o. report.")))
    out.append(kartica(
        "Provjera" if not en else "Verification",
        "Gdje se podatci provjeravaju" if not en else "Where the data is verified",
        popis(["Sudski registar Republike Hrvatske", "FINA RGFI — javna objava izvještaja",
               "Colorado Secretary of State — matično društvo", "EUIPO eSearch plus — žigovi"]
              if not en else
              ["Court Register of the Republic of Croatia", "FINA RGFI — public filing of statements",
               "Colorado Secretary of State — parent company", "EUIPO eSearch plus — trade marks"])
        + p("Registre koji nemaju javno otvoreno podatkovno sučelje portal ne kopira automatski, "
            "nego vodi izravno na službenu pretragu."
            if not en else
            "Registers without an open public data interface are not copied automatically; the "
            "portal links directly to the official search.")))
    out.append("</div></section>")

    # 3 · Devet projekata
    out.append('<section class="about-band"><div class="about-head">'
               f'<p class="eyebrow">{"Strategic portfolio" if en else "Strateški portfelj"}</p>'
               f'<h2>{"Nine projects, one development logic" if en else "Devet projekata, jedna razvojna logika"}</h2>'
               f'<p>{"Five implementation tracks. One publicly announced, one held confidential by design. Each project carries its own phase and its own risk profile." if en else "Pet provedbenih trakova. Jedan je javno najavljen, jedan je namjerno povjerljiv. Svaki projekt nosi vlastitu fazu i vlastiti profil rizika."}</p>'
               '</div><div class="grid about-projects">')
    trak_naziv = {t["id"]: (t["labelEn"] if en else t["labelHr"]) for t in ROADMAP["tracks"]}
    for x in ROADMAP["projects"]:
        naslov = x["titleEn"] if en else x["titleHr"]
        cilj = x["objectiveEn"] if en else x["objectiveHr"]
        faza = x["phaseLabelEn"] if en else x["phaseLabelHr"]
        out.append(
            f'<article class="card project"><span class="pill">{x["number"]} · {e(trak_naziv.get(x["track"], ""))}</span>'
            f'<h3>{e(naslov)}</h3><p>{e(cilj)}</p>'
            f'<p class="project-phase">{e(faza)}</p></article>')
    out.append("</div></section>")

    # 4 · THE CODE
    out.append('<section class="about-band about-code"><div class="about-head">'
               '<p class="eyebrow">New York · 7. listopada 2026. · 11:30 ET</p>'
               if not en else
               '<section class="about-band about-code"><div class="about-head">'
               '<p class="eyebrow">New York · 7 October 2026 · 11:30 ET</p>')
    out.append('<h2>THE CODE</h2>'
               + p("THE CODE je trenutak u kojem se 45 povezanih društava na pet kontinenata "
                   "povezuje u jedinstven globalni sustav. Projekt počinje u Boulderu, Colorado, "
                   "a službena aktivacija planirana je za 7. listopada 2026. u New Yorku. "
                   "Financijsku osnovu čini kapitalna struktura Grupe i poslovanje bez "
                   "dugoročnog financijskog duga."
                   if not en else
                   "THE CODE is the moment when 45 connected companies across five continents are "
                   "joined into a single global system. The project begins in Boulder, Colorado, "
                   "with the official activation planned for 7 October 2026 in New York. Its "
                   "financial basis is the Group's capital structure and operations without "
                   "long-term financial debt.")
               + '</div><div class="grid">')
    out.append(kartica(
        "Akvizicija" if not en else "Acquisition",
        "Tri povjerljiva društva" if not en else "Three confidential companies",
        p("Međunarodna akvizicijska i integracijska arhitektura kojom se predstavljaju tri "
          "globalna društva. Njihov identitet ostaje povjerljiv do same objave."
          if not en else
          "An international acquisition and integration architecture presenting three global "
          "companies. Their identity remains confidential until the announcement itself.")))
    out.append(kartica(
        "Format", "Šest scena i živi satovi" if not en else "Six scenes and live clocks",
        p("Multimedijski prikaz s odbrojavanjem i satovima diljem svijeta, koji se ažurira uživo "
          "do trenutka prezentacije."
          if not en else
          "A multimedia presentation with a countdown and clocks around the world, updating live "
          "until the moment of the presentation.")))
    out.append(kartica(
        "Osnova" if not en else "Foundation",
        "Kapital bez dugoročnog duga" if not en else "Capital without long-term debt",
        p("Udio kapitala u aktivi grupe iznosi 98,02 %, a društvo posluje bez dugoročnih obveza. "
          "To je osnova na kojoj se gradi integracija."
          if not en else
          "The Group's equity ratio stands at 98.02 %, and the company operates without "
          "long-term liabilities. That is the basis on which the integration is built.")))
    out.append("</div></section>")

    # 5 · Tehnologija
    out.append('<section class="about-band"><div class="about-head">'
               f'<p class="eyebrow">{"Digital strategy" if en else "Digitalna strategija"}</p>'
               f'<h2>{"Technology and artificial intelligence" if en else "Tehnologija i umjetna inteligencija"}</h2>'
               f'<p>{"Six areas that connect information technology, data, advanced analytics, fintech and sports digital systems." if en else "Šest područja koja povezuju informatiku, podatke, naprednu analitiku, fintech i sportske digitalne sustave."}</p>'
               '</div><div class="grid about-tech">')
    podrucja = ([
        ("Artificial Intelligence", "Business application of models, automation, data analysis and intelligent user interfaces."),
        ("Software Platforms", "Digital platforms, system architecture, integrations and scalable solutions."),
        ("FinTech & Digital Assets", "Market data, digital assets, blockchain technology and an informative market monitor."),
        ("Sports Technology", "Performance tracking, sports analytics and technology supporting the development of sport."),
        ("Cybersecurity", "Data security, system integrity and responsible digital governance."),
        ("Global Innovation", "International technology trends and projects connecting capital, execution and innovation."),
    ] if en else [
        ("Artificial Intelligence", "Poslovna primjena modela, automatizacija, analiza podataka i inteligentna korisnička sučelja."),
        ("Software Platforms", "Digitalne platforme, arhitektura sustava, integracije i razvoj skalabilnih rješenja."),
        ("FinTech & Digital Assets", "Tržišni podatci, digitalna imovina, blockchain tehnologija i informativni market monitor."),
        ("Sports Technology", "Performance tracking, sportska analitika i tehnologija kao podrška razvoju sporta."),
        ("Cybersecurity", "Sigurnost podataka, integritet sustava i odgovorno digitalno upravljanje."),
        ("Global Innovation", "Međunarodni tehnološki trendovi i projekti koji povezuju kapital, izvedbu i inovaciju."),
    ])
    for naslov, opis in podrucja:
        out.append(f'<article class="card tech"><h3>{e(naslov)}</h3><p>{e(opis)}</p></article>')
    out.append("</div></section>")

    # 6 · Portal
    out.append('<section class="about-band"><div class="about-head">'
               f'<p class="eyebrow">{"What the portal publishes" if en else "Što portal objavljuje"}</p>'
               f'<h2>{"Content, sources and editorial responsibility" if en else "Sadržaj, izvori i urednička odgovornost"}</h2>'
               f'<p>{"Editorial opinion and aggregated news are kept strictly apart, and each carries its own marking." if en else "Uredničko stajalište i preuzete vijesti strogo su odvojeni, a svaki nosi vlastitu oznaku."}</p>'
               '</div><div class="grid">')
    out.append(kartica(
        "153 " + ("texts" if en else "teksta"),
        "Objave, analize i komentari" if not en else "Publications, analyses and commentary",
        popis(["112 objava", "37 komentara", "4 analize",
               "Svaki tekst nosi izvore i uredničko odobrenje",
               "Glavni urednik: Nermin Sefić"]
              if not en else
              ["112 publications", "37 commentaries", "4 analyses",
               "Every text carries its sources and editorial approval",
               "Editor in chief: Nermin Sefić"])))
    out.append(kartica(
        "AKTUAL MEDIA", "Vijesti iz javnih izvora" if not en else "News from public sources",
        popis(["Do 150 objavljenih vijesti", "31 medijski izvor",
               "Osvježavanje svaka 2 sata", "Arhiva do 2.000 stavki",
               "Puni tekst se ne preuzima — vodi na izvornog izdavača"]
              if not en else
              ["Up to 150 published items", "31 media sources",
               "Refreshed every 2 hours", "Archive of up to 2,000 items",
               "Full text is not copied — links to the original publisher"])))
    out.append(kartica(
        "The World Table", "789 recepata" if not en else "789 recipes",
        popis(["14 kategorija", "PDF izdanje od 1424 stranice",
               "Listanje stranicu po stranicu u pregledniku",
               "Besplatno za preuzimanje i dijeljenje"]
              if not en else
              ["14 categories", "A 1,424-page PDF edition",
               "Page-by-page reading in the browser",
               "Free to download and share"])))
    out.append("</div></section>")

    # 7 · Infrastruktura
    out.append('<section class="about-band"><div class="about-head">'
               f'<p class="eyebrow">{"How the system runs" if en else "Kako sustav radi"}</p>'
               f'<h2>{"Infrastructure and continuity" if en else "Infrastruktura i kontinuitet"}</h2>'
               f'<p>{"The portal maintains itself. Data refreshes on a schedule, content publishes on a schedule, and the entire repository mirrors to a standby copy." if en else "Portal se održava sam. Podatci se osvježavaju po rasporedu, sadržaj se objavljuje po rasporedu, a cijeli repozitorij zrcali se u pričuvu."}</p>'
               '</div><div class="grid">')
    out.append(kartica(
        "37 " + ("automations" if en else "automatizacija"),
        "Što se događa samo" if not en else "What happens on its own",
        popis(["Podatci naslovnice i trgovine — svakih 15 minuta",
               "Tržišni pokazatelji i objave — svaki sat",
               "Vijesti i SEO ciklus — svaka 2 sata",
               "Makro podatci — svaka 3 sata",
               "Zrcaljenje u pričuvu — svaka 4 sata",
               "Zdravlje sajta i revizije — dnevno"]
              if not en else
              ["Homepage and shop data — every 15 minutes",
               "Market indicators and publications — hourly",
               "News and SEO cycle — every 2 hours",
               "Macro data — every 3 hours",
               "Mirror to standby — every 4 hours",
               "Site health and audits — daily"])))
    out.append(kartica(
        "Cloudflare", "Posluživanje i pohrana" if not en else "Serving and storage",
        popis(["25 konfiguracija workera", "50 jedinstvenih ruta",
               "8 KV prostora, 2 D1 baze, 1 R2 spremnik",
               "Dnevni ispit javnih ruta"]
              if not en else
              ["25 worker configurations", "50 unique routes",
               "8 KV namespaces, 2 D1 databases, 1 R2 bucket",
               "Daily probe of public routes"])))
    out.append(kartica(
        "Kontinuitet" if not en else "Continuity",
        "Pričuva koja miruje" if not en else "A standby that waits",
        p("Cijeli repozitorij zrcali se u drugi, pričuvni repozitorij, gdje su automatizacije "
          "namjerno isključene da ne rade dvaput. Prelazak se izvodi jednom naredbom i moguć je "
          "i ako glavni račun prestane raditi."
          if not en else
          "The entire repository mirrors to a second, standby repository where automations are "
          "deliberately switched off so nothing runs twice. The switch is a single command and "
          "remains possible even if the main account stops working.")))
    out.append("</div></section>")

    return "".join(out)


CSS = (
 ".about-band{margin:44px 0 0;padding:34px 0 0;border-top:1px solid rgba(184,138,47,.22)}"
 ".about-head{margin:0 0 22px;max-width:760px}"
 ".about-head h2{margin:6px 0 8px;font-size:1.6rem;line-height:1.2}"
 ".about-head p{margin:0;color:#b7ad9e;line-height:1.6}"
 ".about-list{margin:10px 0 0;padding:0 0 0 18px;color:#c9c2b5;line-height:1.7}"
 ".about-list li{margin:0 0 4px}"
 ".about-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));"
 "gap:12px;margin:0 0 22px}"
 ".about-kpi .kpi{padding:16px 18px;border:1px solid rgba(184,138,47,.3);border-radius:14px;"
 "background:linear-gradient(135deg,#131c2e,#0b1220)}"
 ".about-kpi .kpi span{display:block;color:#b88a2f;font-size:.72rem;letter-spacing:.12em;"
 "text-transform:uppercase}"
 ".about-kpi .kpi strong{display:block;margin:6px 0 3px;font:700 1.3rem Georgia,serif;color:#f7f1e5}"
 ".about-kpi .kpi small{color:#8d8577;font-size:.78rem}"
 ".about-projects .card h3,.about-tech .card h3{margin:8px 0 6px;font-size:1.05rem;color:#f7f1e5}"
 ".project-phase{margin:10px 0 0;color:#b88a2f;font-size:.78rem;letter-spacing:.08em;"
 "text-transform:uppercase}"
 ".about-code{background:linear-gradient(180deg,rgba(184,138,47,.07),transparent 70%);"
 "border-radius:18px;padding:34px 22px 8px}"
 ".about-img{width:100%;height:150px;object-fit:cover;border-radius:12px;margin:0 0 12px;"
 "border:1px solid rgba(184,138,47,.25)}"
 "@media(max-width:640px){.about-head h2{font-size:1.32rem}"
 ".about-kpi{grid-template-columns:1fr 1fr}}"
)


def obradi(putanja, en):
    s = open(putanja, encoding="utf-8").read()
    if "about-band" in s:
        print("  već prošireno:", putanja)
        return
    kraj = s.rindex("</main>")
    s = s[:kraj] + cjeline(en) + s[kraj:]
    if ".about-band{" not in s:
        s = s.replace("</style>", CSS + "</style>", 1)
    open(putanja, "w", encoding="utf-8").write(s)
    print(f"  {putanja}: {len(s)//1024} KB")


obradi("apps/portal/about/index.html", en=False)
obradi("apps/portal/en/about/index.html", en=True)
