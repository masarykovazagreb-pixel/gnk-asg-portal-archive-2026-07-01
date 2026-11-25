# AKTUAL MEDIA — NEWSROOM100 / FAST PUBLISH
Datum: 2026-11-25. Kanonski repo: Masarykova, `main`; Cloudflare; bez Vercela.

## Provjereno stanje naspram cilja
- `/gnk-aktual/`, `/objave/`, sitemap i izvorni RSS feed postoje.
- PR #490, #496 i #506 bili su otvoreni i NISU LIVE u trenutku izrade.
- `apps/portal/data/news.json` sadrži linkove drugih izdavača. `verified:true` u feedu potvrđuje samo doseg/feed-link i eventualno sliku; **nije neovisna provjera navoda**.
- Cilj = 100 korisnih ORIGINALNIH tekstova dnevno; ovaj paket **ne tvrdi da AI agenti generiraju ili objavljuju 100 članaka na dan**. Potrebni su AI writing runtime, sadržajna revizija, kvote i stvarni mjerni podaci.
- Dva stvarna puta za objavu u ovom PR-u: (A) novi privatni web-CMS `/admin/newsroom100/` koji koristi postojeću GNK ASG admin sesiju i Cloudflare D1/R2 za **objavu bez redeploya pojedinog članka**, i (B) postojeći kanonski `Content Queue Publish` proširen ručnim uredničkim unosom i zaštićenim exact-SHA deployem.
- PR nije produkcijski deploy. Objavu smatrati LIVE tek poslije izvršenog Cloudflare releasea i HTTP 200 za točan URL.

## Što je već pripremljeno na ovoj razvojnoj grani
1. `scripts/aktual-fast-intake-v1.mjs` — naslov, tekst, izvori, fotografija; izvodi HTML/NewsArticle/OG/canonical, queue upis, legalni SVG fallback i štiti od duplikata.
2. `.github/workflows/content-queue-publish.yml` — postojeći jedini kanonski writer proširen opcionalnim FAST PUBLISH unosom (jedna urednička checkbox potvrda). **Ne uvodi se novi direct-main writer**.
3. `scripts/aktual-newsroom100-radar-v1.mjs` — iz postojećeg feeda bira do 100 svježih različitih **istraživačkih zadataka**; ne objavljuje kopije i ne glumi AI.
4. `workers/gnk-asg-direct-operator/src/newsroom100-cms-v1.js` + integracija u `index-digital-workforce-v1.js`: autorizirani Cloudflare D1/R2 CMS, AI nacrt na Cloudflare AI, upload slike, originalni vizual kada nema slike, javni dinamički članci, Google News sitemap (48h) i sitemap index integracija.
5. `apps/portal/admin/newsroom100/index.html` — stvarni urednički ekran s uploadom fotografija, AI nacrtom, izvornim tekstom, izvorima i gumbom OBJAVI SADA.
6. `tests/test-aktual-fast-intake-v1.mjs`, `tests/test-aktual-newsroom100-radar-v1.mjs`, `tests/test-aktual-newsroom100-cms-v1.mjs`.
7. `scripts/check-published-weekly-integrity-v1.mjs` i prilagodba release provjere: provjera zadnjeg objavljenog tjednika, bez prisilnog izmišljanja novog.

## FAST PUBLISH — operativni tijek nakon mergea i produkcijskog dokaza

**Put A, primarni (web CMS):**
1. Otvori `https://gnk-asg.hr/admin/newsroom100/` i prijavi se postojećim GNK ASG administratorskim tokenom. Nije implementiran novi login/token niti Cloudflare Access pravilo.
2. Upiši originalan naslov i tekst te najmanje 2 HTTPS adrese neovisnih izvora. Za pomoć modela unesi zasebno konkretne provjerene bilješke, klikni 'AI izradi nacrt', provjeri i uredi nacrt.
3. Odaberi fotografiju s vlastitom ili dokazivom dozvolom, te autora, licencu; ili koristi originalnu grafičku ilustraciju.
4. Jednim objedinjenim checkboxom potvrdi činjenice, originalnost i prava. Klikni 'OBJAVI SADA'. Worker zapisuje članak u D1, fotografiju u R2, i odmah poslužuje javni canonical URL `/gnk-aktual/novosti/<slug>/`. Ne postoji novi GitHub build niti pet uzastopnih uredničkih odobrenja.
5. Preglednik provjerava javni HTTP odgovor. News sitemap `/gnk-aktual/news-sitemap.xml` uključuje samo objave zadnja 2 dana, a dinamički sitemap-index pokazuje na News sitemap. Indeksiranje Googlea nije zajamčeno.

