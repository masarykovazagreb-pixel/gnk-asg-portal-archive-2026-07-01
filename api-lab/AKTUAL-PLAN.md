# AKTUAL MEDIA — plan magazina
## Kategorije, potkategorije i preslagivanje

Ovo je plan, ništa od navedenog nije napravljeno niti objavljeno.
Priprema ide na `api-lab`; svaka faza ide u produkciju tek s odobrenjem.

---

## 1. IDEJA U JEDNOJ REČENICI

AKTUAL MEDIA prestaje biti agregator vijesti i postaje magazin grupe —
jedno mjesto za sve što se čita, a Tržište ostaje mjesto za ono što se
koristi (tečajevi, dionice, artikli, tehnički alati).

Razlika: AKTUAL se **čita**, Tržište se **provjerava**.

---

## 2. STRUKTURA — KATEGORIJE I POTKATEGORIJE

### 01 — SVIJET
Glavna rubrika, dnevne i brze vijesti, najveći prostor na stranici.
- **Svjetska politika i gospodarstvo** — RSS iz DW, UN News, Guardian
- **Europa** — poljski, portugalski i drugi europski otvoreni podaci + RSS
- **Brze vijesti** — traka od 8-10 najnovijih naslova, osvježava se najčešće

### 02 — REGIJE
Ono što nas razlikuje od svakog hrvatskog portala. Svaka regija zasebna traka,
ne miješano.
- **Indija** — poslovne vijesti (Economic Times, Business Standard, Livemint) +
  Indian Mutual Fund pokazatelji uz vijesti
- **Azija** — Nikkei Asia, Japan Times, Channel News Asia, SCMP
- **Afrika** — AllAfrica Business, Nairametrics, The East African
- **Latinska Amerika** — Agencia Brasil + Brazil pokazatelji (IBGE)
- **Bliski istok** — Arab News Business
- (Pakistan: nema poseban izvor, ide preko globalnih vijesti filtriranih po zemlji
  — vidi ograničenje u registru izvora)

### 03 — ZNANOST I DRUŠTVO
Mirna rubrika, rijetko se mijenja, jeftina za održavanje.
- **Stop tiska** — Wikinews, 4-5 rotirajućih naslova + link na punu listu
- **Nobel** — zadnji dobitnici, isti format rotacije
- **Otkrića** — GBIF (bioraznolikost), zanimljivosti

### 04 — TEHNOLOGIJA I SVEMIR
- **Svemir** — Spaceflight News (jedini izvor koji ima i slike bez ograničenja)
- **Razvoj i AI** — HN Algolia, kurirano

### 05 — KUHINJA
Vlastita prednost koju ne treba tražiti izvana.
- **Recepti** — izravna veza na `/world-table/`, 789 recepata sa slikama
- **Prehrambeni proizvodi** — Open Food Facts, po regijama (japanski, indijski...)
- **Tjedni izbor** — 4-5 recepata iz knjige, rotira tjedno

### 06 — TRŽIŠTA (unutar AKTUAL-a, ali sažeto)
Samo naslovni pokazatelji, ne detaljna analitika — to ostaje na Tržištu.
- **Tečajevi** — Frankfurter, currency-api, VATComply
- **Makro po zemljama** — World Bank, Econdb (BDP, inflacija za regije od interesa)

---

## 3. ŠTO OSTAJE NA TRŽIŠTU (ne seli)

- Tehnički artikli i alati za web shop
- Detaljni burzovni podaci, ako se uvedu (MarketAux, DexPaprika)
- Zigovi, sudski registri, compliance — to je poseban sustav, ne magazin
- IBAN/SWIFT provjera, cijene goriva, logistika

Kriterij razdvajanja: **ako se čita zbog razumijevanja svijeta → AKTUAL.
Ako se koristi za provjeru ili transakciju → Tržište.**

---

## 4. PRESLAGIVANJE — ODAKLE DOKLE

