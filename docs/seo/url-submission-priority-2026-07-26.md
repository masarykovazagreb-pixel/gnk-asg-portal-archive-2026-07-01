# Podizanje linkova (Google Search Console) — vodič i prioritetna lista

## Zašto sitemap, a ne pojedinačno podizanje

Google Search Console (GSC) nema "bulk" opciju za predaju stotina URL-ova odjednom kroz sučelje — ručna "Request Indexing" opcija radi jedan URL po jedan, i ima dnevni limit. Za stranicu ove veličine (406+ stranica), **jedini skalabilan put je predaja sitemapa**, koji Google zatim sam obilazi po svom rasporedu (obično unutar nekoliko dana za veći dio, brže za prioritetne stranice ako su i ručno predane).

## Korak 1 — Predaj sitemap (jednom, traje)

1. Idi na `search.google.com/search-console`
2. Odaberi property `gnk-asg.hr`
3. Lijevi izbornik → **Sitemaps**
4. U polje upiši: `sitemap-index.xml`
5. **Submit**

Ovo pokriva sve 4 pod-sitemape odjednom (glavni, editorial, visual, image) jer `sitemap-index.xml` upućuje na sve njih.

## Korak 2 — Ručno "podigni" najvažnije stranice (opcionalno, brže indeksiranje)

Za stranice gdje želiš da Google reagira **odmah**, a ne čeka redovni obilazak, koristi ručnu opciju:
1. GSC → gornja traka → zalijepi puni URL (npr. `https://gnk-asg.hr/digital-workforce/`)
2. Enter → **Request Indexing**
3. Google ima **dnevni limit** (obično ~10-12 ručnih zahtjeva dnevno) — zato je važno prioritizirati

### Prioritetna lista (Tier 0 — podigni prve, ručno)

1. `https://gnk-asg.hr/` — naslovnica
2. `https://gnk-asg.hr/en/` — engleska naslovnica
3. `https://gnk-asg.hr/digital-workforce/` — nova stranica, veliki sadržaj
4. `https://gnk-asg.hr/en/digital-workforce/` — engleska verzija
5. `https://gnk-asg.hr/trgovina/` — nova stranica
6. `https://gnk-asg.hr/trzista/` — Market Intelligence
7. `https://gnk-asg.hr/gnk-aktual/` — Aktual Media (ima EN verziju, provjeri i nju)
8. `https://gnk-asg.hr/intelligence-desk/` — Intelligence Desk

### Tier 1 — sekcije (idući krug)

9. `https://gnk-asg.hr/contact/`
10. `https://gnk-asg.hr/o-nama/` (ili `/about/`, provjeri koji je kanonski)
11. `https://gnk-asg.hr/vijesti/` ili glavna news sekcija
12. `https://gnk-asg.hr/dokumenti/`

### Tier 2+ — ostalo

Sve ostalo (pojedinačni članci, komentari, objave, galerija) — pusti da ih Google nađe organski kroz sitemap i interne linkove; nema smisla ručno podizati stotine pojedinačnih članaka.

## Napomena

Broj "Request Indexing" zahtjeva dnevno je ograničen od strane Googlea (ne od nas) — ako dobiješ poruku o limitu, samo pričekaj do sutra i nastavi s idućom stavkom na listi.
