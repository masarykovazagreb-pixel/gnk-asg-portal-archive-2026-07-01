# GNK ASG night build status — round 3

Branch: `project-50-white-integrated-menu`
Protected baseline: `saved-2059`
Deploy: not performed
Real media invitations: not sent

## Completed in this round

- Confirmed `project-50-white-integrated-menu` is still ahead of `saved-2059` and not behind it; merge base remains the saved baseline commit `9b733f5f35987a8927b037ee80cf0e838de4eeb5`.
- Confirmed `apps/portal/assets/public-menu-v10.js` is identical on `project-50-white-integrated-menu` and `saved-2059`: blob SHA `0e4c119b7635007af4d3dcfa86533aa4412dc20e`.
- Fixed the public menu stylesheet so the legacy-header suppression rule cannot hide the canonical `.gnk-public-menu-v10` header.
- Hardened the media access service:
  - version bumped to `GNK_ASG_MEDIA_ACCESS_SERVICE_V2_20260628`
  - added `/api/media-access/admin/revoke`
  - added `/api/media-access/admin/audit`
  - expired codes are marked `EXPIRED`
  - max-attempt codes are marked `LOCKED`
  - revoke invalidates active and dry-run-ready codes plus active sessions
  - session response now returns contact, latest application and document metadata for the invitation code
- Added public journalist login UI at `/media-access/`:
  - invitation reference
  - official e-mail
  - six-digit one-time code
  - redirects to `/media-application/?invitationCode=...` after successful verification
- Added Worker routes for:
  - `gnk-asg.hr/media-access`
  - `gnk-asg.hr/media-access/*`
  - `www.gnk-asg.hr/media-access`
  - `www.gnk-asg.hr/media-access/*`

## Route/API verification by source inspection

- `/api/media-access/admin/list` is admin-token guarded and joins outreach contacts with latest access-code and latest application status.
- `/api/media-access/admin/issue` is admin-token guarded and refuses issuance unless the contact exists, has a valid email, and has both `approved` and `automation_allowed` set.
- `/api/media-access/admin/revoke` is admin-token guarded and revokes codes/sessions for the supplied invitation code.
- `/api/media-access/admin/audit` is admin-token guarded and returns the latest audit events, optionally filtered by invitation code.
- `/api/media-access/verify` remains public but requires mail code, valid email and a six-digit code; codes are hash-verified and single-use.
- `/api/media-access/session` returns only the session tied to the hashed secure cookie.
- `/api/media-access/logout` clears and revokes the current secure cookie session.

## Safety notes

- No production deployment was performed.
- No email delivery was performed.
- No real media invitations or login codes were sent.
- `saved-2059` was not modified.
- Live issue mode still requires explicit `live:true` in the admin API request; default behavior remains dry-run only.

## Commits created in this round

- `69f02fa` Harden media access service with revoke and session detail
- `387cb21` Add journalist media access login UI
- `d4eeedb` Route media access login page
- `3d5fe1` Prevent public menu CSS from hiding canonical v10 header

## Remaining next steps

- Run full Worker build/CI where runtime dependencies are available.
- Add controlled e-mail delivery only after explicit operator approval.
- Add Admin Center action buttons for dry-run issue, revoke and audit view, with live sending kept disabled by default.
