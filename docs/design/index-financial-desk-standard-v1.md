# GNK ASG Index Financial Desk — standard v1

## Svrha

Prva stranica je javni financijsko-poslovni portal za GNK ASG d.o.o., GNK DINAMO Ltd. Group, GNEW Portal i THE CODE / 9. Dizajn smije koristiti strukturu poslovnog/market portala, ali ne smije kopirati nijedan tuđi brand ili UI 1:1.

## Vizualni smjer

- Tamna pozadina.
- GNK zlatna i tamnoplava paleta.
- Financijski ticker ispod headera.
- Veliki editorial/financial hero.
- Sažeti financijski pokazatelji.
- Portal prozor s javnim rutama.
- Javni desk za objave i operativni pregled.
- THE CODE kao zasebna premium sekcija.
- Operativni backend sažetak, ne tehnički dump.

## Boje

```css
--gnk-bg: #04070d;
--gnk-bg2: #07111f;
--gnk-panel: #0b1424;
--gnk-panel2: #111c30;
--gnk-gold: #f3cc62;
--gnk-gold2: #ffe8a0;
--gnk-text: #f8fafc;
--gnk-muted: #a9b5c8;
--gnk-line: rgba(243,204,98,.24);
```

## Font

```css
body { font-family: Inter, Arial, sans-serif; }
h1, h2 { font-family: Georgia, "Times New Roman", serif; }
```

## Obvezne sekcije prve stranice

1. Header: GNK ASG d.o.o., GNK DINAMO Ltd. Group, Portal, Financije, Objave, Vijesti, THE CODE, Mediji, Administracija, EN/HR.
2. Ticker: GNK ASG, Aktiva, Kapital, Group, Dobit, THE CODE.
3. Hero: financije, projekti i objave u formi poslovnog tržišnog portala.
4. Financijski sažetak: GNK ASG d.o.o. i GNK DINAMO Ltd. Group.
5. Portal prozor: Objave, Vijesti, Tržište, Kontakt, GNK-KOD prikaz.
6. Javni desk: SADA, FINANCIJE, THE CODE.
7. THE CODE: iframe `/the-code/?embed=1` i gumbi za THE CODE, medijsku prijavu i PDF dokumente.
8. Javne rute: downloads, objave, vijesti, kontakt, media application, admin, gnew portal.
9. Operativni sažetak: 1.537 profila, 45 lokacija, 9 projekata, 8 zadataka.

## Backend/data contract

### Digital Workforce

Izvori:

```text
/assets/js/digital-workforce-directory-v1.js
/assets/js/digital-workforce-company-layer-v1.js
```

Na indexu prikazati samo sažetak:

- 1.537 profila
- 45 lokacija
- 43 operativna društva
- 27 funkcija

Puni prikaz:

```text
/digital-workforce/directory/
```

### THE CODE / 9

Izvor:

```text
/data/group-entities-project-business.json
```

Na indexu prikazati:

- 9 projektnih sektora
- projektni status
- worker
- sljedeći korak
- governance/public rule

Rute:

```text
/the-code/
/project-business/
/gnew-portal/
```

Embed:

```html
<iframe src="/the-code/?embed=1" title="THE CODE"></iframe>
```

### Worker board

Izvor:

```text
/data/worker-results-3h.json
```

Na indexu:

- 8 zadataka
- zadatak
- rezultat
- sljedeći korak

Ne prikazivati sirovu tehničku tablicu na naslovnici.

### Public feed

Izvori:

```text
/data/public-operational-feed.json
/data/public-conclusions.json
```

Prikazati kao javni desk, ne kao JSON dump.

## Pravila

- Ne miješati HR i EN na hrvatskoj verziji.
- Ne uklanjati postojeće sekcije.
- Ne koristiti bijelu ili agresivno crvenu pozadinu.
- Ne kopirati Bloomberg ili drugi portal 1:1.
- Svi dinamički blokovi moraju imati fallback.
- Produkcijski deploy nije dio ovog standarda.
