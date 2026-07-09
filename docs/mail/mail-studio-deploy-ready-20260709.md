# Mail Studio deploy readiness — 2026-07-09

Mail Studio is ready for one controlled safe deploy after this branch is merged, subject to workflow validation.

## Included layers

- v27 Mail Studio runtime
- authenticated wrapper alignment
- auto-reply case center backend
- auto-reply UI panel
- gold-logo signature contract
- mandatory BCC enforcement
- dedupe and audit through manual mail service
- safe workflow validation

## Deploy mode

Deploy everything from `main` in one safe workflow run. Do not deploy pieces manually.

## Required workflow input

```text
DEPLOY_PUBLIC_PORTAL_SAFE
```

## Post-deploy checks

1. Safe workflow green.
2. v27 runtime asset green.
3. auto-reply panel asset green.
4. `/mail-studio` opens after authentication.
5. One controlled test mail only.
6. Verify gold-logo signature and mandatory BCC behavior.
