# MASTER AI — mobile context/task gateway (implementation contract)

Status: PROPOSED — NOT DEPLOYED
Date: 2026-11-12
Canonical repository: `masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01`, branch `main`.
Safety baseline: `docs/ACTIVE-SOURCE-OF-TRUTH.md`.

## Objective

Provide the same **verified project context**, task status and audit trail to the private mobile MASTER AI entrypoint, David AI and MASTER workers, without copying unbounded chat transcripts into a new database.

## User flow

Authenticated administrator → device biometric/passkey unlock → MASTER AI → authenticated context/task API → read-only verified project snapshot → explicitly authorized task request.

**Biometrics alone are not server authentication.** Use a bound passkey/WebAuthn assertion and short-lived server-side session, verified on each privileged request.

## Source of truth and freshness

- Canonical writer: `main` of this repository. Do not use archived mirrors for live truth.
- Return separate `writer_sha`, `production_sha`, and `production_verified_at`; never assume they are equal.
- All dynamic status fields include `observed_at`, `source`, `verification_level`, and `stale`. An unavailable source is `unknown`, not `green`.
- Distinguish a proposed action, a queued action, an executed action, a verified deployment, and a visible published article.
- Snapshot reads do not trigger expensive Actions or Cloudflare deployments.

## Suggested read API (contract, not implemented)

`GET /api/master-ai/v1/context`

Response:
```json
{
  "schema_version": "1.0",
  "generated_at": "ISO-8601 timestamp",
  "writer_sha": "git SHA or null",
  "production_sha": "verified production SHA or null",
  "production_verified_at": "ISO-8601 timestamp or null",
  "health": {"status": "unknown|healthy|degraded", "observed_at": null},
  "tasks": [],
  "incidents": [],
  "decisions": [],
  "worker_status": [],
  "learning_ledger": [],
  "capabilities": [],
  "stale": true
}
```

`GET /api/master-ai/v1/tasks?status=open` — filtered, paginated, authorization-scoped task list.

`GET /api/master-ai/v1/audit?cursor=...` — append-only, redacted operator history.

## Mutating operations — future, gated

`POST /api/master-ai/v1/task-requests` only after authentication, authorization, validation and rate limits. A request is not execution. Use idempotency keys, server-side allowlists, least privilege, audit actor/time/request/approval/result. Require explicit human approval for publishing, destructive changes, production deployment, financial/legal correspondence, secret/credential changes, and external side effects unless a **separate, documented** authorization policy already covers that exact action.

## Privacy and security

Never put private correspondence, legal case documents, personal data, passwords, tokens, GitHub secrets or health records in public repository files or static page payloads. Separate private data store with per-tenant access controls, encryption at rest/in transit, scoped retention, redacted logs and revocation. GitHub documents specify schemas and routes only, not live user content.

## Implementation sequence

1. Audit existing auth, Cloudflare worker routes, policy and mobile entrypoint. Reuse existing implementations where suitable.
2. Add server-side authenticated **read-only** endpoint with schema validation and tests for freshness, authorization and missing data.
3. Wire mobile MASTER AI to authenticated endpoint; display stale/unknown and link to evidence.
4. Add explicit action request queue, idempotency, RBAC and audit, then approve only scoped mutations.
5. Stage and test. Do not merge or deploy until CI, security review, explicit release authorization and exact-SHA live verification.

## Acceptance tests

- Unauthorized/expired request → 401; insufficient privileges → 403.
- Read-only requests cannot mutate GitHub, workers, secrets or content.
- Production SHA differs from writer SHA → response reports both, not `SYNCED`.
- Missing/unverified live evidence → `unknown` or `stale=true`, never fabricated success.
- Duplicate idempotency key → no duplicate execution.
- Private documents/secrets cannot be retrieved from public endpoints.
- Audit log captures approval and independently verified outcome.

This document defines a safe implementation contract, **not a claim that a mobile application or gateway is running**.
