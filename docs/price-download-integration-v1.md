# price.download — independent source intake

Purpose: once-per-day read-only ingestion into AKTUAL MEDIA with explicit publisher attribution. **This is not an AKTUAL MEDIA-owned service.**

## Security and rollout

The previously shared API token must be rotated because it was pasted into a chat. Never commit it or pass it as a query parameter. Install the **new** token in GitHub Actions secret `PRICE_DOWNLOAD_API_KEY` or a server-side secret manager. Set `PRICE_DOWNLOAD_API_ENDPOINT` only after independently confirming the provider's exact HTTPS API path and authentication mechanism. The code currently assumes Bearer auth; verify this before enabling it.

The public API schema has not been confirmed. Before use, implement and test a separately reviewed vendor-to-`aktual-price-adapter-v1` mapper against a redacted sample. It must preserve product identifier, retailer, price, currency, observation time and direct source URL.

Production is *fail-closed* unless `PRICE_DOWNLOAD_API_CONTRACT_VERIFIED=true` and `PRICE_DOWNLOAD_REUSE_APPROVED=true`. Written permission to redistribute or republish data must be established first. The scheduled workflow does not publish articles, HTML, sitemaps or any raw price data. Missing configuration intentionally produces a non-green job and a sanitized status artifact.

When the integration is approved, create **one** meaningful canonical AKTUAL MEDIA page showing original analysis, timestamped prices with source attribution and a visible disclaimer that amounts may change. Add only **our own verified public page** to sitemap; never add `price.download` itself to our sitemap. Do not label the external provider as a partner or sponsor without an actual agreement.

## Editorial / SEO policy

No synthetic rows, no scraped article bodies, no SEO doorway pages, no misleading claims of partnership. Source link: https://price.download, clearly labelled *neovisni vanjski izvor*. Relevant tags: #Cijene #UsporedbaCijena #TransparentnostCijena #AktualMedia (only when truly relevant). Any automatic article writing must first check the permission, schema, timestamps, and provenance. If no verified data, do not generate a price claim.
