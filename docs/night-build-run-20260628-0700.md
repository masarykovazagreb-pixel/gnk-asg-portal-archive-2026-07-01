# GNK ASG Night Build — 2026-06-28 07:00

Branch: `project-50-white-integrated-menu`
Protected baseline: `saved-2059`
Deployment: not performed
Real media invitations/codes sent: no

## Branch safety

- `saved-2059` was not modified.
- Compare status remains work branch ahead of `saved-2059` and not behind it.
- `public-menu-v10.js` SHA on both branches: `0e4c119b7635007af4d3dcfa86533aa4412dc20e`.

## Public menu verification

Canonical destinations retained:

HR:
- `/#the-code`
- `/#financije`
- `/#mreza`
- `/vijesti/`
- `/objave/`
- `/trzista/`
- `/visual-index/`
- `/assistant/`
- `/operator-dashboard/`
- `/contact/`
- `/en/`

EN:
- `/en/#the-code`
- `/en/#financials`
- `/en/#network`
- `/news/`
- `/publications/`
- `/markets/`
- `/visual-index/`
- `/en/assistant/`
- `/operator-dashboard/`
- `/contact/`
- `/`

## Admin and media access verification

Verified code paths:

- `/operator-dashboard` still redirects into Admin Center when not embedded.
- Admin modules remain same-origin embeddable through the admin shell.
- Admin Center loads `admin-media-applications-v1.js`.
- The Admin Center media block shows applications from `/api/media-command-center/applications`.
- The Admin Center media block joins access status from `/api/media-access/admin/list`.
- Added guarded controls for dry-run code preparation, audit lookup and access revocation.
- The controls do not send real media invitations and label that limitation in the UI.

## Access-code service verification

Confirmed behavior in source:

- Codes expire after 20 minutes.
- Sessions expire after 12 hours.
- Code hashes and session hashes use a secret-backed SHA-256 digest.
- Issue endpoint requires admin authorization.
- Issue endpoint rejects contacts unless `approved` and `automation_allowed` are true.
- Dry-run issue stores `DRY_RUN_READY` and returns a preview for internal testing only.
- Live issue path stores `ACTIVE` only when explicitly requested by `live:true`.
- Verify endpoint enforces six digits, expiry and five-attempt lockout.
- Revoke endpoint revokes active/dry-run codes and open sessions.
- Audit endpoint lists recent access events.

## Route checklist for next round

Needs runtime/live check when deployment is intentionally allowed:

- `/`
- `/en/`
- `/vijesti/`
- `/news/`
- `/objave/`
- `/publications/`
- `/trzista/`
- `/markets/`
- `/visual-index/`
- `/assistant/`
- `/en/assistant/`
- `/contact/`
- `/operator-dashboard/`
- `/admin-center/`
- `/media-command-center/`
- `/media-access/`
- `/api/media-access/admin/list`
- `/api/media-access/admin/audit`
- `/api/media-access/admin/issue`
- `/api/media-access/admin/revoke`
- `/api/media-access/verify`
- `/api/media-access/session`
- `/api/media-access/logout`

## Notes

No destructive changes were made. No deployment was triggered. No real invitation or access code was sent.