| Sadržaj | Danas | Nakon preslagivanja |
|---|---|---|
| RSS vijesti | `gnk-asg.hr/gnk-aktual/`, puni se s 3 izvora kroz `refresh_news_policy.py` | Ista adresa, ali puni se s 40+ izvora kroz popravljenu skriptu, raspoređeno po rubrikama 01-04 |
| Recepti | `/world-table/`, zaseban odjeljak, nije povezan s AKTUAL-om | Ostaju na `/world-table/` kao izvor istine; AKTUAL prikazuje tjedni izbor od 4-5 s poveznicom natrag |
| Tehnologija | Miješano unutar AKTUAL RSS feeda, bez razdvajanja | Izdvaja se u rubriku 04, ili ostaje na Tržištu — odluka na tebi u fazi 3 |
| Tečajevi/makro | Ne postoji na AKTUAL-u, samo na Tržištu (ako uopće postoji prikaz) | Sažeti prikaz dolazi u rubriku 06, detaljno ostaje na Tržištu |
| Wikinews/Nobel | Ne postoji nigdje | Nova rubrika 03, format: 4-5 rotirajućih + link |
| Regionalne vijesti (Indija, Azija, Afrika...) | Ne postoje nigdje na stranici | Nova rubrika 02, gradi se od nule |
| Slike uz komentare/objave | Generirane, ocijenjene kao slabe | Prelaze na Pexels + galerija sa slobodnom licencom (posebna nit rada, ne dio ovog plana) |

**Ništa se ne briše.** `/world-table/` i Tržište zadržavaju svoju adresu i ulogu;
AKTUAL samo dobiva poveznice prema njima gdje ima smisla.

---

## 5. FAZE RADA

### Faza 0 — preduvjet (blokira sve ostalo)
Popraviti `news-refresh.yml` da poziva pravu skriptu s 40+ izvora umjesto one
s 3 izvora. Bez ovoga nijedna rubrika osim 03, 04 i 06 nema sirovinu.

### Faza 1 — kostur stranice
Nova struktura rubrika 01-06, prazna ili s tek jednim-dva izvora po rubrici,
**objavljena usporedno sa starim AKTUAL-om** (druga adresa ili iza zastavice),
da se vidi izgled i brzina prije zamjene.

### Faza 2 — puni izvori
Dodavanje svih regionalnih i tematskih izvora u svaku rubriku, testiranje
brzine učitavanja pod pravim opterećenjem.

### Faza 3 — odluka o tehnologiji
Zajednička odluka: ide li rubrika 04 u AKTUAL ili ostaje isključivo na Tržištu.
Ovo je jedino mjesto u planu gdje trebam tvoju odluku prije nastavka.

### Faza 4 — zamjena
Stari AKTUAL se gasi, novi preuzima adresu `/gnk-aktual/`. Restore point prije
ovog koraka, po istom obrascu kao kod naslovnice.

### Faza 5 — čišćenje
Filtriranje lifestyle/recipe članaka koji cure u poslovne feedove (stara
stavka koja je zapela) — s regionalnim izvorima ovo postaje važnije, ne manje.

---

## 6. PRAVILA KOJA VRIJEDE KROZ SVE FAZE

- Nijedna rubrika se ne dohvaća dok korisnik ne doscrolla do nje
- Izvor koji zakasni ili padne — rubrika se sakrije, stranica ostaje ista
- Nijedan izvor ne smije zauzeti više od 2 kartice u istom prikazu
- Članak bez slike ne ulazi, osim rubrika 03 (Wikinews/Nobel) gdje slika nije bitna
- Deduplikacija po sličnosti naslova, ne po URL-u
- Restore point prije svake produkcijske zamjene
- Ništa se ne preuzima u repozitorij trajno — izvori se prikazuju uživo ili
  keširaju kratkoročno, nikad se ne skladište kao arhiva

---

## 7. OTVORENO ZA TVOJU ODLUKU

1. Ide li Tehnologija (04) u AKTUAL ili ostaje isključivo na Tržištu
2. Redoslijed regija u rubrici 02 — je li Indija uvijek prva, ili se rotira
3. Treba li Kuhinja (05) prikazivati i vanjske recepte, ili isključivo iz
   `/world-table/`
4. Hoće li tjedni/dnevni ritam (koji si spomenuo) biti vizualno označen —
   npr. traka "Danas" odvojena od "Ovaj tjedan"
