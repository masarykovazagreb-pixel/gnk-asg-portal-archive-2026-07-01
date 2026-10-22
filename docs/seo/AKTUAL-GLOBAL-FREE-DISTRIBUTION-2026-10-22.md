# AKTUAL MEDIA — international free distribution (2026-10-22)

## /AUTOPSY — verified channel state

Primary newsroom: https://gnk-asg.hr/gnk-aktual/; AKTUAL MEDIA is the editorial brand. GNK ASG corporate identity, canonical URLs and existing SEO/meta remain unchanged.

Four previously configured long-form mirror destinations:
- Blogger: https://nermin-sefic.blogspot.com/ — **361** recorded historic post URLs
- DEV.to: https://dev.to/nermin-sefic — **184** recorded historic post URLs
- Tumblr: https://nermin-sefic.tumblr.com/ — **184** recorded historic post URLs
- Telegraph: https://telegra.ph/ — **11** recorded historic post URLs (per-state enumeration only)

These 740 records came from `apps/portal/data/{blog-content,devto-content,tumblr-content,telegraph-content}/published.json` in GitHub on October 22, 2026. They are **not** individually verified HTTP URLs, nor a claim of 740 current/this-week publications. Unified original external mirror is `.github/workflows/blog-mirror-publish.yml`, **manual-only** with both per-run confirmation and `GNK_ASG_EXTERNAL_DISTRIBUTION=true`. The content queue is not an automatic owner approval. Do not disable this gate.

## Additional free international API channels (implemented)

| Channel | Typical audience | Content | Requirements | Actual post evidence |
|---|---|---|---|---|
| Bluesky | Global, including Americas/Asia | Native short text and owned JPG/PNG/WEBP picture with alt text, clickable canonical | Free account; GitHub secrets `BSKY_IDENTIFIER` and `BSKY_APP_PASSWORD` | Created record + public record read-back + `bsky.app/profile/<DID>/post/<rkey>` |
| Mastodon | Federated global instances, including EU and beyond | Native short text, tags, owned photo and alt text | Free account/instance; GitHub variable `MASTODON_INSTANCE_URL` (e.g. `https://mastodon.social/`) and secret `MASTODON_ACCESS_TOKEN` with `write:statuses` and `write:media` | POST status and GET status API; permanent returned status URL |
| WordPress.com | Global long-form and images | Manual editorial cross-posting; suitable for additional authorized blogs and languages | A WordPress.com site and signed-in editor/OAuth are required; NOT automatically configured in this change | None (not connected) |

### Geographic / language coverage

- Eight **real original-language editions** already exist: Croatian, Serbian, Bosnian, Hungarian, Slovenian, Italian, Bulgarian, Romanian.
- Engine can produce a concise, accurate *distribution introduction only* in **19 languages**: the above eight plus English, Spanish, Portuguese, French, German, Japanese, Chinese, Vietnamese, Indonesian, Arabic, Swahili.
- Regional news headlines and article bodies are **not translated** by this automation. Localized intros must not be represented as full translations. A future translator must preserve facts, names, source citations, editorial review and local style before publishing actual translated articles.
- Platforms are worldwide networks. Running a post in Japanese/Chinese/Portuguese doesn't guarantee local search results, local moderation eligibility or audience in that geography.

## Workflow and operating instructions

1. `Actions → AKTUAL MEDIA — Global Free Distribution → Run workflow`.
2. Default: `confirm_external_distribution=false`. This creates a multilingual JSON preview as an Actions artifact, **no external publication** and no platform secrets are accessed.
3. For live, connect at least one account (Bluesky/Mastodon), set GitHub repository variable `GNK_ASG_EXTERNAL_DISTRIBUTION=true`, review source content and explicitly set `confirm_external_distribution=true` for that run. Enter languages such as `source,en,es,pt,ja,zh,vi`. The writer uses at most **3 languages per source article** and at most **4 posts per connected platform in one run** (default 2).
4. Main SHA must still equal the manually approved workflow SHA. No automatic cron, no push-based external publishing and no new release bypass.
5. Only already-live `https://gnk-asg.hr/...` source articles with 200 HTML are eligible for external publishing. Foreign-origin photos **must not be rehosted**; image upload only for approved internal `/assets/**.jpg/png/webp` and permitted sizes. SVG remains linked on the original site, not uploaded as an unsupported blob.
6. Record each external API result by **platform + article canonical URL + language**, with an immutable key, output ID and human URL. Public object is read back before counting a verified publication. Unconfirmed posts are recorded as `pending_verification` to avoid blind retries. State persists on `automation/global-distribution-state` only, never on production `main`.
7. After a successful real publication, read `last-report.json` and Actions summary to obtain the **actual new post URLs**. Do not count preview links, planned destinations, upload-only image IDs or unpublished source pages as completed cross-posts.
8. Favor a modest curated selection and originals with citations, not 3,500 near-identical regional copies. The original article stays canonical. No bought backlinks, mass comment spam, sockpuppets or unauthorized media reuse.

## Reference policies

- Bluesky: https://docs.bsky.app/docs/tutorials/creating-a-post and https://bsky.network/docs/tutorials/creating-a-post
- Mastodon: https://docs.joinmastodon.org/methods/statuses/ and https://docs.joinmastodon.org/methods/media/
- WordPress.com REST: https://developer.wordpress.com/docs/api/getting-started/
- Medium official: https://help.medium.com/hc/en-us/articles/213480228-API-Importing — new API integrations not issued.
- Hashnode 2026 Pro: https://hashnode.com/changelog/2026-06-11-introducing-hashnode-pro — automated publishing requires Pro, not a free new integration.

## Security finding requiring owner action

`apps/portal/data/telegraph-content/published.json` previously contained a live-looking `accessToken` field in a tracked file. The new PR **removes that field from current tracked content without repeating its value**, preserving 11 publication entries. **This does not remove the token from Git history or distribution state branches.** The Telegraph account owner must revoke/rotate the old token and move the new one into secured GitHub Secrets or an approved secret manager; do not re-commit it. Treat any previous token as compromised. See https://telegra.ph/api#revokeAccessToken. Do not perform a token rotation using a token pasted in chat.

## Priorities and acceptance criteria

- **Phase 1:** Preserve Blogger/DEV.to/Tumblr/Telegraph exactly as-is; enable reviewable packages for the 2 new global platforms.
- **Phase 2:** Account linking/authorization by owner. No invented accounts or post URLs.
- **Phase 3:** First 2 real verified URL publications with at least one owned image, then controlled multilingual expansion to selected original-language and approved additional language posts. Re-measure external links and referral traffic after publication, not just submitted counts.
