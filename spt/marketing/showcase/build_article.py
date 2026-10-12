#!/usr/bin/env python3
"""SPT — samostalni članak (HR /objave/… + EN /en/publications/…) u portalskom predlošku objava.

Pokretanje (iz korijena repozitorija):
    /home/user/.venv/bin/python spt/marketing/showcase/build_article.py

produced by GNK ASG · autor: Nermin Sefić
"""
from __future__ import annotations

import html
import json
from pathlib import Path
from urllib.parse import quote

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
PORTAL = ROOT / "apps" / "portal"
SITE = "https://gnk-asg.hr"
SLUG = "spt-sports-performance-tracking-gnk-asg"
PUB = "2026-10-12T11:00:00+02:00"
AUTHOR_IMG = "/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp"
OG = "/spt/img/og/hero-stadium-usa.jpg"
COVER = "hero_stadium_usa"  # ključ naslovne slike (članak 64 parametra mijenja ga pri uvozu)
VIDEO = True  # JSON-LD VideoObject samo kad je film ugrađen u članak
LOGO = "/assets/logo-gnk-asg-canonical.svg?v=20260713-standard-64"

ROUTES = {"hr": f"/objave/{SLUG}/", "en": f"/en/publications/{SLUG}/"}
SPT = {"hr": "/spt/", "en": "/spt/en/"}
CONTACT = {"hr": "/contact/", "en": "/en/contact/"}
AUTHOR = {"hr": "/nermin-sefic/", "en": "/en/nermin-sefic/"}

e = lambda s: html.escape(str(s), quote=True)


def dims(path: str) -> tuple[int, int]:
    with Image.open(PORTAL / path.lstrip("/")) as im:
        return im.size


def img_src(key: str) -> tuple[str, str]:
    """(veliki, 720) put za ključ slike."""
    if key.startswith("live_hud_"):
        n = key.replace("_", "-")
        return f"/spt/film/{n}.webp", f"/spt/img/{n}-720.webp"
    return f"/spt/img/{key}.webp", f"/spt/img/{key}-720.webp"


def page_url(key: str, lang: str) -> str:
    slug = key.replace("_", "-")
    return f"{SPT[lang]}galerija/{slug}/"


def pic(key: str, lang: str, alt: str, eager: bool = False) -> str:
    big, small = img_src(key)
    w, h = dims(big)
    w2, _ = dims(small)
    load = 'loading="eager" fetchpriority="high"' if eager else 'loading="lazy" decoding="async"'
    return (f'<img src="{big}" srcset="{small} {w2}w, {big} {w}w" sizes="(max-width: 960px) 100vw, 860px" '
            f'width="{w}" height="{h}" alt="{e(alt)}" {load}>')


def fig(lang: str, items: list[tuple[str, str]], cap: str) -> str:
    """items = [(ključ, alt), …]; jedna ili dvije slike + opis; svaka vodi na svoju stranicu."""
    open_lbl = "Otvori stranicu slike" if lang == "hr" else "Open image page"
    inner = "".join(
        f'<a href="{page_url(k, lang)}" title="{e(open_lbl)}: {e(a)}">{pic(k, lang, a)}</a>' for k, a in items)
    cls = ' class="two"' if len(items) > 1 else ""
    credit = "Ilustracija: SPT · produced by GNK ASG" if lang == "hr" else "Illustration: SPT · produced by GNK ASG"
    return f'<figure><div{cls}>{inner}</div><figcaption>{cap} <span class="cr">{credit}</span></figcaption></figure>'


STYLE = """<style>
.article-body.spt-art figure{margin:30px 0}
.article-body.spt-art figure img{display:block;width:100%;height:auto;border-radius:14px;border:1px solid #e3e7ee;background:#0b1220}
.article-body.spt-art figure a{display:block}
.article-body.spt-art figcaption{margin-top:9px;font-size:.88rem;line-height:1.55;color:#5a6577}
.article-body.spt-art figcaption .cr{display:block;margin-top:2px;font-size:.78rem;color:#8a94a6}
.article-body.spt-art .two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.article-body .spt-facts{margin:26px 0 30px;padding:20px 24px;border-radius:16px;background:#07162d;box-shadow:0 14px 34px rgba(7,22,45,.25)}
.article-body .spt-facts h2{margin:0 0 10px!important;color:#3dd6f5!important;font:800 1.12rem/1.3 Georgia,serif;letter-spacing:.02em}
.article-body .spt-facts ul{margin:0;padding-left:20px}
.article-body .spt-facts li{color:#e8eef8!important;font-size:1rem;line-height:1.75}
.article-body .spt-facts strong{color:#b6f03c!important}
.article-body .spt-table{width:100%;border-collapse:collapse;margin:20px 0 10px;font-size:.96rem}
.article-body .spt-table th,.article-body .spt-table td{padding:11px 12px;border-bottom:1px solid #e3e7ee;text-align:left;vertical-align:top;color:#2f3d52;line-height:1.6}
.article-body .spt-table th{background:#f3f6fa;color:#07162d;font-weight:800;font-size:.86rem;text-transform:uppercase;letter-spacing:.06em}
.article-body .spt-table td:first-child{font-weight:800;color:#07162d;min-width:150px}
.article-body .spt-video{margin:28px 0 8px;border-radius:14px;overflow:hidden;background:#000;border:1px solid #0b1220}
.article-body .spt-video video{display:block;width:100%;height:auto;aspect-ratio:16/9;background:#000}
.article-body .spt-vcap{font-size:.88rem!important;color:#5a6577!important;margin-top:0}
.article-body .spt-week li{margin-bottom:8px}
.article-body .spt-cta{margin:34px 0 26px;padding:24px 26px;border-radius:18px;background:linear-gradient(135deg,#060a12,#0b1a2e 60%,#10283f)}
.article-body .spt-cta h2{margin:0 0 8px!important;color:#fff!important}
.article-body .spt-cta p{color:#c9d4e5!important;margin:0 0 14px}
.article-body .spt-cta .btns{display:flex;flex-wrap:wrap;gap:10px}
.article-body .spt-cta .btns a{display:inline-block;padding:11px 16px;border-radius:11px;border:1px solid rgba(255,255,255,.22);color:#fff!important;text-decoration:none;font-weight:800;font-size:.95rem}
.article-body .spt-cta .btns a.p{background:#3dd6f5;border-color:#3dd6f5;color:#001219!important}
.article-body .spt-note{font-size:.86rem!important;line-height:1.6!important;color:#5a6577!important;border-top:1px solid #e3e7ee;padding-top:14px;margin-top:24px}
.article-body .spt-sig{font-size:.8rem!important;color:#8a94a6!important;letter-spacing:.05em;margin:6px 0 0}
@media(max-width:650px){.article-body.spt-art .two{grid-template-columns:1fr}.article-body .spt-table thead{display:none}.article-body .spt-table tr{display:block;padding:10px 0;border-bottom:1px solid #e3e7ee}.article-body .spt-table td{display:block;border:0;padding:3px 0}}
</style>"""


