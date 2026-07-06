# Admin / GNEW Portal Recovery — 2026-07-06

Repo: `beckuphome-gnk/gnk-asg-portal`

Branch:
`repair/admin-gnew-portal-recovery-20260706`

## Findings

- Latest observed open PR: `#339 fix(index): restore final preproduction metadata layer`.
- PR #339 is narrow. It restores metadata for the public index, but it does not repair admin or mail workflow.
- Existing deployment marker still showed requested/pending state and did not allow a production-live claim.
- `apps/portal/admin/index.html` had an immediate redirect to `/operator-dashboard/`, while the admin/mail UI existed lower in the same file. That made the admin layer practically unusable from `/admin/`.

## Changes on repair branch

### 1. Admin Control Center

Commit: `1855fa2e76a59f292dac5f77385c631611e44799`

File:
`apps/portal/admin/index.html`

Changed behavior:

- `/admin/` stays visible.
- Removed the forced redirect behavior.
- Added a control center for portal modules.
- Added mail diagnostics UI with local Draft, Outbox, Sent and Inbox fallback.
- Added endpoint probing for controlled single-message checks.
- Added clear campaign-safety separation.

### 2. GNEW Portal page

Commit: `f28acf3751193eaed931c59472692a3f5cf7feb8`

File:
`apps/portal/gnew-portal/index.html`

Purpose:

- One clean operational entry for Admin, Mail Studio, Campaign Mailer, Email Status, Media Application, Downloads, THE CODE and Public Operations.
- Presents THE CODE / 9 as a controlled portfolio layer, not as an unsupported completed-investment claim.

### 3. Index repair

Commit: `1acc743f035eaebd52d8cc1f0336a7ab9ffcf33b`

File:
`apps/portal/index.html`

Changed behavior:

- Adds GNEW Portal to primary public navigation.
- Keeps finance-first layout.
- Keeps THE CODE rotating show and New York countdown.
- Keeps nine-sector portfolio and worker routing.
- Adds stronger public metadata and structured data.

### 4. Recovery contract test

Commit: `29bef9ab43e7d5cab6ced06ae212e2357d50873c`

File:
`apps/portal/tests/admin-gnew-index-recovery.spec.js`

Covers:

- `/admin/` remains visible and shows Admin Control Center.
- `/gnew-portal/` exists and exposes operational route map.
- `/` index links GNEW Portal and keeps finance, THE CODE, workers and media entry.

## Review checklist for next chat

1. Compare branch `repair/admin-gnew-portal-recovery-20260706` against `main`.
2. Inspect:
   - `apps/portal/admin/index.html`
   - `apps/portal/gnew-portal/index.html`
   - `apps/portal/index.html`
   - `apps/portal/tests/admin-gnew-index-recovery.spec.js`
3. Run static preview for `apps/portal`.
4. Run Playwright tests.
5. If clean, open a draft PR from repair branch to `main`.
6. Do not treat dashboard UI as proof of real mail delivery; backend/provider confirmation is required.

## New chat prompt

Nastavljamo NEW PORTAL / GNEW Portal / THE CODE / 9 u repo `beckuphome-gnk/gnk-asg-portal`.

Aktivna branch:
`repair/admin-gnew-portal-recovery-20260706`

Prvo pregledaj compare prema `main`, zatim ove datoteke:

- `apps/portal/admin/index.html`
- `apps/portal/gnew-portal/index.html`
- `apps/portal/index.html`
- `apps/portal/tests/admin-gnew-index-recovery.spec.js`

Cilj: završiti review paket, testirati admin, GNEW Portal, index, THE CODE, contact/media rute i mail dijagnostiku, zatim otvoriti draft PR ako je sve čisto.
