# GNK ASG Portal

Razvojna baza za GNK ASG portal (gnk-asg.hr) i povezane Cloudflare Workere.

> ⚠️ **Ovo je KAZALO, ne sadržaj.** Detalji žive u dokumentima na koje se pokazuje.
> Svaki upit o stanju počni od `docs/ACTIVE-SOURCE-OF-TRUTH.md` i datuma u zaglavlju dokumenta.

**Tri pravila koja se ne smiju zaboraviti:**

1. **Merge ≠ LIVE.** Push u `main` ne objavljuje ništa. LIVE = točan SHA deployan kroz
   `deploy-admin-auth-v6.yml` i nezavisno verificiran živim HTTP odgovorom.
2. **Produkcija nije promijenjena automatski.** Cloudflare deploy ide samo eksplicitnom autorizacijom.
3. **Ovo NIJE arhiva unatoč imenu** (`archive`). `main` je aktivni pisac; automatizacije rade samo ovdje.

## Kazalo dokumentacije

| Dokument | Što je |
|---|---|
| `docs/ACTIVE-SOURCE-OF-TRUTH.md` | tko piše, single-writer pravilo, sigurna operacija — **počni ovdje** |
| `docs/BLUEPRINT.md` | nacrt sustava: slojevi, automatizacije, kako nastaje sadržaj, torke vraćanja |
| `docs/ROADMAP-2026-09-23.md` | zadnja dijagnostika + prioritizirani prijedlozi promjena |
| `ops/MASTER_ASG_BACKLOG.md` | jedan operativni backlog (izvori: GitHub issues + povijesni backlogovi) |
| `docs/governance/` | stanje: KPI, rizici, odluke, arhitektura, changelog, health |
| `docs/TAJNE_ZA_DRUGI_REPO.md` | gdje naći svaku tajnu pri prelasku na drugi repo |
| `docs/BLOG_I_TAJNE.md` | blog mirror + popis tajni (GitHub i Worker) + zamjena ključeva |
| `docs/qa/ACCESS-LIMITATIONS-AND-VERIFICATION-LEVELS.md` | što se može provjeriti odavde (razine A–F), granice, **mail kutija pravila** |
| `docs/qa/HANDOFF-2026-07-26-27.md` | povijest rada + "ZA SUTRA" akcije |
| `docs/qa/PR762-HANDBACK-2026-07-25-CONTINUED.md` | posao preusmjeren na **drugog developera** (Digital Workforce read+write) |
| `docs/operations/` | runbook, izvještajna struktura |
| `docs/deploy-readiness/` `docs/deployments/` | deploy evidencija |
| `docs/arhiva/jednokratni/` | jednokratne odluke/markeri iz 2026-06–07 (obavljeno, čuvano radi povijesti) |

## Struktura koda

```
apps/portal/    aktivni HR/EN frontend (statičke stranice, sitemapovi, podaci)
apps/legacy-portal/  prethodni frontend (drži se zbog povijesti; plan spajanja u ROADMAP C5.1)
workers/        aktivni Cloudflare Workeri (bez secrets u repou)
  gnk-asg-direct-operator/   glavni Worker; aktivni ulaz = src/index-digital-workforce-v1.js
scripts/        generatori, validatori, publish skripte
.github/workflows/  CI + cron automatizacije + deploy gate (294 fajla, aktivnih ~19-40)
packages/       (planirano) zajednički UI, navigacija, API, SEO, teme
contracts/      rute, endpointi, bindings (runtime-baseline.json)
config/         politike (canonical-truth-policy.json, katalog hardwareschotte)
ops/            operativni manifesti, backlog, repair-notes, točke vraćanja
```

## Brze naredbe koje se ponavljaju

```bash
node scripts/repo-switch-manifest.mjs     # osvježi popis (secrets, workflowi)
node scripts/repo-switch-preflight.mjs    # provjeri spremnost prve pomoći (treba TARGET_REPO + token)
node scripts/audit-public-portal-v1.mjs   # javni audit ruta
```

Produkcija gnk-asg.hr nije promijenjena ovim kazalom.
Cloudflare deploy nije izvršen.
