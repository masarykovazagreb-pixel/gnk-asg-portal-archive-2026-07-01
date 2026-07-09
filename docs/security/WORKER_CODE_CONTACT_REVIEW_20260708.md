# Worker Code Contact review — 2026-07-08

## Branch

`fix/contact-form-routing-20260708`

## Scope

Add a safe public contact flow by worker code.

Primary example:

- `GNK_57698`
- public display name: `Tajana K.`
- city: Zagreb
- position: Kontakt koordinator
- company: GNK ASG d.o.o.

## Public-data rule

The public page must not expose full surnames, personal email addresses, private credentials, tokens, secrets or direct worker mailboxes.

Public profile format:

- code
- first name + last-name initial only
- company
- country
- city
- position

## Added page

`apps/portal/worker-contact/index.html`

The page:

- allows search by code such as `GNK_57698`;
- displays only safe worker-profile fields;
- lets a visitor send a message using the existing `/api/contact-submit` endpoint;
- injects worker code, city, position, country and company into the submitted message body;
- routes the form through mailbox `sefic` so it goes through the central/director contact path configured in the contact backend;
- does not expose a personal worker email address;
- does not send email during this PR.

## Backend note

A backend module was added for worker-code resolution:

`workers/gnk-asg-direct-operator/src/worker-contact-directory-v1.js`

Direct backend inbox mutation was not forced in this step because the platform blocked the more aggressive email/inbox-flow update. The safe public page still submits through the existing contact backend and preserves worker code metadata in the message body.

## Safety status

- No production deploy.
- No GitHub Actions enabled.
- No live contact-form POST test executed.
- No email sent.
- No campaign/bulk/scheduled outreach.
- No DNS change.
- No Cloudflare route/binding/secret change.
- No direct push to `main`.
