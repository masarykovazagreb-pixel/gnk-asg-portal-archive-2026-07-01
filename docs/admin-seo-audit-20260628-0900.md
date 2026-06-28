# GNK ASG Admin, Mail and SEO audit — 2026-06-28 09:00

Branch: `project-50-white-integrated-menu`
Safety branch: `saved-2059`
Deployment: not performed
Real media invitations: not sent

## Branch safety

- `project-50-white-integrated-menu` is 246 commits ahead and 0 behind `saved-2059` at the audit point.
- Merge base equals the current `saved-2059` commit.
- No write was made to `saved-2059`.

## Mail delivery test

- Gmail test to `beckuphome@gmail.com`: present in Sent and Inbox.
- GMX test to `sefic20@gmx.com`: present in Sent.
- No bounce or delivery-failure message was found during the follow-up search.
- These were plain test messages, not media invitations.

## Admin Center and Mail Studio

Confirmed code-level root cause:

- Admin Center native code and a second injected legacy loader both controlled the same iframe lifecycle.
- The legacy loader now defers when native Admin Center is present.
- Admin Center now directly loads `admin-frame-bridge-v1.js`.
- The frame bridge validates the final same-origin iframe route after load and exits the loading screen when the document is available.
- Redirected modules are reported as errors rather than remaining in an endless loading state.

Remaining validation:

- A real browser preview check is required for `/admin-center/?module=mail` and `/mail-studio/?embedded=1&hubmodule=mail` after reviewed preview deployment.

## Admin route inventory

Static module present:

- `/admin-center/`
- `/mail-studio/`
- `/mail-studio-pro/` compatibility page
- `/operator-dashboard/`
- `/operator-mobile/`
- `/media-command-center/`
- `/auto-editor/`
- `/news-admin/`
- `/pdf-publisher/`
- `/memorandum-studio/`
- `/social-share/`
- `/wa-center/`
- `/review/`
- `/media-access/`

Newly resolved missing routes:

- News Admin
- PDF Publisher
- Social Share
- WA Center
- Review Center
- Mail Studio Pro compatibility route

## Media delivery safeguards

Confirmed in code:

- Test sending requires exact confirmation text.
- Test recipient must be on the configured allowlist.
- Test sending must be explicitly enabled.
- Campaign PDF must exist, have a valid PDF signature, remain below the size limit and match its SHA-256 digest.
- Production queue processing remains locked unless `MEDIA_OUTREACH_LIVE` is explicitly enabled.
- A valid successful test gate is required before production dispatch.
- Only approved, automation-allowed, non-suppressed and operationally ready contacts can be queued.
- Delivery is rate limited and processes one queued message per dispatch.
- Idempotency prevents duplicate queue records for the same contact, PDF and campaign version.

## Vijesti / News SEO

Updated on branch:

- canonical URL
- Croatian and English hreflang
- x-default
- index/follow crawler directives
- large image/snippet preview directives

Production baseline finding:

- The live `/publications/` route currently renders the same Croatian content as `/objave/`.
- The branch contains a separate English static page and a language-aware dynamic renderer.
- This correction is not live because no deployment was performed.

## Objave / Publications SEO

Updated dynamic publication layer:

- `sitemap-objave.xml` is generated from the same `publish:approved` collection used by list and detail pages.
- Both HR and EN article URLs receive reciprocal hreflang and x-default entries.
- `image-sitemap-objave.xml` is generated from approved article image variants.
- Open Graph image MIME type is derived from the actual image extension instead of being hardcoded.
- Non-renderable or unapproved articles are excluded from list pages, detail pages and sitemaps through the same validation function.

## Contact

- `/contact/` remains untouched.
- User confirmed the contact form works.

## Commits in this audit segment

- `ac0b613` — dynamic publication and image sitemaps.
- `a760ec2` — Croatian news canonical and language metadata.
- `2a37824` — English news canonical and language metadata.
- `a222d8b` — embedded module ready bridge asset.
- `65ec86d` — Admin Center frame readiness listener.
- `44551d5` — same-origin frame load fallback and redirect detection.
- `ca03695` — direct Admin Center bridge loading.
- `f249378` — Social Share route.
- `b04a52f` — WA Center route.
- `2e78c6d` — Review Center route.
- `09ab9af` — Mail Studio Pro compatibility route.

## 09:58 continuation pass

- Rechecked branch relationship: `project-50-white-integrated-menu` is 261 commits ahead and 0 behind `saved-2059`; merge base remains `saved-2059`.
- Rechecked test mail evidence: `GNK ASG test poruka 1` is present in Sent and Inbox for `beckuphome@gmail.com`; `GNK ASG test poruka 2` is present in Sent for `sefic20@gmx.com`.
- Follow-up Gmail search found no delivery-failure or bounce message matching the two test subjects.
- Reviewed `admin-frame-bridge-v1.js`: it accepts only same-origin module-ready messages from the controlled iframe, validates the expected `hubmodule`, detects redirected routes and clears the loading state when the iframe document is reachable.
- Reviewed `admin-media-security.test.mjs`: it covers admin token and signed session cookie auth, rejected expired/modified cookies, Media Access lock/use constraints, Admin module asset presence, News/Objave/Publications canonical and hreflang metadata, dynamic publication sitemaps and market sitemap/menu consistency.
- No deployment, D1 migration, SMS action, media queue approval or media dispatch was performed in this continuation pass.

## Not performed

- No production deployment.
- No D1 migration.
- No queue-approved call.
- No media invitation dispatch.
- No SMS sending.
- No destructive data change.
