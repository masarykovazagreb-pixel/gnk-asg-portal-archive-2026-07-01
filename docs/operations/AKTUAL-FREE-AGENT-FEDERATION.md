# AKTUAL MEDIA — ZERO-COST agent network & media federation (2026-10-22)

## Operating truth
- Canonical repo: `masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01`.
- Brand: **AKTUAL MEDIA**; search alias **Aktual mediji**. Existing publication identities must remain discoverable.
- **15 Croatian national source desks** and **8 native-language city desks** create 23 supervised, executable observational roles, not 23 independent Cloudflare Workers. They run **150+ machine-checkable microchecks** in one existing four-hour workflow. The exact executed count is in `artifacts/aktual-editorial-network/report.json`.
- No added scheduled workflows, new Cloudflare Workers, paid models, paid translation service, or cloned full texts. GitHub workflow runs still consume monthly Actions quota: zero subscription fee does not mean unlimited compute.
- The newsroom packets contain citations, source date, a short excerpt, an original reporting angle and language metadata. **They are HOLD research prompts, not original finished articles or approved publications.** Do not misrepresent a source-linked draft as verified reporting.
- All 8 city desks: Zagreb/hr, Beograd/sr, Sarajevo/bs, Budimpešta/hu, Ljubljana/sl, Rim/it, Sofija/bg, Bukurešt/ro. `apps/region/channels.json` remains source of truth for their real local feeds and landing routes.
- `scripts/aktual-free-editorial-network-v1.mjs` reads existing local regional archives on every four-hour audit. National official RSS network fetches are disabled by default; enable only `AKTUAL_FREE_FEEDS=1` in a controlled manual or quota-protected run. No HTML scraper for sites that have no verified RSS.
- `tests/test-aktual-free-editorial-network-v1.mjs` exercises all desks, checks HOLD status and verifies no external publication or paid API calls. Runner outputs JSON/Markdown evidence; it must never claim that GitHub PR, Pages redirect, or production is live without HTTP proof.

## Explicit free-tier policy
| Platform | Verified free capability | Operator boundary |
| --- | --- | --- |
| Existing Cloudflare Pages `.pages.dev` | Free plan documented at 500 builds/month/account and one concurrent build (2026-09-05 Cloudflare docs) | Prefer canonical regional content on `gnk-asg.hr/kanal/<id>/`; existing `.pages.dev` city sites are redirect stubs; do not rebuild 8 stubs for unchanged redirects |
| GitHub Pages `.github.io` | Free for public repositories on GitHub Free | New owned public repository and explicit account settings required; don't claim provisioned |
| Netlify `.netlify.app` | Free plan: hard cap of 300 credits/month and no automatic recharge | Optional low-volume publishing fallback only, not a mandatory mirror |
| Blogger/Blogspot, Tumblr, Telegraph, DEV | Existing destinations or candidate external channels | Requires verified ownership, credentials where applicable, allowed API and platform rules; existing `ops/automation-kill-switches.json` overrides publishing |
| New national-language magazines | Free static HTML with publisher attribution, source links, canonical to main | Start as local static builds, never claim an external domain until host returns successful published URL |

Official current provider references:
- https://developers.cloudflare.com/pages/platform/limits/
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://www.netlify.com/pricing/

## Free-tier budget and safety
1. Monthly GitHub Actions working ceiling is **1,000 minutes**. Favor reuse of existing four-hour orchestration, no new cron for each city or source.
2. **Zero new paid API calls.** Previous optional Exa/OpenAI automation step has been removed from the orchestrator in this branch. Connected ChatGPT apps are not reusable GitHub API secrets.
3. Avoid creating 150 deployed Workers: instead use 150+ strictly bounded checks/process roles in a single runner. A deployed Worker requires separate Cloudflare bindings, routing/security verification, quotas and ownership; tasks do not.
4. Avoid redundant `.pages.dev` builds. A production deployment gating optimization for unchanged 301 stubs requires a separately reviewed PR/workflow update; it is **not deployed** as part of this media runner.
5. Mirrored posts should be short, genuine edited previews linking to the canonical GNK ASG article. No spun translations, title-only doorway pages, duplicate full posts, spam hashtags or copied images without rights.
6. Every public-ready article needs actual publisher, original author only when verified, language-specific title/description/alt, linked primary sources, appropriate AI disclosure, no protected private information, and documented human/editorial checks when required.
7. Public proposal previews may only expose already-safe content. The Admin Center localStorage decisions alone are not server audit evidence and cannot start a 30-minute timer. On-time and contentHash must be immutable; rejection/hold overrides any clock.
8. Production requires existing release gate and independently verified exact-SHA, public HTTP 200 and canonical page. The `portalPublish=false` switch may not be overridden by these agents.

## Immediate next milestones
- **INF-01:** Connect existing `/admin-center/editorial-approval/` and regional desks to a *durable, authenticated* moderation API. Prove actual review delivery, content digest and rejections before timing anything. Public overview should show only safe metadata; never expose confidential drafts.
- **INF-02:** Implement measured 30-minute low-risk review states, and a separate explicitly authorized publication lane for original editorial text where the source and human-review gates are truly satisfied. No silent approval of author identity.
- **REG-01:** Diagnose failed official RSS URLs from recorded `apps/region/data/_status.json` and replace only with empirically verified publisher feeds, not guessed URLs.
- **REG-02:** Native-language writing, native-speaker review cues, locale-specific dates and hreflang; only original licensed art. Remain HOLD pending publication gate.
- **SEO-01:** Validate page-level canonical, hreflang/alternates, sitemap, JSON-LD news organization identity, image rights and public HTTP 200.
- **FREE-01:** Investigate reducing redundant deployments of unchanged regional `.pages.dev` 301 redirects under an explicitly reviewed workflow change.
- **PROOF-01:** For each publicly claimed post, store its URL, exact deployed source SHA, independent GET timestamp, HTTP status and editorial evidence. Missing proof means NOT VERIFIED.

This is a concrete free-tier-first architecture and executable audit, **not** a claim that 150 live autonomous Worker instances, an editorial Infocentar publication timer or new third-party sites are already live.
