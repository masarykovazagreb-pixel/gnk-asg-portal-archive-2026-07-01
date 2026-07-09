# Safe mail and functions test matrix — 2026-07-09

Scope: static and local smoke validation for public portal assets, protected functions, and mail safety gates.

This test pack does **not** deploy, does **not** send mail, does **not** launch campaigns, does **not** touch DNS, routes, secrets, or production bindings.

## Run locally

```bash
cd apps/portal
npm run test:safe-smoke
```

## What the smoke test validates

### Public portal

- `apps/portal/index.html` exists and links to `/the-code/`.
- `apps/portal/en/index.html` exists.
- `apps/portal/the-code/index.html` contains the THE CODE public module and New York / 2026 activation references.
- `apps/portal/google46686328e30c759f.html` contains the exact Google verification string.
- `apps/portal/data/finance-kpi-2025.json` is valid JSON, uses EUR, has download links, and excludes ROI/ROA as metrics.
- Public PDF downloads exist and begin with `%PDF-`.

### Worker and function protection

- Unified worker imports and routes the Mail Studio adapter.
- `/api/admin-mail-send`, `/api/mail-center/*`, `/api/mail-sync*`, and `/api/campaign-mailer*` remain protected routes.
- Backend status reports `productionDeploy:false` and `bulkMail:false`.
- `/media-application` remains public UI.
- Wrangler assets point to `../../apps/portal` and use `run_worker_first = true`.

### Mail safety

- Manual mail sending requires `confirm: "SEND_MAIL"`.
- Manual mail sending requires the `MAIL_MANUAL_LIVE` environment gate.
- Manual mail sending requires Cloudflare Email binding before any provider send call.
- Safety order is checked: confirmation → live flag → email binding → `env.EMAIL.send(payload)`.
- Recipient, attachment count, attachment size, blocked attachment types, mandatory BCC, and duplicate-send protection are checked.
- Inbox reading is marked disconnected.
- Mail sync health reports `bulkMailLocked:true`.
- State actions explicitly report that no external mailbox state was changed.

## What is intentionally not tested here

- Real e-mail delivery.
- Campaign sending.
- Production deployment.
- DNS / Cloudflare route changes.
- Secret or production binding changes.
- Live admin token verification.

## Live checks allowed only after explicit approval

These are read-only or controlled checks, but still require an explicit decision before execution against production:

```bash
curl -I https://gnk-asg.hr/the-code/
curl -I https://gnk-asg.hr/google46686328e30c759f.html
curl -I https://gnk-asg.hr/data/finance-kpi-2025.json
curl -I https://gnk-asg.hr/media-application/
```

Mail delivery test remains locked unless all three are true:

1. explicit approval to send a test mail,
2. `MAIL_MANUAL_LIVE=true`,
3. valid Cloudflare Email binding is configured.