**Put B, rezervni (GitHub Actions):**
1. U kanonskom repo otvori `Actions` → `Content Queue Publish` → `Run workflow` nakon što je ažurirani workflow na main.
2. Izborno ispuni naslov, slug, tekst, dva HTTPS izvora i podatke o legalnoj fotografiji, te označi jednu uredničku potvrdu. Ako su polja prazna, zadržava se stara ručna queue obrada.
3. Kanonski queue → preflight → materijalizacija → registry/sitemap → single-writer compare-and-swap → zaštićeni Cloudflare exact-SHA release. Zbog punog deploya ovo nije primarni realtime CMS.

**Status:** KOD U DRAFT PR-u; nijedan novi CMS URL niti automatizirana objava ne smiju se zvati LIVE prije zelenog CI, kontroliranog mergea, Cloudflare releasea i neovisne javne provjere. Dnevni cilj 100 originalnih AI tekstova **nije ostvaren** ovim paketom: moguće je napraviti do 100 AI nacrta dnevno na zahtjev, ali bez neovisno provjerenih činjenica ne postoji sigurna automatska masovna objava.

### Nezaobilazne zaštite (brzo, ali ne naslijepo)
- Autentičan izvor i drugi neovisni izvor, provjereni datumi i sadržaj, ne samo RSS polje `verified:true`.
- Nema automatskog preuzimanja tuđih fotografija/članaka bez licence; cover SVG je legalan fallback.
- Vijest i tekst moraju biti originalno sastavljeni; istinitost provjerava urednik ili dokazani fact-check sustav.
- Čuvati zaštitu od duplikata, scheduled/held sadržaja, nenamjenskih pisaca, racea i promjene main SHA-a.
- Nema lozinki, tokena, privatnih pravnih/istražnih dokumenata niti osobnih podataka u javnom outputu.
- Maksimalna potrošnja prema arhiviranom operativnom pravilu: 1000 GitHub Actions minuta mjesečno; web CMS s D1/R2 izbjegava GitHub Actions po članku. Trošak Cloudflare AI/D1/R2 zasebno mjeriti.

## Arhitektura ciljne proizvodnje 100 originalnih tekstova/dan
RSS/licencirani API → normalizacija → tematsko grupiranje i 2-source crosscheck → ranking → research factsheet → AI writer → fact verification → prava na sliku → READY → publikacija u jednoj transakciji → sitemap, NewsArticle, interna poveznica → javni HTTP 200 → metrike Search Console.

Količina je kapacitet, ne obveza da se 100 slabih vijesti mora na silu objaviti. Ako je samo 37 tema kvalitetno potvrđeno, objavi 37. Prazna kvota nije propust; neprovjeren sadržaj jest.

## 50 konkretnih ideja i redoslijed razvoja

### A. Brzina i UX (1–10)
1. Pravi web CMS u /admin/newsroom100/ uz Cloudflare Access prijavu.
2. Jedan veliki gumb OBJAVI s idempotency ključem.
3. Drag-and-drop učitavanje slike s trenutačnim previewom.
4. Učitavanje više fotografija odjednom u licenciranu galeriju.
5. Automatski crop 16:9, 4:3 i 1:1 uz odobrenje fotografa.
6. Hotkeys za naslov, podnaslov, izvor i objavu.
7. Preview na desktopu i mobitelu prije objave, bez dodatnog odobrenja.
8. Automatsko spremanje nacrta u D1 i oporavak nakon prekida.
9. Brzo uređivanje već objavljenog teksta s vidljivim revision history.
10. Urgent-news način s istom sigurnošću, ali minimalnom latencijom.

