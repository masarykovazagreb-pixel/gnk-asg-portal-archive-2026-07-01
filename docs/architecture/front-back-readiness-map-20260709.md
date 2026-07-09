# Front/back readiness map — 2026-07-09

## Purpose

This document separates the public portal into front, back and deployment responsibilities after safe deploy #9 reached a green state.

## Front layer

The front layer contains only user-visible public or protected user interface assets:

- public index `/`
- English entry `/en/`
- THE CODE `/the-code/`
- Mail Studio UI `/mail-studio/`
- finance/report/download cards
- media application
- route map and public operations dashboards

The front layer must not be the only safety layer for mail sending, campaign execution, authentication or route protection.

## Back layer

The back layer is the Cloudflare Worker and its runtime modules:

- operator/auth wrapper
- protected UI/API routing
- Mail Studio adapter
- manual mail service
- D1 audit trail
- KV draft/dedupe/runtime storage
- R2 media assets
- Email binding
- scheduled worker cycles where explicitly safe

Back-end gates remain authoritative for:

- authentication
- send confirmation
- recipient validation
- sender profile allow-list
- mandatory copy enforcement
- attachment allow-list/signature checks
- duplicate-send protection
- campaign/bulk lockouts

## Deploy layer

The deploy layer is the manual-only workflow:

`Deploy Public Portal Assets Safe`

The workflow must remain manual and must require the exact confirmation string:

```text
DEPLOY_PUBLIC_PORTAL_SAFE
```

The workflow is responsible for:

- local asset validation
- Worker syntax checks
- wrangler configuration checks
- dry-run deploy
- actual safe deploy
- live route verification with curl transfer-status checks

## Current green baseline

Safe deploy #9 is the first green baseline after diagnostics and curl-exit hardening were merged.

Do not repeat a green deploy without a new relevant change.

## Priority queue

1. Keep deploy baseline stable.
2. Add/maintain route manifest.
3. Remove Mail Studio legacy BCC from source in a dedicated PR.
4. Upgrade `/en/` to full public index parity.
5. Split large inline front files into maintainable CSS/JS/data modules.
6. Integrate Canva-derived visual assets through reviewed static assets only.
