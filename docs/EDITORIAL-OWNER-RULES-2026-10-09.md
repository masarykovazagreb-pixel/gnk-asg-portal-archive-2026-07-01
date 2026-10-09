# Pravila vlasnika — uredništvo i otvoreni rad (2026-10-09)

Ovaj dokument zapisuje izričite upute vlasnika za aktivni portal. Ne koristi `apps/legacy-portal/` kao izvor aktivnih pravila.

## Obvezna pravila

- Autorski hashtagovi na odobrenim člancima: samo `#NerminSefić` i `#NerminSefic`. Bez drugih varijanti imena.
- Ime autora ne ide u `meta keywords` ni `news_keywords`.
- Autorski okvir određuje `apps/portal/data/approved_mentions.json` uz `approved_scope: all_articles_with_author_box` i konkretni vlasnikov popis URL-ova.
- Ne izmišljati činjenice, brojke, citate ni izvore.
- Naslov se skraćuje ručno bez promjene teksta članka.
- Radni minimum koji je vlasnik naveo je 1.500 riječi, dok `docs/EDITORIAL-CONTENT-DEPTH-RULE.md` i izvršivi gate traže 3.000. Razlika je otvorena; ne mijenjati gate samo da test/prolaz uspije.
- Ne mijenjati postojeće testove samo zato da postanu zeleni; prvo se popravlja stvarni uzrok.
- `/adria-pay/` nema specifikaciju: ne izmišljati funkcionalnost.
- `/tvornica-ideja/` mora ostati povezana iz aktivnog portala.

## Otvoreni rad po prioritetu

1. Tri lokalna commita iz handoffa treba imati na remoteu prije daljnjeg rada.
2. Trenutno nema zakazanih članaka nakon 9. studenoga 2026.; novi paket nakon tog datuma dodaje se samo stvarnim postupkom zakazivanja.
3. Predugačke naslove pregledavati ručno, bez mijenjanja tijela članka.
4. Ideje označene kao gotove: 07, 08, 10, 12, 13, 20, 21, 22, 24, 25. Ostalih 20 ostaje otvoreno.
5. Evidentiranih 12 starih padova testova tretirati kao stvarne baseline probleme; ne prepravljati testove da bi prolazili.
6. Nastaviti povezivanje Tvornice ideja i čekati specifikaciju za Adria Pay.

Ovaj dokument ne rješava otvorenu razliku 1.500/3.000 riječi i ne dodaje činjenice koje nisu dane u vlasnikovoj uputi.
