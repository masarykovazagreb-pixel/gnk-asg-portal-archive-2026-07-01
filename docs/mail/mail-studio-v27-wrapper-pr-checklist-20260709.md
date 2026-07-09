# Mail Studio v27 wrapper PR checklist — 2026-07-09

## Required before deploy

- Active wrapper advertises Mail Studio v27.
- Active wrapper does not inject v26 hotfix.
- Active wrapper reports gold-logo signature contract.
- Safe workflow validates v27 wrapper markers.
- Safe workflow fails on active v26 wrapper markers.

## Required after deploy

- `/assets/mail-studio-webmail-v27.js` returns 200 and v27 marker.
- `/mail-studio` opens after auth.
- Mail Studio sends only individual messages.
- Sent message includes gold-logo signature.
- Mandatory BCC is enforced.
- Campaign/bulk remains disabled.

## Stop condition

If any Mail Studio send check fails, stop further portal work and fix Mail Studio first.
