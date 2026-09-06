# MASTER ASG — 99% Operational Backlog

Updated: 2026-09-06
Target: verified 99%, not estimated 99%.

## P0 — execution and freshness
1. Restore GitHub Actions runner execution; investigate why scheduled jobs fail with zero steps/runner assignment after 2026-09-01.
2. Re-run and verify Image Health Scan to success after runner execution is restored.
3. Re-run and verify Generate Digital Workforce Newsroom Pages to success.
4. Verify GNK ASG Automation SLA Watchdog executes again and reports current state.
5. Restore AKTUAL/news scheduled refresh cadence and verify current news-automation-status.json timestamp.
6. Restore weather refresh and clear stale weather state.
7. Restore market/digital-assets refresh and verify fast_market_status.json against current cadence.
8. Regenerate freshness-status.json only from current source timestamps and require overall=fresh before green status.

## P1 — publication, workforce, SEO/indexation
9. Verify Digital Workforce worker/public API health and current worker inventory.
10. Verify Digital Workforce newsroom HR static generation and canonical URLs.
11. Verify Digital Workforce newsroom EN static generation and hreflang symmetry.
12. Rebuild sitemap.xml and sitemap-index.xml after publication recovery.
13. Rebuild editorial-sitemap.xml and validate all current editorial/newsroom URLs.
14. Rebuild image-sitemap.xml and validate referenced image URLs.
15. Run image health audit for broken, missing, duplicate and non-indexable images.
16. Audit title/meta description/canonical/robots across key public routes.
17. Audit structured data/schema validity for Organization, Article and relevant entity pages.
18. Strengthen entity SEO coverage for Nermin Sefić / Nermin Sefic with consistent canonical naming and sameAs where verified.
19. Strengthen GNK ASG entity SEO and internal linking from authoritative public pages.

## P2 — regression, observability and closure
20. Add/verify regression checks so publication jobs cannot silently fail without surfacing stale state.
21. Verify public-route health for AKTUAL, market, Digital Workforce, entity pages and language variants after every P0/P1 change.
22. Close only with evidence: current main SHA, successful Actions runs, fresh source timestamps, valid sitemaps and no P0/P1 failures.

## Current incident note
- main HEAD advanced to 2831fd72969d9a1f25c2ffdcf998adb59e61a1da on 2026-09-06 with this operational backlog; no automation-generated content commit has advanced main since 2026-09-01.
- freshness-status.json is still generatedAt 2026-09-01T19:55:37.235Z and overall=stale; weather was already stale at generation time.
- news-automation-status.json is still updated_at 2026-09-01T21:55:37+02:00 despite a configured six-times-daily cadence, so AKTUAL/news freshness is not currently healthy.
- 2026-09-06 Image Health Scan run 34020265439 was retried; attempt 2 failed immediately with zero executed steps.
- Digital Workforce Newsroom run 33958603031 was retried again; the latest attempt also failed immediately with zero executed steps.
- Two independent workflows failing before any step executes materially strengthens the diagnosis of a GitHub Actions execution/runner/account-level incident rather than an application-script defect. Do not modify generator application code until the execution layer is restored or GitHub provides a concrete job-level error.
