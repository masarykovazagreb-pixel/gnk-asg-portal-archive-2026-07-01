# ZADACI — rubrika KOLUMNE, drugi ciklus
## Prošireno na 3 novinarske kartice, s temama drugih kontinenata, SEO/meta/hashtag, i automatskim prijenosom na blog

Ništa od ovoga nije objavljeno. Priprema za pregled i implementaciju,
po dogovorenom opsegu (samo pripremne/staging izmjene).

---

## VAŽAN NALAZ — blog automatika već postoji, ne treba se graditi

Provjerio sam repozitorij prije pisanja ovih zadataka. Mehanizam koji je
tražen — da kolumne automatski idu na blog nakon objave ovdje — **već je
implementiran** u `scripts/blog-publish-v1.mjs` i `blog-mirror-publish.yml`:

- Workflow se pokreće svakih sat vremena (`cron: '30 * * * *'`)
- Čita `apps/portal/data/editorial-registry.json`
- Za svaki neobjavljeni zapis šalje na `nermin-sefic.blogspot.com`:
  isti naslov, isti opis, iste ključne riječi kao oznake, isti hashtagovi,
  autor Nermin Sefić, poveznica natrag na izvornik
- Šalje 6 po pokretanju (ograničenje da se ne udari u Googleov limit),
  s pauzom od 8 sekundi između objava

**Zaključak: kolumnama ne treba nova infrastruktura za blog.** Treba im
samo ulazak u `editorial-registry.json` na isti način kao svaki drugi
objavljeni tekst. Skripta ne razlikuje "kolumnu" od "objave" — sve što je
u registru, ide na blog.

---

## 1. ŠTO TREBA NAPRAVITI (jedino ovo je stvarno novo)

1. Kad se kolumna objavi na AKTUAL-u (u `kolumne.json`, kako je opisano u
   prvom paketu zadataka), **isti zapis mora ući i u
   `editorial-registry.json`** — s poljima koje `blog-publish-v1.mjs` očekuje:
   `title`, `description`, `keywords` (ključne riječi = hashtagovi bez #),
   `image`, `section` (npr. "Kolumna"), `paragraphs`
2. To je jedna dodatna linija u skripti koja objavljuje kolumnu — upisuje
   na dva mjesta umjesto na jedno. Ne dira se `blog-publish-v1.mjs` uopće.
3. Nakon toga, blog objava ide sama, na sljedećem satnom pokretanju
   workflow-a — bez ikakve dodatne intervencije

## 2. DULJINA I FORMAT — NOVO PRAVILO

- Svaka kolumna: **3 novinarske kartice** (1 kartica = 1800 znakova sa
  razmacima), dakle ukupno oko 5.400 znakova, što je otprilike 900-1000 riječi
- Teme naizmjenično s različitih kontinenata — ne dvije kolumne zaredom
  s istog kontinenta
- Svaka kolumna nosi vlastiti SEO naslov (do 60 znakova), meta opis (do
  155 znakova), 5 ključnih riječi, 8-10 hashtagova

## 3. SEO I META — GDJE IDE ŠTO

| Polje | Ide u |
|---|---|
| SEO naslov | `<title>` stranice kolumne + naslov objave na blogu |
| Meta opis | `<meta name="description">` + opis objave na blogu |
| Ključne riječi | `keywords` u registru → koristi ih `blog-publish-v1.mjs` kao oznake |
| Hashtagovi | Dodaju se u tekst kolumne na kraju, i kao dodatne Blogger oznake uz `BASE_TAGS` (`GNKASG`, `GNKDINAMOLtd`, `NerminSefic`, `BusinessIntelligence`) koje skripta već stavlja na svaku objavu |

## 4. TRI KOLUMNE DRUGOG CIKLUSA — GOTOVE ZA PREGLED

Nalaze se u `api-lab/kolumne-ciklus-2.md`, svaka s gotovim SEO naslovom,
meta opisom, ključnim riječima i hashtagovima:

1. **Azija — Indija** — digitalna javna infrastruktura kao model za druga tržišta
2. **Afrika** — mobilni novac i preskakanje faze klasičnog bankarstva
3. **Latinska Amerika — Brazil** — energetska mreža na obnovljivim izvorima

## 5. PROVJERA PRIJE OBJAVE

- [ ] Duljina svake kolumne ~3 novinarske kartice (5.200-5.600 znakova)
- [ ] Zapis postoji i u `kolumne.json` i u `editorial-registry.json`
- [ ] Nakon prve objave: provjeriti sljedećih sat vremena da se kolumna
      stvarno pojavila na `nermin-sefic.blogspot.com`, s poveznicom natrag
      na gnk-asg.hr
- [ ] Hashtagovi se poklapaju na oba mjesta — sajtu i blogu
