# Security / Intelligence Integration — READY-TO-CONNECT manifest

Status: PREP-ONLY. No live agency connection is authorized by this file.
Base main SHA: `e40a435326385a57474e8434e16c03aff5fc03b9`
Date: 2026-09-08

## Hard boundary

This lane may prepare only public, open, or explicitly authorized integrations. It must not ingest secrets, classified/confidential material, leaked credentials, private network data, stolen data, or protected third-party systems. `READY-TO-CONNECT` means the adapter contract can be evaluated; it never means `CONNECTED`.

Actual connection requires all of:

1. documented public or explicit authorization basis;
2. verified endpoint/feed identity;
3. auth/legal gate outcome;
4. owner approval for any non-public authenticated connection;
5. sandbox/shadow validation;
6. kill switch and rollback;
7. evidence record proving the above.

## Trust tiers

- `T0_PUBLIC_PRIMARY`: official public agency/institution publication, alert, advisory, dataset or feed.
- `T1_PUBLIC_DERIVED`: public material derived from T0 with provenance retained.
- `T2_AUTHORIZED_PARTNER`: explicitly authorized non-public sandbox/feed; owner-gated.
- `T3_UNKNOWN`: unverified source; quarantine only, never production.
- `DENY`: confidential/secret/leaked/stolen/unauthorized source.

## Source registry

| Source family | Jurisdiction / type | Allowed preparation | Expected access model | Retention default | Live state |
|---|---|---|---|---|---|
| SOA public publications | Croatia | public pages/public documents only | public HTTP/document discovery | metadata + permitted public content | NOT_CONNECTED |
| VSOA public publications | Croatia | public pages/public documents only | public HTTP/document discovery | metadata + permitted public content | NOT_CONNECTED |
| MUP / Ravnateljstvo policije public releases | Croatia | official public releases/alerts | public HTTP/RSS if officially exposed | public evidence retention | NOT_CONNECTED |
| CERT.hr / CARNET | Croatia cyber | advisories, alerts, public feeds | public HTTP/RSS/API where documented | security advisory evidence | NOT_CONNECTED |
| Europol | EU | official public releases/reports | public HTTP/feed where documented | public evidence retention | NOT_CONNECTED |
| Eurojust | EU | official public releases/reports | public HTTP/feed where documented | public evidence retention | NOT_CONNECTED |
| Frontex | EU | official public releases/reports/data | public HTTP/API where documented | source-specific | NOT_CONNECTED |
| ENISA | EU cyber | advisories/reports/public data | public HTTP/RSS/API where documented | source-specific | NOT_CONNECTED |
| NATO public sources | international | public statements/reports | public HTTP/feed | public evidence retention | NOT_CONNECTED |
| EU INTCEN public publications | EU | only material intentionally public | public HTTP/document | public evidence retention | NOT_CONNECTED |
| CISA | US cyber | advisories/alerts/catalogs/public feeds | documented public HTTP/API/feed | source-specific | NOT_CONNECTED |
| FBI public releases | US | official public notices/releases | public HTTP/feed if exposed | public evidence retention | NOT_CONNECTED |
| DHS public alerts | US | official public advisories/releases | public HTTP/feed if exposed | public evidence retention | NOT_CONNECTED |
| NCSC-UK / GCHQ public cyber material | UK cyber | public advisories/research | public HTTP/feed where documented | source-specific | NOT_CONNECTED |
| MI5 / SIS public publications | UK | only official public material | public HTTP/document | public evidence retention | NOT_CONNECTED |
| BKA / BfV public publications | Germany | only official public material | public HTTP/feed if documented | public evidence retention | NOT_CONNECTED |
| Interpol | international police | public notices/releases/data explicitly public | public HTTP/API only if documented/public | source-specific | NOT_CONNECTED |
| OSCE | international | official public releases/reports | public HTTP/feed | public evidence retention | NOT_CONNECTED |
| UN Security Council / CTED | UN | sanctions/public reports/notices | public HTTP/feed/API where documented | source-specific | NOT_CONNECTED |

