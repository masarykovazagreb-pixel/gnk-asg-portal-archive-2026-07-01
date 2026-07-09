# Curl exit verification hardening summary — 2026-07-09

This branch addresses the Codex P2 review comment on PR #380.

## Change

The safe deploy workflow no longer treats HTTP 200 alone as enough. It also requires `curl` to exit successfully.

## Why

Without checking curl's exit code, a timed out or truncated transfer could still print an HTTP 200 code and accidentally pass a marker check.

## Files

- `.github/workflows/deploy-public-portal-assets-safe.yml`
- `docs/deploy-readiness/codex-review-curl-exit-fix-20260709.md`

## Non-changes

No deploy command change. No production binding change. No DNS, route, secret, token, account ID, KV, mail or campaign changes.
