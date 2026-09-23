# ROADMAP — što je izvršeno (2026-09-23)

Ovo je evidencija **izvršenog** uz plan u `docs/ROADMAP-2026-09-23.md`.
Ništa dolje nije deployano; sve su obične izmjene repozitorija (dokumentacija i struktura).

| ID | Akcija | Status |
|---|---|---|
| — | Popravljen UTF-8 BOM na `contracts/runtime-baseline.json`, `docs/BACKEND_COMPATIBILITY_RULES.md`, `docs/BASELINE_STATUS.md`, `docs/MIGRATION_AND_ROLLBACK.md` (sad se parser uspješno učitava). | ✅ izvršeno (4 fajla) |
| C3.1 | `README.md` prepisan kao kazalo s "merge ≠ LIVE" pravilima na vrhu. | ✅ izvršeno |
| C4.1 | `git mv` 59 jednokratnih `.md/.txt/.json` iz korijena `docs/` → `docs/arhiva/jednokratni/` (0 referenca iz koda/workflowa — provjereno prije). | ✅ izvršeno |
| C4.2/4.3 | Obrisani mrtvi fajlovi: `noop`, `docs/TEMP.txt`, `TEMP2.txt`, `TEMP3.txt` i 9 `docs/.hotfix-trigger-state*`/`.placeholder-hotfix` markera (0 referenca — provjereno). | ✅ izvršeno (14 fajlova) |
| — | Napravljen `docs/ROADMAP-2026-09-23.md` (dijagnostika + plan) i `docs/arhiva/jednokratni/README.md`. | ✅ izvršeno |

## Namjerno NIJE izvršeno (plan / čeka odluku)

U ovoj sam sesiji dirao **samo dokumentaciju, strukturu foldera i mrtve markere** — ništa što
pokreće produkcijski deploy, piše podatke ili mijenja kod Workera.

- **C1.1** watchdog prag (`ops-automation-sla-watchdog.yml` threshold) — *izmjena koda CI-ja; ide u PR.*
- **C1.2** `btc_chart.json` — *podatkovni fajl; vraća se uz C1 u PR.*
- **C1.3** cron komentari — kozmetika, uz idući commit.
- **C2.x** single-writer konsolidacija workflowa — *mijenja CI; vlastiti PR + provjera.*
- **C3.2** spajanje tri backloga u `ops/MASTER_ASG_BACKLOG.md` — *sljedeći korak nakon potvrde.*
- **C4.4** `tmp-*` (audit2/siroki/slike) — *live izlazi workflowa; ne brisati slijepo.*
- **C4.5** siročad (`trgovina/`, `audit2_script.sh`, `tmp/`, `tools/`, `operations/news-drafts/`, `.controlled-media-test-assets/`) — *treba odluka što je live.*
- **C4.6 / C5.x / C6** — tek nakon vlasnikove potvrde / drugog informatičara.
- **D1–D4** — područje drugog informatičara (vidi roadmap §D). Ovdje nije dirano ništa.

## Povlačenje

Sve zajedno vrati se jednim naredbama:

```bash
git revert <commit>        # ili:
git restore --staged .     # prije commita
git checkout .
```

Renames su čisti `git mv`, pa git sam prati parove staro→novo.