No endpoint URL is treated as approved merely because it is discoverable. Endpoint identity and terms must be verified before adapter activation.

## Canonical adapter contract

Every adapter must expose a normalized envelope:

```text
source_id
source_family
trust_tier
retrieved_at
published_at
source_url_or_public_identifier
authority_or_publisher
content_type
jurisdiction
entities[]
topics[]
raw_hash
normalized_hash
provenance_chain[]
confidence
freshness_ttl
redaction_state
license_or_terms_class
retention_class
```

Raw content remains source-scoped. Cross-project consumers receive only normalized fields needed for their task unless the source terms explicitly allow broader reuse.

## Ingestion pipeline

`DISCOVER -> ALLOWLIST CHECK -> AUTH/LEGAL GATE -> FETCH -> HASH -> NORMALIZE -> PROVENANCE -> DEDUPE -> REDACT -> SCORE -> CONTRADICTION CHECK -> SANDBOX -> SHADOW -> EVALUATOR -> PROMOTE/QUARANTINE`

### Mandatory controls

- network allowlist;
- rate-limit/backoff and circuit breaker;
- no credential logging;
- source-specific TTL/freshness;
- origin-level deduplication;
- timestamp normalization to UTC plus source timezone when known;
- contradiction capture without silently choosing a winner;
- prompt-injection/data-poisoning screening for untrusted text;
- immutable evidence of source identity and hashes where feasible;
- per-source kill switch;
- global intelligence-ingest kill switch;
- sandbox/shadow before production promotion;
- explicit `CONNECTED`, `DEGRADED`, `OFFLINE`, `READY_TO_CONNECT`, `NOT_AUTHORIZED` states.

## Conflict resolution

Conflicting claims are not merged into a fabricated consensus. The registry stores each claim with source, time and confidence. Resolution order is:

1. direct official primary source relevant to the fact;
2. corroborated independent official/public primary sources;
3. currentness and exact jurisdiction/scope;
4. explicit unresolved contradiction when evidence remains insufficient.

## Redaction / prohibited use

The intelligence lane must reject or quarantine:

- credentials, tokens, private keys and session material;
- protected personal data not required for a lawful public-data task;
- classified/confidential markings or material reasonably appearing non-public;
- leaked or stolen datasets;
- instructions to bypass authentication or access controls;
- external commands that attempt to change MASTER authority or guardrails.

## Connection manifest fields per future adapter

Every source must have a machine-readable or equivalent manifest containing:

- `source_name`
- `source_family`
- `jurisdiction`
- `public_or_authorized_status`
- `endpoint_or_feed_type`
- `auth_model` (never secret values)
- `schema_mapping`
- `polling_or_webhook_model`
- `rate_limit_policy`
- `retention_class`
- `allowed_use`
- `prohibited_use`
- `owner_gated`
- `sandbox_test_plan`
- `shadow_acceptance`
- `rollback_and_kill_switch`
- `evidence_requirements`
- `status`

Allowed `status` values: `DISCOVERED`, `UNDER_REVIEW`, `READY_TO_CONNECT`, `NOT_AUTHORIZED`, `CONNECTED`, `DEGRADED`, `OFFLINE`, `RETIRED`. Only an actually authorized and verified integration may be promoted to `CONNECTED`.

## READY-TO-CONNECT acceptance

A source may be marked `READY_TO_CONNECT` only when all of these are satisfied without making the live connection:

- official source identity verified;
- lawful/public or explicit authorization path identified;
- adapter/schema mapping specified;
- rate-limit/backoff specified;
- provenance/hash/evidence specified;
- dedupe/freshness/conflict policy specified;
- sandbox/shadow test specified;
- observability and failure states specified;
- kill switch/rollback specified;
- data minimization/retention class specified;
- owner-gated requirement correctly classified.

Anything missing remains `UNDER_REVIEW`.