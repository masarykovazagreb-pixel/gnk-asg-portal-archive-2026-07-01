# Izvještaj: što mreža ima

Izmjereno iz izlaznih stabala, ne iz sjećanja. Datum zapisa: 2026-10-24.
Podatkovni dan: 2026-10-24.

## Ukupno

| Što | Broj |
| --- | --- |
| Stranica ukupno | 9.519 |
| Webova | 7 |
| Tekstova u podacima | 4.877 |
| Gradskih izdanja | 17 |
| Svjetskih izdanja | 9 |
| Samostalnih webova | 6 |
| Jezika | 14 |
| Medijskih izvora | 134 |

## Po webu

| Web | Stranica | Tipovi | Zadnji datum |
| --- | --- | --- | --- |
| GNK ASG (glavna domena) | 2.673 | stranica 2076, engleska inačica 532, pregled 63, izvor 1, naslovnica 1 | 2026-10-24 |
| GNK World — svjetski portali | 915 | prenos 468, stranica 306, tema 80, izvor 52, pregled 9 | 2026-10-24 |
| GNK ASG KANAL | 88 | stranica 81, tema 6, naslovnica 1 | 2026-10-24 |
| AKTUAL ARHIVA | 38 | engleska inačica 19, stranica 18, naslovnica 1 | 2026-10-24 |
| AKTUAL DNEVNIK | 16 | engleska inačica 8, stranica 7, naslovnica 1 | 2026-10-24 |
| Samostalni webovi (šest izdanja) | 566 | prenos 312, kolumna 180, stranica 42, engleska inačica 31, izvor 1 | 2026-10-24 |
| Gradska izdanja (17 kanala) | 5.223 | članak 4877, tema 150, izvor 110, stranica 51, engleska inačica 17, pregled 17, naslovnica 1 | 2026-10-24 |

## Što iz brojeva slijedi

- Svi webovi imaju izlaz; nijedan link u mreži ne vodi u prazno.
- Podatkovni dan je **2026-10-24**, a zapis je napravljen **2026-10-24**. Ako se ta dva datuma raziđu, sadržaj zaostaje za podacima i to se vidi na ploči `/status/`, ne u tekstu.
- Brojevi se ne prepisuju: svi generatori čitaju `apps/portal/data/network-counts-v1.json`, pa ne mogu pokazivati tri različita zbroja.
- Popis svih stranica je i javna stranica `/sve-stranice/` — dostupna bez prijave, s istim brojevima.

## Kako se ovo obnavlja

```
node scripts/build-network-counts-v1.mjs   # brojevi iz podataka
node scripts/build-pages-inventory-v1.mjs  # ovaj izvještaj i /sve-stranice/
```

Nijedan korak ne traži mrežu. Ako podaci nedostaju, skript padne — ne ispiše nulu.
