# Mail Studio live send locks — 2026-07-09

## Active intent

Mail Studio is intended for controlled individual communication, not blind bulk sending.

## Required locks

- Manual send path remains confirmation-gated.
- Sender profile must be allow-listed.
- Mandatory BCC remains enforced to `beckuphome@gmail.com`.
- Gold-logo signature contract remains backend-enforced.
- Attachment validation remains active.
- Dedupe remains active.
- Audit remains active.
- Campaign/bulk remains disabled.

## Allowed next action

One controlled test message may be sent from Mail Studio after authentication to verify the full live path.

## Not allowed

- No campaign send.
- No bulk send.
- No external blast.
- No DNS/Cloudflare route/secrets/account/KV changes.
