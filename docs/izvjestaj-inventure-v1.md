# Izvještaj: što mreža ima

Izmjereno iz izlaznih stabala, ne iz sjećanja. Datum zapisa: 2026-10-26.
Podatkovni dan: 2026-10-26.

## Ukupno

| Što | Broj |
| --- | --- |
| Stranica ukupno | 11.462 |
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
| GNK ASG (glavna domena) | 2.671 | stranica 2075, engleska inačica 532, pregled 62, izvor 1, naslovnica 1 | 2026-10-27 |
| GNK World — svjetski portali | 1.015 | prenos 567, stranica 306, tema 80, izvor 53, pregled 9 | 2026-10-27 |
| GNK ASG KANAL | 118 | stranica 111, tema 6, naslovnica 1 | 2026-10-27 |
| AKTUAL ARHIVA | 38 | engleska inačica 19, stranica 18, naslovnica 1 | 2026-10-27 |
| AKTUAL DNEVNIK | 20 | engleska inačica 10, stranica 9, naslovnica 1 | 2026-10-27 |
| Samostalni webovi (šest izdanja) | 632 | prenos 378, kolumna 180, stranica 42, engleska inačica 31, izvor 1 | 2026-10-27 |
| Gradska izdanja (17 kanala) | 6.968 | članak 6624, tema 149, izvor 109, stranica 51, engleska inačica 17, pregled 17, naslovnica 1 | 2026-10-27 |

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
