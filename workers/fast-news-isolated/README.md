# AKTUAL MEDIA — FAST NEWS DEV

Independent Worker for a development hostname. No deployment, production DNS change or production database migration is implied by this branch.

## Local gate

From this directory run `node --test tests/worker.test.mjs` (Node 22). Fixtures are not real news. Verify the actual D1 SQL against a local or explicitly designated development database as a separate integration test.

## DEV deployment gate

1. Verify the existing DEV host, routing ownership, Cloudflare account permissions and the absence of route conflicts. Proposed hostname: dev.gnk-asg.hr. Do not use an unverified database identifier.
2. Copy wrangler.example.toml to a local wrangler.toml, supply the dedicated DEV D1 binding and verified PUBLIC_ORIGIN. Keep PUBLISH_ENABLED=false and INDEX_ENABLED=false. Do not commit secrets. Only add a custom-domain route after the host and authority are verified.
3. Apply migrations to the dedicated DEV database only. Deploy through authorized Cloudflare access after tests pass, verify /health, /, /news-sitemap.xml and unauthorized /api/publish.
4. Store the publisher secret using Cloudflare secret management; use a dedicated authorized publisher. Enable writes only after the previous writer is disabled or an isolated fixture-only test is explicitly separated. Never publish fixture articles publicly. Verify a real approved original article through POST /api/publish and independent GET of the returned URL. Replaying identical input preserves publication time; changed data at the same slug returns 409.
5. Confirm homepage, RSS and sitemap reflect the article. Production cutover requires a controlled single-writer switch, public URL and canonical verification, and explicit indexing enablement. DEV stays noindex. No Vercel or email infrastructure involvement.

## Remaining work

Real D1 integration and deployment are unverified. Automated research/writing, persistent READY queue with retries, corrections, photo rights workflow, synchronization and production cutover still require implementation and tests. The current Worker uses original SVG illustrations, not documentary photos. No automatic publishing schedule or runtime producer is supplied by this package yet.
