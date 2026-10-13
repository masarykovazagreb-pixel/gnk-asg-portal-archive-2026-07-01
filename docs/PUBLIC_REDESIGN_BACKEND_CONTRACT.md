# GNK ASG Public Redesign — Backend Preservation Contract

## Scope

This branch retains the previously accepted public visual layer and may include narrowly scoped runtime, integration or review-isolation hardening justified by the extended technical audit. Production credentials, bindings, email delivery settings, databases, storage, route ownership and backend business logic must remain unchanged unless a separately approved production change explicitly authorizes them.

## Protected capabilities

The following capabilities are release blockers and must continue to work exactly as before:

1. Manual email sending through `/api/admin-mail-send`.
2. Mail readiness, Sent, Outbox and Inbox status routes.
3. Mass media delivery: HTML and PDF upload, test gate, contact approval, queueing, rate limits, dispatch, retry, suppression and delivery history.
4. Public contact form, department selection, PDF attachment and recorded reference response.
5. Journalist/newsroom portal at `/media-application/`.
6. Journalist login using invitation reference and personal PIN.
7. Twelve-hour secure media session cookie.
8. Central D1 draft save and subsequent return with the same access code.
9. Up to three newsroom representatives.
10. Travel, hotel, programme and production data.
11. R2 document upload and document status.
12. Final submission while preserving later authorised updates.
13. Personalised invitation generation and invitation queue.
14. Media Registration administration at `/media-registration-admin/`.
15. Existing Admin Center, Mail Studio and Media Command Center access.
16. Protected Campaign Mailer at `/campaign-mailer/`, including contact approvals, safety controller, queue lock, rate limits, PDF attachment handling, inbound metadata and delivery history.

## Isolation rule

All functional and protected applications retain their dedicated HTML, CSS and JavaScript. The public redesign shell must return them unchanged. This includes:

- `/media-application/`
- `/media-registration-admin/`
- `/campaign-mailer/`
- `/mail-studio/` and `/mail-studio-pro/`
- `/media-command-center/`
- `/admin-center/`, `/operator-dashboard/` and `/operator-mobile/`
- other protected operator, publishing, review and API routes

The redesign may later provide a separate visual revision for one of these applications, but only as an isolated change with regression tests for every field, button, API request and session state.

## Protected infrastructure

A review or visual change must not modify production configuration or state:

- `wrangler.workforce-production-no-routes.toml`, `wrangler.runtime.toml`, or any live Worker profile
- Cloudflare production environment variables, secrets, bindings, routes, DNS or account state
- operator/admin/media tokens
- production D1 migrations or table definitions
- KV keys and production state contracts
- R2 object keys or file validation rules
- Email sender identities, mandatory BCC, allowlists or live-send gates in production profiles
- production cron schedules or queue processors

The default `workers/gnk-asg-direct-operator/wrangler.toml` is the isolated review profile: it must keep a review-only Worker name, no production KV/D1/R2/Email/AI bindings, no scheduled triggers, and all outbound/publishing gates disabled. The production profile remains separate and requires explicit approval.

## Required verification

Run:

```bash
node --check apps/portal/assets/public-menu-v18.js
node --check workers/gnk-asg-direct-operator/src/public-shell-v11.js
node scripts/verify-public-redesign-contract.mjs
node scripts/validate-digital-workforce-public-v3.mjs
node scripts/test-digital-workforce-single-runtime-contract.mjs
node scripts/test-mail-environment-contract.mjs
node scripts/test-email-tools-status-v6.mjs
```

Before production deployment, perform browser tests for:

- HR and EN homepage/navigation
- Contact form without and with PDF
- Admin login and logout
- Mail Studio and Media Command Center protected access
- Journalist login, draft save, reload, document upload, submission and logout
- Media Registration admin status and decision controls
- Campaign Mailer protected route, dashboard loading and read-only status checks

No manual email, mass dispatch or Campaign Mailer delivery is part of the redesign release verification.
