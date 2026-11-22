# WORLD201 — no-Vercel integration status (2026-11-14)

The supplied standalone Next.js release and the canonical static monorepo are **different applications**. Do not unzip the Next.js root over this monorepo's root or publish automatically.

## Verified locally in standalone release
- Fixed the preflight checks to treat absent `vercel.json` as no Vercel cron configuration.
- Archived the release's `.github/workflows/deploy-vercel.yml` as `docs/legacy-config/deploy-vercel.yml.disabled` to prevent accidental Vercel deployment.
- Archived conflicting `public/robots.txt`; retained dynamic `src/app/robots.ts`.
- `npm run preflight`: PASS.
- `npm run audit:editorial-seo`: PASS; 4/4 source-policy tests PASS.
- `npm ci --offline --ignore-scripts`: BLOCKED (npm cache lacks `zwitch`), so Next.js build is **not verified**.

## Integration strategy
1. Keep existing `apps/portal/gnk-aktual` static country routes and generators in place; review PR #439 for migration route coverage.
2. Integrate the standalone Next.js release in an **isolated app directory** only after dependency installation and a complete build, not at monorepo root.
3. Establish an independent hosting target and verify DNS, TLS, database, runtime environment, rollback and exact deployed SHA. **No hosting provider is confirmed**.
4. Require editorial approval for publication, source rights checks, disabled write APIs by default, and robots/noindex for staging.
5. Before promotion, verify 201 HTML pages, 201 RSS feeds, 10 cities, sitemap, article pages, API health and the 17 existing channels.

No production changes, Vercel operations, DNS changes or merge into main were made by this work.
