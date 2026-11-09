# GNK ASG — SEO / ASG favicon / Internal links / Earned backlinks
**Working PR:** #405, branch `feat/sitewide-semantic-seo-20261109`. **Not production-deployed.**
**Source check:** 2026-11-09, Ubersuggest estimates: Domain Authority 2/100; 7 backlinks; 2 referring domains; approximately 672 estimated monthly organic visits (data month 2026-10); 3 tracked organic ranking keywords (language filtering may differ). External estimates are not Google Search Console.
**Observed sample external citations:** DEV Community profile /nermin-sefic → homepage; RoleFate reference to a GNK ASG publication. These sources are third-party, not controlled by GitHub changes.

## Non-negotiable SEO principles
- `meta keywords` are ignored by Google. Do not add more keywords just to boost rank; repeated hashtags are not a ranking shortcut.
- Genuine backlinks are created by **third parties** choosing to cite material. Publishing on `gnk-asg.hr` creates internal links, not off-site backlinks.
- Never pay for follow backlinks, use link farms, mass directory submission, automated link exchanges, or cross-site footer links primarily to manipulate rankings.
- Use a stable favicon path, truthful organization / author attribution, concise unique page titles and descriptions, matching canonical/og:url and valid JSON-LD.
- Do not invent article authors or assert that a corporate entity owns another without primary registry evidence.

## Applied source work on PR405
- 25 existing favicon SVGs made identical via `apps/shared/brand/favicon.svg`, including root `/favicon.svg`, `/assets/favicon.svg`, city edition copies, app/agent copies and legacy copies. Visual: red center, double gold ring, centered ASG. Also matched 192/512 PWA SVG app icons and changed `/app/` HTML favicon link to the canonical source. Existing legacy PNG/ICO fallbacks may require regeneration before those app surfaces are declared visually uniform.
- `scripts/lib/seo-topic-taxonomy-v1.mjs`: limited route-grounded hashtags with meaningful targets; publisher, author and brand links no longer all point to the editor profile.
- `scripts/lib/sitewide-meta-enrichment-v1.mjs`: add **missing only**, truthful Open Graph, Twitter card, site name, derived from the page's existing title, description and canonical. Never modify `robots`, `title`, `description`, canonical, authorship or image claims.
- `scripts/apply-network-entity-v1.mjs`: applies semantic tags and metadata after canonical page generators.
- `scripts/sitewide-seo-meta-v1.mjs`: read-only sitewide scan by default, opt-in `--write`.
- `scripts/audit-sitewide-link-equity-v1.mjs`: reports static internal inbound link counts and page candidates without mistaking them for external backlinks.
- `scripts/test-sitewide-semantic-seo-v1.mjs`: idempotence, brand links, icon consistency and no unsafe meta injections.
- `scripts/build-asg-favicon-raster-v1.py`: reproducible **binary** PNG/ICO and iOS/app icon fallbacks, derived from canonical SVG. Run locally with Pillow and CairoSVG and commit output; existing fallback binaries are not represented as updated until generated.
- `apps/portal/gnk-aktual/media/index.html`: reader-visible citation guidance with contextual links to original sources, methodology and data desk.

## Safe build and test sequence
```bash
git fetch origin main
git switch feat/sitewide-semantic-seo-20261109
node --check scripts/lib/sitewide-meta-enrichment-v1.mjs
node --check scripts/lib/seo-topic-taxonomy-v1.mjs
node scripts/test-sitewide-semantic-seo-v1.mjs
node scripts/sitewide-seo-meta-v1.mjs
node scripts/audit-sitewide-link-equity-v1.mjs
# Review number and diff samples before bulk writing!
node scripts/sitewide-seo-meta-v1.mjs --write
git diff --stat
git diff --check
node scripts/sitewide-seo-meta-v1.mjs
# Confirm zero remaining missing semantic OG/Twitter additions.
```
Canonical generators may overwrite generated pages; run them FIRST and the SEO enrichment LAST. Keep the final generated HTML in the release commit. Do not suppress gates.

## Authority-building plan (external, needs editorial outreach)
1. Prioritize genuinely original, citeable material: transparent GNK ASG financial methodology, AI governance analyses, World 201 source directory, dated editorial digests. Publish methodology and primary-source references clearly.
2. Contact relevant journalists, business-technology publishers, trade associations and research authors who cover the *specific* findings. Share a useful original canonical URL and evidence; ask for fact checking/correction where needed, not a guaranteed followed link.
3. Ensure legitimate organization/social profiles link to the exact official site if the owners can edit those profiles and the association is verified. Maintain branded, natural anchors (e.g. GNK ASG, AKTUAL MEDIA, article title), not repetitive exact-match anchor spam.
4. Track referring domains, new/lost links, indexed URL counts, and branded/organic impressions in Search Console. Ubersuggest is an external estimate only; do not count placed links until independently observed.
5. For sponsored placements use `rel="sponsored"`; for untrusted/UGC links use `rel="nofollow"` or `ugc`. Never assert a backlink was earned merely because a suggested outreach target is listed.

## Deployment safeguard
PR #405 is a draft pending review and mandatory CI. Before merging, reconcile the fast-moving `main` branch and re-run all required gates. Production deployments use ONLY approved `deploy-admin-auth-v6.yml` with the exact merged SHA and permitted environment approvals. Independently verify home favicon, `/gnk-aktual/`, `/gnk-aktual/media/`, social metadata, canonical, sitemap, mobile and app behavior. No deploy is confirmed by this file.