def content(lang: str) -> dict:
    hr = lang == "hr"
    spt, contact = SPT[lang], CONTACT[lang]
    film = f"{spt}film/"
    gal = f"{spt}galerija/"
    if hr:
        facts = """<aside class="spt-facts" aria-label="SPT ukratko"><h2>SPT ukratko</h2><ul>
<li><strong>GNSS 20 Hz</strong> na otvorenom — GPS, Galileo, GLONASS i BeiDou istodobno</li>
<li><strong>UWB ±10 cm</strong> u dvorani, gdje satelitski signal ne prolazi</li>
<li><strong>IMU do 1000 Hz</strong>, devet osi, kućište IP67</li>
<li><strong>&lt; 1 sekunda</strong> od senzora do klupe, i kad internet zakaže</li>
<li><strong>75 sportova</strong> u bazi · aplikacija na <strong>10 jezika</strong> · prezentacija na <strong>24 jezika</strong></li>
<li>Uloge: trener, kondicijski trener, sportaš, skaut i administrator</li></ul></aside>"""
        week = """<ul class="spt-week">
<li><strong>Ponedjeljak (MD+2) — oporavak.</strong> Jutarnja spremnost iz HRV-a, sna i pulsa u mirovanju svrstava igrače u zelenu, žutu ili crvenu zonu. Crveni dobivaju individualni plan.</li>
<li><strong>Utorak i srijeda (MD-4, MD-3) — najveće opterećenje tjedna.</strong> Kondicijski trener prati trčanje velikom brzinom, sprinteve i broj naglih ubrzanja i kočenja u odnosu na ciljanu dozu za svaki položaj.</li>
<li><strong>Četvrtak (MD-2) — taktika i brzina, manji volumen.</strong> SPT upozorava na igrače čiji omjer akutnog i kroničnog opterećenja raste prebrzo.</li>
<li><strong>Petak (MD-1) — aktivacija.</strong> Odluka o sastavu donosi se s podacima, a ne samo s osjećajem.</li>
<li><strong>Dan utakmice.</strong> Uživo na klupi, na tabletu uz teren i na velikom ekranu u kontrolnoj sobi; izvještaj se slaže sam.</li></ul>"""
        table = """<table class="spt-table"><thead><tr><th>Funkcija</th><th>Što radi</th><th>Zašto je važno</th></tr></thead><tbody>
<tr><td>ACWR — omjer akutnog i kroničnog opterećenja</td><td>Uspoređuje opterećenje zadnjih 7 dana s prosjekom zadnjih 28 dana (eksponencijalno ponderirani prosjeci).</td><td>Nagli skokovi opterećenja povezuju se s većim rizikom ozljeda mekih tkiva. Zona od oko 0,8 do 1,3 smatra se uravnoteženom, a vrijednosti iznad 1,5 rizičnima.</td></tr>
<tr><td>Trčanje velikom brzinom i sprintevi</td><td>Broji metre i ponavljanja iznad pragova brzine prilagođenih sportu i položaju (u nogometu često oko 20 i 25 km/h).</td><td>Stražnja loža i prepone najosjetljivije su upravo na izloženost maksimalnoj brzini — premalo je jednako opasno kao i previše.</td></tr>
<tr><td>Ubrzanja i kočenja</td><td>Iz inercijskog senzora od 1000 Hz broji nagle promjene brzine, npr. iznad 3 m/s².</td><td>Kočenje je mehanički najzahtjevnije opterećenje za mišiće i tetive, a sam GPS ga ne vidi dovoljno dobro.</td></tr>
<tr><td>Spremnost (readiness)</td><td>Spaja HRV, puls u mirovanju, san i kratki upitnik u jutarnju ocjenu: zeleno, žuto ili crveno.</td><td>Isti trening nije isti podražaj za odmornog i za iscrpljenog sportaša.</td></tr>
<tr><td>Monotonija i strain</td><td>Mjeri koliko su dani u tjednu međusobno slični i koliki je ukupni stres tjedna.</td><td>Jednolično visoko opterećenje bez dana oporavka često prethodi bolesti i pretreniranosti.</td></tr>
<tr><td>Kontrolna soba uživo</td><td>Do 12 pločica: karta, puls, brzine, alarmi ili usporedba dvaju igrača na polovici terena.</td><td>Analitičar i trener vide istu sliku u istoj sekundi.</td></tr>
<tr><td>Tjelesni sastav</td><td>Vaga bioimpedancijom mjeri masu, mišiće, masti, vodu, visceralnu mast i bazalni metabolizam.</td><td>Prehrana i opterećenje planiraju se prema stvarnom stanju tijela, a ne prema dojmu.</td></tr>
<tr><td>Izvještaji i ispis</td><td>Izvještaj nakon treninga i utakmice, karton sportaša i ispis za upravu.</td><td>Manje papirologije, više vremena za igrače.</td></tr></tbody></table>"""
        oem = """<ul>
<li><strong>Firmware SDK i protokol</strong> — fuzija GNSS/IMU, UWB mjerenje udaljenosti, BLE sinkronizacija i ažuriranja OTA.</li>
<li><strong>Cloud i edge serveri</strong> — prijem, obrada i pohrana podataka u stvarnom vremenu na infrastrukturi SPT-a ili partnera.</li>
<li><strong>White-label aplikacija</strong> — logotip, boje i domena partnera; naš kod i naša ažuriranja.</li>
<li><strong>Analitički motor i umjetna inteligencija kao API</strong> — ACWR, spremnost, rizik od ozljede, biomehanika i izvještaji.</li>
<li><strong>Otvoreni API i izvoz</strong> — JSON i CSV prema video analizi, medicinskim sustavima i klupskom ERP-u.</li></ul>"""
        video = f"""<div class="spt-video"><video controls preload="none" playsinline poster="/spt/film/spt-film-poster.webp" width="1280" height="720" aria-label="Film SPT u 60 sekundi"><source src="/spt/film/spt-film.mp4?v=3" type="video/mp4"></video></div>
<p class="spt-vcap">Film „SPT u 60 sekundi”: bez naratora — vedra glazba i zvukovi raznih sportova: publika, sudačka zviždaljka, nogomet, tenis, košarka, plivanje, atletika i otkucaji srca. <a href="{film}">Stranica filma s poglavljima →</a></p>"""
        body = [
            "<p>U modernom sportu rezultat se sve češće odlučuje prije utakmice: u tome tko je u ponedjeljak trenirao previše, tko je u četvrtak imao lošu noć i čiji su sprintevi u drugom poluvremenu postali sporiji nego inače. <strong>SPT — Sports Performance Tracking</strong> sustav je koji te signale hvata dok se događaju i pretvara ih u odluke koje stručni stožer može donijeti na vrijeme: prije ozljede, a ne nakon nje.</p>",
            facts,
            "<h2>Od senzora do klupe za manje od sekunde</h2>",
            "<p>Srce sustava je <strong>SPT Pod</strong>, senzor koji se nosi u džepu kompresijskog prsluka, između lopatica. To nije slučajno mjesto: tijekom trčanja to je najmirnija točka tijela s najboljim pogledom na nebo, pa su satelitski trag i mjerenje ubrzanja čišći nego na zapešću ili bokovima.</p>",
            "<p>Pod istodobno prima signale četiriju satelitskih sustava 20 puta u sekundi, a inercijski senzor s devet osi bilježi ubrzanja, rotacije i udarce do 1000 puta u sekundi. Kad igra prijeđe u dvoranu, gdje satelitski signal ne prolazi, senzor sam prelazi na <strong>UWB</strong>: sidra na stropu određuju položaj s preciznošću od desetak centimetara. Na stadionu podatke prima server <strong>SPT Edge One</strong>, lokalno računa metrike i šalje ih na klupu za manje od sekunde — i kad internet zakaže.</p>",
            fig("hr", [("chip_pod", "SPT Pod senzor s oznakom SPT"), ("vest_back", "SPT prsluk s džepom za senzor između lopatica")],
                "SPT Pod i džep između lopatica: najstabilnija točka tijela za satelitski signal i čisto mjerenje ubrzanja."),
            "<h2>Showcase: tjedan jednog američkog kluba</h2>",
            "<p>Kako to izgleda u praksi, prikazujemo na izmišljenom, ali realističnom primjeru: <strong>Coastline United SC</strong>, profesionalni nogometni klub iz Kalifornije, i stožer od tridesetak ljudi koji od ponedjeljka do utakmice radi s jednim izvorom istine. Klub i podaci su simulirani — funkcije su stvarne.</p>",
            week,
            fig("hr", [("live_hud_alert", "SPT live alarm rizika tijekom utakmice: ACWR 1,52 kod igrača broj 6")],
                "Trenutak iz demo utakmice: sustav označava igrača broj 6 (ACWR 1,52) i predlaže izmjenu — odluka ostaje treneru."),
            "<p>U 67. minuti demo utakmice protiv Bay Cityja, broj 9 sprinta 32,2 km/h i postiže gol za 3:1. Istodobno se na ekranu pali crvena oznaka uz broj 6: omjer akutnog i kroničnog opterećenja dosegnuo je 1,52, iznad praga koji je stožer sam postavio. Sustav ne donosi odluku — on je stavlja pred trenera na vrijeme, s razlogom i prijedlogom izmjene.</p>",
            video,
            "<h2>Ključne funkcije: što rade i zašto</h2>",
            "<p>SPT ima desetke modula, od prehrane do skautinga. Ovo su oni koji najviše mijenjaju odluke stožera:</p>",
            table,
            "<p>Važna napomena: SPT daje pokazatelje izvedbe i dobrobiti, a ne medicinsku dijagnozu. Pragovi se postavljaju po klubu, sportu i sportašu, a odluke ostaju kod ljudi — trenera, kondicijskog trenera i liječnika.</p>",
            fig("hr", [("analytics_screen", "SPT analitika: radar profila, tjedno opterećenje, ACWR i toplinska karta")],
                "Analitika: radar profila, tjedno opterećenje s upozorenjima, ACWR i toplinska karta — rizik je vidljiv prije ozljede."),
            fig("hr", [("control_room", "SPT kontrolna soba s pločicama uživo")],
                "Kontrolna soba: do 12 pločica uživo, a svaka prikazuje ono što odaberete — uključujući usporedbu dvaju igrača."),
            "<h2>SPT u uređajima drugih proizvođača</h2>",
            "<p>Manje je poznato da SPT ne radi samo na našim uređajima. <strong>Softver SPT kupuju i u svoje proizvode ugrađuju i drugi proizvođači sličnih sustava za praćenje sportaša.</strong> Ponekad radi pod njihovim brendom — ali uvijek s našim alatima, našim softverom i na našim serverima.</p>",
            oem,
            "<p>Imena partnera ne objavljujemo: na zahtjev potpisujemo NDA i radimo pod brendom partnera. Svima je zajedničko jedno — svaka nova verzija koju razvijemo za SPT stiže i do njihovih korisnika.</p>",
            fig("hr", [("oem_cloud", "SPT Cloud infrastruktura za partnere i proizvođače")],
                "SPT Cloud: serveri, alati i softver na kojima rade i uređaji drugih proizvođača."),
            "<h2>Stalni razvoj</h2>",
            "<p>SPT nije gotov proizvod nego platforma koja raste s klubovima i partnerima. Nova verzija izlazi svakih nekoliko tjedana. Posljednja, <strong>SPT 2.5</strong>, donijela je procjenu rizika uz pomoć umjetne inteligencije, skauting s percentilima po položaju i dobi, medicinski i rehabilitacijski modul, usporedbu s ligom, biomehaniku, planer obroka, praćenje ciklusa i otvoreni API. Desktop verzija za Windows 11 instalira se jednim klikom, a sustav radi i kao web aplikacija.</p>",
            "<h2>Od nogometa do veslanja: 75 sportova</h2>",
            "<p>Nogomet je naš showcase, ali SPT je građen za 75 sportova. Svaki ima svoje položaje, metrike i norme: od košarke, rukometa, odbojke i futsala u dvorani s UWB-om, preko veslanja, vaterpola i plivanja, do atletike, biciklizma, skijanja te auto-moto sporta — automobilizma, motociklizma i kartinga.</p>",
            fig("hr", [("indoor_volleyball_uwb", "Odbojka u dvorani s UWB praćenjem"), ("recreational_runner", "Rekreativna trkačica sa SPT satom")],
                "Dvoranski sportovi s UWB-om i rekreativci sa satom: isti sustav, različite potrebe."),
            "<p>Rekreativcima su dovoljni sat i aplikacija: puls, san, oporavak i plan treninga koji se prilagođava danu. Za akademije i mlade od 12 godina tu su dobne krivulje, praćenje rasta i opterećenja te suglasnost roditelja.</p>",
            "<h2>Podaci pripadaju klubu i sportašu</h2>",
            "<p>Svaka uloga vidi samo ono što joj treba: trener, kondicijski trener, sportaš, skaut i administrator imaju različita prava. Klubovi su u sustavu pohranjeni pod šiframa, podaci maloljetnika dodatno su zaštićeni, a ozljede unosi ovlašteno osoblje. Podaci ostaju u klubu i kad ljudi odu.</p>",
            "<h2>Zaključak</h2>",
            "<p>SPT spaja ono što je u sportu dugo bilo razdvojeno: senzore, znanost o treningu i svakodnevni rad stožera. Rezultat nije još jedna tablica, nego pravodobna odluka — tko danas trenira punom snagom, tko treba odmor, a tko je spreman za utakmicu.</p>",
            f"""<aside class="spt-cta" aria-label="SPT prezentacija"><h2>Cijela SPT prezentacija</h2><p>Film, galerija s 21 slikom (svaka sa svojom stranicom), sve funkcije i stručna objašnjenja — na 24 jezika.</p><div class="btns"><a class="p" href="{spt}">Otvori SPT prezentaciju →</a><a href="{film}">Pogledaj film</a><a href="{gal}">Galerija slika</a><a href="{contact}">Demo i partnerstvo</a></div></aside>""",
            '<p class="spt-note">Napomena: Coastline United SC i Bay City izmišljeni su demo klubovi, a prikazani podaci su simulirani. Slike uređaja i scena ilustracije su sustava SPT.</p>',
        ]
        return dict(
            title="GNK ASG predstavlja SPT: praćenje sportaša GPS-om, UWB-om i umjetnom inteligencijom",
            seo="SPT: praćenje sportaša GPS-om, UWB-om i umjetnom inteligencijom | GNK ASG",
            desc="SPT spaja GPS 20 Hz, UWB ±10 cm, senzor 1000 Hz i umjetnu inteligenciju u sustav koji prati opterećenje, spremnost i rizik od ozljede sportaša.",
            lead="SPT (Sports Performance Tracking) povezuje nosivi senzor, sat, prsni pojas i pametnu vagu s platformom koja u stvarnom vremenu računa opterećenje, spremnost i rizik od ozljede. Softver već kupuju i ugrađuju i drugi proizvođači sličnih sustava — ponekad pod svojim brendom, ali uvijek s našim alatima, softverom i serverima.",
            eyebrow="Objava · Sport i tehnologija · 12. listopada 2026.",
            section="Sport i tehnologija",
            keywords=["SPT", "Sports Performance Tracking", "praćenje sportaša", "GPS prsluk", "UWB", "ACWR", "prevencija ozljeda",
                      "sportska analitika", "nogometna analitika", "white-label", "OEM", "GNK ASG", "GNK ASG d.o.o.", "GNK DINAMO Ltd."],
            hashtags="#SPT #GNKASG #NerminSefić #NerminSefic #SportsPerformanceTracking #SportskaAnalitika #PrevencijaOzljeda #UWB #FootballTech #MadeInCroatia",
            cover_alt="Dan utakmice u SAD-u: igrači praćeni sustavom SPT — ilustracija",
            body=body,
            L=dict(author="Autor", profile="Profil autora", role="direktor GNK ASG d.o.o. i ovlašteni predstavnik GNK DINAMO Ltd.",
                   small="GNK ASG · GNK DINAMO Ltd. USA Group", approval="<strong>Urednička odgovornost:</strong> objavu je prije objave odobrio glavni urednik Nermin Sefić.",
                   share="Podijeli:", copy="Kopiraj link", copied="Kopirano ✓", back="← Povratak", back_url="/objave/",
                   home="Naslovnica", coll="Objave", coll_url="/objave/", menu="IZBORNIK", sig="produced by GNK ASG · SPT — Sports Performance Tracking",
                   video_name="SPT u 60 sekundi", video_desc="Film bez naratora: SPT uređaji, nadzorna ploča uživo i analitika, samo uz zvukove sporta."),
        )
    # ---------------- EN ----------------
    facts = """<aside class="spt-facts" aria-label="SPT at a glance"><h2>SPT at a glance</h2><ul>
<li><strong>20 Hz GNSS</strong> outdoors — GPS, Galileo, GLONASS and BeiDou at once</li>
<li><strong>±10 cm UWB</strong> indoors, where satellite signals cannot reach</li>
<li><strong>IMU up to 1000 Hz</strong>, nine axes, IP67 housing</li>
<li><strong>&lt; 1 second</strong> from sensor to bench, even when the internet drops</li>
<li><strong>75 sports</strong> in the database · app in <strong>10 languages</strong> · presentation in <strong>24 languages</strong></li>
<li>Roles: coach, strength &amp; conditioning coach, athlete, scout and administrator</li></ul></aside>"""
    week = """<ul class="spt-week">
<li><strong>Monday (MD+2) — recovery.</strong> Morning readiness from HRV, sleep and resting heart rate sorts players into green, amber or red. Red players get an individual plan.</li>
<li><strong>Tuesday and Wednesday (MD-4, MD-3) — the heaviest load of the week.</strong> The S&amp;C coach tracks high-speed running, sprints and the number of hard accelerations and decelerations against the target dose for each position.</li>
<li><strong>Thursday (MD-2) — tactics and speed, lower volume.</strong> SPT flags players whose acute-to-chronic workload ratio is climbing too fast.</li>
<li><strong>Friday (MD-1) — activation.</strong> The line-up is decided with data, not gut feeling alone.</li>
<li><strong>Match day.</strong> Live on the bench, on the sideline tablet and on the big screen in the control room; the report builds itself.</li></ul>"""
    table = """<table class="spt-table"><thead><tr><th>Feature</th><th>What it does</th><th>Why it matters</th></tr></thead><tbody>
<tr><td>ACWR — acute:chronic workload ratio</td><td>Compares the load of the last 7 days with the average of the last 28 days (exponentially weighted averages).</td><td>Sudden spikes in load are associated with a higher risk of soft-tissue injury. A zone of roughly 0.8 to 1.3 is considered balanced; values above 1.5 are considered risky.</td></tr>
<tr><td>High-speed running and sprints</td><td>Counts metres and repetitions above speed thresholds tailored to sport and position (in football often around 20 and 25 km/h).</td><td>Hamstrings and groin are most sensitive to maximal-speed exposure — too little is as dangerous as too much.</td></tr>
<tr><td>Accelerations and decelerations</td><td>Counts sharp changes of speed, e.g. above 3 m/s², from the 1000 Hz inertial sensor.</td><td>Braking is the most mechanically demanding load for muscles and tendons, and GPS alone does not see it well enough.</td></tr>
<tr><td>Readiness</td><td>Combines HRV, resting heart rate, sleep and a short questionnaire into a morning score: green, amber or red.</td><td>The same session is not the same stimulus for a rested and an exhausted athlete.</td></tr>
<tr><td>Monotony and strain</td><td>Measures how similar the days of the week are and how large the week's total stress is.</td><td>Uniformly high load without recovery days often precedes illness and overtraining.</td></tr>
<tr><td>Live control room</td><td>Up to 12 tiles: map, heart rate, speeds, alarms or a half-pitch comparison of two players.</td><td>The analyst and the coach see the same picture in the same second.</td></tr>
<tr><td>Body composition</td><td>The bioimpedance scale measures weight, muscle, fat, water, visceral fat and basal metabolism.</td><td>Nutrition and load are planned on the body's real condition, not on impressions.</td></tr>
<tr><td>Reports and printing</td><td>Post-session and post-match reports, the athlete file and print-outs for the board.</td><td>Less paperwork, more time for players.</td></tr></tbody></table>"""
    oem = """<ul>
<li><strong>Firmware SDK and protocol</strong> — GNSS/IMU fusion, UWB ranging, BLE sync and OTA updates.</li>
<li><strong>Cloud and edge servers</strong> — real-time ingestion, processing and storage on SPT infrastructure or the partner's.</li>
<li><strong>White-label app</strong> — the partner's logo, colours and domain; our code and our updates.</li>
<li><strong>Analytics engine and AI as an API</strong> — ACWR, readiness, injury risk, biomechanics and reports.</li>
<li><strong>Open API and export</strong> — JSON and CSV to video analysis, medical systems and the club ERP.</li></ul>"""
    video = f"""<div class="spt-video"><video controls preload="none" playsinline poster="/spt/film/spt-film-poster.webp" width="1280" height="720" aria-label="Film: SPT in 60 seconds"><source src="/spt/film/spt-film.mp4?v=3" type="video/mp4"></video></div>
<p class="spt-vcap">The film “SPT in 60 seconds”: no narrator — upbeat music and the sounds of many sports: the crowd, the referee's whistle, football, tennis, basketball, swimming, athletics and a heartbeat. <a href="{film}">Film page with chapters →</a></p>"""
    body = [
        "<p>In modern sport, results are increasingly decided before kick-off: by who trained too hard on Monday, who had a bad night on Thursday and whose sprints became slower than usual in the second half. <strong>SPT — Sports Performance Tracking</strong> is a system that captures these signals as they happen and turns them into decisions the staff can make in time: before the injury, not after it.</p>",
        facts,
        "<h2>From sensor to bench in under a second</h2>",
        "<p>The heart of the system is the <strong>SPT Pod</strong>, a sensor worn in a compression-vest pocket between the shoulder blades. The spot is no accident: while running it is the stillest point of the body with the clearest view of the sky, so the satellite track and the acceleration data are cleaner than on the wrist or the hips.</p>",
        "<p>The Pod receives four satellite systems 20 times per second, while a nine-axis inertial sensor records accelerations, rotations and impacts up to 1000 times per second. When play moves indoors, where satellite signals cannot reach, the sensor switches to <strong>UWB</strong> on its own: ceiling anchors locate the athlete to within about ten centimetres. At the stadium, the <strong>SPT Edge One</strong> server receives the data, calculates metrics locally and sends them to the bench in under a second — even when the internet fails.</p>",
        fig("en", [("chip_pod", "SPT Pod sensor with SPT branding"), ("vest_back", "SPT vest with the sensor pocket between the shoulder blades")],
            "The SPT Pod and the pocket between the shoulder blades: the most stable point of the body for satellite reception and clean acceleration data."),
        "<h2>Showcase: one week at an American club</h2>",
        "<p>To show how this works in practice, we use a fictional but realistic example: <strong>Coastline United SC</strong>, a professional football club from California, and a staff of around thirty people working from Monday to match day with a single source of truth. The club and the data are simulated — the features are real.</p>",
        week,
        fig("en", [("live_hud_alert", "SPT live risk alert during a match: ACWR 1.52 for player number 6")],
            "A moment from the demo match: the system flags player number 6 (ACWR 1.52) and suggests a substitution — the decision stays with the coach."),
        "<p>In the 67th minute of the demo match against Bay City, number 9 sprints at 32.2 km/h and scores to make it 3–1. At the same moment a red marker lights up next to number 6: his acute-to-chronic workload ratio has reached 1.52, above the threshold the staff set themselves. The system does not make the decision — it puts it in front of the coach in time, with the reason and a substitution suggestion.</p>",
        video,
        "<h2>Key features: what they do and why</h2>",
        "<p>SPT has dozens of modules, from nutrition to scouting. These are the ones that change staff decisions the most:</p>",
        table,
        "<p>An important note: SPT provides performance and wellbeing indicators, not a medical diagnosis. Thresholds are set per club, sport and athlete, and decisions remain with people — the coach, the S&amp;C coach and the doctor.</p>",
        fig("en", [("analytics_screen", "SPT analytics: profile radar, weekly load, ACWR and heatmap")],
            "Analytics: profile radar, weekly load with flags, ACWR and a heatmap — the risk is visible before the injury."),
        fig("en", [("control_room", "SPT control room with live tiles")],
            "The control room: up to 12 live tiles, each showing what you choose — including a comparison of two players."),
        "<h2>SPT inside other manufacturers' devices</h2>",
        "<p>It is less well known that SPT does not run only on our own devices. <strong>SPT software is also bought and built into their products by other manufacturers of similar athlete-tracking systems.</strong> Sometimes it runs under their brand — but always with our tools, our software and on our servers.</p>",
        oem,
        "<p>We do not publish partner names: on request we sign an NDA and work under the partner's brand. What they all have in common — every new version we develop for SPT also reaches their users.</p>",
        fig("en", [("oem_cloud", "SPT Cloud infrastructure for partners and manufacturers")],
            "SPT Cloud: the servers, tools and software that other manufacturers' devices run on as well."),
        "<h2>Continuous development</h2>",
        "<p>SPT is not a finished product but a platform that grows with clubs and partners. A new version ships every few weeks. The latest, <strong>SPT 2.5</strong>, added AI-assisted risk assessment, scouting with percentiles by position and age, a medical and rehabilitation module, league comparison, biomechanics, a meal planner, cycle tracking and an open API. The Windows 11 desktop version installs with one click, and the system also runs as a web app.</p>",
        "<h2>From football to rowing: 75 sports</h2>",
        "<p>Football is our showcase, but SPT is built for 75 sports. Each has its own positions, metrics and norms: from basketball, handball, volleyball and futsal indoors with UWB, through rowing, water polo and swimming, to athletics, cycling, skiing and motorsport — car racing, motorcycling and karting.</p>",
        fig("en", [("indoor_volleyball_uwb", "Indoor volleyball with UWB tracking"), ("recreational_runner", "Amateur runner with an SPT watch")],
            "Indoor sports with UWB and amateur athletes with a watch: one system, different needs."),
        "<p>For amateur athletes, a watch and the app are enough: heart rate, sleep, recovery and a training plan that adapts to the day. For academies and young athletes aged 12 and over there are age curves, growth and load monitoring, and parental consent.</p>",
        "<h2>The data belongs to the club and the athlete</h2>",
        "<p>Each role sees only what it needs: coach, S&amp;C coach, athlete, scout and administrator have different permissions. Clubs are stored in the system under codes, minors' data is additionally protected and injuries are entered by authorised staff. The data stays with the club even when people leave.</p>",
        "<h2>Conclusion</h2>",
        "<p>SPT brings together what sport kept apart for a long time: sensors, training science and the staff's daily work. The result is not another spreadsheet but a timely decision — who trains at full intensity today, who needs rest and who is ready for the match.</p>",
        f"""<aside class="spt-cta" aria-label="SPT presentation"><h2>The full SPT presentation</h2><p>The film, a gallery of 21 images (each with its own page), every feature and expert explanations — in 24 languages.</p><div class="btns"><a class="p" href="{spt}">Open the SPT presentation →</a><a href="{film}">Watch the film</a><a href="{gal}">Image gallery</a><a href="{contact}">Demo and partnership</a></div></aside>""",
        '<p class="spt-note">Note: Coastline United SC and Bay City are fictional demo clubs and the data shown is simulated. Device and scene images are illustrations of the SPT system.</p>',
    ]
    return dict(
        title="GNK ASG unveils SPT: athlete tracking with GPS, UWB and artificial intelligence",
        seo="SPT: athlete tracking with GPS, UWB and AI | GNK ASG",
        desc="SPT combines 20 Hz GPS, ±10 cm UWB, a 1000 Hz sensor and AI to track load, readiness and injury risk — for clubs, coaches and amateur athletes.",
        lead="SPT (Sports Performance Tracking) connects a wearable sensor, watch, chest strap and smart scale with a platform that calculates load, readiness and injury risk in real time. Its software is already bought and built in by other manufacturers of similar systems — sometimes under their brand, but always with our tools, software and servers.",
        eyebrow="Publication · Sport &amp; technology · 12 October 2026",
        section="Sport & technology",
        keywords=["SPT", "Sports Performance Tracking", "athlete tracking", "GPS vest", "UWB", "ACWR", "injury prevention",
                  "sports analytics", "football analytics", "white-label", "OEM", "GNK ASG", "GNK ASG d.o.o.", "GNK DINAMO Ltd."],
        hashtags="#SPT #GNKASG #NerminSefić #NerminSefic #SportsPerformanceTracking #SportsAnalytics #InjuryPrevention #UWB #FootballTech #MadeInCroatia",
        cover_alt="Match day in the USA: players tracked by SPT — illustration",
        body=body,
        L=dict(author="Author", profile="Author profile", role="Director, GNK ASG d.o.o. and authorised representative, GNK DINAMO Ltd.",
               small="GNK ASG · GNK DINAMO Ltd. USA Group", approval="<strong>Editorial responsibility:</strong> this publication was approved before release by editor-in-chief Nermin Sefić.",
               share="Share:", copy="Copy link", copied="Copied ✓", back="← Back to publications", back_url="/en/publications/",
               home="Home", coll="Publications", coll_url="/en/publications/", menu="MENU", sig="produced by GNK ASG · SPT — Sports Performance Tracking",
               video_name="SPT in 60 seconds", video_desc="A film without narration: SPT devices, the live dashboard and analytics, with sport sounds only."),
    )


