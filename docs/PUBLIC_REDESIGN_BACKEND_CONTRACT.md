# GNK ASG Public Redesign — Backend Preservation Contract

## Scope

This branch changes the public visual layer only. It must not change production credentials, Cloudflare bindings, email delivery settings, databases, storage, route ownership or backend business logic.

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

## Isolation rule

`/media-application/` and `/media-registration-admin/` retain their dedicated HTML, CSS and JavaScript. The general public redesign shell must return those documents unchanged.

The redesign may later provide a separate visual revision for the newsroom portal, but only as an isolated change with regression tests for every field, button, API request and session state.

## Protected infrastructure

A public redesign change must not modify:

- `wrangler.toml`
- Cloudflare environment variables or bindings
- operator/admin/media tokens
- D1 migrations or table definitions
- KV keys and state contracts
- R2 object keys or file validation rules
- Email sender identities, mandatory BCC, allowlists or live-send gates
- Cron schedules or queue processors

## Required verification

Run:

```bash
node --check apps/portal/assets/public-menu-v18.js
node --check workers/gnk-asg-direct-operator/src/public-shell-v11.js
node scripts/verify-public-redesign-contract.mjs
```

Before production deployment, perform browser tests for:

- HR and EN homepage/navigation
- Contact form without and with PDF
- Admin login and logout
- One manual email test to an approved internal recipient
- One mass-mail dry run and one allowlisted test
- Journalist login, draft save, reload, document upload, submission and logout
- Media Registration admin status and decision controls

No production mass dispatch is part of the redesign release.
