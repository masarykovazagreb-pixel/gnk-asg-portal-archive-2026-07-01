# Minimum live Mail Studio plan — 2026-07-09

If the full public portal upgrade is not deployed today, the minimum acceptable live outcome for tomorrow is Mail Studio readiness for controlled individual email sending.

## Minimum must work

- `/mail-studio` opens after authentication.
- Mail Studio loads v27 runtime.
- Manual send endpoint remains backend-controlled.
- Mandatory BCC remains enforced to `beckuphome@gmail.com`.
- Gold-logo signature contract is enforced on every sent message.
- Draft save/load remains available.
- Attachment validation remains active.
- Dedupe/audit trail remains active.
- Bulk campaign sending remains disabled.

## Not required for minimum mail readiness

- Public homepage redesign.
- Canva visual polish.
- Full auto-reply live activation.
- Any DNS or Cloudflare route change.
- Any secret/token/account/KV namespace change.

## Deploy rule

Use only the existing manual safe workflow with exact input:

```text
DEPLOY_PUBLIC_PORTAL_SAFE
```

No repeated green deploys without a relevant change.
