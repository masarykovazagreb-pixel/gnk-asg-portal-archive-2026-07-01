# GNEW PORTAL – INDEX / THE CODE / 9

## Canva dizajn, frontend/backend povezivanje i završetak index stranice

### Status i granice

Repozitorij: `beckuphome-gnk/gnk-asg-portal`  
Glavna grana: `main`  
Radni branch: `fix/index-canva-final-contract`

Cilj je završiti javni index kao korporativni operating portal, uskladiti HR i EN verziju, povezati postojeće backend/data slojeve i pripremiti kontrolirani preview/deploy review.

Ne raditi:

- ne pokretati produkcijski deploy bez izričite naredbe;
- ne dirati DNS, Cloudflare routes, secrets ni production bindings;
- ne slati mailove;
- ne aktivirati kampanje, bulk slanje, auto-outreach ni scheduled outreach;
- ne koristiti stari workflow `Deploy GNK ASG production`;
- ne tvrditi da je produkcija deployana dok live domena to ne pokaže.

Dopušten workflow za produkcijski deploy, tek nakon odobrenja:

`Deploy Admin Auth V6`

Confirm input:

`DEPLOY_ADMIN_AUTH_V6`

---

## 1. Glavni problem

Index stranica mora prestati izgledati kao privremeni landing page. Mora postati ozbiljan javni korporativni portal koji na jednom mjestu prikazuje:

1. GNK ASG d.o.o.;
2. GNK DINAMO Ltd. Group;
3. financijske pokazatelje;
4. PDF dokazne izvore;
5. THE CODE / 9;
6. projekte;
7. objave i vijesti;
8. medijsku prijavu;
9. digital workforce / worker-location mapu;
10. javni operativni pregled;
11. zaštićeni admin/operator ulaz, bez izlaganja privatnih funkcija javnosti.

Brutalna istina: ako HR i EN nisu jednake po logici, strukturi i snazi, portal izgleda nedovršeno. EN ne smije biti stari portal, HR ne smije biti kratki shell. Obje verzije moraju imati isti koncept, a razlikovati se samo po jeziku.

---

## 2. Canva cilj

Canva se koristi kao dizajnerski blueprint, ne kao finalni tehnički runtime.

Canva treba proizvesti:

- vizualnu strukturu indexa;
- raspored sekcija;
- brand stil;
- tipografsku hijerarhiju;
- kartice, tickere, CTA gumbe;
- mobilni i desktop mockup;
- export vizualnih elemenata koji nisu tekstualni runtime;
- smjernice za CSS implementaciju.

Canva ne smije proizvoditi finalni HTML kao sliku. Tekst, linkovi, iframe, backend podaci i API pozivi moraju ostati u kodu.

---

## 3. Canva artboards

Minimalno 6 Canva stranica:

1. `INDEX_HR_DESKTOP_FINAL` — desktop HR, 1440 px širina.
2. `INDEX_EN_DESKTOP_FINAL` — desktop EN, ista struktura kao HR.
3. `INDEX_HR_MOBILE_FINAL` — mobile HR, 390 px širina.
4. `INDEX_EN_MOBILE_FINAL` — mobile EN, ista struktura kao mobile HR.
5. `INDEX_COMPONENTS` — primary/secondary button, finance card, route card, news card, PDF card, protected admin card, ticker chip, section heading, iframe placeholder, alert badge, data-source badge.
6. `INDEX_DEV_HANDOFF` — boje, fontovi, spacing, breakpoints, nazivi sekcija, linkovi, rute, data izvori i export pravila.

---

## 4. Vizualni stil

### Boje

- Background: `#02040A`, `#07101F`, `#04070D`
- Gold: `#F3CC62`, `#FFE08A`, `#BD8A2B`
- Tekst: `#F8FAFC`
- Muted tekst: `#B8C3D6`, `#A9B5C8`
- Panel: `rgba(5,8,14,.96)`, `rgba(17,28,48,.96)`
- Border: `rgba(243,204,98,.24)`, `rgba(255,255,255,.12)`

### Stil

Smjer: dark corporate finance, luxury dashboard, Bloomberg/market desk osjećaj, ozbiljno, premium, ali ne kič. Sve mora izgledati kao financijski i operativni portal, ne kao obična web brošura.

### Tipografija

- Naslovi: serif stil, npr. Georgia ili sličan Canva serif.
- Body: Inter / Arial / sans-serif.

---

## 5. Finalna struktura index stranice

### Header

- GNK ASG d.o.o. logo;
- GNK DINAMO Ltd. Group logo;
- naziv `GNK ASG d.o.o. · GNK DINAMO Ltd. Group`;
- podnaslov `Finance · THE CODE · Media · Operations`;
- navigacija: Financije, Objave, Vijesti, THE CODE, Mediji, Dokumenti, EN/HR, Zaštićeni ulaz.

