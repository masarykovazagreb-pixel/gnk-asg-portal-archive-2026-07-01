# Current run autopsy — 2026-07-09

## Observed state

The safe deploy workflow reached Cloudflare deployment successfully, then failed during final live verification.

The failure point is the final `Verify public portal assets` step, not the deploy command.

## What this means

The production update may already be live, but GitHub Actions reports the run as failed because one live smoke assertion returned a non-matching response.

## Likely causes

- edge/cache propagation delay
- a specific URL returns a redirect or unexpected HTML
- one file is not available through the production route
- marker string mismatch
- PDF route status not 200

## Immediate fix

The workflow now logs each live verification target separately with retry attempts, HTTP status and short response preview. This makes the next run actionable instead of blind.

## Stop rule

If the improved workflow identifies a failing route, fix only that route. Do not touch DNS, routes, secrets, tokens, account IDs or mail/campaign switches.
