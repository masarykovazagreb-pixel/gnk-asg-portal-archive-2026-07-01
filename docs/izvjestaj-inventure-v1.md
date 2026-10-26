# Izvještaj: što mreža ima

Izmjereno iz izlaznih stabala, ne iz sjećanja. Datum zapisa: 2026-10-26.
Podatkovni dan: 2026-10-26.

## Ukupno

| Što | Broj |
| --- | --- |
| Stranica ukupno | 13.842 |
| Webova | 7 |
| Tekstova u podacima | 6.173 |
| Gradskih izdanja | 17 |
| Svjetskih izdanja | 9 |
| Samostalnih webova | 6 |
| Jezika | 14 |
| Medijskih izvora | 134 |

## Po webu

| Web | Stranica | Tipovi | Zadnji datum |
| --- | --- | --- | --- |
| GNK ASG (glavna domena) | 2.676 | stranica 2079, engleska inačica 532, pregled 63, izvor 1, naslovnica 1 | 2026-10-26 |
| GNK World — svjetski portali | 1.006 | prenos 558, stranica 306, tema 80, izvor 53, pregled 9 | 2026-10-26 |
| GNK ASG KANAL | 108 | stranica 101, tema 6, naslovnica 1 | 2026-10-26 |
| AKTUAL ARHIVA | 38 | engleska inačica 19, stranica 18, naslovnica 1 | 2026-10-26 |
| AKTUAL DNEVNIK | 18 | engleska inačica 9, stranica 8, naslovnica 1 | 2026-10-26 |
| Samostalni webovi (šest izdanja) | 626 | prenos 372, kolumna 180, stranica 42, engleska inačica 31, izvor 1 | 2026-10-26 |
| Gradska izdanja (17 kanala) | 9.370 | članak 9022, tema 151, izvor 111, stranica 51, engleska inačica 17, pregled 17, naslovnica 1 | 2026-10-26 |

## Što iz brojeva slijedi

- Svi webovi imaju izlaz; nijedan link u mreži ne vodi u prazno.
- Podatkovni dan je **2026-10-26**, a zapis je napravljen **2026-10-26**. Ako se ta dva datuma raziđu, sadržaj zaostaje za podacima i to se vidi na ploči `/status/`, ne u tekstu.
- Brojevi se ne prepisuju: svi generatori čitaju `apps/portal/data/network-counts-v1.json`, pa ne mogu pokazivati tri različita zbroja.
- Popis svih stranica je i javna stranica `/sve-stranice/` — dostupna bez prijave, s istim brojevima.

## Kako se ovo obnavlja

```
node scripts/build-network-counts-v1.mjs   # brojevi iz podataka
node scripts/build-pages-inventory-v1.mjs  # ovaj izvještaj i /sve-stranice/
```

Nijedan korak ne traži mrežu. Ako podaci nedostaju, skript padne — ne ispiše nulu.
