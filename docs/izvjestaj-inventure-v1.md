# Izvještaj: što mreža ima

Izmjereno iz izlaznih stabala, ne iz sjećanja. Datum zapisa: 2026-10-29.
Podatkovni dan: 2026-10-29.

## Ukupno

| Što | Broj |
| --- | --- |
| Stranica ukupno | 11.845 |
| Webova | 7 |
| Tekstova u podacima | 6.917 |
| Gradskih izdanja | 17 |
| Svjetskih izdanja | 9 |
| Samostalnih webova | 6 |
| Jezika | 14 |
| Medijskih izvora | 134 |

## Po webu

| Web | Stranica | Tipovi | Zadnji datum |
| --- | --- | --- | --- |
| GNK ASG (glavna domena) | 2.688 | stranica 2083, engleska inačica 539, pregled 64, izvor 1, naslovnica 1 | 2026-10-29 |
| GNK World — svjetski portali | 1.052 | prenos 603, stranica 306, tema 81, izvor 53, pregled 9 | 2026-10-29 |
| GNK ASG KANAL | 128 | stranica 121, tema 6, naslovnica 1 | 2026-10-28 |
| AKTUAL ARHIVA | 38 | engleska inačica 19, stranica 18, naslovnica 1 | 2026-10-29 |
| AKTUAL DNEVNIK | 22 | engleska inačica 11, stranica 10, naslovnica 1 | 2026-10-29 |
| Samostalni webovi (šest izdanja) | 656 | prenos 402, kolumna 180, stranica 42, engleska inačica 31, izvor 1 | 2026-10-29 |
| Gradska izdanja (17 kanala) | 7.261 | članak 6917, tema 149, izvor 109, stranica 51, engleska inačica 17, pregled 17, naslovnica 1 | 2026-10-29 |

## Što iz brojeva slijedi

- Svi webovi imaju izlaz; nijedan link u mreži ne vodi u prazno.
- Podatkovni dan je **2026-10-29**, a zapis je napravljen **2026-10-29**. Ako se ta dva datuma raziđu, sadržaj zaostaje za podacima i to se vidi na ploči `/status/`, ne u tekstu.
- Brojevi se ne prepisuju: svi generatori čitaju `apps/portal/data/network-counts-v1.json`, pa ne mogu pokazivati tri različita zbroja.
- Popis svih stranica je i javna stranica `/sve-stranice/` — dostupna bez prijave, s istim brojevima.

## Kako se ovo obnavlja

```
node scripts/build-network-counts-v1.mjs   # brojevi iz podataka
node scripts/build-pages-inventory-v1.mjs  # ovaj izvještaj i /sve-stranice/
```

Nijedan korak ne traži mrežu. Ako podaci nedostaju, skript padne — ne ispiše nulu.
