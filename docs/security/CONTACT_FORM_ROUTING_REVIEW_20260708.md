# Contact Form Routing review — 2026-07-08

## Branch

`fix/contact-form-routing-20260708`

## Scope

Review and repair the public contact form flow for:

- `/contact/`
- `/en/contact/`
- `/api/contact-submit`
- `/api/contact`

No production deploy, no GitHub Actions, no test submission, no email send, no DNS/Cloudflare/secrets/bindings change.

## Current behavior found

The frontend contact forms exist in Croatian and English and POST to `/api/contact-submit` using `FormData`.

The backend endpoint exists and validates:

- at least email or phone;
- message;
- consent;
- PDF-only attachment metadata.

The backend records submissions to KV keys:

- `contact:submissions`
- `contact:last`

The backend attempts notification only when `CONTACT_FORM_LIVE=true` and the Cloudflare Email binding is present and usable.

## Problem found

The UI says the message is routed to the selected department, but the backend previously sent notification to a single `CONTACT_NOTIFY_TO` / `CONTACT_FORM_NOTIFY_TO` / fallback address. The selected `mailbox` was recorded but not used as the primary routing address.

## Fix applied

Updated:

`workers/gnk-asg-direct-operator/src/index-portal-experience-v10.js`

Added mailbox routing map:

- `info` → `info@gnk-asg.hr`
- `contact` → `contact@gnk-asg.hr`
- `media` → `media@gnk-asg.hr`
- `press` → `press@gnk-asg.hr`
- `legal` → `legal@gnk-asg.hr`
- `privacy` → `privacy@gnk-asg.hr`
- `it` → `it@gnk-asg.hr`
- `ubo` → `ubo@gnk-asg.hr`
- `sefic` → `sefic@gnk-asg.hr`
- `assistant` → `assistant@gnk-asg.hr`

Notification now goes to the selected mailbox route plus any configured `CONTACT_NOTIFY_TO` / `CONTACT_FORM_NOTIFY_TO` addresses. Mandatory copy is kept separately through `CONTACT_MANDATORY_BCC` or `MAIL_MANDATORY_BCC`.

Response now includes the resolved mailbox route for audit.

## Safety status

- No production deploy.
- No GitHub Actions enabled.
- No contact-form POST test executed.
- No email sent.
- No campaign/bulk/scheduled outreach.
- No DNS change.
- No Cloudflare route/binding/secret change.
- No direct push to `main`.
