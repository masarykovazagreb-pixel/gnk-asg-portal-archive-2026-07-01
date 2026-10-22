# AKTUAL MEDIA — SEO discovery / information architecture
Date: 2026-10-22
Status: code changes in review branch; **NOT LIVE** until approved exact-SHA deploy and public HTTP verification.

## Source of truth
- Canonical writer: `masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01` `main` (not the backup repositories).
- Follow `docs/ACTIVE-SOURCE-OF-TRUTH.md`; merger of this branch does **not** publish production.
- This is a technical discoverability project, not a new editorial AI publication and not a claim of Google indexing.

## Measured baseline
Third-party Ubersuggest snapshot of **the whole gnk-asg.hr domain**, not a dedicated AKTUAL MEDIA property:
- Domain authority: **2/100**.
- Backlinks: **6** from **1** referring domain; **6 follow**, **0 nofollow** (tool estimate).
- Ranking organic keywords: **26**; estimated monthly organic visits **506**, latest accessible month **September 2026**.
- Detailed backlink inspection did not complete; free-plan daily report quota was exhausted. Do not invent source URLs or individual anchor links. Continuation requires quota reset or a higher Ubersuggest limit (https://ubersuggest.com/en/pricing).

Sitemap inventory collected directly from 19 files in the active source tree on 2026-10-22 (before this patch):
- 4,515 `<loc>` entries; **4,463** distinct loc URLs (one off-host URL included).
- Eight regional channel sitemap counts: Zagreb 440, Beograd 438, Sarajevo 442, Budimpešta 439, Ljubljana 442, Rim 439, Sofija 440, Bukurešt 441. **3,521** regional loc entries total.
- Editorial sitemap 521, primary 183, visual 168, gallery 63, editions 21, data desk 10, other specialized maps.
- Sitemaps list candidate URLs, **not** verified indexed pages, search ranks, unique HTML files, or verified internal backlinks. Cross-sitemap duplication can be intentional.

## Corrected in this change
1. `NewsMediaOrganization` for **AKTUAL MEDIA d.o.o.** now consistently uses `https://gnk-asg.hr/gnk-aktual/#news-organization`. The GNK ASG corporate `WebSite` publisher keeps its own `https://gnk-asg.hr/#gnk-asg` identity. This prevents two organizations from being modeled as one entity.
2. In eight city edition homepages, fix broken Open Graph locale `undefined` with valid locale pairs: `hr_HR`, `sr_RS`, `bs_BA`, `hu_HU`, `sl_SI`, `it_IT`, `bg_BG`, `ro_RO`. Existing English overview receives `en_US` as alternate Open Graph locale.
3. On the AKTUAL MEDIA news homepage, consolidate two competing `CollectionPage` JSON-LD blocks; correct structured `ItemList.numberOfItems` to match actual entries; associate it with the media publisher and a discoverable Zagreb channel RSS feed.
4. Link all city editions, nine topic desks, the radio, channel network, gallery and data desk within the editions' structured `ItemList` (21 linked destinations). These reflect real, existing site routes and are not synthetic backlinks.
5. Make the data desk and radio use the same newsroom entity and social page identity.
6. Remove an off-host `gnk-asg-tjednik.pages.dev` URL from `gnk-asg.hr` editions sitemap; add missing local `/kanal/` and `/radio/` routes. The third-party tjednik must be audited separately; do not canonicalize it to the parent domain without an actual hosted replacement.
7. Add a read-only regression test: `node tests/test-aktual-media-discovery-v1.mjs`.

## Validate before any merge/deploy
- Run the read-only regression test and the repository's existing SEO/AI governance tests on the PR SHA. Review generated `apps/portal/kanal/**` output for future jobs that can overwrite regional homepages.
- Run a controlled comparison of the PR tree against `main`; keep editorial text and frozen corporate sections unchanged.
- After separately approved exact-SHA deployment, verify public HEAD/GET responses for `/gnk-aktual/`, `/izdanja/`, `/kanal/`, all eight regional roots, `/radio/`, and `/aktual-media/`, their canonical/hreflang/OG/schema/robots responses, and nested sitemap locations.
- In Google Search Console inspect actual coverage for representative news and city `/clanak/` pages, `/gnk-aktual/`, and media route pages. Submit `https://gnk-asg.hr/sitemap-index.xml` if needed and check duplicate canonical, alternate language, discovered-not-indexed, crawl errors, noindex and rendered content. Indexing depends on Google and cannot be guaranteed.
- Compare search appearance for exact-brand queries `Aktual Media`, `AKTUAL MEDIA KANAL`, `AKTUAL MEDIA RADIO`, `Aktual Media Zagreb` and target article queries, over time. Separate brand query visibility from organic traffic and Discover appearance.
- Focus off-site visibility on authentic independent mentions, journalism citations, verified organization/business listings, legitimate social profiles and high-value syndication with attribution. **Do not** buy backlinks, add hidden link networks or mass hashtag spam; HTML keyword tags do not force Google ranking.

## Risks and follow-up
- Channel articles include source-linked analyses and automated excerpts. Do not use `NewsArticle` structured data to falsely imply independent reporting or human editorial review; obey the existing AI transparency and attribution rules.
- Static SEO patches can be overwritten if a generator regenerates the same paths. Ensure future generators pass the read-only regression test; investigate/fix the source on first recurring failure.
- Keep external backlink counts distinct from internal links and sitemap counts; do not infer the former from the latter.
- No change in this PR proves that Cloudflare has deployed or that Google has indexed content.
