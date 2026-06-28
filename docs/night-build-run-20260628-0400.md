# GNK ASG night build status — round 2

Branch: project-50-white-integrated-menu
Protected baseline: saved-2059
Deploy: not performed
Real media invitations: not sent

## Completed in this round

- Confirmed `apps/portal/assets/public-menu-v10.js` on `project-50-white-integrated-menu` has the same blob SHA as `saved-2059`: `0e4c119b7635007af4d3dcfa86533aa4412dc20e`.
- Added a guarded media-access API module at `workers/gnk-asg-direct-operator/src/media-access-service-v1.js`.
- Routed `/api/media-access/*` through the active worker entrypoint.
- Aligned the media-access service with the canonical `media-access-v1.sql` schema:
  - `media_access_codes`
  - `media_access_sessions`
  - `media_access_audit`
- Added admin API visibility for media access status via `/api/media-access/admin/list`.
- Added guarded code issue endpoint `/api/media-access/admin/issue`:
  - requires administrator token
  - requires existing contact
  - requires verified email
  - requires `approved=1` and `automation_allowed=1`
  - live mode is explicit only (`live:true`)
  - default is dry-run only
- Added media login endpoints:
  - `/api/media-access/verify`
  - `/api/media-access/session`
  - `/api/media-access/logout`
- Updated the Admin Center media applications summary to include invitation access-code status, expiry, sent time and attempt count when the access API is reachable.

## Safety notes

- No production deployment was performed.
- No email delivery was performed.
- No real media invitations or login codes were sent.
- `saved-2059` was not modified.
- A duplicate migration file was discovered after creating `0024_media_access.sql`; it was aligned with the canonical schema rather than deleted, because deletion was blocked by the connector safety layer.

## Commits created in this round

- `e612eba` Add media access D1 schema
- `cf08285` Add guarded media access code API
- `aadaba6` Route guarded media access API
- `bf29a2f` Align media access service with audit schema
- `d24eb9b` Align duplicate media access migration with canonical schema
- `83f87a6` Show media access status in Admin Center summary

## Remaining next steps

- Test worker build with the repository CI/runtime once available.
- Verify authenticated Admin Center can call `/api/media-access/admin/list` in the deployed environment.
- Add the public `/media-access` UI for journalists to enter invitation code, email and one-time code.
- Add controlled email delivery only after explicit operator approval.
