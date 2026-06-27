# GNK ASG početna — autorizacija vizuala

Datum: 27. lipnja 2026.  
Status: nijedan vizual nije odobren za produkciju.

## Pravilo

Na početnoj se ne smije prikazati fotografija, poster ili URL pozadina bez izričitog odobrenja točno određenog asseta i pozicije. Odobrenje jednog vizuala ne vrijedi za drugu poziciju, drugi crop ili novu verziju iste slike.

## HOME-HERO-01

- **Točna pozicija:** prvi ekran početne, desna strana hero sekcije `.hero-visual`; na mobitelu neposredno ispod glavnog naslova i tipki.
- **Funkcija:** prvi premium dojam kompanijske grupe; globalno poslovanje, tehnologija, podaci i međunarodna mreža.
- **Motiv:** fotorealističan suvremeni globalni operativni centar ili arhitektonski poslovni prostor s diskretnim prikazom svijeta i mrežnih točaka; bez vidljivih tuđih brendova.
- **Kompozicija:** glavni detalj u desnoj polovici; lijeva trećina mirnija zbog prijelaza prema tekstu.
- **Master:** 3200 × 2200 px, minimalno 2400 px širine.
- **Mobilna verzija:** zaseban crop 2160 × 2700 px.
- **Nije dopušteno:** nogomet, stadion, dresovi, navijači, svemirski brodovi, lažni logotipi, neprirodni ljudi, čitljiv nasumičan tekst.
- **Status:** ČEKA ODOBRENJE.

## HOME-FEATURED-02

- **Točna pozicija:** velika lijeva kartica u sekciji “Featured Intelligence”, selektor `.featured`; slika je pozadina ispod naslova odabrane korporativne informacije ili videa.
- **Funkcija:** naglasiti jednu najvažniju poslovnu, tehnološku ili korporativnu objavu.
- **Motiv:** fotorealističan New York / međunarodni financijski i tehnološki centar u plavom satu, premium ali realističan; bez turističkog kiča.
- **Kompozicija:** vizualni fokus lijevo; donja i desna zona moraju ostati dovoljno mirne za naslov, sažetak i tipku.
- **Master:** 3000 × 1800 px.
- **Mobilna verzija:** 2160 × 1800 px s centralnim fokusom.
- **Nije dopušteno:** slučajne burzovne brojke, kriptovalutni logotipi, izmišljeni natpisi, politički slogani, tuđi zaštitni znakovi.
- **Status:** ČEKA ODOBRENJE.

## HOME-NETWORK-03

- **Točna pozicija:** kartica “Mreža grupe”, unutar `.world-map`, iznad brojki 33 / 12 / 45.
- **Funkcija:** vizualizirati međunarodnu prisutnost i planirano širenje bez stvaranja dojma da je riječ o turističkoj stranici.
- **Motiv:** fotorealistična Zemlja noću iz orbite, s Europom, Atlantikom, Afrikom i dijelom Amerika u kadru; diskretne zlatne veze i točke.
- **Kompozicija:** bez teksta unutar slike; centralni prostor čitljiv i bez prejakih svjetala.
- **Master:** 2400 × 1600 px.
- **Mobilna verzija:** 1800 × 1600 px.
- **Nije dopušteno:** netočne državne granice, zastave, nogometni grbovi, pretjerani neon, znanstveno-fantastični sateliti.
- **Status:** ČEKA ODOBRENJE.

## HOME-INNOVATION-04

- **Točna pozicija:** prva kartica sekcije “Portal uživo”, `.live-card:first-child`, iza ili iznad AI asistenta, ovisno o završnom cropu.
- **Funkcija:** pokazati sigurnu poslovnu tehnologiju, automatizaciju i podatkovnu infrastrukturu.
- **Motiv:** fotorealističan moderan podatkovni centar ili profesionalni operativni prostor, tamnoplava i neutralna rasvjeta, bez osoba u prvom planu.
- **Kompozicija:** jednostavna; najmanje 35 % mirnog prostora za tekst i tipku.
- **Master:** 2200 × 1800 px.
- **Mobilna verzija:** 1800 × 1800 px.
- **Nije dopušteno:** humanoidni roboti, lebdeći hologrami s besmislenim tekstom, cyberpunk estetika, maske, anonimni hakeri.
- **Status:** ČEKA ODOBRENJE.

## Format odluke

Za svaku sliku odluka se bilježi odvojeno:

- `HOME-HERO-01 — ODOBRENO / ODBIJENO / IZMJENA`
- `HOME-FEATURED-02 — ODOBRENO / ODBIJENO / IZMJENA`
- `HOME-NETWORK-03 — ODOBRENO / ODBIJENO / IZMJENA`
- `HOME-INNOVATION-04 — ODOBRENO / ODBIJENO / IZMJENA`

Nakon odobrenja asset dobiva jedinstveni ID, produkcijski WebP/AVIF, desktop i mobilni crop, `data-visual-approved="true"` i zapis datuma odobrenja.
