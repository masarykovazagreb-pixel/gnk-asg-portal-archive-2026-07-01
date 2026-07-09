# Campaign Mailer Dashboard review — 2026-07-08

## Branch

`fix/email-status-center-20260708`

## Scope

Repair the protected URL:

`/campaign-mailer/#dashboard`

This branch adds the missing protected Campaign Mailer UI shell and an extensionless fallback. It does not deploy production, does not enable GitHub Actions, does not send email, does not run campaigns and does not touch DNS, Cloudflare routes, secrets or production bindings.

## Problem found

1. `/campaign-mailer` is present in the protected UI route list in `index-unified-auth-v14.js`.
2. No static page existed at `apps/portal/campaign-mailer/index.html` on `main`.
3. `#dashboard` is a browser-side fragment and is not sent to the Worker, so the base `/campaign-mailer/` page must exist first.
4. Without the base page, the dashboard hash cannot initialize.

## Fix applied

Added:

- `apps/portal/campaign-mailer/index.html`
- `apps/portal/campaign-mailer.html`

The page:

- is `noindex,nofollow,noarchive`;
- is protected by the existing admin/operator auth route;
- defaults to `#dashboard`;
- loads read-only GET endpoints for provider/mail state:
  - `/api/mail-center/status`
  - `/api/mail-center/sent`
  - `/api/mail-center/outbox`
  - `/api/mail-center/inbox`
  - `/api/mail-sync/health`
- links to `/email-status?source=all&from=%2Fcampaign-mailer%2F`;
- includes local-only recipients/template workspaces;
- performs no POST request and no send/campaign action.

The fallback `apps/portal/campaign-mailer.html` redirects extensionless `/campaign-mailer` to `/campaign-mailer/#dashboard` while preserving query string and hash.

## Safety status

- No production deploy.
- No GitHub Actions enabled.
- No mail sent.
- No campaign/bulk/scheduled outreach.
- No DNS change.
- No Cloudflare route/binding/secret change.
- No direct push to `main`.
