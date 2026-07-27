# Best Buy API activation — GNK ASG webshop

## Current state

The code is ready before Best Buy approval. In review/staging, set `BESTBUY_MODE=review` to serve controlled mock products. Without an approved key and without review mode, the provider fails closed with HTTP 503 and the existing static webshop catalogue continues to work.

## Required Cloudflare settings after approval

Set the API key only as a Worker secret:

```bash
wrangler secret put BESTBUY_API_KEY
```

Do not add the key to GitHub, browser JavaScript, HTML, JSON catalogue files, screenshots, logs or support messages.

Set the environment mode:

- staging/review: `BESTBUY_MODE=review`
- production/live: `BESTBUY_MODE=live`

## Verification endpoints

List/search:

```text
GET /api/commerce/bestbuy/products?q=laptop&pageSize=24
```

Single product:

```text
GET /api/commerce/bestbuy/product/{BEST_BUY_SKU}
```

Expected live response characteristics:

- `mode: live`
- `provider: bestbuy`
- SKU prefixed as `BBY-`
- `currency: USD`
- `priceEur: null`
- `market: US`
- no API key in response body, headers or logs

## Storefront behavior

`/trgovina/` loads the existing static GNK ASG catalogue and then attempts to add Best Buy results. If the provider is unavailable, pending approval, rate limited or temporarily down, the static catalogue remains visible.

Best Buy prices are displayed only as U.S. reference prices. They are not converted into a final European selling price and do not include Croatian VAT, customs duties, international shipping or the final GNK ASG quotation.

## Validation

Run:

```bash
node workers/gnk-asg-direct-operator/tests/test-bestbuy-provider-v1.mjs
```

Then run the standard repository CI checks and desktop/mobile browser audit before enabling live mode.
