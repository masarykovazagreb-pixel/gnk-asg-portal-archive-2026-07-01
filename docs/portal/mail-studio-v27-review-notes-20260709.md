# Mail Studio v27 review notes — 2026-07-09

## Review summary

This branch makes Mail Studio v27 the active runtime and removes the legacy BCC value from active source paths.

## Changed files

- `.github/workflows/deploy-public-portal-assets-safe.yml`
- `apps/portal/mail-studio/index.html`
- `apps/portal/assets/mail-studio-webmail-v27.js`
- `apps/portal/data/route-manifest.json`
- `docs/portal/mail-studio-v27-bcc-source-cleanup-20260709.md`

## Validation added

The safe deploy workflow now checks:

- Mail Studio HTML references `mail-studio-webmail-v27.js`
- v27 runtime contains `GNK_ASG_WEBMAIL_V27_20260709_BCC_SOURCE_CLEANUP`
- active HTML contains `beckuphome@gmail.com`
- active v27 runtime defines `const BCC='beckuphome@gmail.com'`
- active HTML and v27 runtime do not contain the legacy BCC string
- v27 runtime passes `node --check`

## Safety exclusions

No mail was sent. No campaign was launched. No DNS, Cloudflare route, secret, token, account ID, KV namespace or Worker binding was changed.
