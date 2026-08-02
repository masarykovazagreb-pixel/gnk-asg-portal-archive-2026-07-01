# Canonical regression evidence — 2026-08-02

Detected after merge of PR #932 on `main`.

Affected EN routes:

- `/en/commentary/a-supplier-who-does-not-share-data-is-not-a-partner/`
- `/en/commentary/data-without-an-owner-is-not-an-asset/`
- `/en/publications/cyber-insurance-terms-and-exclusions/`

Observed defect: canonical, `hreflang=en`, Open Graph URL and Article JSON-LD URL point to invalid `/en/en/<slug>/` paths instead of the actual static routes.

Required correction:

- commentary routes must use `/en/commentary/<slug>/`;
- publication routes must use `/en/publications/<slug>/`;
- generator/translation workflow must reject any canonical containing `/en/en/`;
- SEO rollout remains blocked until the affected pages and generator contract are corrected.

Mail, Cloudflare, DNS, routes, bindings and secrets are outside the scope of this evidence record and must not be changed.
