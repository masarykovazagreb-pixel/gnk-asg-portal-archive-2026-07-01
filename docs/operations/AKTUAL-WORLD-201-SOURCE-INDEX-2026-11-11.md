# AKTUAL MEDIA WORLD 201 — source and index integrity (2026-11-11)

## Editorial direction
Priority external world preview, nominated by owner: https://j1hex9qg03f0-d.space-z.ai/

As at this review the host could not be fetched from available public lookup tools. The URL is linked prominently from the AKTUAL MEDIA homepage and country directory, but an operational article feed, source rights and media-use permissions have **not** been verified. It must never be treated as a confirmed news import endpoint solely because a link exists.

## Primary canonical network
- World directory: https://gnk-asg.hr/gnk-aktual/media/
- Per-country pages: `/gnk-aktual/media/{slug}/` — 201 pages
- City pages: `/gnk-aktual/grad/{slug}/` — 10 pages
- Existing source inventory: 435 configured entries (not 435 verified active connections)
- Nested sitemap: https://gnk-asg.hr/gnk-aktual/media/sitemap.xml — 212 URLs (directory + 201 + 10)
- Sitemap discoverability via `/sitemap-index.xml` and `/robots.txt`
- Own branded image: `/assets/editorial/aktual-media-800.webp`. Do not use third-party article photographs without permission.

## Source integration contract
`apps/portal/data/aktual-world-external-source-v1.json` records the high-priority candidate. Status remains `pending_external_verification`, `feedUrl=null`, article-body and remote-image copying disabled.

`node scripts/probe-aktual-world-external-v1.mjs` performs an offline config check.
`node scripts/probe-aktual-world-external-v1.mjs --probe` performs a single read-only HTTPS probe on the exact nominated host and discovers only declared same-origin RSS/Atom/JSON Feed links. Probe records connectivity and discovery metadata; it never publishes, copies images, or scrapes full text. The existing scheduled world-source refresh logs its advisory result without making the other sources dependent on this host.

**Required before actual live ingestion:** independently confirm access and RSS/Atom/JSON feed URL or documented API; verify whether the site is owner-controlled; obtain permitted fields, source attribution, legal authorization to reuse text/images, destination country taxonomy and publication timestamps. Then add parser fixtures, schema validation, provenance records, source-level rate limiting and editorial review into existing single-writer queue. Canonical URLs of original third-party articles must not be replaced by preview-host URLs.

## Sitemap and release
An older sitemap generator previously rewrote `sitemap-index.xml` to four static entries, potentially removing nested world and regional sitemaps. It now discovers existing valid sitemap XML files and fails when the 201-country directory sitemap is missing. The country/city generator preserves a lastmod on the actually updated directory page only, not invented updates for all country pages.

Run read-only checks:
- `node scripts/test-aktual-world-source-index-v1.mjs`
- `node scripts/test-aktual-world-directory-v1.mjs`
- `python3 -m py_compile scripts/generate-sitemaps.py`
- `node --check scripts/probe-aktual-world-external-v1.mjs`

Do not use `generate-sitemaps.py` without reviewing the resulting wide diff. Do not merge failing PRs or claim live indexing from a commit alone. Deploy exact approved SHA through `.github/workflows/deploy-admin-auth-v6.yml` and validate production URLs, canonical tags, sitemap HTTP responses, crawler access and generated content separately.

Search-engine indexing/rankings are not guaranteed. Thin country pages need genuinely distinctive, sourced information before expecting all 201 to rank.
