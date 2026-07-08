# THE CODE connected UI review — 2026-07-08

## Branch

`fix/the-code-editorial-publications-20260708`

## Scope

Create a shared visual and navigation layer for connected public and protected portal pages.

## Added

- `apps/portal/assets/connected-ui-v1.css`
- `apps/portal/the-code-os/index.html`
- `apps/portal/admin-center/the-code-os/index.html`
- `apps/portal/data/connected-pages-registry.json`
- `apps/portal/data/backend-modules-registry.json`

## Updated

- `apps/portal/index.html`
- `apps/portal/markets/index.html`

## Shared navigation

The connected menu now uses the same public structure:

- THE CODE
- Tržišta
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

## Markets

A public-safe markets overview is aligned to the connected UI at:

- `/markets/`

The page is a category overview only. It does not expose live prices and does not provide financial recommendations.

Planned backend bridge:

- `/api/markets/snapshot`

## Backend registry

The registry records 19 target backend modules:

- 15 modules already visible in the current auth-layer backend status;
- 4 missing public bridge modules:
  - public status API;
  - markets snapshot API;
  - workers public results API;
  - approval public decisions API.

Registry path:

- `/data/backend-modules-registry.json`

## THE CODE / news / procedures scope

This branch establishes the public-safe shell for later backend wiring:

- THE CODE OS public overview;
- internal THE CODE OS admin shell;
- markets overview;
- news/publications entry;
- project procedures placeholder;
- morning review concept;
- 09:00 publication concept;
- worker/contact integration path;
- backend modules registry.

## Safety status

- No production deploy.
- No GitHub Actions enabled.
- No live form submission.
- No mail sent.
- No campaign, bulk or scheduled outreach.
- No DNS, route, binding or secret changes.
- No direct push to main.
- No secrets or access tokens added to public HTML, JS, CSS or JSON.

## Follow-up needed

After contact PR merge, apply `connected-ui-v1.css` to `/worker-contact/`, `/contact/`, `/news/`, `/email-status` and `/campaign-mailer/` so all connected pages use the same shell.

Backend follow-up:

- implement `/api/markets/snapshot`;
- implement `/api/public/status`;
- implement `/api/workers/public-results`;
- implement `/api/approval/public-decisions`.
