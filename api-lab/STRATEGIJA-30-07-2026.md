# STRATEGIJA — gnk-asg.hr
## Pripremljeno 29.07.2026. za rad 30.07.2026.
**Ništa od ovoga nije objavljeno. Sve stoji na grani `api-lab`.**

---

## 1. ŠTO JE DANAS UTVRĐENO

### Radi i potvrđeno je
- **34 izvora bez ključa** prolaze iz preglednika, s CORS-om
- **Pexels** radi s ključem — rješava slike uz komentare i objave, legalno, uz atribuciju
- **RSS2JSON** dokazao da slike **već postoje** u RSS feedovima, u polju `enclosure`
- Testna stranica živi na `/preuzimanja/api-lab/` i `/preuzimanja/api-lab-v6/`

### Ne radi, i zna se zašto
- **FRED** — ključ je ispravan, ali servis ne šalje CORS. Mora kroz Worker.
- **OpenSanctions, OkSurf, Noozra** — pali; endpointi traže provjeru u dokumentaciji
- **serpstack, Openverse** — ključ još nije izvađen

### Tri nalaza koja su važnija od svih API-ja
1. **AKTUAL se puni krivom skriptom.** Workflow `news-refresh.yml` pokreće
   `apps/portal/scripts/refresh_news_policy.py`, koja ima **3 izvora**.
   U repozitoriju stoje `scripts/gnk-news-refresh.mjs` (53 izvora) i
   `scripts/refresh-public-news-v4.mjs` — **nijedna nije vezana ni uz jedan workflow**.
   Ovo je uzrok svega što je smetalo: jedan izvor dominira, ponavljanja, malo izbora.
2. **Tri Workera nemaju rutu u konfiguraciji** — `direct-operator`,
   `mail-center-worker`, `operator-center`. Ako rade, vezani su ručno u Cloudflareu,
   izvan repozitorija.
3. **`gnk-asg-editorial-center` ne postoji u repozitoriju.** Ni mapa, ni konfiguracija.
   (Tuđi posao, ali visi nad svime.)

---

## 2. REDOSLIJED ZA SUTRA

### Prvo — MAIL (ujutro, ~3 h kalendarski, 75 min tvog rada)
Sve je razrađeno u `MAIL-SETUP-gnk-asg.md`. Ukratko:
- Zoho Mail Lite, EU datacentar, **3 licence**: `it@`, `info@`, `office@`
- Postojeće `legal@` i `ubo@` postaju aliasi na `office@` — **imena se ne mijenjaju**
- **DKIM prije MX-a** jer je DMARC već na `p=quarantine`
- SPF i DMARC se **uređuju**, ne dodaju
- Trošak ~36 USD/god

**Blokira te samo jedno:** screenshot `Cloudflare → Email → Email Routing → Routing rules`.

Zašto prvo mail: sve što šalje obavijesti — bot, monitoring žigova, compliance
provjere — ovisi o SMTP-u koji sutra nastaje.

### Drugo — SKRIPTA ZA VIJESTI
Prije bilo kakvog preslagivanja stranica. Otvoriti `refresh_news_policy.py`,
vidjeti koja su ta tri izvora i zašto je ostala na tri, pa u nju prenijeti
bogatiji popis. **Ne dirati dizajn.**

Tek kad ta skripta vraća 100+ stavki iz 40+ izvora, magazin ima sirovinu.

### Treće — MAGAZIN AKTUAL
Rubrike, redoslijedom izrade:
| Rubrika | Izvor | Stanje |
|---|---|---|
| Svijet | RSS kroz našu skriptu | čeka korak 2 |
| Regije (Indija, Azija, Afrika, LatAm) | RSS + 13 pripremljenih feedova | čeka korak 2 |
| Znanost i društvo | Wikinews + Nobel, 4–5 rotirajućih + link | **spremno** |
| Tehnologija | Spaceflight News + HN Algolia | **spremno** |
| Kuhinja | `/world-table/` (789 recepata) + Open Food Facts | **spremno** |
| Tržišta | Frankfurter, currency-api, VATComply, World Bank, Econdb | **spremno** |

