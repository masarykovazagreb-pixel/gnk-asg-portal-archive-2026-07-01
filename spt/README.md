# 📡 SPT — Sports Performance Tracking

**Vrhunski sustav za praćenje sportskih performansi za Windows 11** — praćenje uživo (GPS / UWB-M2M / BLE),
reprodukcija utakmica u **2D i 3D** (točkice po terenu, obje momčadi, svaki igrač), analize i usporedbe
**1 423 sportaša iz cijelog svijeta**, simulacije **unatrag i unaprijed**, katalog **75 sportova**,
**334 vrste mjerenja** i **35 uređaja**. Klubovi su pod **šiframa**, sportovi po nazivima.

---

## ⚡ Brzi start (Windows 11)

1. Instaliraj **Python 3.10+** (https://www.python.org/downloads/) — obavezno *“Add to PATH”*
2. Dvoklik **`start_windows.bat`**
3. Aplikacija se otvara u pregledniku na `http://localhost:8000`

> Ne treba nijedna biblioteka — cijeli je sustav napisan u Pythonovoj standardnoj biblioteci
> (HTTP poslužitelj, SQLite baza, gzip) + čisti HTML/CSS/JS frontend bez ijedne vanjske ovisnosti.
> Radi potpuno **offline**.

Linux/macOS: `python3 server.py` · Port: `SPT_PORT=8080 python server.py` · Bez preglednika: `SPT_NO_BROWSER=1`

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
