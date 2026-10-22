# AKTUAL MEDIA — Global Free Distribution (2026-10-22)

## Purpose
Extend, **not replace**, the four existing mirrors (Blogger, DEV.to, Tumblr and Telegraph).
New international channels prepare per-language link previews with original author,
original canonical article, editor as **role only**, and an owned image where allowed.
AKTUAL MEDIA is the editorial network. GNK ASG's corporate identity is preserved.

## Existing 4 (do not claim new publishes without a provider receipt)
- Blogger: https://nermin-sefic.blogspot.com/
- DEV.to: existing mirror account via authenticated API
- Tumblr: https://nermin-sefic.tumblr.com/
- Telegraph: https://telegra.ph/
These remain governed by `.github/workflows/blog-mirror-publish.yml`.
The October-22 main branch's committed snapshots record **361 Blogger, 184 DEV.to,
184 Tumblr and 11 Telegraph** post receipts. This is a repository snapshot,
**not** a fresh, independently verified live count. Some evidence can be older
than the state branch; preserve the state branch as source of truth.

## New surfaces
| Service | Intended material | Integration | Required owner step |
|---|---|---|---|
| [Bluesky](https://bsky.app/) | Brief posts, original media images, canonical links | AT Protocol | Create account and set BSKY_HANDLE / BSKY_APP_PASSWORD secrets |
| [Mastodon](https://joinmastodon.org/) | Stories as brief localized status + link + image | OAuth user token, instance API | Create an account on an approved instance; MASTODON_INSTANCE / MASTODON_TOKEN |
| [Pixelfed](https://pixelfed.org/) | Owned illustration/photograph + caption and canonical | Instance API | Image account, PIXELFED_INSTANCE / PIXELFED_TOKEN |
| [WordPress.com](https://wordpress.com/) | Brief localized article excerpt + image + original canonical | WordPress.com REST API | WordPress site and WORDPRESS_SITE_ID / WORDPRESS_ACCESS_TOKEN |
| [Substack](https://substack.com/) | Longform editorial and newsletters | **Manual package only** | Account login and editor publication |
| [Medium](https://medium.com/) | Attributed manual import of original article | **Manual package only** | Account login; new official integration tokens no longer available |

Official reference documentation:
- https://docs.bsky.app/docs/tutorials/creating-a-post
- https://docs.joinmastodon.org/methods/statuses/
- https://docs.joinmastodon.org/methods/media/
- https://developers.pixelfed.org/api
- https://developer.wordpress.com/docs/api/1.1/post/sites/%24site/posts/new/
- https://help.medium.com/hc/en-us/articles/213480228-API-Importing
- https://hashnode.com/changelog/2026-05-13-graphql-api-paid-access

Hashnode cannot be classified as free API publishing after May 2026, therefore it is **not** added to the free writer. Services with no reliable/public authentication-free writer are not misrepresented as automatically publishable.

## Multilingual regions
15 language-specific **intros and link labels**, not invented full translations:
HR / SR / BS / HU / SL / IT / BG / RO / EN / DE / FR / ES / PT / TR / JA.
Coverage includes Balkan/regional EU, broader European markets, English-language
audiences across six continents, Iberian and Latin American markets, Lusophone
Brazil and Africa, Francophone Canada and Africa, Türkiye and Japan.

If the source article is in Croatian, the original headline and URL remain in
Croatian on every localized teaser. It must **never** be advertised as a full
Spanish/French/Japanese translation. A separate approved editorial translation
pipeline is required for native-language full text.

## Safe local preview
Run from repo root (Node.js 24):

```sh
node --check scripts/aktual-global-distribution-v1.mjs
node tests/test-aktual-global-distribution-v1.mjs
node scripts/aktual-global-distribution-v1.mjs \
  --article /gnk-aktual/kolumne/tisina-nakon-pitanja/ \
  --platforms bluesky,mastodon,pixelfed,wordpress,substack,medium \
  --languages en,es,fr
```

The preview is written to `artifacts/distribution/aktual-global-preview.json`
only, with **no external posts**. It uses original owned editorial routes, a
canonical URL matching the source, published date and attributable Article
schema. Assets are restricted to known same-domain editorial/generated/image
paths; URL ownership does **not** by itself guarantee legal image rights.
Review the source's actual image licence before activating live delivery.

## Activation / audit trail
- `Actions → AKTUAL MEDIA - Global Multilingual Distribution → Run workflow`.
- First use `confirm_live=false`; check the uploaded preview artifact.
- Connect accounts through **GitHub Actions repository secrets**, never put
  access passwords or OAuth tokens in prompts or files.
- Require `GNK_ASG_EXTERNAL_DISTRIBUTION=true`, explicit
  `confirm_live=true` for each run, and no more than **three** account/language
  publications per run. The system never schedules external publishing.
- For live runs the authorizations and a live HTTP 200 canonical are checked.
  Provider URLs are recorded ONLY after a confirmed API success.
- Deduplication is by SHA-256 of platform + language + canonical URL. Receipts
  go to `automation/aktual-global-distribution-state`, **never to production main**.
- Verify the URLs independently; API success is not Google indexing or audience reach.
- Each platform/instance is governed by its own moderation, image, post and rate
  limits. Avoid automated irrelevant posts, follow/unfollow manipulation, paid
  backlinks or publication into communities without editorial permission.

## Current operational status
The new connector code and workflow are **proposed changes in a GitHub feature
branch**, not live channels. No new provider account was created, connected or
authenticated in this implementation. A user must connect each external account
before it can publish. Existing four distribution channels are unchanged.

## Critical canonical and attribution boundaries
- Source `/kanal/{city}/clanak/{slug}/` stories often cite external journalism.
  These are excluded from this first international mirror writer to protect
  attribution, copyright, and local publishers. Share a short editorial link to
  them where appropriate, never bulk copy third-party reporting.
- `Nermin Sefić` is an editor; personal authorship is **only** shown if verified
  in the original article's visible byline and structured data.
- Original corporate content remains GNK ASG-owned even when AKTUAL MEDIA
  distributes an editorial teaser. No false publisher/author attribution.
- HTML keyword tags and hashtags are not a substitute for authoritative
  original reporting, relevant backlinks, indexing, speed and accessibility.
