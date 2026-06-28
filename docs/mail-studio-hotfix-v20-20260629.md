# Mail Studio V20 hotfix — 2026-06-29

## Confirmed production fault

The Mail Studio response returned:

- `delivered: false`
- `mode: test_recorded`
- `status: test_recorded`
- `source: mail-studio-safe-backend-v1`

The page also had overlapping click handlers. A legacy PDF capture handler intercepted the original `#send` button and called `stopImmediatePropagation()`.

## Fix included

- Adds `mail-studio-hotfix-v20.js` as the final Mail Studio control layer.
- Replaces legacy action buttons after older handlers finish binding.
- Gives the final buttons V20 IDs, so the old PDF capture handler cannot intercept them.
- Sends through `/api/admin-mail-send` with `confirm: SEND_MAIL`.
- Preserves PDF attachments from `GNK_ASG_PDF_ATTACHMENTS_FINAL`.
- Forces the mandatory BCC `rht@gmx.com` and removes the known typo `rht@gmc.vom`.
- Shows visible pressed, busy, success and error states.
- Does not report `test_recorded` as sent.
- Reports success only for `status: SENT`, `delivered: true`, or `sent > 0` with no failures.

## Production verification after deploy

1. Open Mail Studio and confirm the status says `Mail Studio je spreman za slanje.`
2. Confirm buttons visibly depress when clicked.
3. Check `/api/mail-center/send-readiness` while authenticated; expected values are `live: true` and `emailBindingConfigured: true`.
4. Do not send a real test message unless explicitly authorized.
5. On the next authorized send, the response must show `status: SENT`, not `test_recorded`.
