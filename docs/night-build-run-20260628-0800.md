# GNK ASG Night Build Verification - 2026-06-28 08:00

Branch: project-50-white-integrated-menu
Safety branch: saved-2059
Deployment: not performed
Real media invitations: not sent

## Safety status

- saved-2059 remains the merge base for the working branch.
- Working branch comparison from saved-2059: ahead only, 226 commits ahead, 0 behind before this report commit.
- No destructive deployment was executed.

## Public menu verification

The canonical public menu file was compared on both branches:

- saved-2059: apps/portal/assets/public-menu-v10.js blob SHA 0e4c119b7635007af4d3dcfa86533aa4412dc20e
- project-50-white-integrated-menu: apps/portal/assets/public-menu-v10.js blob SHA 0e4c119b7635007af4d3dcfa86533aa4412dc20e

Result: PASS. Public menu destinations and labels are identical to confirmed saved-2059.

Confirmed destinations:

- HR anchors: /#the-code, /#financije, /#mreza
- HR pages: /vijesti/, /objave/, /trzista/, /visual-index/, /assistant/, /operator-dashboard/, /contact/, /en/
- EN anchors/pages: /en/#the-code, /en/#financials, /en/#network, /news/, /publications/, /markets/, /visual-index/, /en/assistant/, /operator-dashboard/, /contact/, /

## Admin visibility verification

Admin Center includes the media applications summary loader:

- apps/portal/admin-center/index.html loads /assets/admin-media-applications-v1.js?v=20260628.
- apps/portal/assets/admin-media-applications-v1.js displays outlet/agency, representative, responsible editor, email/mobile contacts, travel data, documents, application status, human decision, and media access-code status.
- Admin actions are limited to dry-run test code, audit view, and revoke. The interface explicitly does not expose real invitation sending.

Result: PASS for static integration and guarded UI behavior.

## Media access service verification

Media access service file reviewed:

- workers/gnk-asg-direct-operator/src/media-access-service-v1.js

Implemented controls:

- 20-minute one-time code TTL.
- 12-hour session TTL.
- hashCode and hashSession use server-side secret material.
- issueCode checks media_outreach_contacts.approved and automation_allowed.
- live=false creates DRY_RUN_READY and returns codePreview for testing only.
- live=true records ACTIVE/READY_FOR_DELIVERY but no real email sending is implemented in this service.
- verifyCode accepts only ACTIVE codes.
- invalid attempts increment attempts and audit access_code_rejected.
- 5 attempts locks code.
- expired code becomes EXPIRED.
- successful login marks code USED, stores hashed session, and writes audit.
- logout and revoke are implemented.
- admin audit endpoint is implemented.

Result: PASS for code-level security controls. Real email dispatch remains intentionally blocked until explicit user approval and final delivery implementation.

## Database verification

D1 migration reviewed:

- workers/gnk-asg-direct-operator/migrations/0024_media_access.sql

Tables are non-destructive and idempotent:

- media_access_codes
- media_access_sessions
- media_access_audit

Indexes are present for code lookup, session lookup, and audit listing.

Result: PASS for schema availability and non-destructive migration pattern.

## Route checklist

Public route targets from canonical menu:

- / : expected public index
- /en/ : expected English index
- /vijesti/ and /news/ : expected news pages
- /objave/ and /publications/ : expected publication pages
- /trzista/ and /markets/ : expected market pages
- /visual-index/ : expected gallery/visual index
- /assistant/ and /en/assistant/ : expected assistant routes
- /operator-dashboard/ : expected admin/operator entry
- /contact/ : expected contact route

Admin/media API routes implemented:

- GET /api/media-access/admin/list
- GET /api/media-access/admin/audit
- POST /api/media-access/admin/issue
- POST /api/media-access/admin/revoke
- POST /api/media-access/verify
- GET /api/media-access/session
- POST /api/media-access/logout

## Final status

The final overnight run completed with no deployment, no real invitations sent, and no change to saved-2059. The working branch now contains the completed verification record and the media access/application implementation foundation for later reviewed deployment.
