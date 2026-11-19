# AKTUAL MEDIA — 201 English companions (country source directories)

**Scope implemented:** The existing generator produces 201 additional source-directory pages at `/gnk-aktual/media/<country-slug>/en/`. Each has actual English-language editorial text, its own canonical, `<html lang="en">`, search/social metadata, responsive design, original source-directory explanations, and an English/Croatian language switch. The existing 201 country pages gain visible English links and reciprocal hreflang, without replacing corporate layers or existing headline blocks. The generated directory sitemap registers both actual URLs, with reciprocal xhtml language metadata.

**Accuracy:** The existing base country catalogues were written in **Croatian** regardless of the local country language stored in the registry. We **must not** tell crawlers that Croatian text is Japanese, German, Arabic etc. The remaining requirement is to translate/localize primary national pages to each verified country language; only after those actual pages are present should the primary hreflang be changed from `hr` to the appropriate local language. Country language != page language. This PR does **not** provide independent English translations of 201 countries' full news articles; these are English source directories, not news articles.

**No content theft:** No copied article bodies, photos, invented headline claims, auto-approved AI articles, or unverified sponsorships. Source entries are external publisher links; rights and availability still need checking.

## Tests and release

Run `node --test tests/test-aktual-world-v1.mjs`. The test builds all 201 pairs into a temporary folder, confirms reciprocal language links, checks responsive English output and checks the exact URL count (201 x 2 + 10 cities = 412). Then run global CI. The existing `aktual-world-source-refresh-v1.yml` workflow stages generated HTML in a review PR, without merging or deploying; this is NOT confirmation of production rollout. Verify live production URL and SHA through VPS/Cloudflare release gates.

Related: issue #464 (201 original local newsroom agents), PR #466 (source research planner), PR #432 (cinematic newsroom).