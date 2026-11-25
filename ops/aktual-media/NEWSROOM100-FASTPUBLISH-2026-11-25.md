# AKTUAL MEDIA — NEWSROOM100 / FAST PUBLISH
Datum: 2026-11-25. Kanonski repo: Masarykova, `main`; Cloudflare; bez Vercela.

## Provjereno stanje naspram cilja
- `/gnk-aktual/`, `/objave/`, sitemap i izvorni RSS feed postoje.
- PR #490, #496 i #506 bili su otvoreni i NISU LIVE u trenutku izrade.
- `apps/portal/data/news.json` sadrži linkove drugih izdavača. `verified:true` u feedu potvrđuje samo doseg/feed-link i eventualno sliku; **nije neovisna provjera navoda**.
- Cilj = 100 korisnih ORIGINALNIH tekstova dnevno; ovaj paket **ne tvrdi da AI agenti generiraju ili objavljuju 100 članaka na dan**. Potrebni su AI writing runtime, sadržajna revizija, kvote i stvarni mjerni podaci.
- Nova workflow/manual fast path dopušta jedan urednički nalog za jednu objavu i koristi postojeći sigurni `Content Queue Publish` + exact-SHA deploy. Nije browser CMS s izravnim uploadom.
- PR nije produkcijski deploy. Objavu smatrati LIVE tek poslije izvršenog Cloudflare releasea i HTTP 200 za točan URL.

## Što je već pripremljeno na ovoj razvojnoj grani
1. `scripts/aktual-fast-intake-v1.mjs` — naslov, tekst, izvori, fotografija; izvodi HTML/NewsArticle/OG/canonical, queue upis, legalni SVG fallback i štiti od duplikata.
2. `.github/workflows/aktual-fast-publish-v1.yml` — jedan Run workflow nalog (10 polja), kontrolira pravo na sliku i uredničku potvrdu, automatski pokreće zaštitni publication + exact-SHA deploy.
3. `scripts/aktual-newsroom100-radar-v1.mjs` — iz postojećeg feeda bira do 100 svježih različitih **istraživačkih zadataka**; ne objavljuje kopije i ne glumi AI.
4. `tests/test-aktual-fast-intake-v1.mjs`, `tests/test-aktual-newsroom100-radar-v1.mjs`.

## FAST PUBLISH — operativni tijek nakon mergea i verifikacije
1. Otvori GitHub Actions / `AKTUAL MEDIA - Fast Publish v1` na kanonskom repozitoriju.
2. Unesi naslov, slug, izvorni tekst i najmanje 2 neovisne HTTPS adrese izvora.
3. Ako imaš fotografiju, upload u `apps/portal/assets/editorial/` i u formu unesi `/assets/editorial/...webp`, tip prava, atribuciju i dokaz licence. Ako nemaš legalno dostupnu fotografiju, automatski se izradi ORIGINALNI SVG vizual.
4. Označi jednu objedinjenu potvrdu da su činjenice i originalnost provjerene. Upiši `OBJAVI`. Klikni `Run workflow` — nema pet uzastopnih uredničkih odobrenja.
5. Automatika: queue → preflight → materijalizacija → registry/sitemap/AKTUAL links → compare-and-swap push → `Deploy Admin Auth V6` exact-SHA → javna provjera HTTP 200. Ne tvrditi objavljeno dok posljednja točka nije dokazana.

### Nezaobilazne zaštite (brzo, ali ne naslijepo)
- Autentičan izvor i drugi neovisni izvor, provjereni datumi i sadržaj, ne samo RSS polje `verified:true`.
- Nema automatskog preuzimanja tuđih fotografija/članaka bez licence; cover SVG je legalan fallback.
- Vijest i tekst moraju biti originalno sastavljeni; istinitost provjerava urednik ili dokazani fact-check sustav.
- Čuvati zaštitu od duplikata, scheduled/held sadržaja, nenamjenskih pisaca, racea i promjene main SHA-a.
- Nema lozinki, tokena, privatnih pravnih/istražnih dokumenata niti osobnih podataka u javnom outputu.
- Maksimalna potrošnja prema arhiviranom operativnom pravilu: 1000 GitHub Actions minuta mjesečno; 100 zasebnih Actions publikacija na dan može premašiti budžet. Prednost dati batch releaseu i budućem izravnom autoriziranom Worker/R2 CMS-u.

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

P1: Cloudflare Access + R2 + D1 web editor (upload → piši → objavi) s direktnim runtimeom, batch AI pipeline, izvori, licensing desk, News sitemap, Search Console.

## Izričito NE uključivati
- Vercel deploy, ukidanje exact-SHA zaštite, kopiranje cjelovitih tekstova drugih izdavača, izmišljene AI agente, neprovjerene političke/pravne tvrdnje ili SEO keyword stuffing.