Admin link mora biti jasan, ali ne smije sugerirati javni pristup.

### Hero

HR naslov: `Financije, projekti i objave u formi poslovnog tržišnog portala.`

HR lead: `Javni dio portala objedinjuje financijske pokazatelje, dokumente, objave, vijesti, THE CODE i medijsku prijavu. Operativni alati ostaju odvojeni u zaštićenom administratorskom centru.`

EN naslov: `Financials, projects and posts in a business market portal format.`

EN lead: `The public layer brings together financial indicators, documents, posts, news, THE CODE and media registration. Operating tools remain separated in the protected administration center.`

CTA: Financijski sažetak / THE CODE / Medijska prijava / Dokumenti.

### Financial ticker

HR: `GNK ASG — 504,00 mil. €`, `Aktiva — 46,40 mil. €`, `Kapital — 46,21 mil. €`, `Group — 4,7046 mlrd. €`, `Dobit — 982,48 mil. €`, `THE CODE — 9 projekata`.

EN: `GNK ASG — €504.00M`, `Assets — €46.40M`, `Equity — €46.21M`, `Group — €4.7046B`, `Profit — €982.48M`, `THE CODE — 9 projects`.

### Financial board

Kartice:

1. GNK ASG d.o.o. — ukupni prihodi;
2. GNK ASG d.o.o. — ukupna aktiva;
3. GNK ASG d.o.o. — kapital i rezerve;
4. GNK ASG d.o.o. — dobit razdoblja;
5. GNK DINAMO Ltd. Group — konsolidirani prihodi;
6. GNK DINAMO Ltd. Group — ukupna imovina grupe;
7. GNK DINAMO Ltd. Group — neto dobit grupe;
8. GNK DINAMO Ltd. Group — omjer kapitala.

Uz svaku karticu mora postojati data-source oznaka: `PDF source / public financial summary`.

### PDF Evidence

CTA kartice: GNK ASG d.o.o. financial statements, GNK DINAMO Ltd. Group consolidated report, THE CODE memorandum, Media kit, Corporate documents, Downloads.

Ako dokument ne postoji na ruti, kartica vodi na `/downloads/`, ne na mrtav link.

### THE CODE / 9

Sekcija mora imati veliki naslov `THE CODE / 9`, opis, iframe preview za `/the-code/?embed=1`, CTA `Otvori THE CODE` i CTA za Media Application. THE CODE nije obična mala kartica, nego centralni narativni element.

### Public Desk

Svrha: prikazati da portal nije statična brošura nego operativni javni desk.

Data izvori:

- `/data/public-operational-feed.json`
- `/data/public-conclusions.json`
- `/data/worker-results-3h.json`

Fallback:

- `Financijska naslovnica dobiva tržišnu strukturu u GNK bojama.`
- `Zadržani su financije, portal, objave, THE CODE, mediji i javne rute.`
- `PDF dokumenti ostaju dostupni kroz postojeće rute.`

### Objave i vijesti

Rute: `/objave/`, `/vijesti/`. Na indexu samo preview, bez automatskog objavljivanja iz admina bez kontrole.

### Media Application

Rute:

- HR: `/media-application/?lang=hr`
- EN: `/media-application/?lang=en`

Ako backend endpoint za slanje nije potvrđen, forma ostaje intake/preview bez slanja.

### Digital Workforce Map

Javno prikazati:

- 1.537 profila;
- 33 primarne lokacije;
- 12 proširenih lokacija;
- ukupno 45 lokacija.

Data izvori:

- `/assets/js/digital-workforce-directory-v1.js`
- `/assets/js/digital-workforce-company-layer-v1.js`
- eventualni JSON u `/data/`.

Fallback: `1.537 profila · 45 lokacija · javni pregled u pripremi`.

### Protected Admin / Operator Entry

Javno se smije prikazati samo ulaz, ne sadržaj.

Linkovi:

- `/admin-center/`
- `/operator-dashboard/`
- `/mail-studio/`
- `/auto-editor/`

Tekst: `Pristup je ograničen na autorizirane operatore. Token i sesija nisu dio javnog indexa.`

Ne prikazivati token, mail funkcije, campaign funkcije, bulk funkcije, test-send gumbe, private logs, secrets ili Cloudflare konfiguraciju.

---

## 6. Frontend implementacija

Glavne datoteke:

- `apps/portal/index.html`
- `apps/portal/en/index.html`
- `apps/portal/assets/gallery-bootstrap.js`
- `apps/portal/assets/backend-ui-shell.js`
- `apps/portal/assets/backend-ui-shell.css`
- `apps/portal/assets/backend-grid-alignment-v4.css`

