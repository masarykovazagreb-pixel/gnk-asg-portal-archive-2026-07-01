# Email Status Center review — 2026-07-08

## Branch

`fix/email-status-center-20260708`

## Scope

Repair the protected URL:

`/email-status?source=all&from=%2Fcampaign-mailer%2F`

This branch adds a read-only protected status page. It does not deploy production, does not enable GitHub Actions, does not send email, does not run campaigns and does not touch DNS, Cloudflare routes, secrets or production bindings.

## Problem found

1. `/email-status` is present in the protected UI route list in `index-unified-auth-v14.js`.
2. No static page existed at `apps/portal/email-status/index.html` on `main`.
3. After authentication, the Worker had no concrete Email Status UI asset to serve.
4. The existing backend already exposes safe read endpoints:
   - `/api/mail-center/status`
   - `/api/mail-center/sent`
   - `/api/mail-center/outbox`
   - `/api/mail-center/inbox`
   - `/api/mail-sync/health`

## Fix applied

Added:

`apps/portal/email-status/index.html`

The page:

- is `noindex,nofollow,noarchive`;
- is designed as protected admin/operator UI;
- loads status, sent, outbox, inbox and mail-sync health with GET-only requests;
- supports `source=all`, `source=status`, `source=sent`, `source=outbox`, `source=inbox`, `source=sync`;
- supports `from=/campaign-mailer/` as a safe same-origin back link;
- shows provider readiness, live mode, sent/outbox/inbox counts;
- shows a login link if the protected API returns unauthorized;
- performs no POST request and no email-send action.

## Safety status

- No production deploy.
- No GitHub Actions enabled.
- No mail sent.
- No campaign/bulk/scheduled outreach.
- No DNS change.
- No Cloudflare route/binding/secret change.
- No direct push to `main`.
