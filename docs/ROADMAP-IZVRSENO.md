# ROADMAP — što je izvršeno (2026-09-23)

Ovo je evidencija **izvršenog** uz plan u `docs/ROADMAP-2026-09-23.md`.
Ništa dolje nije deployano; sve su obične izmjene repozitorija (dokumentacija, struktura,
i JEDNA izmjena CI-ja — watchdog — koja se aktivira tek po mergeu na `main` i pritom ne piše podatke).

## Drugi prolaz (2026-09-23, nakon potvrde "nastavi")

| ID | Akcija | Status |
|---|---|---|
| C1.1 | **Watchdog popravak** u `ops-automation-sla-watchdog.yml`: `ensure_age(soft, hard)` + debounce (jedan dispatch po run-u) + urednička provjera postaje dnevna observacija (bez prisilnog dispatcha i bez lažnog crvenog). | ✅ izvršeno (YAML + Python body + AST provjereni) |
| C2.1/C2.2 | **News single-writer**: 3 stara refresh varijanta arhivirana (`gnk-news-refresh`, `gnk-news-v14-refresh`, `news-v13-lifecycle`) → `.github/workflows-archive/` (dispatch-only, 0 aktivnih runova, 0 refova). Kanonski pisac ostaje `gnk-news-refresh-v2.yml`. `news-refresh.yml` i `seo-news-cycle.yml` NISU dirani — čuvaju ih testovi/workflowi. | ✅ izvršeno |
| C5.2 | **`ops/CONTROL-PLANE.json`** — strojno-čitljiv single-writer manifest (tko piše što + cadence + zamrznuta siročad). | ✅ izvršeno (valid JSON) |
| C3.2 | **Jedan backlog** `ops/MASTER_ASG_BACKLOG.md` (spojena 2 zamrznuta + `gh issue` lista + današnji dokazi). Stara 2 → `docs/arhiva/`. | ✅ izvršeno |
| — | `docs/governance/AUDIT-TRAIL.md` + `docs/governance/ACCESS-OWNERSHIP-MATRIX.md` (C5 predložak s P0-blockerima) + `docs/BLUEPRINT.md` obilježen "povijesni presjek, aktualno u CONTROL-PLANE". | ✅ izvršeno |
| — | Ispravljena vlastita greška iz 1. prolaza (cron komentar 07:05/15:05 UTC bio je točan — povučeno iz plana). | ✅ izvršeno |

## Prvi prolaz (2026-09-23)

| ID | Akcija | Status |
|---|---|---|
| — | Popravljen UTF-8 BOM na `contracts/runtime-baseline.json` + 3 `.md` (parser se sad uspješno učitava). | ✅ izvršeno (4 fajla) |
| C3.1 | `README.md` prepisan kao kazalo s "merge ≠ LIVE" pravilima na vrhu. | ✅ izvršeno |
| C4.1 | `git mv` **59** jednokratnih `.md/.txt/.json` iz korijena `docs/` → `docs/arhiva/jednokratni/` (0 referenca — provjereno prije). | ✅ izvršeno |
| C4.2/4.3 | Obrisani mrtvi fajlovi: `noop`, `docs/TEMP.txt`, `TEMP2.txt`, `TEMP3.txt` i 9 `docs/.hotfix-trigger-state*`/`.placeholder-hotfix` (0 referenca — provjereno). | ✅ izvršeno (14 fajlova) |
| — | Napravljen `docs/ROADMAP-2026-09-23.md`, `docs/ROADMAP-IZVRSENO.md`, `docs/arhiva/jednokratni/README.md`. | ✅ izvršeno |

## Namjerno NIJE izvršeno (plan / čeka odluku ili drugog informatičara)

- **C1.2** `btc_chart.json` + obitelj od 6 zamrznutih fajlova — **treba odluka vlasnika** (4 od 6 JOŠ dohvaća javni JS → stvarno stale; vidi `docs/governance/ACCESS-OWNERSHIP-MATRIX.md`).
- **C4.4** `tmp-*` (audit2/siroki/slike) — *live izlazi workflowa; ne brisati slijepo.*
- **C4.5** siročad (`trgovina/`, `audit2_script.sh`, `tmp/`, `tools/`, `operations/news-drafts/`, `.controlled-media-test-assets/`) — *treba odluka što je live.*
- **C4.6 / C5.1 / C5.3 / C6** — tek nakon vlasnikove potvrde.
- **D1–D4** — područje drugog informatičara (roadmap §D). Ovdje nije dirano ništa.
- **P0-1** (izostanak `refresh-index-live-data` runova) — *dijagnosticiran, NIJE zaključen: meni je čitanje repo Variables 403. Vlasnik/CF osoba treba provjeriti "Disable Actions"/`GNK_ASG_RELEASE_FENCE` (vidi ACCESS-OWNERSHIP-MATRIX).*

## Povlačenje

Sve zajedno vrati se jednim naredbama:

```bash
git revert <commit>        # ili:
git restore --staged .     # prije commita
git checkout .
```

Renames su čisti `git mv`, pa git sam prati parove staro→novo.
