# GNK ASG night build check - 2026-06-28 03:00

Branch: `project-50-white-integrated-menu`
Protected reference: `saved-2059`

## Completed in this run

- Compared `saved-2059` to the work branch. Result: work branch is ahead and not behind the protected reference.
- Verified `apps/portal/assets/public-menu-v10.js` is byte-identical between `saved-2059` and the work branch.
- Loaded the media application summary script inside `apps/portal/admin-center/index.html`.
- Expanded the Admin Center media application summary to show newsroom/outlet, invitation code, website, applicant, editor, e-mails, phones, travel data, documents, triage status, score, human decision, reason and decision metadata.
- Added D1 migration storage for one-time media access codes, media access sessions and access audit events.

## Public route matrix to keep aligned

- `/`
- `/en/`
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

## Admin route matrix to keep testing

- `/admin-center/`
- `/operator-dashboard/`
- `/mail-studio/`
- `/media-command-center/`
- `/auto-editor/`
- `/news-admin/`
- `/pdf-publisher/`
- `/api/operator-auth-check`
- `/api/operator-backend-status`
- `/api/mail-center/status`
- `/api/media-command-center/status`
- `/api/media-command-center/applications`

## Security constraints retained

- No real media invitation sending without explicit human approval.
- Access-code storage uses hashes, not plaintext codes.
- Sessions are designed for expiry and revocation.
- Access events must be auditable.
- Passport copies remain rejected at the ordinary e-mail intake stage.

## Next work items

1. Wire the new access-code tables into the Worker runtime routes.
2. Add admin columns for latest invitation-code delivery and access-code status once Worker route is connected.
3. Run live route checks after deployment or preview URL availability.
