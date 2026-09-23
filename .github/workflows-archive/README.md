# Workflows-archive — neaktivni CI/CRON

Ovo NIJE `.github/workflows/` (`on:` se ovdje **ne** registrira — GitHub čita samo
`.github/workflows/`). Ovdje čuvamo povijesne / zamijenjene workflowe bez trošenja
runnersa i bez "Run workflow" ponuda.

## Pravilo vraćanja

Vraća se samo kroz PR i isključivo `git mv .github/workflows-archive/X.yml .github/workflows/X.yml`
(nikad `cp`, da se očuva povijest). Prije vraćanja provjeriti:

1. da nema aktivnog nasljednika s istom ulogom (single-writer),
2. cron da se ne sudara s postojećim rasporedom,
3. `permissions` na minimum.

## Popis (s datumima premještanja)

| Workflow | Premješten | Razlog |
|---|---|---|
| `gnk-news-refresh.yml` | 2026-09-23 | zamijenjen `gnk-news-refresh-v2.yml`; dispatch-only `contents: write` bez ijednog aktivnog runa |
| `gnk-news-v14-refresh.yml` | 2026-09-23 | isto (stari refresh varijant) |
| `news-v13-lifecycle.yml` | 2026-09-23 | isto (stari lifecycle) |
| `emergency-deploy-mail-autoreply-bcc-20260722.yml` | (prethodno) | jednokratno iz 2026-07-22 |
| `fix-deploy-direct-inbound-final-20260722.yml` | (prethodno) | jednokratno iz 2026-07-22 |
| `fix-deploy-mail-autoreply-bcc-20260722.yml` | (prethodno) | jednokratno iz 2026-07-22 |
| `fix-deploy-mail-autoreply-mime-20260722.yml` | (prethodno) | jednokratno iz 2026-07-22 |
