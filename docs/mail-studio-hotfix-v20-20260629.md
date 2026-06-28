# Mail Studio V20 hotfix — 2026-06-29

## Problem confirmed

The production response returned `delivered: false`, `mode: test_recorded`, and `source: mail-studio-safe-backend-v1`. The existing page also had multiple overlapping click handlers, including a legacy PDF capture handler that called `stopImmediatePropagation()` for the original `#send` button.

## Fix

- Adds `mail-studio-hotfix-v20.js` as the final Mail Studio control layer.
- Replaces legacy action buttons after older handlers finish binding.
- Uses V20 button IDs so the legacy PDF capture handler cannot intercept the click.
- Preserves PDF attachments from `GNK_ASG_PDF_ATTACHMENTS_FINAL`.
- Sends `confirm: SEND_MAIL` to `/api/admin-mail-send`.
- Normalizes mandatory BCC to `rht@gmx.com` and removes the known typo `rht@gmc.vom`.
- Shows visible pressed, busy, success, and error states.
- Never reports a test-recorded response as sent.
- Reports success only for `status: SENT`, `delivered: true`, or `sent > 0` with no failures.

## Production expectation

After the active worker is deployed from `main`, `/api/admin-mail-send` must resolve through `manual-mail-service-v1`, with `MAIL_MANUAL_LIVE=true` and the `EMAIL` binding available. No real message is sent as part of this code change.