def page(lang: str) -> str:
    c = content(lang)
    L = c["L"]
    hr = lang == "hr"
    route = ROUTES[lang]
    url = SITE + route
    alt_lang = "en" if hr else "hr"
    home_url = SITE + ("/" if hr else "/en/")
    art = {
        "@context": "https://schema.org", "@type": "Article", "headline": c["title"], "description": c["desc"],
        "inLanguage": lang, "datePublished": PUB, "dateModified": PUB,
        "mainEntityOfPage": {"@type": "WebPage", "@id": url},
        "author": {"@type": "Person", "name": "Nermin Sefić", "url": SITE + AUTHOR[lang], "image": SITE + AUTHOR_IMG},
        "publisher": {"@type": "Organization", "name": "GNK ASG d.o.o.", "url": SITE + "/",
                      "logo": {"@type": "ImageObject", "url": SITE + "/assets/logo-gnk-asg-canonical.svg"}},
        "image": [SITE + OG, SITE + img_src(COVER)[0], SITE + AUTHOR_IMG],
        "articleSection": c["section"], "keywords": c["keywords"] + ["Nermin Sefić", "Sefić Nermin", "Nermin Sefic", "Sefic Nermin"],
        "about": [{"@type": "Brand", "name": "SPT — Sports Performance Tracking", "url": SITE + SPT[lang]},
                  {"@type": "Person", "name": "Nermin Sefić", "url": SITE + AUTHOR[lang]},
                  {"@type": "Organization", "name": "GNK ASG d.o.o.", "url": SITE + "/"},
                  {"@type": "Organization", "name": "GNK DINAMO Ltd. USA Group"}],
        "video": {"@type": "VideoObject", "name": L["video_name"], "description": L["video_desc"],
                  "thumbnailUrl": [SITE + "/spt/img/og/film.jpg"], "uploadDate": "2026-10-12T10:00:00+02:00",
                  "duration": "PT1M1S", "contentUrl": SITE + "/spt/film/spt-film.mp4", "embedUrl": SITE + SPT[lang] + "film/"},
    }
    if not VIDEO:
        art.pop("video")
    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": L["home"], "item": home_url},
        {"@type": "ListItem", "position": 2, "name": L["coll"], "item": SITE + L["coll_url"]},
        {"@type": "ListItem", "position": 3, "name": c["title"], "item": url}]}
    jd = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    enc = quote(url, safe="")
    tw_text = quote(c["title"], safe="")
    wa_text = quote(c["title"] + " — " + url, safe="")
    feed = "/feed.xml" if hr else "/en/feed.xml"
    atom = "/atom.xml" if hr else "/en/atom.xml"
    head = f"""<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>{e(c['seo'])}</title><meta name="description" content="{e(c['desc'])}"><meta name="keywords" content="{e(', '.join(c['keywords']))}"><meta name="author" content="Nermin Sefić"><meta property="article:author" content="{SITE}{AUTHOR[lang]}"><meta name="author-image" content="{SITE}{AUTHOR_IMG}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><link rel="canonical" href="{url}"><link rel="alternate" hreflang="{lang}" href="{url}"><link rel="alternate" hreflang="{alt_lang}" href="{SITE}{ROUTES[alt_lang]}"><link rel="alternate" hreflang="x-default" href="{SITE}{ROUTES['en']}"><meta property="og:type" content="article"><meta property="og:locale" content="{'hr_HR' if hr else 'en_US'}"><meta property="og:locale:alternate" content="{'en_US' if hr else 'hr_HR'}"><meta property="og:site_name" content="GNK ASG"><meta property="og:title" content="{e(c['title'])}"><meta property="og:description" content="{e(c['desc'])}"><meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}{OG}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="{e(c['title'])} — Nermin Sefić"><meta property="article:published_time" content="{PUB}"><meta property="article:section" content="{e(c['section'])}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{e(c['title'])}"><meta name="twitter:description" content="{e(c['desc'])}"><meta name="twitter:image" content="{SITE}{OG}"><meta name="twitter:image:alt" content="{e(c['cover_alt'])}"><script type="application/ld+json">{jd(art)}</script><link rel="stylesheet" href="/assets/editorial-content-v2.css?v=20260714-seo-v3"><link rel="stylesheet" href="/assets/public-unified-menu-v6.css?v=20260721-header-fulltransparent-v1">{STYLE}<script type="application/ld+json">{jd(crumbs)}</script><link rel="alternate" type="application/rss+xml" title="GNK ASG RSS" href="{feed}"><link rel="alternate" type="application/atom+xml" title="GNK ASG Atom" href="{atom}"></head>"""
    hdr = f"""<body><header id="gnk-unified-header" data-gnk-unified-shell="v6-static"><div class="inner"><a class="brand" href="{'/' if hr else '/en/'}" aria-label="GNK ASG"><img src="{LOGO}" alt="GNK ASG" width="110" height="68" data-gnk-canonical-logo="1"></a><div id="gnk-unified-menu"><div class="actions"><div class="lang"><a href="{ROUTES['hr']}" aria-label="Hrvatski"{' aria-current="page"' if hr else ''}>HR</a><a href="{ROUTES['en']}" aria-label="English"{'' if hr else ' aria-current="page"'}>EN</a></div><button class="toggle" type="button" aria-expanded="false" aria-controls="gnk-unified-nav">{L['menu']}</button></div><nav id="gnk-unified-nav"></nav></div></div></header>"""
    author_alt = (f"Nermin Sefić — autor teksta {c['title']}" if hr else f"Nermin Sefić — author of {c['title']}")
    cover_big, cover_small = img_src(COVER)
    cw, ch = dims(cover_big)
    main = f"""<main class="editorial-wrap article"><img class="editorial-logo" src="{LOGO}" alt="GNK ASG"><header class="article-header"><p class="eyebrow">{c['eyebrow']}</p><h1>{e(c['title'])}</h1><p class="lead">{e(c['lead'])}</p></header><aside class="article-author"><img title="Nermin Sefić (Sefic Nermin) — GNK ASG · GNK DINAMO Ltd." src="{AUTHOR_IMG}" alt="{e(author_alt)}" width="320" height="320" loading="eager"><div><span>{L['author']}</span><strong>Nermin Sefić</strong><a href="{AUTHOR[lang]}">{L['profile']}</a><small>{L['small']}</small></div></aside><a href="{page_url(COVER, lang)}"><img class="article-cover" src="{cover_big}" srcset="{cover_small} 720w, {cover_big} {cw}w" sizes="(max-width: 960px) 100vw, 920px" width="{cw}" height="{ch}" alt="{e(c['cover_alt'])}" fetchpriority="high"></a><article class="article-body spt-art">{''.join(c['body'])}<p class="editorial-approval">{L['approval']}</p><aside class="author-box" aria-label="{L['author']}"><p class="author-box-label">{L['author']}</p><p class="author-box-name"><a href="{AUTHOR[lang]}">Nermin Sefić</a></p><p class="author-box-role">{L['role']}</p></aside><p class="article-hashtags">{e(c['hashtags'])}</p><div class="ak-share" role="group" aria-label="{L['share']}"><strong>{L['share']}</strong> <a href="https://www.facebook.com/sharer/sharer.php?u={enc}" target="_blank" rel="noopener noreferrer" aria-label="Facebook">Facebook</a> <a href="https://www.linkedin.com/sharing/share-offsite/?url={enc}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">LinkedIn</a> <a href="https://twitter.com/intent/tweet?url={enc}&amp;text={tw_text}" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">X (Twitter)</a> <a href="https://api.whatsapp.com/send?text={wa_text}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">WhatsApp</a> <button type="button" class="ak-share-copy" data-url="{url}" data-copied="{L['copied']}" style="background:none;border:1px solid currentColor;color:inherit;font:inherit;padding:6px 12px;border-radius:4px;cursor:pointer">{L['copy']}</button></div><script>(function(){{var b=document.currentScript.previousElementSibling.querySelector('.ak-share-copy');if(!b)return;b.addEventListener('click',function(){{navigator.clipboard&&navigator.clipboard.writeText(b.dataset.url).then(function(){{var t=b.textContent;b.textContent=b.dataset.copied;setTimeout(function(){{b.textContent=t}},1800)}})}})}})();</script><p class="spt-sig">{L['sig']}</p></article><a class="article-back" href="{L['back_url']}">{L['back']}</a></main><script src="/assets/app.js?v=20260721-hero-rounded-v1" defer></script></body></html>"""
    return head + hdr + main


def main() -> None:
    for lang, route in ROUTES.items():
        out = PORTAL / route.strip("/") / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(lang), encoding="utf-8")
        print(f"{out.relative_to(ROOT)}  {out.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
