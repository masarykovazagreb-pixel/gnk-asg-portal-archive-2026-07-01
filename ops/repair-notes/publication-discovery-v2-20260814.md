# Publication & Discovery V2 repair

Scope: canonical host, scheduled/published gate, sitemap generation/validation, 4/4 blog health, freshness guards. No production deploy until exact-SHA approval and verification.

- Masarykova `main` is the only production source of truth; active mirror execution is retired.
- `apps/portal/data/editorial-registry.json` is the canonical editorial authority.
- `scripts/lib/publication-gate-v2.mjs` separates published content from scheduled/held content for sitemap, blog and social consumers.
- `editorial-sitemap.xml` is deterministic and its sitemap-index lastmod follows the published corpus.
- Blog parity is Blogger, Dev.to, Tumblr and Telegraph (4/4).
- SOCIAL LIVE remains off.
- Freshness states are `fresh`, `stale` or `error`; stale data is never reported as OK.
