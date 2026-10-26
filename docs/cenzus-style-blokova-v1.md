# Cenzus `<style>` blokova

Snimak: **2026-10-26** · alat: `scripts/audit-style-blocks-v1.mjs`

Jedan list po webu je pravilo; ugrađeni blokovi su iznimka koja se mora znati
izbrojati. Ovaj cenzus ne mijenja stranice — imenuje mjesta na kojima se
izgled popravlja teže nego što bi trebalo.

## Zbroj

- javnih stranica: **9775**
- stranica s ugrađenim stilom: **8344**
- ugrađenih blokova ukupno: **15929**
- najviše blokova na jednoj stranici: **8**

## Razdioba (blokova → stranica)

- 0: 1431
- 1: 1509
- 2: 6288
- 3: 354
- 4: 189
- 5: 2
- 8: 2

## Po webu

| web | stranica | blokova | prosjek |
| --- | --- | --- | --- |
| apps/portal | 7945 | 12051 | 1.52 |
| apps/world/site | 933 | 2145 | 2.3 |
| apps/sites/site | 578 | 1590 | 2.75 |
| apps/tjednik/site | 174 | 0 | 0 |
| apps/kanal/site | 89 | 89 | 1 |
| apps/arhiva/site | 39 | 38 | 0.97 |
| apps/dnevnik/site | 17 | 16 | 0.94 |

## Najteže stranice

| stranica | blokova | bajtova | imena blokova |
| --- | --- | --- | --- |
| `apps/portal/en/gnk-aktual/index.html` | 8 | 10429 | am-spt-style, aktual-perf, amn-style, (bez id), (bez id), (bez id), evd-style, (bez id) |
| `apps/portal/gnk-aktual/index.html` | 8 | 10093 | am-spt-style, aktual-perf, amn-style, (bez id), (bez id), (bez id), evd-style, (bez id) |
| `apps/portal/index.html` | 5 | 7369 | (bez id), (bez id), (bez id), (bez id), (bez id) |
| `apps/portal/animacija/index.html` | 5 | 866 | (bez id), (bez id), (bez id), (bez id), (bez id) |
| `apps/portal/kanal/index.html` | 4 | 15202 | (bez id), (bez id), (bez id), (bez id) |
| `apps/sites/site/bor-usa/kolumna/01-ai-za-male-tvrtke/index.html` | 4 | 13454 | (bez id), (bez id), (bez id), am-design-v1 |
| `apps/sites/site/bor-usa/kolumna/07-cibona-kutak-dodig/index.html` | 4 | 13454 | (bez id), (bez id), (bez id), am-design-v1 |
| `apps/sites/site/bor-usa/kolumna/08-cibona-prvak/index.html` | 4 | 13454 | (bez id), (bez id), (bez id), am-design-v1 |
| `apps/sites/site/bor-usa/kolumna/covjek-koji-mi-je-rekao-ne/index.html` | 4 | 13454 | (bez id), (bez id), (bez id), am-design-v1 |
| `apps/sites/site/bor-usa/kolumna/dan-kad-sam-prestao-zuriti-na-sastancima/index.html` | 4 | 13454 | (bez id), (bez id), (bez id), am-design-v1 |
| `apps/sites/site/bor-usa/kolumna/godina-kad-sam-prestao-obecavati/index.html` | 4 | 13454 | (bez id), (bez id), (bez id), am-design-v1 |
| `apps/sites/site/bor-usa/kolumna/gresku-priznati-brze-nego-sto-je-napravljena/index.html` | 4 | 13454 | (bez id), (bez id), (bez id), am-design-v1 |
| `apps/sites/site/bor-usa/kolumna/hrvatski-softver-izvoz-nevidljivi-lider/index.html` | 4 | 13454 | (bez id), (bez id), (bez id), am-design-v1 |
| `apps/sites/site/bor-usa/kolumna/index.html` | 4 | 13454 | (bez id), (bez id), (bez id), am-design-v1 |
| `apps/sites/site/bor-usa/kolumna/kad-me-je-najbolji-zaposlenik-napustio/index.html` | 4 | 13454 | (bez id), (bez id), (bez id), am-design-v1 |
