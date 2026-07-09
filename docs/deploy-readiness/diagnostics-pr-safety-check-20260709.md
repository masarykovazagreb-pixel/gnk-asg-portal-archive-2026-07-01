# Diagnostics PR safety check — 2026-07-09

## Scope

This branch only improves observability of the final live verification step in the safe public portal deploy workflow.

## Changed files

- `.github/workflows/deploy-public-portal-assets-safe.yml`
- `docs/deploy-readiness/live-verify-diagnostics-20260709.md`

## Explicit non-changes

- No DNS changes
- No Cloudflare route changes
- No Cloudflare secret or token changes
- No account ID or namespace changes
- No mail sending
- No campaign, scheduled outreach or bulk action enablement
- No worker source rewrite
- No asset content rewrite

## Operational effect

The existing deployment command remains the same. The verification step now reports exactly which URL or marker failed and retries to allow for short edge/cache propagation delay.
