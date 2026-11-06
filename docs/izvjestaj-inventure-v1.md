# Izvještaj: što mreža ima

Izmjereno iz izlaznih stabala, ne iz sjećanja. Datum zapisa: 2026-11-06.
Podatkovni dan: 2026-11-06.

## Ukupno

| Što | Broj |
| --- | --- |
| Stranica ukupno | 19.392 |
| Webova | 7 |
| Tekstova u podacima | 14.130 |
| Gradskih izdanja | 17 |
| Svjetskih izdanja | 9 |
| Samostalnih webova | 6 |
| Jezika | 14 |
| Medijskih izvora | 135 |

## Po webu

| Web | Stranica | Tipovi | Zadnji datum |
| --- | --- | --- | --- |
| GNK ASG (glavna domena) | 2.689 | stranica 2084, engleska inačica 539, pregled 64, izvor 1, naslovnica 1 | 2026-11-06 |
| GNK World — svjetski portali | 1.271 | prenos 819, stranica 306, tema 81, izvor 56, pregled 9 | 2026-11-06 |
| GNK ASG KANAL | 208 | stranica 201, tema 6, naslovnica 1 | 2026-11-06 |
| AKTUAL ARHIVA | 38 | engleska inačica 19, stranica 18, naslovnica 1 | 2026-11-06 |
| AKTUAL DNEVNIK | 32 | engleska inačica 16, stranica 15, naslovnica 1 | 2026-11-06 |
| Samostalni webovi (šest izdanja) | 674 | prenos 420, kolumna 180, stranica 42, engleska inačica 31, izvor 1 | 2026-10-31 |
| Gradska izdanja (17 kanala) | 14.480 | članak 14130, tema 152, izvor 112, stranica 51, engleska inačica 17, pregled 17, naslovnica 1 | 2026-11-06 |

## Što iz brojeva slijedi

- Svi webovi imaju izlaz; nijedan link u mreži ne vodi u prazno.
- Podatkovni dan je **2026-11-06**, a zapis je napravljen **2026-11-06**. Ako se ta dva datuma raziđu, sadržaj zaostaje za podacima i to se vidi na ploči `/status/`, ne u tekstu.
- Brojevi se ne prepisuju: svi generatori čitaju `apps/portal/data/network-counts-v1.json`, pa ne mogu pokazivati tri različita zbroja.
- Popis svih stranica je i javna stranica `/sve-stranice/` — dostupna bez prijave, s istim brojevima.

## Kako se ovo obnavlja

```
node scripts/build-network-counts-v1.mjs   # brojevi iz podataka
node scripts/build-pages-inventory-v1.mjs  # ovaj izvještaj i /sve-stranice/
```

Nijedan korak ne traži mrežu. Ako podaci nedostaju, skript padne — ne ispiše nulu.
