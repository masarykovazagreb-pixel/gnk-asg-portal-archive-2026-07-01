# GNK ASG night build — round 4 verification

Date: 2026-06-28
Branch: project-50-white-integrated-menu
Protected baseline: saved-2059

## Guardrails

- `saved-2059` was not modified.
- No deployment was started.
- No real media invitations, login codes or external delivery were sent.
- Work stayed on `project-50-white-integrated-menu`.

## Public menu verification

- Compared `saved-2059` with `project-50-white-integrated-menu`.
- Result: work branch is ahead of `saved-2059` and not behind it.
- `apps/portal/assets/public-menu-v10.js` has the same blob SHA on both refs: `0e4c119b7635007af4d3dcfa86533aa4412dc20e`.
- Canonical destinations verified in the menu source:
  - `/` / `/en/`
  - `/#the-code` / `/en/#the-code`
  - `/#financije` / `/en/#financials`
  - `/#mreza` / `/en/#network`
  - `/vijesti/` / `/news/`
  - `/objave/` / `/publications/`
  - `/trzista/` / `/markets/`
  - `/visual-index/`
  - `/assistant/` / `/en/assistant/`
  - `/operator-dashboard/`
  - `/contact/`

## Public and admin route review

Reviewed worker routing layer:

- `/operator-dashboard` redirects to `/admin-center/?module=operator` unless embedded.
- Admin module embedding keeps same-origin framing by replacing frame-ancestor restrictions.
- Admin Center is patched with the module loader when served.
- Index routes `/` and `/en` are served directly from static assets and patched with the locked index menu.
- `/api/media-access/*` is intercepted before the older app handler.

## Media access/application implementation status

Verified existing media-access service:

- `CODE_TTL_MINUTES = 20`.
- `SESSION_TTL_HOURS = 12`.
- Code hashes use `MEDIA_ACCESS_SECRET` or operator/admin token fallback.
- Sessions are stored only as hashed session tokens.
- Access-code issue endpoint refuses contacts unless both `approved` and `automation_allowed` are true.
- Non-live mode creates `DRY_RUN_READY` records only.
- `live: true` only marks the code as ready/active in the service; it does not send external email in this implementation.
- Verification enforces expiry, attempt lock after 5 attempts, hash comparison, session creation and audit event.
- Logout and admin revoke both revoke active sessions.
- Admin audit endpoint returns latest audit events.

## Admin visibility

Verified Admin Center media application widget:

- Pulls `/api/media-command-center/applications?limit=12`.
- Pulls `/api/media-access/admin/list` for access-code status.
- Displays outlet/agency name, country, website, invitation code, applicant name/role/email/mobile, editor name/role/email/mobile, departure city, preferred airport, travel dates, other costs, uploaded documents, application status, score, human decision, decision reason, decider and access-code status.

## Outstanding for next round

- Add route manifest/check script if connector write filters allow it.
- Add a dry-run admin action for issuing a code from the UI, still blocked from real delivery.
- Review live production response headers only if deployment is explicitly approved later.
