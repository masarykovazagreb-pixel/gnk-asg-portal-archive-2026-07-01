# 📡 SPT — Sports Performance Tracking

> **produced by GNK ASG** · gnk-asg.hr

**Vrhunski sustav za praćenje sportskih performansi za Windows 11** — praćenje uživo (GPS / UWB-M2M / BLE),
reprodukcija utakmica u **2D i 3D** (točkice po terenu, obje momčadi, svaki igrač), analize i usporedbe
**1 423 sportaša iz cijelog svijeta**, simulacije **unatrag i unaprijed**, katalog **75 sportova**,
**334 vrste mjerenja** i **35 uređaja**. Klubovi su pod **šiframa**, sportovi po nazivima.

---

## ⚡ Brzi start (Windows 11)

**Najlakše — instalacija:** preuzmi
**[SPT-Setup-2.5.0.exe](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/raw/main/spt/windows/release/SPT-Setup-2.5.0.exe)**,
pokreni ga i klikni *Instaliraj*. Nisu potrebna administratorska prava, a Python se instalira automatski.
SPT dobiva prečace u izborniku Start i na radnoj površini te se otvara u vlastitom prozoru.
Detalji su u [`windows/README.md`](windows/README.md).

**Ručno (s vlastitim Pythonom):**

1. Instaliraj **Python 3.10+** (https://www.python.org/downloads/) — obavezno *“Add to PATH”*
2. Dvoklik **`start_windows.bat`**
3. Aplikacija se otvara u pregledniku na `http://localhost:8000`

> Ne treba nijedna biblioteka — cijeli je sustav napisan u Pythonovoj standardnoj biblioteci
> (HTTP poslužitelj, SQLite baza, gzip) + čisti HTML/CSS/JS frontend bez ijedne vanjske ovisnosti.
> Radi potpuno **offline**.

Linux/macOS: `python3 server.py` · Port: `SPT_PORT=8080 python server.py` · Bez preglednika: `SPT_NO_BROWSER=1`
· Adresa: `SPT_HOST=127.0.0.1` (samo ovo računalo; zadano `0.0.0.0` = i uređaji u LAN-u)

Baza se sama stvara pri prvom pokretanju (determinističko sjeme `42` — svaka instalacija ima identičnu bazu).

---

## 🧭 Što aplikacija sadrži

| Modul | Opis |
|---|---|
| **📊 Nadzorna ploča** | KPI baze, prosječna spremnost, distribucija po sportovima, zadnje utakmice i aktivnosti |
| **🔴 Praćenje uživo** | Pozicije svih igrača i lopte u realnom vremenu; izbor tehnologije: **AUTO / UWB·M2M indoor / GPS / Bluetooth**; semafor, puls, baterije čipova, statistika uživo, signalni panel (Hz, latencija, gubitak paketa, sateliti/sidra) |
| **🎬 Reprodukcija 2D/3D** | Svaka sekunda utakmice (1 Hz): točkice u boji momčadi, lopta s letom parabolom, **3D kamera** (rotacija mišem + zum), tragovi, **heatmap**, vektori brzine, playback **unatrag/unaprijed** 0,25×–8×, klik na igrača → metrike do tog trenutka, izvještaj cijele utakmice |
| **📈 Analize** | Usporedba do 4 sportaša (radar percentila unutar pozicije), ljestvice po metrici sa filterima, distribucije (histogram s P10/P50/P90) |
| **🧬 Karton sportaša** | kompletan zdravstveno-performance karton: norme po dobi/poziciji s odstupanjima (zone), sastav tijela s vage, kronologija (ozljede, anomalije, vaganja), 16-tjedni prikaz opterećenja, testovi (CMJ, sprint, yo-yo, laktat), utakmice → reprodukcija, glasovni zapisi, izvoz |
| **🏢 Klubovi** | 174 kluba — **isključivo pod šiframa** `KLB-XXXX` (zemlja, razina, sport) |
| **⚽ Sportovi i mjerenja** | 75 sportova (nogomet, košarka, rukomet, veslanje, odbojka, auto-moto sport…), katalog svih 334 mjerenja po grupama |
| **🛰️ Uređaji** | 35 uređaja: Catapult, STATSports, KINEXON UWB, Inmotio, Polar, WHOOP, force plates, EMG, CGM… |
| **🔮 Simulacije** | **Rekonstrukcija unatrag** (12 tjedana opterećenja, crvene zastavice ACWR/spremnosti) + **projekcija unaprijed** (4 tjedna: opterećenje, rizik ozljede, indeks forme, pojas nesigurnosti) + **WHAT-IF** klizač ±30 % obujma |
| **🍽️ Prehrana** | dnevnik unosa vs izračunate potrebe (BMR/TDEE, makronutrijenti, hidratacija) po danu — višak/manjak, preporuke na hrvatskom |
| **🏥 Ozljede** | evidencija s uzrocima i trajanjem, statusi, matrica po dijelovima tijela, ručni unos (samo trener/kondicijski/admin) |
| **👕 SPT hardver** | katalog SPT 2.0 obitelji uređaja sa slikama i specifikacijama: Vest M1/W1, Pod S1, Watch A1, Anchor A8, Edge One, Scale B1, Strap H2 |
| **📥 Uvoz podataka** | GPX / TCX / CSV (Catapult, STATSports, Polar, Huawei, Xiaomi…) / JSON (KINEXON LPS) + automatski uvoz s vage (scale_inbox) i satova (UDP :1520) + ogledne datoteke |
| **👥 Pregled kluba** | dostupnost rostera, kolektivno opterećenje, anomalije kluba, planovi treninga s označavanjem jedinica |
| **🎙️ BioSenzor** | analiza glasa preko mikrofona (stres, umor, drhtanje), disanje (ritam, pravilnost), RR intervali srca s HRV (RMSSD/SDNN) i upozorenjima |
| **🤖 SPT AI** | asistent na prirodnom jeziku koji poznaje cijelu bazu: pretrage, usporedbe, rizik ozljede, objašnjenja metrika |
| **🌐 Višejezičnost** | korisničko sučelje na 10 jezika (hr, en, de, it, es, fr, pt, nl, pl, sl) + marketinška stranica na 24 jezika |

---

## 📡 Tehnologije praćenja (kako se spaja s čipom)

**Indoor — M2M mreža (UWB / LPS):** čip (tag) na dresu 20×/s emitira ultraširokopojasni signal;
8–16 sidra po dvorani triangulira poziciju ±10 cm i mesh mrežom je šalje do gatewaya → SPT poslužitelj.
Idealno: košarka, rukomet, futsal, hokej, odbojka.

**Outdoor — GPS/GNSS:** L1/L2 satelitski prijam 10–18 Hz, ±1–2 m. Idealno: nogomet, ragbi, atletika, biciklizam.

**BLE (Bluetooth Low Energy):** rezervni kanal za puls i IMU (4 Hz).

**AUTO:** sustav sam bira najbolji kanal (dvorana → UWB, vani → GNSS).

U demonstraciji signal **simulira poslužitelj**, ali je sučelje identično produkcijskom —
`hardware_bridge.py` sadrži `TrackingSource`/`UdpSource` (UDP JSON listener za KINEXON/Inmotio tokove)
i `CsvImporter` (uvoz Catapult/STATSports izvoza). Integracija pravog hardvera = ~30 linija po vendoru.

---

## 📏 Popis mjerenja (sažetak — puni katalog u aplikaciji)

**Kretanje (GPS/UWB):** ukupna udaljenost; udaljenosti po zonama 1–5 (hodanje → sprint);
maksimalna i prosječna brzina; broj sprinteva i sprint udaljenost; ubrzanja/usporenja > 3 m/s²;
promjene smjera; koraci.

**Kardiometrijski:** puls prosječni/maksimalni; vrijeme u zonama 3–5; HRV (RMSSD); oporavak pulsa 60 s;
VO2max procjena; potrošnja kalorija; TRIMP.

**Opterećenje i oporavak:** sRPE; PlayerLoad™ (IMU); ACWR; spremnost 0–100; san (sati + ocjena);
bolnost; raspoloženje; monotonija.

**Neuromuskularni:** broj skokova; visina skoka (max/prosjek); vrijeme doskoka; asimetrija lijevo/desno;
RSI; vrijeme kontakta pri trčanju; vertikalna oscilacija.

**Tehnički (po sportu, ~120 pokazatelja):** nogomet — dodiri, dodavanja, uspješnost dodavanja, udarci, golovi,
asistencije, driblanja, oduzimanja…; košarka — poeni, šutevi, trice, skokovi, asistencije, blokovi…;
plivanje — SWOLF, DPS, frekvencija zaveslaja, splitovi; biciklizam — snaga (W), NP, TSS, kadenca;
boks — udarci izbačeni/pogođeni; atletika — reakcija, split 30/60 m; F1 — vrijeme kruga, gas/kočenje, G-sile…

**Okolišni:** temperatura, vlažnost, nadmorska visina. **Timske analitike:** posjed, momčadski volumen, xG.

---

## ⚽ Popis sportova (75)

**Velika igrališta:** nogomet, hokej na travi, ragbi 15, ragbi 13, američki nogomet, australski nogomet,
kriket, bejzbol, softbol, lacrosse
**Dvoranski:** košarka, rukomet, odbojka, futsal, hokej na ledu, floorball (unihokej), vaterpolo
**Reket:** tenis, stolni tenis, badminton, squash, padel
**Atletika:** sprint, srednje pruge, duge pruge, maraton, skokovi, bacanja, višeboj
**Izdržljivost:** cestovni/brdski/stazni biciklizam, BMX, triatlon, orijentiring
**Vodeni:** plivanje, veslanje, kajak i kanu sprint, kajak na divljim vodama, jedrenje, surfanje, jedrenje na dasci, kitesurfing
**Zimski:** alpsko i nordijsko skijanje, skijaški skokovi, biatlon, snowboard, brzo klizanje, umjetničko klizanje, curling, bob i sankanje
**Borilački:** boks, hrvanje, judo, taekwondo, karate, MMA, kickboxing, mačevanje
**Snaga:** dizanje utega, powerlifting, CrossFit, sportska i ritmička gimnastika
**Precizni:** golf, streličarstvo, streljaštvo, kuglanje, konjički sport
**Motorički:** automobilizam (Formula), karting, motociklizam · **Individualni:** sportsko penjanje, moderni pentatlon

---

## 🗂️ Struktura projekla

```
spt/
├── server.py            # HTTP poslužitelj + API (stdlib only)
├── seed.py              # generator baze (sportaši, klubovi, sesije, utakmice)
├── matchesim.py         # simulator nogometa 11v11 i košarke 5v5 (1 Hz okviri)
├── data_catalog.py      # katalog: 75 sportova, 334 mjerenja, 35 uređaja, imena zemalja
├── hardware_bridge.py   # producijsko sučelje za stvarni hardver (UDP/CsvImporter)
├── start_windows.bat    # pokretač za Windows 11
├── windows/             # Windows instalacija: SPT-Setup-2.5.0.exe (release/), izvori i build skripta
├── spt.db               # SQLite baza (nastaje automatski; ~17 MB)
└── static/              # frontend (bez ikakvih CDN-a — radi offline)
    ├── index.html
    ├── css/style.css
    └── js/ (util, charts, pitch + 11 pogleda)
```

## 🔌 API (sažetak)

`/api/meta` · `/api/dashboard` · `/api/sports[/{id}]` · `/api/metrics` · `/api/devices` ·
`/api/countries` · `/api/clubs[/{code}]` · `/api/athletes[/{id}]` · `/api/compare?ids=` ·
`/api/leaderboard?sport=&metric=` · `/api/histogram` · `/api/matches[/{id}[/replay]]` ·
`/api/live/status` · `/api/live/frame` · `POST /api/live/config` · `/api/simulate?athlete=&extra=`

## 🔐 Privatnost

Svi su podaci **sintetski** (generirani). Klubovi su anonimizirani šiframa, imena sportaša su slučajno
generirana iz regionalnih baza imena, a identiteti ne odgovaraju stvarnim osobama.

## 🧭 Roadmap

- Uvoz stvarnih izvoza (Catapult/STATSports CSV, Kinexon JSON, Polar Team Pro)
- UDP most za live tokove (vidi `hardware_bridge.py`)
- Video AI analitika + xG modeli, izvoz PDF izvještaja, HR/EN/DE sučelje


---

## 🔑 Demo računi (ulogiraj se u gornjoj traci)

| Korisnik | PIN | Uloga |
|---|---|---|
| `admin` | `admin123` | administrator (sve + postavke) |
| `trener` | `1234` | trener (planovi, ozljede, kartoni) |
| `kondicija` | `1234` | kondicijski trener (opterećenje, prehrana, testovi) |
| `sportas` | `1234` | sportaš (vlastiti karton) |
| `skaut` | `1234` | skaut (samo čitanje) |

## 🌍 Marketinška stranica (za gnk-asg.hr)

`http://localhost:8000/marketing` — javna prezentacija SPT sustava (nogometaški primjer kartona,
dan utakmice prije/tijekom/poslije, katalog uređaja sa slikama) na **24 jezika**.
Slobodno se dodaje na javni domen — ne dira aplikaciju.

## 📡 SPT 2.0 — hardver

Na svakom uređaju stoji **SPT**: grudnjak M1 (muški) i W1 (ženski), Pod S1 (GNSS + IMU 1000 Hz + UWB, IP67),
Watch A1 (AMOLED, BYOD), Anchor A8 (UWB ±10 cm, 20 Hz, PoE), Edge One (rubni server 18k poruka/s),
Scale B1 (BIA vaga, 8 elektroda) i Strap H2 (ECG pojas s HRV-om).

---

## 🛰️ SPT 2.2 — Kontrolna soba + 50 mogućnosti

### Kontrolna soba (`#soba`)
Do **9 live ploča na jednom ekranu** (2×2 / 3×2 / 3×3) — svaka ploča je samostalan live prikaz koji biraš iz padajućeg izbornika:

tereni (sve / domaći / gosti), praćenje igrača s tragom i strelicom smjera, **heatmap uživo**, **usporedba dva igrača**
(svaki na svojoj polovini ekrana + live statistika s osvajačem), puls zone, najbrži sada, alarmi, događaji, semafor.
Zvuk na crvene alarmi, fullscreen, raspored se pamti.

### 50 mogućnosti (✅ = implementirano)

| # | Mogućnost | |
|---|---|---|
| 1 | Multi-panel live grid do 9 ploča | ✅ |
| 2 | Biranje sadržaja svake ploče | ✅ |
| 3 | Split-screen usporedba 2 igrača | ✅ |
| 4 | Live trag kretanja (trail) igrača | ✅ |
| 5 | Strelica smjera i brzine iznad igrača | ✅ |
| 6 | Live heatmap terena | ✅ |
| 7 | Info-box s metrikama praćenog igrača | ✅ |
| 8 | Prikaz samo jedne momčadi | ✅ |
| 9 | Zvučni alarm na crvene događaje | ✅ |
| 10 | Fullscreen / TV način | ✅ |
| 11 | Spremanje rasporeda ploča | ✅ |
| 12 | Live puls zone momčadi | ✅ |
| 13 | Ljestvica "najbrži sada" uživo | ✅ |
| 14 | Alarmi uživo (puls zona 5, sprintevi, baterija) | ✅ |
| 15 | Live semafor + sat | ✅ |
| 16 | Feed događaja uživo (golovi…) | ✅ |
| 17 | Komandna paleta Ctrl+K (sportaši/klubovi/ekrani) | ✅ |
| 18 | Zvono s obavijestima (anomalije/ozljede/izvještaji) | ✅ |
| 19 | Wellness jutarnji upitnik (san/bolnost/raspoloženje/energija/stres) | ✅ |
| 20 | Wellness trend graf u kartonu | ✅ |
| 21 | 7 vrsta izvještaja (sportaš/klub/spremnost/ozljede/testovi/utakmica/sastav) | ✅ |
| 22 | Tijek odobravanja izvještaja (skica → odobren/odbijen) | ✅ |
| 23 | Ispis izvještaja / spremanje kao PDF | ✅ |
| 24 | Matrica korelacija metrika (Pearson) | ✅ |
| 25 | Kalendar aktivnosti (GitHub-style, 26 tjedana) | ✅ |
| 26 | Achievementi/medalje u kartonu (sprint, km medalje, streak) | ✅ |
| 27 | Svijetla tema | ✅ |
| 28 | TV način (veliki prikaz za ekrane u svlačionici) | ✅ |
| 29 | Tipkovničke kratice + pomoć na "?" | ✅ |
| 30 | Sigurnosna kopija baze (admin, .db download) | ✅ |
| 31 | Reset/regeneracija baze (admin) | ✅ |
| 32 | Auto-restart servera u start_windows.bat | ✅ |
| 33 | Prečica na radnoj površini (SPT-prečica.bat) | ✅ |
| 34 | ACWR (akutno/kronično opterećenje) u izvještajima | ✅ |
| 35 | Rang-lista rizika ozljede po klubu | ✅ |
| 36 | Preporuke u svakom izvještaju (na temelju podataka) | ✅ |
| 37 | SPT AI asistent s cijelom bazom | ✅ |
| 38 | BioSenzor (glas/disanje/HRV) | ✅ |
| 39 | Uvoz GPX/TCX/CSV/KINEXON + vaga + satovi | ✅ |
| 40 | Automatski uvoz s vage (scale_inbox) | ✅ |
| 41 | Most za satove UDP :1520 | ✅ |
| 42 | 10 jezika sučelja + marketing na 24 jezika | ✅ |
| 43 | Live mreža ~70 000 sportaša s feedom | ✅ |
| 44 | Uloge i prava (admin/trener/kondicijski/skaut/sportaš) | ✅ |
| 45 | Karton s normama, kronologijom, testovima | ✅ |
| 46 | Reprodukcija utakmica 2D/3D unatrag/unaprijed | ✅ |
| 47 | Simulacije (rekonstrukcija + projekcija + WHAT-IF) | ✅ |
| 48 | Rasporedi na više ploča 2×2/3×2/3×3 | ✅ |
| 49 | Potpuno offline — čisti Python stdlib, nula ovisnosti | ✅ |
| 50 | Marketinška stranica za gnk-asg.hr | ✅ |

### Windows 11
- **`windows/release/SPT-Setup-2.5.0.exe`** — instalacija (bez admina, s ugrađenim Pythonom, prečaci, deinstalacija)
- `start_windows.bat` — pokreće SPT i **sam se resetira** ako padne
- `SPT-prečica.bat` — stvara prečicu na radnoj površini
- Radi offline; preglednik se sam otvara na `http://localhost:8000`

---

## ⚡ SPT 2.3 — 10× više opcija sučelja

### Postavke (⚙ u navigaciji) — središte svih opcija
| Opcija | Opis |
|---|---|
| **Tema** | auto ( prati sustav) / tamna / svijetla |
| **Veličina teksta** | S / M / L / XL — cijelo sučelje se prilagođava |
| **Gustoća tablica** | normalno / kompaktno (više redaka na ekran) |
| **Paleta** | standardna / za slijepe za boje (plavo-narančasta) |
| **Jedinice** | metričke (km · kg) / imperijalne (mi · lb · mph) |
| **Jezik** | 10 jezika |
| **TV način** | veliki prikaz za ekrane u svlačionici |

### Instalacija kao Windows aplikacija (PWA)
`manifest.webmanifest` + service worker → **Instaliraj SPT** u Postavkama ili ⊕ u adresnoj traci:
zaseban prozor bez trake, ikona u Start meniju, **radi offline** (sučelja ostaju u kešu).

### Nove mogućnosti u pregledima
- **Karton**: ⭐ favoriti · 🖨 **kartica igrača** za ispis (one-pager PDF) · **potpunost kartona %** ·
  tablica svih sesija (klik = detalji s ispisom) · **bilješke trenera** · monotonija/strain/EWMA
- **Ljestvice**: filter perioda (30/90/365 dana ili cijela povijest) + **izvoz CSV**
- **Nadzorna ploča**: ⚙ prilagodba — uključi/isključi svaku karticu, animirani brojači
- **Kontrolna soba**: **preseti** (Trener/Kondicijski/Fizioterapeut/Analitičar) + **povuci-i-ispusti** preslagivanje ploča
- **SPT hardver**: **inventar opreme** — dodjela uređaja sportašima, baterija, firmver, statusi
- **Sportaši**: redak ★ favorita i 🕑 nedavno gledanih
- Upravljanje **korisnicima i ulogama** (admin, u Postavkama)
- Toastovi s tipovima, skeletoni učitavanja, animacije prijelaza, tipkovnica (Ctrl+K, ?, F11, Ctrl+P)

### Znanost opterećenja (u kartonu i izvještajima)
- **Monotonija** = prosjek/std dev dnevnog opterećenja (rizik > 2,0)
- **Strain** = tjedno opterećenje × monotonija
- **EWMA** = eksponencijalno ugladena opterećenja (half-life 7 dana)

---

## 🧠 SPT 2.4 — Napredna analitika (8 novih analiza)

Pregled **Napredna analitika** (🧠 u navigaciji):

| Analiza | Što otkriva |
|---|---|
| **📈 Trend** | regresija metrike kroz vrijeme — napredak/pad/stabilno + % promjene + trend po tjednu |
| **📦 Po pozicijama** | box-plot P10–P90 po pozicijama — gdje je «širok» prosjek, gdje gušći |
| **🎂 Dobne krivulje** | prosjek metrike po dobnim skupinama (12–15 … 30+) + vršna dob |
| **⚬ Raspršenje** | bilo koja metrika vs bilo koja (npr. km vs max brzina, r = korelacija), hover = ime, klik = karton |
| **🎯 Konzistentnost** | CV (varijabilnost) — najstabilniji vs «boom-or-bust» igrači |
| **⚖️ Balans opterećenja** | Gini koeficijent po klubovima (28 dana) + koliko nose top-3 igrača → rizik preopterećenja |
| **🧘 Wellness vs forma** | kvaliteta sna vs spremnost — korelacija + outlayeri |
| **🚑 Teret ozljeda** | burden = izgubljeni dani / 1000 AU opterećenja po klubu → prioritet prevencije |

## 🗺 Ideje za nastavak (roadmap)

> Prijedlozi sljedećih faza — reci koje ti se sviđaju i radimo ih:

1. **AI predikcija ozljeda** — logistička regresija na ACWR + wellness + asimetriji → vjerojatnost ozljede po igraču (kao Zone7)
2. **Automatski tjedni izvještaj** — PDF na e-poštu svakog ponedjeljka (sažetak kluba + crvene zastavice)
3. **Raspored treninga (kalendar)** — drag & drop jedinica po danima, auto-računanje opterećenja tjedna
4. **Scouting soba** — usporedba kandidata vs percentil pozicije + "shortlist" liste
5. **Video sinkronizacija** — replay 2D usklađen s video snimkom utakmice
6. **Zdravstveni dosje** — alergije, pregledi, vakcine, dozvole roditelja (mlađi od 18)
7. **Rehab protokoli** — checkpoint sustav povratka (kriteriji + potpisi fizioterapeuta)
8. **Ljestvice liga** — anonimizirana benchmark usporedba klubova (gdje je moj klub jači/slabiji)
9. **Sleep tracking** — uvoz sata (san/HRV noću) → jutarnja spremnost automatski
10. **Menstrualni ciklus** — monitoring za ženske sportašice (opterećenje prilagođeno fazi)
11. **Prehrana+** — planeri obroka s receptima i auto-kalorije iz treninga
12. **Push alarmi na sat/trener** — kritični događaji u stvarnom vremenu
13. **Open API** — JSON export za istraživače/reklame
14. **3D biomehanika** — silinski pladnjevi + asymetrija lijevo/desno kroz vrijeme
15. **Cloud sinkronizacija** — više klubova, jedna baza, kontrola pristupa po šifri

---

## 🏁 SPT 2.5 — sve roadmap stavke implementirane

| Stavka | Status |
|---|---|
| 🤖 AI predikcija rizika ozljede (ACWR + wellness + asimetrija + povijest) | ✅ klub + karton |
| 📅 Tjedni pregled kluba (izvještaj za ispis) | ✅ 8. vrsta izvještaja |
| 🔭 Scouting (shortliste, ocjene ★, bilješke) | ✅ nova stranica |
| 🩺 Medicinski dosje (alergije, pregledi, vakcine, dozvole roditelja) | ✅ u kartonu |
| 🩹 Rehab/RTP protokoli (6 koraka s kriterijima + potpis fizioterapeuta) | ✅ u ozljedama |
| 🏆 Liga benchmark (percentili klubova unutar sporta) | ✅ analitika |
| 🦵 Biomehanika (GCT asimetrija lijevo/desno + CMJ serija) | ✅ analitika |
| 🍽 Planer obroka (biblioteka 22 obroka + dnevni plan vs TDEE) | ✅ prehrana |
| 🌸 Monitoring ciklusa (faze + preporuke za trening) | ✅ karton (žene) |
| 🔓 Open API (JSON export cijele baze) | ✅ postavke (admin) |
| 🖥 Instalacija na desktop | ✅ PWA + INSTALACIJA-WINDOWS.bat |

**Instalacija na Windows 11 (3 načina):**
1. **INSTALACIJA-WINDOWS.bat** — sve jednim klikom (provjera + prečica + start)
2. **PWA** — Postavke → "Instaliraj SPT" (prozor bez trake, offline, ikona u Startu)
3. **SPT-prečica.bat** — samo prečica na radnoj površini

*Sljedeća faza: javna stranica gnk-asg.hr — world-class marketing s punim SEO
(meta, OG, Twitter kartice, hashtags), autor: Nermin Sefić.*
