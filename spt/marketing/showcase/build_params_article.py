#!/usr/bin/env python3
"""SPT — članak „Parametri i analize: 64 parametra koje SPT mjeri — i što pokazuju” (HR + EN).

Svi parametri, analize, funkcije, uređaji i tehnički podaci čitaju se iz ISTIH izvora kao
SPT stranica (i18n/params/<jezik>.json i i18n/<jezik>.json), pa su članak i /spt/ uvijek usklađeni.
Predložak (zaglavlje, SEO, JSON-LD, autor, dijeljenje) dijeli se s build_article.py.

Pokretanje (iz korijena repozitorija):
    /home/user/.venv/bin/python spt/marketing/showcase/build_params_article.py

produced by GNK ASG · autor: Nermin Sefić
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build_article as ba  # noqa: E402  (zajednički portalski predložak objava)

e = ba.e
SLUG_HR = "spt-64-parametra-i-analize"
SLUG_EN = "spt-64-parameters-and-analyses"
ROUTES = {"hr": f"/objave/{SLUG_HR}/", "en": f"/en/publications/{SLUG_EN}/"}
PUB = "2026-10-12T16:30:00+02:00"
OG = "/spt/img/og/analytics-screen.jpg"
COVER = "analytics_screen"
FIRST_ARTICLE = dict(ba.ROUTES)  # prvi SPT članak (GPS, UWB i AI)
BASE_L = {lang: ba.content(lang)["L"] for lang in ("hr", "en")}  # prije zamjene ba.content

# Koji parametri (redni brojevi 1–64, isti kao na /spt/#params) ulaze u svaku od 6 analiza.
AN_INPUTS = [
    [17, 18, 19, 21, 23, 24, 43, 55, 56, 57, 58, 59],   # jutarnja spremnost
    [1, 3, 4, 5, 6, 7, 8, 10, 14, 15, 45],               # izvještaj treninga
    [3, 8, 18, 43, 44, 45, 46, 47, 56],                  # tjedni rizik
    [25, 26, 27, 30, 31, 32, 33, 34, 35, 36, 37, 38, 41],  # prehrana prema opterećenju
    [5, 6, 49, 50, 51, 52, 53, 61, 64],                  # usporedba i razvoj
    [3, 5, 7, 8, 46, 48, 49, 54, 56],                    # povratak nakon ozljede
]

T = {
    "hr": dict(
        title="Parametri i analize: 64 parametra koje SPT mjeri — i što pokazuju",
        seo="64 parametra koje SPT mjeri i što pokazuju | GNK ASG",
        desc="Svih 64 parametra sustava SPT — od kretanja, srca i sna do prehrane i taktike — što pokazuju i kako ih šest analiza i sve funkcije pretvaraju u odluke.",
        lead="Od metra trčanja do grama proteina: SPT mjeri 64 parametra u 11 skupina i iz njih slaže šest analiza za svakodnevne odluke stožera. Ovdje su svi — s jedinicom mjere, izvorom podatka, onim što pokazuju i funkcijama koje ih koriste.",
        eyebrow="Objava · Sport i tehnologija · 12. listopada 2026.",
        section="Sport i tehnologija",
        keywords=["SPT", "Sports Performance Tracking", "64 parametra", "parametri sportaša", "analiza opterećenja", "ACWR", "HRV",
                  "indeks spremnosti", "energetska dostupnost", "prehrana sportaša", "prevencija ozljeda", "sportska analitika",
                  "GNK ASG", "GNK ASG d.o.o.", "GNK DINAMO Ltd."],
        hashtags="#SPT #GNKASG #NerminSefić #NerminSefic #SportsPerformanceTracking #SportskaAnalitika #64Parametra #ACWR #HRV #SportskaPrehrana #PrevencijaOzljeda #MadeInCroatia",
        cover_alt="SPT AI analitika: radar profila, tjedno opterećenje sa zastavicama, ACWR mjerač i toplinska karta — ilustracija",
        intro=[
            "Sportski stožeri danas nemaju manjak podataka, nego manjak jasnih odgovora. Zato SPT (Sports Performance Tracking) ne broji sve što se može izbrojiti, nego mjeri 64 parametra od kojih svaki ima jasnu svrhu: vanjsko opterećenje (što je sportaš odradio), unutarnji odgovor (kako je to tijelo podnijelo), san i oporavak, tjelesni sastav, prehranu i hidraciju, terenske testove, wellness i taktiku.",
            "U nastavku je potpun popis — po skupinama, s jedinicom ili načinom mjerenja, izvorom podatka i objašnjenjem što pojedini parametar pokazuje. Slijede primjer kako se parametri spajaju, šest analiza koje iz njih svakodnevno nastaju, ključne funkcije s objašnjenjem što rade i zašto, te pregled svih funkcija, uređaja i tehničkih podataka.",
        ],
        facts_t="Ukratko",
        facts=[
            "<strong>64 parametra</strong> u 11 skupina: deset skupina po šest i taktika s četiri",
            "<strong>6 analiza</strong> za svakodnevne odluke — od jutarnje spremnosti do povratka nakon ozljede",
            "<strong>Više od 50 modula</strong> u 8 skupina funkcija, na istom kartonu sportaša",
            "<strong>Izvori podataka:</strong> SPT Pod (GNSS 20 Hz, UWB oko ±10 cm, IMU 1000 Hz), SPT sat, prsni pojas, pametna vaga, aplikacija i terenski testovi",
            "<strong>Pragovi po mjeri:</strong> podešavaju se po klubu, sportu, poziciji, dobi i sportašu — za sportaše od 12 godina naviše",
            "<strong>Wellness i sportska analitika</strong> — ne medicinska dijagnoza",
        ],
        toc_t="Sadržaj",
        read="<strong>Kako čitati tablice:</strong> svaki redak sadrži redni broj, naziv parametra, jedinicu ili način mjerenja te objašnjenje što pokazuje. Pragovi navedeni uz jedinice okvirni su i u SPT-u se podešavaju; redni brojevi (1–64) isti su kao na SPT stranici.",
        th=["#", "Parametar", "Mjerenje", "Što pokazuje"],
        src="Izvor",
        prange="parametri",
        gintro=[
            "Vanjsko opterećenje — ono što je sportaš stvarno odradio. SPT Pod bilježi položaj 20 puta u sekundi vani (GNSS) i s preciznošću oko ±10 cm u dvorani (UWB), pa se udaljenost, brzina i sprintevi mjere jednako na travnjaku i na parketu.",
            "Ono što GPS sam ne vidi dovoljno dobro: nagla ubrzanja, kočenja, promjene smjera, skokovi i kontakti. Inercijski senzor od 1000 Hz hvata događaje koji traju milisekunde — upravo one koji najviše opterećuju mišiće, tetive i zglobove.",
            "Unutarnje opterećenje — kako je tijelo doživjelo trening. Prsni pojas daje puls otkucaj po otkucaj, a sat prati puls u mirovanju i HRV; ista vanjska brojka kod odmornog i umornog sportaša ima posve drukčiju cijenu.",
            "Oporavak se događa noću. Sat mjeri trajanje i faze sna, buđenja, disanje i temperaturu kože, a jutarnji indeks spremnosti od 0 do 100 spaja sve u jednu odluku: puni intenzitet ili plan oporavka.",
            "Pametna vaga bioimpedancijom svako jutro bilježi masu, masno i mišićno tkivo, vodu, visceralnu mast i bazalni metabolizam. Trend kroz tjedne govori više od jednog vaganja — i temelj je plana prehrane.",
            "Energija ulaz–izlaz: što je sportaš pojeo i koliko je potrošio. Iz toga SPT računa energetsku dostupnost, unos proteina i ugljikohidrata po kilogramu i vrijeme obroka — kako bi se opterećenje i prehrana planirali zajedno.",
            "Male razlike s velikim učinkom: gubitak tekućine, status hidracije, mikronutrijenti, kofein i alkohol te uvjeti okoline — vrućina, vlaga i nadmorska visina — objašnjavaju dane kad brojke „ne štimaju”.",
            "Ovdje se brojke pretvaraju u odluke. ACWR, monotonija, subjektivni napor, asimetrija koraka i AI procjena rizika pokazuju tko ulazi u zonu rizika — dovoljno rano da stožer reagira prije ozljede.",
            "Kratki terenski testovi — skok, sprint, intermitentni test — mjere svježinu živčano-mišićnog sustava i kondicijsku razinu. Za rekreativce je aerobna efikasnost najjednostavniji pokazatelj napretka.",
            "Kratki jutarnji upitnik u aplikaciji — umor, bol, san, stres, raspoloženje — često reagira prije objektivnih pokazatelja. Za sportašice postoji i opcionalno, privatno praćenje ciklusa.",
            "Iz istih pozicijskih podataka nastaje i taktička slika: toplinske karte, kompaktnost momčadi, visina obrambene linije i — uz senzor na kopački — udarci lopte i omjer lijeve i desne noge.",
        ],
        fig_after={
            1: (["vest_back", "chip_pod"], "SPT prsluk drži senzor mirno uz leđa, a SPT Pod bilježi položaj 20 puta u sekundi — temelj parametara 1–12."),
            3: (["strap_hr", "watch"], "Prsni pojas daje puls otkucaj po otkucaj, a SPT sat noću bilježi san, HRV i puls u mirovanju (parametri 13–24)."),
            5: (["smart_scale", "mobile_app"], "Pametna vaga i aplikacija: tjelesni sastav svako jutro, prehrana, hidracija i wellness upitnik na jednom mjestu (parametri 25–42 i 55–60)."),
            8: (["live_hud_alert"], "Alarm uživo: kad opterećenje ili puls prijeđu osobni prag, stožer to vidi dok se trening još odvija."),
            9: (["indoor_volleyball_uwb"], "U dvorani UWB sidra zamjenjuju GPS: isti parametri, preciznost oko ±10 cm."),
            11: (["control_room", "coach_tablet"], "Kontrolna soba do 12 pločica i tablet uz aut-liniju: taktička slika i opterećenje uživo."),
        },
        comb_t="Kako se parametri spajaju",
        comb=[
            "Pojedinačni broj rijetko je dovoljan. Vanjsko opterećenje (što je sportaš odradio) tek u kombinaciji s unutarnjim odgovorom (kako je tijelo to podnijelo) i oporavkom (san, HRV, wellness) govori koliko ga je trening stvarno koštao.",
            "Zato SPT uz svaki parametar pamti osobnu normu sportaša (prosjek posljednjih tjedana) i uspoređuje je s pozicijom i profilom lige. Odstupanje od vlastite norme često je važnije od apsolutne vrijednosti.",
        ],
        example="<strong>Primjer iz prakse:</strong> dva veznjaka istrče po 10,2 km i 640 m trčanja velikom brzinom. Kod prvoga puls većinom ostaje u zoni 3, HRV je stabilan, a spavao je osam sati — zeleno. Drugi ima TRIMP veći za četvrtinu, HRV 15 % ispod osobne norme i šest sati sna — žuto. Isti trening, različita cijena: drugi sutra dobiva prilagođen plan.",
        an_intro="Parametri su sirovina, a vrijednost nastaje kad se spoje. SPT iz njih automatski slaže šest analiza koje stožer, sportaš i partneri koriste svaki dan. Uz svaku piše kada se koristi, tko je čita i koji parametri u nju ulaze.",
        when="Kada i tko",
        an_when=[
            "svako jutro prije prvog treninga — trener i kondicijski trener.",
            "odmah nakon treninga ili utakmice — trener, kondicijski trener i analitičar.",
            "na kraju tjedna i pri planiranju mikrociklusa — stožer i medicinski tim.",
            "dnevno i tjedno — nutricionist, kondicijski trener i sam sportaš.",
            "mjesečno i sezonski — skaut, voditelj mlađih kategorija i sportaš osobno.",
            "tijekom rehabilitacije — fizioterapeut, liječnik kluba i kondicijski trener.",
        ],
        inputs="Ulazni parametri",
        key_t="Ključne funkcije: što rade i zašto",
        all_t="Sve funkcije SPT-a",
        dev_t="Uređaji koji mjere",
        dev_th=["Uređaj", "Što radi", "Zašto je važno"],
        dev_fig=(["uwb_anchor", "vest_front"], "UWB sidro za dvorane i SPT prsluk — svaki uređaj nosi oznaku SPT."),
        fn_fig=(["dashboard_laptop"], "Live nadzorna ploča: pozicije, brzine i opterećenje svih igrača bez kašnjenja."),
        who_t="Za koga je SPT",
        who_fig=(["recreational_runner", "training_vests"], "Od rekreativca s jutarnjim trčanjem do profesionalne momčadi na treningu — isti sustav, različite potrebe."),
        sports_lbl="Među podržanim sportovima",
        specs_t="Tehnički podaci",
        specs_th=["Stavka", "Vrijednost"],
        oem_t="Stalni razvoj i partneri",
        ver_t="Razvoj po verzijama",
        oem_fig=(["oem_cloud", "edge_server"], "Cloud i edge serveri SPT-a: partneri dobivaju naš softver, alate i infrastrukturu — i pod svojim brendom."),
        illus="Slike uređaja i scena ilustracije su sustava SPT; brojevi u primjeru i na zaslonima simulirani su.",
        cta_t="Pogledajte SPT uživo",
        cta_p="Na SPT stranici parametri su složeni u pregledne kartice, uz film, galeriju od 21 slike (svaka ima svoju stranicu) i stručna objašnjenja na 24 jezika.",
        cta_b=["Otvori parametre na SPT stranici →", "Pogledaj film", "Galerija slika", "Prvi članak o SPT-u", "Demo i partnerstvo"],
        cta_aria="SPT prezentacija",
    ),
    "en": dict(
        title="Parameters and analyses: the 64 parameters SPT measures — and what they show",
        seo="The 64 parameters SPT measures and what they show | GNK ASG",
        desc="All 64 SPT parameters — from movement, heart and sleep to nutrition and tactics — what each one shows and how six analyses and every feature turn them into decisions.",
        lead="From a metre of running to a gram of protein: SPT measures 64 parameters in 11 groups and builds six analyses from them for the staff's daily decisions. Here they all are — with the unit, the data source, what each one shows and the features that use them.",
        eyebrow="Publication · Sport &amp; technology · 12 October 2026",
        section="Sport & technology",
        keywords=["SPT", "Sports Performance Tracking", "64 parameters", "athlete metrics", "load analysis", "ACWR", "HRV",
                  "readiness index", "energy availability", "sports nutrition", "injury prevention", "sports analytics",
                  "GNK ASG", "GNK ASG d.o.o.", "GNK DINAMO Ltd."],
        hashtags="#SPT #GNKASG #NerminSefić #NerminSefic #SportsPerformanceTracking #SportsAnalytics #64Parameters #ACWR #HRV #SportsNutrition #InjuryPrevention #MadeInCroatia",
        cover_alt="SPT AI analytics: profile radar, weekly load with flags, an ACWR gauge and a heatmap — illustration",
        intro=[
            "Sports staff today don't lack data — they lack clear answers. That is why SPT (Sports Performance Tracking) doesn't count everything that can be counted; it measures 64 parameters, each with a clear purpose: external load (what the athlete did), internal response (how the body coped), sleep and recovery, body composition, nutrition and hydration, field tests, wellness and tactics.",
            "Below is the complete list — by group, with the unit or method, the data source and an explanation of what each parameter shows. It is followed by an example of how the parameters combine, the six analyses built from them every day, the key features with what they do and why, and an overview of every feature, device and technical specification.",
        ],
        facts_t="In brief",
        facts=[
            "<strong>64 parameters</strong> in 11 groups: ten groups of six and tactics with four",
            "<strong>6 analyses</strong> for daily decisions — from morning readiness to the return after injury",
            "<strong>More than 50 modules</strong> in 8 feature groups, sharing one athlete record",
            "<strong>Data sources:</strong> SPT Pod (20 Hz GNSS, about ±10 cm UWB, 1000 Hz IMU), SPT watch, chest strap, smart scale, the app and field tests",
            "<strong>Tailored thresholds:</strong> adjusted per club, sport, position, age and athlete — for athletes aged 12 and up",
            "<strong>Wellness and sports analytics</strong> — not a medical diagnosis",
        ],
        toc_t="Contents",
        read="<strong>How to read the tables:</strong> each row contains the number, the parameter name, the unit or method and an explanation of what it shows. Thresholds next to the units are indicative and adjustable in SPT; the numbers (1–64) match the SPT page.",
        th=["#", "Parameter", "Measured as", "What it shows"],
        src="Source",
        prange="parameters",
        gintro=[
            "External load — what the athlete actually did. The SPT Pod records position 20 times per second outdoors (GNSS) and to about ±10 cm indoors (UWB), so distance, speed and sprints are measured the same way on grass and on court.",
            "What GPS alone cannot see well enough: sharp accelerations, braking, changes of direction, jumps and contacts. The 1000 Hz inertial sensor captures events lasting milliseconds — exactly the ones that load muscles, tendons and joints the most.",
            "Internal load — how the body experienced the session. The chest strap delivers beat-by-beat heart rate and the watch tracks resting heart rate and HRV; the same external numbers cost a rested and a tired athlete very different amounts.",
            "Recovery happens at night. The watch measures sleep duration and stages, awakenings, breathing and skin temperature, and the 0–100 morning readiness index turns it all into one decision: full intensity or a recovery plan.",
            "Every morning the smart scale uses bioimpedance to record mass, fat and muscle, water, visceral fat and basal metabolic rate. The trend over weeks says more than a single weigh-in — and it is the basis of the nutrition plan.",
            "Energy in and out: what the athlete ate and how much they used. From that SPT calculates energy availability, protein and carbohydrate per kilogram and meal timing — so load and nutrition are planned together.",
            "Small differences with big effects: fluid loss, hydration status, micronutrients, caffeine and alcohol, and environmental conditions — heat, humidity and altitude — explain the days when the numbers “don't add up”.",
            "This is where numbers become decisions. ACWR, monotony, session RPE, stride asymmetry and the AI risk estimate show who is entering the risk zone — early enough for the staff to act before an injury.",
            "Short field tests — jump, sprint, intermittent test — measure neuromuscular freshness and fitness level. For amateur athletes, aerobic efficiency is the simplest marker of progress.",
            "A short morning questionnaire in the app — fatigue, soreness, sleep, stress, mood — often reacts before the objective markers. Female athletes can also use optional, private cycle tracking.",
            "The same position data also produce the tactical picture: heatmaps, team compactness, defensive line height and — with a boot sensor — ball strikes and the left/right foot ratio.",
        ],
        fig_after={
            1: (["vest_back", "chip_pod"], "The SPT vest keeps the sensor still against the back, and the SPT Pod records position 20 times per second — the basis of parameters 1–12."),
            3: (["strap_hr", "watch"], "The chest strap delivers beat-by-beat heart rate, while the SPT watch records sleep, HRV and resting heart rate overnight (parameters 13–24)."),
            5: (["smart_scale", "mobile_app"], "Smart scale and app: body composition every morning, plus nutrition, hydration and the wellness questionnaire in one place (parameters 25–42 and 55–60)."),
            8: (["live_hud_alert"], "Live alert: when load or heart rate crosses a personal threshold, the staff see it while the session is still running."),
            9: (["indoor_volleyball_uwb"], "Indoors, UWB anchors replace GPS: the same parameters, at about ±10 cm precision."),
            11: (["control_room", "coach_tablet"], "A control room of up to 12 tiles and a sideline tablet: the tactical picture and load, live."),
        },
        comb_t="How the parameters combine",
        comb=[
            "A single number is rarely enough. External load (what the athlete did) only tells you what a session really cost when it is combined with the internal response (how the body coped) and recovery (sleep, HRV, wellness).",
            "That is why SPT keeps a personal norm for every parameter (the average of recent weeks) and compares it with the position and the league profile. A deviation from one's own norm is often more important than the absolute value.",
        ],
        example="<strong>A real-world example:</strong> two midfielders each cover 10.2 km with 640 m of high-speed running. For the first, heart rate stays mostly in zone 3, HRV is stable and he slept eight hours — green. The second has a TRIMP a quarter higher, HRV 15% below his personal norm and six hours of sleep — yellow. Same session, different cost: tomorrow the second one gets an adjusted plan.",
        an_intro="Parameters are the raw material; the value appears when they are combined. From them SPT automatically builds six analyses that the staff, the athlete and partners use every day. Each one lists when it is used, who reads it and which parameters feed it.",
        when="When and who",
        an_when=[
            "every morning before the first session — head coach and strength & conditioning coach.",
            "right after the session or match — coach, S&C coach and analyst.",
            "at the end of the week and when planning the microcycle — staff and medical team.",
            "daily and weekly — nutritionist, S&C coach and the athlete.",
            "monthly and seasonally — scout, academy lead and the athlete.",
            "throughout rehab — physio, club doctor and S&C coach.",
        ],
        inputs="Input parameters",
        key_t="Key features: what they do and why",
        all_t="Every SPT feature",
        dev_t="The devices that measure",
        dev_th=["Device", "What it does", "Why it matters"],
        dev_fig=(["uwb_anchor", "vest_front"], "A UWB anchor for indoor venues and the SPT vest — every device carries the SPT mark."),
        fn_fig=(["dashboard_laptop"], "Live dashboard: positions, speeds and load of every player with no delay."),
        who_t="Who SPT is for",
        who_fig=(["recreational_runner", "training_vests"], "From an amateur on a morning run to a professional squad in training — one system, different needs."),
        sports_lbl="Supported sports include",
        specs_t="Technical specifications",
        specs_th=["Item", "Value"],
        oem_t="Constant development and partners",
        ver_t="Development by version",
        oem_fig=(["oem_cloud", "edge_server"], "SPT cloud and edge servers: partners get our software, tools and infrastructure — under their own brand too."),
        illus="Device and scene images are illustrations of the SPT system; the numbers in the example and on screens are simulated.",
        cta_t="See SPT live",
        cta_p="On the SPT page the parameters are laid out as clear cards, together with the film, a gallery of 21 images (each with its own page) and expert explanations in 24 languages.",
        cta_b=["Open the parameters on the SPT page →", "Watch the film", "Image gallery", "First SPT article", "Demo and partnership"],
        cta_aria="SPT presentation",
    ),
}

EXTRA_STYLE = """<style id="spt-params-article-css">
.article-body.spt-art h2[id],.article-body.spt-art tr[id]{scroll-margin-top:96px}
.article-body .spt-toc{margin:26px 0 30px;padding:18px 22px;border:1px solid #e3e7ee;border-radius:16px;background:#f6f9fc}
.article-body .spt-toc h2{margin:0 0 8px!important;font:800 1.05rem/1.3 Georgia,serif;color:#07162d!important}
.article-body .spt-toc ol{margin:0;padding-left:22px;columns:2;column-gap:30px}
.article-body .spt-toc li{margin:3px 0;line-height:1.55;break-inside:avoid}
.article-body .spt-toc a{color:#0b6e8a;text-decoration:none;font-weight:700}
.article-body .spt-src{margin:-4px 0 10px!important;font-size:.88rem!important;color:#0b6e8a!important;font-weight:700}
.article-body .spt-scroll{overflow-x:auto;margin:16px 0 8px}
.article-body .spt-params{margin:0}
.article-body .spt-params td:first-child{min-width:0;width:34px;font-weight:700;color:#7489a2}
.article-body .spt-params td:nth-child(2){font-weight:800;color:#07162d;min-width:170px}
.article-body .spt-params td:nth-child(3){color:#0b6e8a;font-size:.88rem;min-width:110px}
.article-body .spt-params tr:target td{background:#fff6cc}
.article-body .spt-ancards,.article-body .spt-fgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0 8px}
.article-body .spt-ancard,.article-body .spt-fcard,.article-body .spt-key{border:1px solid #e3e7ee;border-radius:14px;padding:16px 18px;background:#fff}
.article-body .spt-ancard h3,.article-body .spt-fcard h3,.article-body .spt-key h3{margin:0 0 6px!important;font-size:1.06rem!important;line-height:1.35!important;color:#07162d!important}
.article-body .spt-ancard p,.article-body .spt-key p{margin:0 0 8px;font-size:.97rem;line-height:1.65}
.article-body .spt-when,.article-body .spt-inputs{font-size:.88rem!important;color:#5a6577!important}
.article-body .spt-inputs a{color:#0b6e8a;text-decoration:none}
.article-body .spt-key{margin:14px 0;border-left:4px solid #3dd6f5}
.article-body .spt-tag{display:inline-block;margin:0 0 6px!important;padding:2px 10px;border-radius:999px;background:#07162d;color:#b6f03c!important;font-size:.76rem!important;font-weight:800;letter-spacing:.06em}
.article-body .spt-fcard ul{margin:0;padding-left:18px}
.article-body .spt-fcard li{margin:3px 0;font-size:.95rem;line-height:1.55}
.article-body .spt-example{margin:18px 0;padding:16px 20px;border-radius:14px;background:#f3f6fa;border-left:4px solid #b6f03c}
.article-body .spt-example p{margin:0}
.article-body .spt-dev td:first-child a{color:#07162d;text-decoration:underline;text-decoration-color:#3dd6f5;text-underline-offset:3px}
@media(max-width:650px){.article-body .spt-toc ol{columns:1}.article-body .spt-ancards,.article-body .spt-fgrid{grid-template-columns:1fr}.article-body .spt-params td:first-child{display:inline-block;width:auto;margin-right:6px}.article-body .spt-params td:nth-child(2){display:inline-block}}
</style>"""


def load(lang: str) -> tuple[dict, dict]:
    params = json.loads((HERE / "i18n" / "params" / f"{lang}.json").read_text(encoding="utf-8"))["params"]
    main = json.loads((HERE / "i18n" / f"{lang}.json").read_text(encoding="utf-8"))
    return params, main


def img_info(main: dict) -> dict[str, tuple[str, str]]:
    """ključ slike → (naslov, opis) iz istih tekstova kao galerija SPT stranice."""
    info: dict[str, tuple[str, str]] = {}
    for it in main["screens"]["items"]:
        info[it["img"]] = (it["t"], it["x"])
    for k, v in main["scenes"].items():
        info[k] = (v["t"], v["x"])
    for it in main["hw"]["items"]:
        info[it["img"]] = (it["t"], it["x"])
    return info


def figure(lang: str, info: dict, keys: list[str], cap: str) -> str:
    items = []
    for k in keys:
        t, x = info[k]
        items.append((k, f"{t} — {x}"))
    return ba.fig(lang, items, e(cap))


def body(lang: str) -> list[str]:
    t = T[lang]
    params, main = load(lang)
    info = img_info(main)
    groups = params["groups"]
    flat = [p for g in groups for p in g["items"]]
    assert len(groups) == 11 and len(flat) == 64, (len(groups), len(flat))
    assert len(t["gintro"]) == len(groups) and len(params["an"]) == len(AN_INPUTS) == len(t["an_when"])
    spt, first, contact = ba.SPT[lang], FIRST_ARTICLE[lang], ba.CONTACT[lang]

    out: list[str] = [f"<p>{e(p)}</p>" for p in t["intro"]]
    out.append(f'<aside class="spt-facts" aria-label="{e(t["facts_t"])}"><h2>{e(t["facts_t"])}</h2><ul>'
               + "".join(f"<li>{x}</li>" for x in t["facts"]) + "</ul></aside>")

    toc = [(f"g{i}", g["t"]) for i, g in enumerate(groups, 1)]  # <ol> sam numerira 1–11 = brojevi skupina
    toc += [("combine", t["comb_t"]), ("analyses", params["an_title"]), ("key-features", t["key_t"]),
            ("features", t["all_t"]), ("devices", t["dev_t"]), ("who", t["who_t"]),
            ("specs", t["specs_t"]), ("development", t["oem_t"])]
    out.append(f'<nav class="spt-toc" aria-label="{e(t["toc_t"])}"><h2>{e(t["toc_t"])}</h2><ol>'
               + "".join(f'<li><a href="#{a}">{e(lbl)}</a></li>' for a, lbl in toc) + "</ol></nav>")
    out.append(f"<p>{t['read']}</p>")

    n = 0
    for gi, g in enumerate(groups, 1):
        first_n = n + 1
        rows = []
        for p in g["items"]:
            n += 1
            rows.append(f'<tr id="p{n}"><td>{n}</td><td>{e(p["n"])}</td><td>{e(p["u"]) or "—"}</td><td>{e(p["w"])}</td></tr>')
        out.append(f'<h2 id="g{gi}">{gi}. {e(g["t"])}</h2>')
        out.append(f'<p class="spt-src">{t["src"]}: {e(g["src"])} · {t["prange"]} {first_n}–{n}</p>')
        out.append(f"<p>{e(t['gintro'][gi - 1])}</p>")
        out.append('<div class="spt-scroll"><table class="spt-table spt-params"><thead><tr>'
                   + "".join(f"<th>{e(h)}</th>" for h in t["th"]) + "</tr></thead><tbody>" + "".join(rows) + "</tbody></table></div>")
        if gi in t["fig_after"]:
            keys, cap = t["fig_after"][gi]
            out.append(figure(lang, info, keys, cap))

    out.append(f'<h2 id="combine">{e(t["comb_t"])}</h2><p>{e(t["comb"][0])}</p>'
               f'<div class="spt-example"><p>{t["example"]}</p></div><p>{e(t["comb"][1])}</p>')

    cards = []
    for i, (a, nums, when) in enumerate(zip(params["an"], AN_INPUTS, t["an_when"]), 1):
        links = " · ".join(f'<a href="#p{k}">{k} {e(flat[k - 1]["n"])}</a>' for k in nums)
        cards.append(f'<section class="spt-ancard"><h3>{i}. {e(a["t"])}</h3><p>{e(a["d"])}</p>'
                     f'<p class="spt-when"><strong>{e(t["when"])}:</strong> {e(when)}</p>'
                     f'<p class="spt-inputs"><strong>{e(t["inputs"])}:</strong> {links}</p></section>')
    out.append(f'<h2 id="analyses">{e(params["an_title"])}</h2><p>{e(t["an_intro"])}</p><div class="spt-ancards">{"".join(cards)}</div>')

    sci = main["sci"]
    out.append(f'<h2 id="key-features">{e(t["key_t"])}</h2><p>{e(sci["sub"])}</p>')
    for it in sci["items"]:
        out.append(f'<section class="spt-key"><p class="spt-tag">{e(it["tag"])}</p><h3>{e(it["t"])}</h3>'
                   f'<p><strong>{e(sci["what"])}:</strong> {e(it["what"])}</p><p><strong>{e(sci["why"])}:</strong> {e(it["why"])}</p></section>')

    sw = main["sw"]
    fcards = "".join(f'<section class="spt-fcard"><h3>{e(g["t"])}</h3><ul>' + "".join(f"<li>{e(x)}</li>" for x in g["i"]) + "</ul></section>"
                     for g in sw["groups"])
    out.append(f'<h2 id="features">{e(t["all_t"])}</h2><p>{e(sw["sub"])}</p><div class="spt-fgrid">{fcards}</div>')
    out.append(figure(lang, info, *t["fn_fig"]))

    hw = main["hw"]
    drows = "".join(f'<tr><td><a href="{ba.page_url(it["img"], lang)}">{e(it["t"])}</a></td><td>{e(it["x"])}</td><td>{e(it["w"])}</td></tr>'
                    for it in hw["items"])
    out.append(f'<h2 id="devices">{e(t["dev_t"])}</h2><p>{e(hw["sub"])}</p><div class="spt-scroll"><table class="spt-table spt-dev"><thead><tr>'
               + "".join(f"<th>{e(h)}</th>" for h in t["dev_th"]) + f"</tr></thead><tbody>{drows}</tbody></table></div>")
    out.append(figure(lang, info, *t["dev_fig"]))

    who, sports = main["who"], main["sports"]
    out.append(f'<h2 id="who">{e(t["who_t"])}</h2><p>{e(who["sub"])}</p><ul>'
               + "".join(f'<li><strong>{e(it["t"])}</strong> — {e(it["x"])}</li>' for it in who["items"]) + "</ul>")
    out.append(f'<p><strong>{e(sports["title"])}.</strong> {e(sports["sub"])} {e(t["sports_lbl"])}: '
               f'{e(", ".join(sports["list"]))} ({e(sports["more"])}).</p>')
    out.append(figure(lang, info, *t["who_fig"]))

    specs = main["specs"]
    out.append(f'<h2 id="specs">{e(t["specs_t"])}</h2><div class="spt-scroll"><table class="spt-table"><thead><tr>'
               + "".join(f"<th>{e(h)}</th>" for h in t["specs_th"]) + "</tr></thead><tbody>"
               + "".join(f"<tr><td>{e(a)}</td><td>{e(b)}</td></tr>" for a, b in specs["rows"]) + "</tbody></table></div>")

    oem, dev = main["oem"], main["dev"]
    out.append(f'<h2 id="development">{e(t["oem_t"])}</h2><p>{e(oem["lead"])}</p><ul>'
               + "".join(f'<li><strong>{e(p["t"])}</strong> — {e(p["x"])}</li>' for p in oem["points"]) + "</ul>")
    out.append(f'<h3>{e(t["ver_t"])}</h3><p>{e(dev["sub"])}</p><ul>'
               + "".join(f'<li><strong>SPT {e(it["v"])}</strong> — {e(it["x"])}</li>' for it in dev["items"]) + "</ul>")
    out.append(figure(lang, info, *t["oem_fig"]))

    b = t["cta_b"]
    out.append(f'<aside class="spt-cta" aria-label="{e(t["cta_aria"])}"><h2>{e(t["cta_t"])}</h2><p>{e(t["cta_p"])}</p><div class="btns">'
               f'<a class="p" href="{spt}#params">{e(b[0])}</a><a href="{spt}film/">{e(b[1])}</a><a href="{spt}galerija/">{e(b[2])}</a>'
               f'<a href="{first}">{e(b[3])}</a><a href="{contact}">{e(b[4])}</a></div></aside>')
    out.append(f'<p class="spt-note">{e(params["note"])} {e(sci["disclaimer"])} {e(t["illus"])}</p>')
    return out


def content(lang: str) -> dict:
    t = T[lang]
    return dict(title=t["title"], seo=t["seo"], desc=t["desc"], lead=t["lead"], eyebrow=t["eyebrow"], section=t["section"],
                keywords=t["keywords"], hashtags=t["hashtags"], cover_alt=t["cover_alt"], body=body(lang), L=BASE_L[lang])


def main() -> None:
    ba.ROUTES, ba.PUB, ba.OG, ba.COVER, ba.VIDEO = ROUTES, PUB, OG, COVER, False
    ba.STYLE = ba.STYLE + EXTRA_STYLE
    ba.content = content
    for lang, route in ROUTES.items():
        out = ba.PORTAL / route.strip("/") / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(ba.page(lang), encoding="utf-8")
        print(f"{out.relative_to(ba.ROOT)}  {out.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
