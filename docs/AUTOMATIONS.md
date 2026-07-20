# GNK ASG portal — automation map

_Last reviewed: 2026-07-20_

This document records the source, execution path, destination, cadence, dependencies and known failure modes of the portal's automated data flows.

## 1. Public business news

- **Producer:** `apps/portal/scripts/refresh_news.py`
- **Scheduler:** `.github/workflows/news-refresh.yml`
- **Expected cadence:** hourly, at minute `:17` UTC
- **Inputs:** configured Croatian, regional and international RSS/Atom feeds
- **Outputs:** public news JSON, archive JSON and update/status metadata under `apps/portal/data/`
- **Operational rule:** a failing source must be isolated and reported; one bad feed must not invalidate all healthy sources.
- **Known condition:** Lider and Hina were removed after persistent HTTP 404/403 failures.

## 2. Index live data: crypto and selected currencies

- **Producer:** `scripts/refresh_index_live_data.py`, function `refresh_market()`
- **Scheduler:** `.github/workflows/refresh-index-live-data.yml`
- **Expected cadence:** every 15 minutes
- **Input:** CoinGecko public market endpoint
- **Output:** `apps/portal/data/market.json`
- **Validation:** four configured assets must contain an EUR price and the output timestamp must match the current run.
- **Optional dependency:** `COINGECKO_DEMO_API_KEY` may be used for improved rate limits when supported by the workflow.

## 3. Global equity indices

- **Producer:** `scripts/refresh_index_live_data.py`, function `refresh_market_indices()`
- **Scheduler:** `.github/workflows/refresh-index-live-data.yml`
- **Expected cadence:** every 15 minutes
- **Current input:** Stooq CSV feed
- **Outputs:**
  - `apps/portal/data/market_indices.json`
  - `apps/portal/data/fast_market_status.json`
- **Known failure:** Stooq can reject GitHub Actions runner IP addresses. In that state, the script still refreshes timestamps but writes no usable index rows and records `degraded` status.
- **Required remediation:** make the Cloudflare Worker market fetch the canonical acquisition layer, or add a second approved source with explicit fallback and provenance. Do not treat a fresh timestamp as proof that index values are fresh.

## 4. Cloudflare public world markets endpoint

- **Producer:** Cloudflare Worker route `/api/public-world-markets`
- **Execution:** request-driven with Worker-side cache
- **Expected cache:** approximately 120 seconds
- **Current role:** public market endpoint; Cloudflare egress is not affected by the GitHub Actions/Stooq block observed above.
- **Recommended role:** canonical index acquisition service for both the public page and repository snapshots, with schema validation before data is persisted.

## 5. Email delivery-status synchronization

- **Producer:** `workers/gnk-asg-direct-operator/src/email-status-tracking-v3.js`
- **Function:** `syncCloudflareEmailStatuses`
- **Scheduler:** Worker `scheduled()` handler in `index-unified-auth-v16.js`
- **Inputs:** Cloudflare Analytics API
- **Destination:** protected email-status data used by the operator/admin interface
- **Required secrets:**
  - `CLOUDFLARE_ANALYTICS_TOKEN`
  - `CLOUDFLARE_ZONE_ID`
- **Failure mode:** without both secrets, the synchronization cannot produce authoritative delivery status.

## 6. Editorial publications and comments

- **Manifest:** `apps/portal/data/editorial-plan/manifest.json`
- **Current state:** repository-managed/manual publication workflow
- **Outputs:** dedicated HTML pages, homepage/editorial feed entries and SEO metadata
- **Important:** there is no approved autonomous AI publishing scheduler. Any future generator must produce reviewable drafts, enforce source provenance, separate publications from comments and require a publication gate.

## 7. Visual gallery

- **Data:**
  - `apps/portal/data/visual_gallery.json`
  - `apps/portal/data/gallery-manifest.json`
- **Current state:** static repository content
- **Output:** gallery assets plus dedicated `/visual-index/{slug}/` pages
- **Important:** no scheduled image rotation or autonomous generation currently exists.

## 8. Production deployment

- **Workflow:** `.github/workflows/deploy-admin-auth-v6.yml`
- **Mode:** manual and explicitly authorized only
- **Required confirmation input:** `DEPLOY_ADMIN_AUTH_V6`
- **Required SHA:** always resolve the current `main` HEAD immediately before dispatch because automated data jobs can commit to `main` between merge and deployment.
- **Safety rule:** no cron, bot or recurring agent may deploy production automatically.

## 9. Operational health rules

1. Fresh timestamps are not sufficient; validate row counts, required fields and source timestamps.
2. Each run should expose `status`, successful source count, failed source count and bounded error details.
3. One external source failure must not destroy the last known-good public payload.
4. Persist the last known-good data separately from the latest acquisition attempt.
5. All public market data must include source attribution and an informational-use disclaimer.
6. Secrets belong in GitHub/Cloudflare secret stores, never in repository files, logs or generated status JSON.
7. Production deploy remains a separate, manually authorized operation.
