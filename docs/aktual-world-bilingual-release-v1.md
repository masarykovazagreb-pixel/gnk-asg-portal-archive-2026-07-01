# AKTUAL WORLD 201 — bilingual release and SEO acceptance checklist

Date: 2026-11-18. **Prepared, not declared deployed**.

## Inventory and authoring integrity

- 201 country pages in `/gnk-aktual/media/<slug>/`, currently written in Croatian, and 201 English companion directories at `/en/gnk-aktual/media/<slug>/`.
- Both pages have canonical self URLs, reciprocal `hreflang=hr` and `hreflang=en`; `x-default` points to the English page. A visible language switch must be usable with keyboard and mobile.
- Country native-language news beyond HR/EN requires independently reviewed translations and factual editorial content. The source registry's locale code is **not** a claim that Croatian directory copy was translated into all 201 local languages.
- Editorial leads from RSS are never source-verified news by themselves. No external article-body copying, no source-photo copying, no synthetic news. Editorial author and editor are distinct: an AI-supported text must not be attributed personally to Nermin Sefić unless genuine author verification exists.
- Only genuinely useful independently verified original articles are eligible for NewsArticle structured data or news sitemaps; directories use CollectionPage.

## Search index reality

- Current English sitemap includes the EN directory and 8 country directories with two or more distinct registered non-aggregator publishers. The other 193 remain `noindex,follow` until additional publisher verification and original localized editorial value are present. No quality gate may be removed simply to force 201 indexed pages.
- Sitemap XML is a discovery signal, not evidence of Google indexing or guaranteed ranking.
- Confirm HTTPS response 200, correct canonical and matching hreflang links, no accidental robots exclusion, and parity of generated assets before Search Console submission.
- Source directories may list original publisher links with proper attribution and `rel=nofollow`; that does not make them partner or sponsored properties.
- Ensure `/robots.txt` lists the English sitemap and `/sitemap-index.xml` continues to reference the existing Croatian sitemap. Do not hand-edit generated canonical editorial artifacts unless their generator is updated too.

## Actual test commands

```sh
node --check scripts/build-aktual-world-en-v1.mjs
node --test tests/test-aktual-world-en-v1.mjs
node scripts/audit-aktual-all-pages-v2.mjs
node scripts/test-nermin-author-seo-v1.mjs
node scripts/test-asg-public-seo-release-v1.mjs
```

Do not release until **all** required GitHub Actions for the **exact latest SHA** pass, including Publication Sitemap Registry Gate, Site Functional Readiness and All gates (portal). The 2026-11-16 lifestyle issue requires at least eight real source-verified curated items. A failing memory-intensive static audit must be repaired without removing its checks.

Use the approved protected exact-SHA VPS / Cloudflare release workflow; never interpret a Vercel status as the requested deployment. Check public URL, deployed revision and rollback readiness. No personal user notifications between 20:00 and 08:00 Europe/Zagreb.

Related: issue #464, PR #468.
