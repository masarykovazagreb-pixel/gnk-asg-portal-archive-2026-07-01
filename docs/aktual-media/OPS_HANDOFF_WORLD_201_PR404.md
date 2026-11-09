# AKTUAL MEDIA WORLD 201 — LIVE OPERATIONAL HANDOFF
**Last inspected 2026-11-09; dynamically recheck PR refs. This is not release approval.**

## Entry point
- Active repository: `masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01` (despite the archive suffix)
- Working PR: [#404](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/pull/404); branch `feat/aktual-world-ci-release-20261109`
- Target: https://gnk-asg.hr/gnk-aktual/ ; world directory https://gnk-asg.hr/gnk-aktual/media/
- Last inspected PR SHA `7d09a5e5095c89e31599a8b51b325c1d292aea8f`; last inspected main SHA `1bdaee25389acee9f4224a0ed5b370a580288fda`; refs change often.
- PR open, unmerged, 2 behind main; latest inspected PR CI had 19 passing, one failed Publication Sitemap Registry Gate, six unfinished. NEVER claim LIVE without actual deployment and independent public checks.

## Code map
- Home HR/EN: `apps/portal/gnk-aktual/index.html`, `apps/portal/en/gnk-aktual/index.html`.
- New world index: `apps/portal/gnk-aktual/media/index.html`, CSS/JS `apps/portal/assets/aktual-world-directory-v1.{css,js}`.
- Country/city pages and RSS: `apps/portal/gnk-aktual/media/<slug>/{index.html,feed.xml}` and `apps/portal/gnk-aktual/grad/<slug>/{index.html,feed.xml}`.
- Source of truth `apps/portal/data/world-countries-v1.json`; generator `scripts/generate-world-countries-v1.mjs`; static generator `scripts/build-aktual-world-v1.mjs`; sitemap `apps/portal/gnk-aktual/media/sitemap.xml` with 212 entries (201 countries + 10 cities + index).
- World takeover/popup `apps/portal/assets/aktual-zagreb-takeover-v1.{css,js}`; old promo guard `apps/portal/assets/aktual-promo-v1.js`.
- Cross-link stylesheet `apps/portal/assets/aktual-world-bridge-v1.css`; HR/EN cross-links in `aktual-media`, `gnk-aktual/mreza`, `tehnologija-buducnosti`, `autonomija`.
- World CI `.github/workflows/check-aktual-media-world-v1.yml`, tests `scripts/test-aktual-media-world-v1.mjs` and `scripts/test-aktual-world-directory-v1.mjs`.
- 435 **configured** sources, not 435 proven online/licensed sources; 24/7 is an automation objective, not a measured uptime claim.

## Critical unresolved P0 gate
`Publication Sitemap Registry Gate`: canonical `apps/portal/data/aktual-weekly-curation.json` still has `issue_week: 2026-11-02`; source news week is `2026-11-09`. Must source-check **at least 8** current-week lifestyle articles, original HR/EN summaries, original illustration SVGs and full rights/credits. Staged but NOT published evidence: `docs/aktual-media/weekly-curation-evidence-2026-11-09.json`.
Then use canonical builders: `scripts/generate-aktual-weekly-cover-assets-v1.mjs`, `scripts/build-aktual-media-weekly-v1.mjs`, `scripts/build-aktual-media-weekly-archive-v1.mjs`, `scripts/editorial-registry-v1.mjs`, relevant sitemap generators. Produce digest, image manifest, HR/EN pages, archives, editorial sitemap and sitemap index. Preserve editorial and copyright gates. Verify `node scripts/build-aktual-media-weekly-v1.mjs --check`.

## Other P0 gate
`All gates (portal)`: prior errors included approx. 795 stale independently generated edition HTML pages (official `node apps/sites/build.mjs`), approx. 3435 refresh-day drifts (`node tests/test-refresh-layer-v1.mjs`), radio-promo drift and World directory WebSite JSON-LD missing. The last two were patched by `7d09a5e...` but need newly green CI; rerun tests, never suppress failures. For refresh tags use actual network-counts data day, **not** today's date as a fictional freshness signal. Before bulk regenerate, inspect `git diff --stat` and sample HTML.

## Local validation
```bash
git fetch origin main feat/aktual-world-ci-release-20261109
git switch -c work/world201-finish origin/feat/aktual-world-ci-release-20261109
git diff --stat origin/main...HEAD
node scripts/test-aktual-media-world-v1.mjs
node scripts/test-aktual-world-directory-v1.mjs
node scripts/build-aktual-media-weekly-v1.mjs --readiness
node scripts/build-aktual-media-weekly-v1.mjs --check
node tests/test-sites-network-v1.mjs
node tests/test-refresh-layer-v1.mjs
node scripts/test-website-jsonld-v1.mjs
python3 scripts/factory/radio_promo_v1.py --check
git diff --check
```

## Main race protection
Main is modified by publisher bots. Recheck `git fetch origin main`, compare changed paths, merge main into PR #404 **without force push**, preserving latest text, stats, feeds and weather. Only copy clearly marked World blocks (`AM-WORLD-PROMO`, `AM-WORLD-GATEWAY`, `AKTUAL-WORLD-BRIDGE`) into current pages when conflicts occur. Re-run full CI on the exact post-merge SHA.

## Exact-SHA protected production procedure — only after ALL required green
Use GitHub Actions on `main` → `Deploy Admin Auth V6` (`.github/workflows/deploy-admin-auth-v6.yml`) → Run workflow.
- `confirm_production_deploy` = `DEPLOY_ADMIN_AUTH_V6`
- `approved_sha` = 40-digit lowercase **current main SHA after PR merge**, matching GITHUB_SHA, HEAD and origin/main.
- `notify_search_engines` = false until public content and indexing approved.
- Production environment approvals and required Cloudflare secrets must be present; no bypass and never share secrets in chat.
- Workflow also deploys Workers/related assets. Inspect successful deploy logs and independent public **new HTML** at /gnk-aktual/, /gnk-aktual/media/, /gnk-aktual/media/hrvatska/, /gnk-aktual/grad/zagreb/, RSS and sitemap. A 200 status or green Actions alone does not prove the new portal is LIVE. Check real content, canonical, JS search, mobile popup/scroll, SHA/proof header.

## Definition of done
All required CI green; current-week eight-source digest and generator outputs; main up-to-date; PR #404 merged and exact new SHA recorded; protected workflow successful with approved SHA; independent public validation and evidence retained. Only then say **DEPLOY CONFIRMED**.