### B. AI redakcija (11–20)
11. AI topic radar sa scoringom izvora i važnosti.
12. Detekcija "druge vijesti o istom događaju" radi izvora.
13. Agent za sažetak činjenica uz točne URL-ove i datume.
14. Odvojeni agent za provjeru brojki i citata.
15. Agent za hrvatsku jezičnu i stilsku redakturu.
16. Agent za sport i službene rezultate.
17. Agent za financije/poslovne registre.
18. Agent za zakone s provjerom datuma stupanja na snagu.
19. Agent za međunarodne teme i provjerene prijevode.
20. Dnevni AI plan 100 kandidata, uz objavu samo onih koji prođu dokazani prag.

### C. Izvori, copyright i povjerenje (21–30)
21. Registar izvora s uvjetima RSS/API korištenja.
22. Razlikovati citat, link, sažetak i izvorni izvještaj.
23. Registar licenci fotografija, fotografa i dokaza prava.
24. Upozorenje na prestanak/istek fotografske licence.
25. Detekcija identičnih i gotovo identičnih odlomaka.
26. Fact-check matrica: tvrdnja → izvor → datum → stupanj pouzdanosti.
27. Obavezna oznaka 'analiza', 'vijest', 'komentar' ili 'oglas'.
28. Vidljivi javni ispravci i vremenski označene izmjene.
29. Automatska zabrana objave privatnih dokumenata i credentiala.
30. Dnevnik potpisnika/urednika, uključujući AI doprinos.

### D. SEO i distribucija (31–40)
31. Namjenski Google News sitemap samo za zadnja 2 dana.
32. Atom/RSS feed koji sadrži samo stvarno objavljene tekstove.
33. Jedinstven canonical i dosljedni HR/EN hreflang.
34. NewsArticle s točnim publisherom, datumima, slikama i autorom.
35. Opisni ALT i veličine slika s minimalnim CLS-om.
36. Automatski relevantne interne poveznice na ranije članke.
37. Tematske landing stranice bez dupliciranja sadržaja.
38. Brzina Core Web Vitals: LCP, CLS, INP.
39. Karta 404/soft-404 i automatska redirekcija kada je opravdana.
40. Search Console mjerenje stvarnog indeksiranja i klikova, ne lažne 'SEO 99%' ocjene.

### E. Operacije i rast (41–50)
41. Objava kroz jedan proces: WRITE → LIVE, bez pet ručnih gateova.
42. Event-driven queue umjesto dugog GitHub Actions reda za svaki članak.
43. Cloudflare R2 za medije i D1 za transakcijske objave.
44. Uvezivanje runtime dynamic articles sa sitemapom bez redeploya cijelog portala.
45. Kontrola potrošnje modela, tokena, inferencije i Actions minuta.
46. Pametni retry i dead-letter queue, bez duplih objava.
47. SLA dashboard: od gotovog teksta do HTTP 200.
48. Segmentacija izvora po Hrvatskoj, gradovima, regijama i jezicima.
49. Eksperimenti naslova bez clickbaita i bez mijenjanja kanonskog URL-a.
50. Dnevna operativna ploča: kandidati, nacrti, objavljeni, indeksirani, greške, ispravci.

## P0 – P1 odluke
P0: test/merge FAST PUBLISH grane, provjera PR #506 sadržaja i prava na slike, završetak točnog Cloudflare deploya i javni URL dokaz.

P1: dokaz autorizacije i produkcijskog D1/R2/AI bindinga, poboljšanje Cloudflare Access zaštite (još nije uvedena), batch AI pipeline samo uz provjerene činjenice, licensing desk, Search Console i podaci o stvarnom indeksiranju. Kod web editora, Google News sitemapa i dinamičkih članaka nalazi se u draft PR-u, nije LIVE.

## Izričito NE uključivati
- Vercel deploy, ukidanje exact-SHA zaštite, kopiranje cjelovitih tekstova drugih izdavača, izmišljene AI agente, neprovjerene političke/pravne tvrdnje ili SEO keyword stuffing.