Tehnologija i artikli iz trgovine **ostaju pod Tržište**, ne sele u magazin.

**Metoda:** nova rubrika se gradi **uz** postojeći AKTUAL, ne umjesto njega.
Dvije verzije žive paralelno dok se nova ne pokaže ispravnom. Tek onda zamjena.

### Četvrto — GALERIJA SLIKA
Pexels je potvrđen. Skripta pretraži po temi, spremi **sliku zajedno s licencom
i autorom**, komentari je povlače odatle. Atribucija se ispisuje automatski —
to je uvjet licence, ne izbor.

**Ne preuzimati slike iz RSS feedova za vlastite tekstove.** To su press
fotografije u tuđem vlasništvu. Prikaz na kartici koja vodi na njihov članak
je u redu; korištenje uz naš tekst nije.

### Peto — WORKERI
Raščistiti ona tri bez rute. Dok konfiguracija i produkcija ne govore isto,
svaki sljedeći deploy je nagađanje.

---

## 3. KAKO SE RJEŠAVAJU KLJUČEVI

Test danas je podijelio izvore u dvije skupine:

**Idu izravno iz preglednika** — sve što je pozelenilo bez ključa, plus Pexels.
Najjeftinije: nema servera, nema ključa u kodu.

**Moraju kroz Cloudflare Worker** — FRED i svaki izvor bez CORS-a, plus svaki
čiji ključ ne smije biti javan. Worker drži ključ na serveru, stranica zove
našu adresu tipa `/api/makro`. Isti obrazac kao mail secreti.

**Pravilo:** nijedan ključ nikad ne ide u HTML. `/preuzimanja/api-lab/` je javna
stranica; polje za ključ postoji samo za testiranje i ključ ostaje u pregledniku.

---

## 4. PRAVILA KOJA OSTAJU NA SNAZI

- Ništa se ne preuzima u repozitorij — izvori se **prikazuju**, ne skladište
- Nijedna rubrika se ne dohvaća dok korisnik ne doscrolla do nje
- Timeout 4 s; izvor koji zakasni ili padne — rubrika se sakrije, stranica ostaje ista
- Nijedan izvor ne smije zauzeti više od 2 kartice u istom prikazu
- Članak bez slike ne ulazi
- 4 kartice po redu, 100+ objavljenih stavki
- Ne uzimati API koji duplicira ono što već imamo
- Restore point prije svake izmjene naslovnice ili produkcije

---

## 5. ŠTO STOJI SPREMNO NA GRANI `api-lab`

| Datoteka | Što je |
|---|---|
| `api-registry.json` | Registar v1 — osnovni izvori |
| `api-registry-global.json` | v2 — Azija, Afrika, Indija |
| `api-registry-svijet.json` | v3 — ostali kontinenti |
| `api-svi-izvori.json` | Spojeno, 67 izvora |
| `novi-kandidati.json` | 193 nova kandidata iz automatskog otkrivanja |
| `kandidati-s-kljucem.json` | 98 kandidata s besplatnim ključem |
| `test_svi.py` | Serverski test svih izvora |
| `otkrij-nove-api.py` | Automatsko otkrivanje novih izvora |
| `provjera-workera.py` | Provjera Workera iz konfiguracije, ne pogađanjem |
| `worker-inventar.md` | Inventar 14 Workera i njihovih ruta |
| `api-loader.js` | Klijentski loader — lijeno učitavanje, tihi pad |

---

## 6. OTVORENO, ZA KASNIJE

- Sustav brojeva predmeta i praćenja pošte (skica dogovorena, čeka mail)
- Monitoring žigova — Markbase + markerapi, dnevna razlika na `legal@`
- OpenSanctions za provjeru protustranke na `ubo@` — endpoint treba provjeriti
- Migracija na drugi repozitorij, kad se potroši preostali kredit
- Poništiti GitHub token i ključeve koji su prošli kroz razgovor
