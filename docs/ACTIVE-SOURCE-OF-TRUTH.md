# GNK ASG — ACTIVE SOURCE OF TRUTH

Status: ACTIVE

## Canonical writer

Repository: `masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01`
Branch: `main`

Despite the legacy repository name and description containing `archive` / `ARCHIVE`, this repository is NOT GitHub-archived and remains the active writer. Automated news, weather, world-monitor, market and AEO/entity jobs continue to commit to `main`.

Do not migrate, rename, mirror, or replace this repository as production source without an explicit controlled migration plan that preserves every commit newer than the last verified production SHA.

## Production rule

Production is NOT assumed to equal `main`.

The canonical production state is the exact SHA successfully deployed by `.github/workflows/deploy-admin-auth-v6.yml` and then independently verified live.

Operationally always track both values separately:

- `WRITER_SHA` = current `main`
- `PRODUCTION_SHA` = latest successfully deployed exact SHA

Never report `SYNCED`, `LIVE`, or `DONE` merely because a commit exists on `main`.

## Single-writer rule

`main` in this repository is the only active source-of-truth writer for the GNK ASG portal. Deprecated mirror/backup repositories must not be used for active Actions, deploy, cron, publishing, or parity decisions.

## Safe-operation rules

1. Zero-minute-first inspection before Actions execution.
2. Do not trigger Actions only to verify repository state.
3. Preserve the 1,000-minute monthly working ceiling.
4. Use exact-SHA production deployment.
5. Verify the public URL/asset after deploy before marking work DONE.
6. Treat future-dated editorial content as STAGED/SCHEDULED until its publication time; never equate generated HTML with published content.
7. The 504M article body/design is frozen except for explicitly approved corrections.

## Current known truth-layer defects

These defects must be resolved at the source before claiming full consistency:

- Homepage/group-network entity count conflict: `33` versus `45 + 12 locations`.
- Canonical SEO generator still contains legacy `Bitcoin Payment Processor`, `bpp.is`, and `BPP_ID` references and can reintroduce removed content.
- Publication history contains legacy `backfilled:true` state that must be distinguished from actual publication time.

This file documents topology and operating invariants only. Dynamic SHAs must always be read from current Git history and successful deploy runs rather than copied from this document.