Canva dizajn se ne kopira kao slika. Iz Canve se preuzima raspored, boje, spacing, sekcije, komponentna logika i eventualno dekorativni SVG/PNG elementi. U kodu ostaju HTML tekst, linkovi, iframe, JSON fetch, backend auth, responsive CSS, accessibility oznake i SEO meta.

HR/EN parity je obavezna: isti broj sekcija, isti redoslijed, isti CTA sustav, isti data izvori, isti protected/admin separation, isti THE CODE blok, isti media application blok, isti PDF blok. Razlika smije biti samo jezik i lokalizacija brojki.

---

## 7. Backend i API povezivanje

Zaštićene UI rute:

- `/admin-center/`
- `/operator-dashboard/`
- `/operator-mobile/`
- `/mail-studio/`
- `/mail-studio-pro/`
- `/auto-editor/`

Frontend shell mora prikazati login token polje samo na zaštićenim rutama, čuvati token u `sessionStorage`, ukloniti legacy `localStorage` token, slati `authorization: Bearer <token>` i `x-operator-token: <token>`, te odjaviti preko `/operator/session/logout`.

Zaštićeni API endpointi moraju bez tokena vratiti 401, ne smiju slati mail, ne smiju mijenjati stanje i ne smiju prikazivati privatne podatke.

Public data endpointi koje index smije javno čitati:

- `/data/portal-version.json`
- `/data/group-entities-project-business.json`
- `/data/worker-results-3h.json`
- `/data/public-operational-feed.json`
- `/data/public-conclusions.json`
- `/assets/js/digital-workforce-directory-v1.js`
- `/assets/js/digital-workforce-company-layer-v1.js`

Ako endpoint ne postoji ili padne, index ne smije puknuti; mora se prikazati fallback kartica.

Mail Studio ne smije biti dio javnog indexa kao funkcija slanja. Na javnom indexu smije postojati samo protected entry link.

---

## 8. Acceptance checklist

Vizual:

- HR izgleda jednako snažno kao EN;
- EN nije ostao stari portal;
- Canva dizajn je prenesen u CSS/HTML;
- desktop izgleda kao financijski portal;
- mobile nije zbijen;
- logo nije deformiran;
- zlatna boja nije preagresivna;
- THE CODE ima centralnu poziciju;
- media application je vidljiva;
- documents/PDF sekcija je jasna.

Linkovi za provjeru:

- `/`
- `/en/`
- `/finance-daily/`
- `/downloads/`
- `/the-code/`
- `/the-code/?embed=1`
- `/media-application/?lang=hr`
- `/media-application/?lang=en`
- `/objave/`
- `/vijesti/`
- `/contact/`
- `/digital-workforce/directory/`
- `/admin-center/`
- `/operator-dashboard/`
- `/mail-studio/`
- `/auto-editor/`

Auth:

- bez tokena admin rute traže login;
- s tokenom se admin otključava;
- odjava briše session;
- token nije u URL-u;
- token nije u localStorage;
- protected API bez tokena vraća 401;
- public index ne traži token.

Mail sigurnost:

- nema javnog mail slanja;
- nema auto campaign;
- nema bulk;
- nema scheduled outreach;
- nema test-send aktivacije;
- mail flags ostaju false.

---

## 9. GitHub radni plan

Branch: `fix/index-canva-final-contract`

PR naslov:

`fix(index): final Canva contract and public/backend parity`

PR body mora navesti HR/EN parity, Canva handoff, backend/data mapping, protected admin separation, no production deploy, no DNS/Cloudflare route changes, no secrets, no mail sent, no campaign/bulk/scheduled outreach.

---

## 10. Deployment decision gates

Deploy se ne smije pokretati dok nije sve zeleno:

1. PR review završen.
2. HR i EN manual preview potvrđeni.
3. Smoke test zelen.
4. `node --check` zelen za relevantne JS datoteke.
5. Mail/campaign flags potvrđeni false.
6. Nema DNS/route/secrets promjena.
7. Korisnik izričito odobri deploy.
8. Pokreće se samo `Deploy Admin Auth V6`.
9. Confirm input: `DEPLOY_ADMIN_AUTH_V6`.

---

## 11. Definicija gotovog indexa

Index je gotov tek kada HR i EN izgledaju kao ista platforma, javni korisnik odmah razumije GNK ASG, GNK DINAMO Ltd. Group, financije, dokumente, THE CODE i medijsku prijavu, backend podaci se prikazuju javno gdje smiju, admin ostaje odvojen i zaštićen, mail funkcije nisu javno dostupne, fallback radi ako JSON zakaže, mobile izgleda ozbiljno, sve glavne rute rade i nema lažnog deploy statusa.

Kratko: index mora izgledati kao financijsko-operativni portal, ne kao landing stranica.
