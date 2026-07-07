# Editor Desk Deploy Review — 2026-07-07

## Purpose

This is a deploy-review control note for the GNEW Portal / Editor Desk recovery phase.

The public index is intentionally treated as a large corporate homepage. It contains static corporate content, public financial summaries, project routing, THE CODE, worker routing and backend-fed public data. The goal of this review is not to redesign the index before release. The goal is to stop working blindly and verify the current functional contract before any production deploy is considered.

## Hard safety boundaries

- No production deploy is authorised by this document.
- No DNS, Cloudflare route, secret or production binding changes are authorised.
- No mail, campaign, bulk outreach, scheduled outreach or auto-ack sending is authorised.
- Mail-related flags must remain locked unless a separate explicit approval is given.
- Merge does not equal deploy.
- Production deploy must be a separate explicit executive action after review evidence is green.

## Current architecture under review

### Public frontend

Primary public routes to verify:

- `/`
- `/en/`
- `/gnew-portal/`
- `/the-code/`
- `/media-application/?lang=en`
- `/financije/`
- `/downloads/`
- `/objave/`
- `/public-operations/`

Expected public index role:

- corporate homepage
- financial summary entry
- THE CODE entry and/or embedded view
- GNEW Portal entry
- worker/project/public operations routing
- public media registration entry
- backend-fed public data layer where configured

### Protected / operator frontend

Primary protected/review routes to verify:

- `/admin/`
- `/admin-login`
- `/operator-dashboard/`
- `/mail-studio/`
- `/campaign-mailer/#dashboard`
- `/email-status/`
- `/auto-editor/`
- `/news-admin/`
- `/media-registration-admin/`

Expected operator role:

- Admin must stay visible and must not redirect away unexpectedly.
- Mail UI can prepare draft/outbox and probe endpoints.
- Mail delivery is valid only if backend/provider returns success.
- Campaign/bulk must remain separated and locked.

### Backend / Worker

Active safe entrypoint expected:

- `workers/gnk-asg-direct-operator/src/index-unified-auth-v14.js`

Expected review-safe configuration:

- route-less Worker config for review deploys
- `MAIL_MANUAL_LIVE=false`
- campaign/outreach/test/auto-ack flags locked false
- admin auth protected by token/session
- backend status available only through authenticated path where required

## Urgent pre-review checks

These must be verified before production deploy is even discussed.

1. Repo vs live difference

   Confirm whether the live domain still shows an older public index than the current `main` branch. Do not claim production is updated unless the live domain proves it.

2. Route smoke test

   Verify the public routes return HTML and contain the expected visible anchors: finance, THE CODE, GNEW Portal, media registration, posts/public operations.

3. Backend-fed index layer

   The index may use backend/public JSON-fed layers. Verify that the injected public backend layer appears or, if it fails, that the base corporate page remains usable.

4. HR/EN parity

   HR and EN pages do not have to be identical word-for-word, but they must expose the same operational promise: finance, THE CODE, GNEW/worker routing, media entry and public posts.

5. Admin visibility

   `/admin/` must remain a control center and must not silently redirect away. If protected functionality needs auth, the UI must make that clear.

6. Mail locks

   Confirm manual mail send remains locked unless deliberately approved. Campaign/bulk/scheduled outreach must remain locked.

7. Workflow deploy locks

   Production-style workflows must remain `workflow_dispatch` and require explicit confirmation input.

8. No accidental deploy trigger

   PR creation, review commit, merge, test run or news refresh must not be treated as production deploy approval.

## Deploy review decision gates

### Gate A — Review PR only

Allowed:

- documentation
- smoke tests
- route contract tests
- frontend contract compatibility patches
- copy/disclaimer tightening

Not allowed:

- production deploy
- DNS/route/secrets/bindings
- mail live flag changes
- campaign activation
- bulk or scheduled outreach

### Gate B — Preview/review deploy

Allowed only if:

- route-less config is used
- no production route is attached
- deploy workflow confirms it is a review/preview action
- smoke tests are green or known failures are documented

### Gate C — Production deploy

Allowed only after a separate explicit approval stating:

- exact commit SHA
- exact deploy workflow/config
- no DNS change unless separately approved
- no mail/campaign live activation unless separately approved
- rollback target
- post-deploy verification routes

## Recommended immediate fixes before production deploy

1. Add a deploy-review smoke test that matches the current corporate-index reality instead of stale DOM assumptions.
2. Add a compatibility selector for THE CODE if tests or public JSON still refer to `#gnk-index-code-show` while HR index uses `#the-code`.
3. Keep the large index intact for now; improve it iteratively inside review PRs, not blindly on production.
4. Add a visible deploy-status note in documentation: `repo main != live until verified`.
5. Keep all mail and campaign live flags false during the first deploy review.

## Review outcome template

- Repo commit reviewed:
- Live domain currently shows:
- Public route smoke status:
- Protected route/auth status:
- Mail lock status:
- Campaign lock status:
- Backend status endpoint result:
- HR/EN parity status:
- Known blockers:
- Recommendation:

## Current recommendation

Proceed to deploy review, not production deploy.

The safest next step is a review PR that adds this checklist and a smoke-test contract. After that, evaluate the PR checks and only then decide whether a route-less preview deploy is useful. Production deploy remains a separate decision.
