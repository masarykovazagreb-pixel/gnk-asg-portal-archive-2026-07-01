# MASTER ASG / NN — 23-project parallel control manifest

Base SHA: `e40a435326385a57474e8434e16c03aff5fc03b9`
Created: 2026-09-08 Europe/Zagreb

## Execution contract

- Exactly one Integration Writer owns write/merge/deploy serialization.
- Project pools may run read/build/test work in parallel only with exclusive task/path ownership.
- Every mutation requires fresh main SHA, head SHA, ownership lease, evidence, rollback path where applicable, and exact-SHA/CAS precondition.
- SHA drift or lease conflict => reject/rebase; never blind merge.
- R0/R1 reversible/idempotent work may proceed autonomously. R2/R3 and owner-gated work remains blocked pending explicit approval.
- Runner-allocation failure is isolated and must not starve runner-independent work.

## Current P0 evidence

Latest checked scheduled run newer than the prior Execution Probe is `Site Health Check (2x daily Zagreb)` run `34177082529` on exact main SHA `e40a435326385a57474e8434e16c03aff5fc03b9`. It completed `failure`; job `101908521203` has no executable step data. This preserves the cross-workflow failure-before-steps pattern and is treated as runner-allocation/execution-layer P0, not as evidence of an individual code-step failure. No blind rerun is authorized.

## Project lanes

1. CI / PR convergence / Exact-SHA / release fence
2. Production health / smoke / rollback readiness
3. AKTUAL / newsroom freshness
4. Weather freshness pipeline
5. Market / digital-assets freshness
6. Digital Workforce runtime / worker health
7. Workforce capability registry / lifecycle
8. NN memory / shared intelligence
9. Knowledge Bus / evaluator / promotion lifecycle
10. SEO meta/title/schema normalization
11. Canonical / hreflang / robots parity
12. Main/editorial/corporate sitemap coverage
13. Image SEO / image sitemap
14. Internal linking / entity graph
15. Nermin Sefic/Sefić entity SEO
16. GNK ASG / GNK DINAMO Ltd entity consistency
17. Publication queue / scheduler ownership
18. External publisher parity / bounded retry
19. Observability / health-event-decision ledgers
20. Recovery Pool / self-heal / fallback capability
21. Mobile/context/admin access readiness within existing auth boundaries
22. Full-site QA / regression / accessibility / performance
23. Security & Intelligence Integration Readiness — PREP ONLY

## Lane state rules

Each lane must keep: `owner_lease`, `task_class`, `priority`, `dependencies`, `acceptance`, `evidence`, `rollback`, `heartbeat`, `queue_state`, `knowledge_namespace`, `fallback`, and `status` (`ACTIVE|BLOCKED|READY|DONE`). Project starvation target is zero. A blocker in one lane must not stop unrelated lanes.

## Shared knowledge contract

Knowledge path: `OBSERVED -> CANDIDATE -> SANDBOX_VERIFIED -> SHADOW_VERIFIED -> DOMAIN_VERIFIED -> GLOBAL_VERIFIED` or `QUARANTINED/REJECTED`. Consumers receive only the minimum relevant verified subset. Cross-project transfer requires context-fit evaluation. Every promoted object requires provenance, version, trust/confidence, applicable task classes, TTL/staleness, contradiction state, evaluator result, reuse evidence and rollback target.

## Security / intelligence boundary

Lane 23 may prepare only public, open or explicitly authorized sources. It may build adapter contracts, source registry, provenance/trust tiers, schema normalization, rate limiting, redaction, retention classes, sandbox/shadow ingestion, observability, audit log, kill switch and READY-TO-CONNECT manifests. It must not connect to private/closed agency systems, use leaked/secret material, accept external authority escalation, or mark any agency as CONNECTED without explicit owner approval plus verified legal/auth gate.

## Current merge gate

Until an exact-SHA GitHub Actions job is proven to receive a runner and execute steps successfully, CI/Actions cannot be described as healthy. Runner-dependent merges remain gated. Runner-independent analysis, manifests, static reviews and isolated branch work may continue.