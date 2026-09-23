# ACCESS & OWNERSHIP MATRIX — P0 izvršenje + svježina (work-in-progress)

> **Predložak za C5** — popunjava se SVAKIM P0 iz mapeta, i nikad se ne učitava stariji od 7 dana.
> Ažurirano: 2026-09-23 · Autor: bot sesija `arena/01a0cde5` (dijagnostika) · Referenca: `docs/qa/ACCESS-LIMITATIONS-AND-VERIFICATION-LEVELS.md`

## Problem 1 — `refresh-index-live-data.yml` nema runa od 2026-09-22 18:44 UTC

| Polje | Vrijednost |
|---|---|
| **Pristup koji NEDOSTAJE (ja, agent)** | GitHub "Actions administration" ili čitanje/upravljanje repo **Variables** (`GNK_ASG_RELEASE_FENCE`), jer je `gh api .../actions/variables` → **403** za integraciju. |
| **Što točno provjeriti** | 1) Je li org/repo **"Disable Actions"** ukopčan (Settings → Actions → Allow actions). 2) Vrijednost varijable `GNK_ASG_RELEASE_FENCE` (ako je `true`, `refresh-main` job se isključuje; bilo koji drugi sadržaj = bug u uvjetu). 3) Postoji li uspješan **plan** (skipped) od 07:05/15:05 UTC, a ne samo failed/success u povijesti. |
| **Gdje se to obavlja** | GitHub UI: `https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/settings/actions` + `Settings → Secrets and variables → Actions → Variables` (repo). |
| **Koji rezultat treba vratiti** | (a) stanje "Disable Actions"; (b) `GNK_ASG_RELEASE_FENCE` = vrijednost; (c) ima li danas (23.9.) "skipped" run u povijesti workflowa. Bilo koja tri pola, ili ništa |
| **Što ću napraviti nakon odgovora** | Ako fence=true → otvoriti pitanje o odobrenom pisanju. Ako Disabled/Actions off → spada u potrošnju/administraciju (druga osoba). Ako ništa ne blokira → lokalni `workflow_dispatch` probni run s dnevnikom. |

## Problem 2 — Orphan-6 tržišni fajlovi zamrznuti na 2026-06-01

| Polje | Vrijednost |
|---|---|
| **Pristup koji NEDOSTAJE** | Odluka vlasnika (poslovna): vratiti publiku na svježe izvore ili obrisati. |
| **Što je točno utvrđeno** | 4 od 6 fajlova **JOŠ Dohvaća javni JS**: `stablecoins.json`, `exchange_compare.json`, `stock_exchanges.json`, `asg_gold_asset.json` (grep u `apps/portal/assets/*.js`) → **starno stale na javnim stranicama od 2026-06-01** (P0). `btc_chart.json` i `reference_assets_status.json` **nemaju pronađenog JS potrošača** (samo KV rub `/data/...`). |
| **Što točno provjeriti** | Koji blokovi `/trzista/` (i EN) prikazuju te podatke; jesu li tržišne kartice dovoljne s `market_indices` + `market.json` + `market-pulse.json`. |
| **Gdje** | Frontend pregled `/trzista/` + `grep` u `apps/portal/assets/market*.js`, `browser-data-refresh.js`, `market-expansion.js`, `desk-hybrid.js`. |
| **Rezultat** | "koristi se" ili "ne koristi se" po svakom od 6 fajlova. |
| **Nakon odgovora** | Ako se ne koristi → PR koji ih briše (uz arhivsku kopiju); ako se koristi → vratiti ih u `refresh-index-live-data` writer (novi small script + `git add`). |
