# Mail Studio v27 BCC source cleanup — 2026-07-09

## Purpose

Remove the active Mail Studio dependency on the legacy BCC value and make `beckuphome@gmail.com` the source-level mandatory BCC.

## What changed

- `apps/portal/mail-studio/index.html` now loads `mail-studio-webmail-v27.js`.
- The visible BCC input defaults to `beckuphome@gmail.com`.
- `apps/portal/assets/mail-studio-webmail-v27.js` defines:

```js
const BCC='beckuphome@gmail.com';
```

- The safe deploy workflow validates the v27 runtime marker and fails if the active Mail Studio source contains the legacy BCC string.
- The route manifest now treats v27 as the active Mail Studio runtime.

## What did not change

- No backend send endpoint change.
- No Worker binding change.
- No DNS change.
- No Cloudflare route change.
- No secret, token, account ID or KV change.
- No mail was sent.
- No campaign or bulk outreach was launched.

## Deployment note

This branch does not deploy. After merge, live web changes only after a manual safe deploy with the exact confirmation input:

```text
DEPLOY_PUBLIC_PORTAL_SAFE
```

## Transition note

The legacy v26 file remains in the repository during transition but is no longer the active Mail Studio runtime after this PR is deployed.
