# AKTUAL MEDIA — "Prati cijenu" (staging, not LIVE)

**Requested:** consumer-facing portal feature on https://gnk-asg.hr/gnk-aktual/prati-cijenu/ rather than a ChatGPT reminder.

## Components
- \`apps/portal/gnk-aktual/prati-cijenu/index.html\` — accessible Croatian signup page, explicitly disabled until verified configuration.
- \`apps/portal/assets/aktual-price-alerts-v1.js\` and \`.css\` — same-origin status, double opt-in via e-mail, optional target price, variant, consent, Turnstile.
- \`workers/gnk-asg-price-alerts/src/index.mjs\` — server-only registration/confirmation, independent KV storage, subscribed daily checks, e-mail price-drop alerts, unsubscribe endpoint.
- \`workers/gnk-asg-price-alerts/wrangler.toml\` — Cloudflare-only route and UTC 07:15 cron (08:15 CET / 09:15 CEST). NO Vercel.
- \`tests/test-aktual-price-alerts-v1.mjs\` — offline guards. Run \`node --test tests/test-aktual-price-alerts-v1.mjs\`.

## Required preconditions (fail closed)
1. Review operator permissions, privacy controller, retention and data-processing agreements; verify GDPR notice. Production activation requires separately authorized privacy/legal review.
2. Provision private Cloudflare KV namespace as \`PRICE_ALERTS_KV\`; **never** put subscriber e-mails or tokens in public Git repo, branch, workflow artifacts, JSON or sitemap.
3. Provide verified \`PRICE_ALERT_FEED_API_URL\`: documented HTTPS GET \`?item_url=<encoded product link>\` with Bearer secret; verified JSON \`{productId,model,variant,condition:"new",market:"HR",currency:"EUR",priceMinor,seller,offerUrl,observedAt}\`. Source must actually match the requested item; adapter must be reviewed against real redacted samples.
4. **Separate** contractual right to compare/cache/redistribute price information from each source. \`PRICE_ALERT_FEED_CONTRACT_VERIFIED\` and \`PRICE_ALERT_REUSE_APPROVED\` must be enabled only on evidence. Existing draft PR #461 (price.download) is a *private read-only ingestion proposal*, not proof of API schema, ownership, licence or production readiness.
5. Provide approved mail adapter \`PRICE_ALERT_MAIL_API_URL\`: POST JSON \`{from,to,subject,text}\`, secret Bearer authorization, successful 2xx only on accepted delivery; set verified sender \`PRICE_ALERT_MAIL_FROM\` and \`PRICE_ALERT_MAIL_CONTRACT_VERIFIED\`. Never claim a message was sent without provider acceptance.
6. Configure Cloudflare Turnstile site key and secret; do not bypass abuse controls. Configure exact allowed retailer hostnames for HR offers (\`PRICE_ALERT_RETAILER_HOSTS\`).
7. Set secrets: \`PRICE_ALERT_FEED_BEARER_TOKEN\`, \`PRICE_ALERT_MAIL_BEARER_TOKEN\`, \`TURNSTILE_SECRET\`, \`PRICE_ALERT_TOKEN_SECRET\` (high entropy). \`TURNSTILE_SITE_KEY\` and public host allowlist may be variables.
8. Only after verified contracts, privacy and test approval: set \`PRICE_ALERTS_ENABLED=true\`, deploy the Worker at the dedicated API route, and separately publish the portal page using exact-SHA Cloudflare release gate. Confirm deployed SHA, URL, status endpoint and a consent-based end-to-end test.

## Functional contract
- Market remains **Hrvatska (HR), EUR**; exact product URL and condition **new** (currently only new products); optional variant and target price.
- Confirmed email required. Initial verified quote establishes baseline — **never send an invented "drop" from zero or a fabricated price**.
- Later observations must be recent and match product ID/model/variant, condition, market, currency and authorized seller hostname. A strictly lower current amount triggers an alert only if it meets the optional target.
- Alert includes old/new EUR amounts, seller, product model/variant, market, condition, verification timestamp, direct offer URL, unsubscribe link.
- Unchanged and unverified observations are silently suppressed. Provider/email failures do not emit an alert or silently claim success.
- Daily schedule runs after 08:00 Zagreb time even in summer. For larger subscriber volumes use a queue and partitioning; this version bounds each cron batch to 200 subscription attempts.
- No manual browser Notification permission request: delivery is e-mail, including when the reader is not visiting the site.

## Release cautions
This code is not the same as a working 24/7 service. The portal and Worker need configuration, provider verification, CI, deployment and live verification. Do not merge or deploy through an unrelated workflow, bypass security checks, alter main silently, scrape arbitrary user URLs or advertise live service until proven.

Do not place subscriber data in SEO metadata or public archives. Landing page starts with \`noindex,follow\` until a working service and final privacy notice are approved. No new GitHub Actions cron is added.
