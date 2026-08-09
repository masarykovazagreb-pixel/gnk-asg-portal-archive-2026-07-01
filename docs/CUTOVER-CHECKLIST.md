# MASTER ASG — Masarykova source-of-truth cutover checklist

Status: PRE-CUTOVER. Do not disable or archive Beckuphome until every mandatory gate below is verified.

## 1. Freeze and final synchronization

- [ ] Freeze production-relevant writes on `beckuphome-gnk/gnk-asg-portal` for the cutover window.
- [ ] Record the approved Beckuphome `main` commit SHA and tree SHA.
- [ ] Synchronize `masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01` to that exact commit/tree.
- [ ] Confirm zero unintentional drift for `.github/workflows`, `scripts`, `apps/portal`, production data/assets, package/build configuration and required operational documentation.
- [ ] Document every intentional repository-level difference.

## 2. Repository-level operational parity

- [ ] Masarykova default branch is `main` and branch protections/required checks are appropriate for production maintenance.
- [ ] Required GitHub Actions workflows exist and are enabled on Masarykova.
- [ ] Required Actions secret/environment/variable NAMES exist on Masarykova. Never store or document secret values in this file.
- [ ] Workflow permissions are sufficient but least-privilege.
- [ ] Environments and deployment approvals required by production workflows are configured.
- [ ] Scheduled workflows have a single owner; there must be no simultaneous Beckuphome and Masarykova scheduled writers after cutover.

## 3. Hardcoded repository ownership audit

- [ ] Search production scripts/workflows/configuration for `beckuphome-gnk` references.
- [ ] Replace source-repository references with Masarykova where required, or make the owner/repository configurable where safer.
- [ ] Check mirror, durable-state, scheduler, dispatch, API and artifact references separately.
- [ ] Do not modify DNS, mail, Cloudflare routes or secret values during repository cutover.

## 4. Masarykova autonomous CI test

- [ ] Open a harmless test branch/PR directly in Masarykova.
- [ ] Confirm all required CI and quality gates run from Masarykova without relying on Beckuphome.
- [ ] Confirm exact-SHA gate behaviour.
- [ ] Close/revert the harmless test change if it is not intended for production.

## 5. Masarykova deployment path test

- [ ] From an approved Masarykova `main` SHA, validate the production deployment workflow contract.
- [ ] Require exact-SHA authorization and all existing green guardrails.
- [ ] Confirm `deploy-production` success before considering the change live.
- [ ] Perform live HTTP smoke tests on key HR/EN routes, AKTUAL, editorial routes and required static assets.
- [ ] Verify canonical/hreflang, sitemap availability and post-deploy IndexNow behaviour.
- [ ] Do not declare production readiness from a merge alone.

## 6. Publishing and automation ownership

- [ ] News/AKTUAL: exactly one scheduled writer after cutover.
- [ ] Market/digital-assets: exactly one scheduled writer after cutover.
- [ ] Editorial/calendar registry: future-dated content remains unpublished until its scheduled date.
- [ ] Blogger, Telegraph, Tumblr and Dev.to: single-writer ownership, durable per-channel state, dedupe/retry/backlog retained.
- [ ] New editorial publication order remains: live on `gnk-asg.hr` with HTTP 200 first, then idempotent 4-channel distribution; EN primary, HR fallback only where EN does not exist.
- [ ] Digital Workforce queues/retries/telemetry continue without duplicate schedulers.
- [ ] SEO audit, sitemap refresh, IndexNow and site-health/self-heal schedules have one owner only.

## 7. Final cutover gate

All items below are mandatory before Beckuphome can be disabled or archived:

- [ ] Beckuphome and Masarykova approved production source trees have zero unintentional drift.
- [ ] Masarykova can independently run required CI.
- [ ] Masarykova can independently run the approved production deployment path.
- [ ] Live production smoke is green after a Masarykova-owned test deployment.
- [ ] All scheduled writers are moved to Masarykova and disabled on Beckuphome, with no overlap window.
- [ ] Durable channel/workforce state is preserved and readable by the new owner.
- [ ] A rollback SHA and rollback procedure are recorded.

Only after every mandatory gate is verified:

1. Mark Masarykova as the authoritative source repository.
2. Stop scheduled writers on Beckuphome.
3. Keep Beckuphome read-only for a stabilization period.
4. Archive/disable Beckuphome only after repeated healthy production cycles on Masarykova.

## Current verification rule

A green mirror workflow is not sufficient evidence of parity. Compare the actual approved commit/tree and production-relevant repository content, and separately verify repository-level settings that are not stored in Git.
