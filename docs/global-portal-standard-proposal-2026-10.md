# GNK ASG / AKTUAL MEDIA — global portal contract (proposal)

Status: design-only; not a production publication or approval to deploy.

## Identity and design
- GNK ASG is the common corporate navigation and design shell; AKTUAL MEDIA retains a distinct newsroom layout.
- All owned non-AKTUAL properties use the same responsive header, footer, accessibility standard and navigation back to gnk-asg.hr.
- Use the existing red ASG favicon asset only on properties whose brand ownership and permission are verified. Do not claim a relationship with a third party without evidence.
- A country/edition is not labelled LIVE until its external URL, ownership, HTTP response and editorial owner are verified.

## Edition registry
Record country (ISO 3166), city, BCP-47 language, canonical URL, host, control/ownership verification, last HTTP verification, feed provenance, publication status, original article URL, and AI assistant configuration. The AKTUAL MEDIA home page displays only verified live editions and explicitly labels planned editions.

## Publishing pipeline
- One canonical news writer on main; no feature-branch writer scheduling. Keep six existing UTC refresh times and release fence.
- Every article stores origin URL, author where supported, originating publisher, fetch date, editorial verification and licence/reuse rights.
- Republish own original content across editions through linked, localized summaries or authorised translations. No bulk copying of third-party articles or images without rights.
- Distinguish syndication, translation, excerpts and editorial opinion. Human approval before controversial, legal, political or potentially defamatory publication.
- Source HTTP 403/429: classify and respect restrictions; never bypass. Stale data must remain labelled stale rather than silently refreshed.

## AI assistants
Each edition may expose a dedicated assistant with locale-specific retrieval, clearly marked as AI, a documented scope, cited source links and a human editorial escalation. Assistants cannot autonomously fabricate facts, send mail, publish allegations or overwrite canonical archives.
Exa may power evidence discovery through a server-side integration if credentials and permissions exist; do not imply an existing integrated agent or expose Exa keys to browser code.

## SEO and assets
Use a unique canonical URL, hreflang pairs only where real equivalents exist, accessible localized title and description, sitemap, robots, verified social card and the shared verified favicon. Use Organization/Person structured data with true role attribution, not fabricated authorship. Hashtags are for social distribution, not a substitute for SEO. Do not inject Nermin Sefic as author of material they did not author; editor role only where evidenced.

## Release acceptance gates
1. Verify repository root and exact reviewed main SHA.
2. Green CI for changed templates and source contracts; no changes to credential files.
3. Single writer and release fence intact; explicit exact-SHA deploy authorization.
4. External HTTP 200 tests on representative pages, favicon, sitemap, canonical and return navigation.
5. Public verification of updated content and attribution after production deployment.

## Rollout
Start with inventory and one representative external portal; validate against accessibility, responsive, attribution and link criteria. Then roll out shared templates per verified owned site. Add Berlin and additional countries only after a controlled URL and editorial source map are established. No artificial 200-country claims.
