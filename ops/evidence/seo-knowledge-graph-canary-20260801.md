# SEO Knowledge Graph canary — 1 August 2026

## Scope

The canary activates the SEO Knowledge Graph assets on exactly four editorial pages:

- `apps/portal/objave/upravljanje-ugovorima-o-razini-usluge-sla/index.html`
- `apps/portal/en/publications/managing-service-level-agreements/index.html`
- `apps/portal/komentari/dokumentacija-je-jeftinija-od-spora/index.html`
- `apps/portal/en/commentary/documentation-is-cheaper-than-a-dispute/index.html`

## Activated assets

- `/assets/seo-knowledge-graph-v1.css?v=20260801`
- `/assets/seo-knowledge-graph-v1.js?v=20260801`

## Corrected URL integrity defect

The English commentary previously declared `/en/en/documentation-is-cheaper-than-a-dispute/` as its canonical, English hreflang, Open Graph URL and JSON-LD URL although the physical route is `/en/commentary/documentation-is-cheaper-than-a-dispute/`.

All four URL signals now match the physical static route:

`https://gnk-asg.hr/en/commentary/documentation-is-cheaper-than-a-dispute/`

## Guardrails

- Historical translation processing remains separate from the future automatic publishing flow.
- No Cloudflare, DNS, routes, bindings or secrets changes.
- No mail or LinkedIn live changes.
- No market, macro, GNKC or digital-asset Worker changes.
- No Blogger, Dev.to or Tumblr schedule changes.
- The materialization helper workflow was temporary and removed before opening the PR.

## Acceptance criteria

- Exactly four editorial HTML pages receive the canary assets.
- Canonical, hreflang, Open Graph and JSON-LD URL signals match the physical EN commentary route.
- Existing article metadata, images and content remain otherwise unchanged.
- All mandatory CI gates must be green before merge.
