# THE CODE connected UI review — 2026-07-08

## Branch

`fix/the-code-editorial-publications-20260708`

## Scope

Create a shared visual and navigation layer for connected public portal pages.

## Added

- `apps/portal/assets/connected-ui-v1.css`
- `apps/portal/the-code-os/index.html`
- `apps/portal/data/connected-pages-registry.json`

## Updated

- `apps/portal/index.html`

## Shared navigation

The connected menu now uses the same public structure:

- THE CODE
- Vijesti
- Worker kontakt
- Kontakt
- Admin

Admin remains a protected link. This branch does not change authentication or access rules.

## Visual unification

The shared CSS defines:

- topbar
- brand mark
- connected menu
- hero block
- cards
- panels
- pills
- footer
- responsive mobile behavior

## THE CODE / news / procedures scope

This branch establishes the public-safe shell for later backend wiring:

- THE CODE OS public overview
- news/publications entry
- project procedures placeholder
- morning review concept
- 09:00 publication concept
- worker/contact integration path

## Safety status

- No production deploy.
- No GitHub Actions enabled.
- No live form submission.
- No mail sent.
- No campaign, bulk or scheduled outreach.
- No DNS, route, binding or secret changes.
- No direct push to main.

## Follow-up needed

After contact PR merge, apply `connected-ui-v1.css` to `/worker-contact/`, `/contact/`, `/news/`, `/email-status` and `/campaign-mailer/` so all connected pages use the same shell.
