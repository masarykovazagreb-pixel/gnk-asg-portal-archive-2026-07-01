# Deploy #10 green baseline — 2026-07-09

## Status

Manual safe deploy run #10 completed successfully based on the operator screenshot.

Workflow:

```text
Deploy Public Portal Assets Safe
```

Job:

```text
deploy-public-assets
```

Observed status:

```text
succeeded
```

Observed duration:

```text
approximately 36 seconds
```

## Scope deployed

The deployed `main` baseline includes:

- Mail Studio v27 runtime
- Mail Studio auto-reply case panel
- auto-reply case center backend
- V2 gold-logo signature contract
- mandatory BCC enforcement to `beckuphome@gmail.com`
- wrapper alignment without active v26 hotfix injection
- THE CODE public route
- finance KPI JSON
- public report PDFs

## No-touch confirmations

No manual DNS, Cloudflare route, secret, token, account ID, KV namespace or campaign change was performed as part of this record.

## Immediate post-deploy priority

Mail Studio functional checks have priority over cosmetic portal work.

Required checks:

1. `/mail-studio` opens after authentication.
2. v27 runtime loads.
3. auto-reply panel loads.
4. auto-reply preview prepares a numbered reply.
5. case lookup works after a persisted case.
6. one controlled individual mail sends successfully.
7. sent message includes the official gold-logo signature.
8. mandatory BCC is present.
9. bulk/campaign remains disabled.

## Stop rule

If Mail Studio send or signature verification fails, stop further portal changes and repair Mail Studio first.
