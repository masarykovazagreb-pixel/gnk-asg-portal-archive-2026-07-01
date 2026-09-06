# MASTER ASG — 99% Operational Backlog

Updated: 2026-09-06
Target: verified 99%, not estimated 99%.

## P0 — execution and freshness
1. Restore GitHub Actions runner execution; investigate why scheduled jobs fail with zero executed steps/runner assignment after 2026-09-01.
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
18. Strengthen entity SEO coverage for Nermin Sefić / Nermin Sefic with consistent canonical naming and sameAs only where verified.
19. Strengthen GNK ASG entity SEO and internal linking from authoritative public pages.

## P2 — regression, observability and closure
20. Add/verify regression checks so publication jobs cannot silently fail without surfacing stale state.
21. Verify public-route health for AKTUAL, market, Digital Workforce, entity pages and language variants after every P0/P1 change.
22. Close only with evidence: current main SHA, successful Actions runs, fresh source timestamps, valid sitemaps and no P0/P1 failures.

## Current incident note
- Repository data refresh automation has not produced a fresh status commit since 2026-09-01; current status files remain stale on 2026-09-06.
- `apps/portal/data/news-automation-status.json` is still `updated_at=2026-09-01T21:55:37+02:00` despite a configured six-times-daily cadence.
- `apps/portal/data/freshness-status.json` is still `generatedAt=2026-09-01T19:55:37.235Z`, `overall=stale`; weather was already stale when it was generated.
- `apps/portal/data/weather-zagreb.json` is still `updated_at=2026-09-01T13:27:09.916Z` and explicitly reports `state=stale`.
- `apps/portal/data/fast_market_status.json` is still `updated_at=2026-09-01T18:21:54.970107+00:00` despite a twice-daily cadence.
- 2026-09-06 Image Health Scan run `34020265439` attempt 2 failed immediately before any workflow step executed.
- Digital Workforce Newsroom run `33958603031` has now failed through attempt 3 before any user step executed; no usable job log was produced for the latest attempt.
- GitHub's public EU status page reported Actions operational during this investigation and September 2026 history showed no platform incident. The working diagnosis is therefore repository/account execution-layer failure, not a confirmed GitHub-wide outage.
- Added `.github/workflows/actions-execution-probe.yml`: a minimal `ubuntu-latest` job with no checkout, Node, Python, secrets, or third-party actions. It is scheduled hourly at minute 37 plus manual dispatch. If this probe also fails before its first shell step, the application/workflow-generator layer is effectively excluded.
- Connector-created commits did not themselves create a push-triggered Actions run, so absence of a run on those commits is not used as failure evidence.

## Guardrail
Do not modify AKTUAL, weather, market, image or Digital Workforce application generators merely to make the dashboards look fresh. Restore execution first, then regenerate source data, then verify timestamps and public-route behavior. Stale data must never be labelled healthy.
