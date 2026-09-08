# MASTER ASG / NN — 23-project parallel execution manifest

Status: execution design / runner-independent
Base main SHA: `e40a435326385a57474e8434e16c03aff5fc03b9`
Date: 2026-09-08

## Global execution contract

- Exactly one Integration Writer owns merge/deploy serialization.
- Every project owns an exclusive path/task lease for writes; read/test/research pools may run in parallel.
- Every task carries `project_id`, `task_class`, `priority`, `risk_class`, `owner_lease`, `dependencies`, `acceptance`, `evidence`, `rollback`, `knowledge_namespace`.
- Any SHA drift before write/merge/deploy invalidates the write plan and requires rebase/revalidation.
- P0 runner-allocation failure is isolated from runner-independent work. No blind rerun of failed execution probes.
- No project may starve another project solely because one lane is blocked.
- R0/R1 only may progress autonomously when reversible, idempotent, evidence-backed, and inside existing authority. R2/R3 remains owner-gated.

## Project registry

| ID | Project / lane | Primary scope | Write ownership class | Knowledge namespace | Current gate |
|---:|---|---|---|---|---|
| 01 | Stability / CI convergence | CI, exact-SHA, drift, rollback | `stability/*` | `domain.stability` | runner allocation P0 isolated |
| 02 | Release / deploy parity | deploy evidence, production parity | `release/*` | `domain.release` | exact-SHA evidence required |
| 03 | Health / SRE | health sentinels, freshness, self-heal | `health/*` | `domain.health` | runner-independent analysis allowed |
| 04 | Workforce runtime | worker lifecycle, heartbeat, queue | `workforce/runtime/*` | `domain.workforce` | healthy evidence required |
| 05 | Workforce capability factory | retrain, sandbox, probation | `workforce/capability/*` | `domain.capability` | no nominal scaling |
| 06 | Orchestration / governance | leases, routing, dependency graph | `ops/orchestration/*` | `domain.orchestration` | single-writer invariant |
| 07 | Shared intelligence / knowledge bus | registry, promotion, rollback | `ops/knowledge/*` | `global.verified` | evaluator-gated |
| 08 | SEO / meta | titles, descriptions, schema | `seo/meta/*` | `domain.seo` | truthfulness required |
| 09 | Indexability / sitemap | canonical, hreflang, sitemap | `seo/index/*` | `domain.indexability` | INDEXED needs proof |
| 10 | Image SEO | alt, dimensions, image schema | `seo/images/*` | `domain.image-seo` | semantic fit required |
| 11 | Entity SEO | Nermin Sefic / GNK ASG entities | `seo/entities/*` | `domain.entity` | no stuffing/false authorship |
| 12 | Publication / freshness | canonical publishing queue | `publication/core/*` | `domain.publication` | primary-live evidence first |
| 13 | External distribution | Blogger/Dev.to/Tumblr/Telegraph | `publication/external/*` | `domain.distribution` | LinkedIn HOLD |
| 14 | Aktual / newsroom | news lifecycle/freshness | `content/aktual/*` | `project.aktual` | source truth required |
| 15 | World / public intelligence | lawful public OSINT ingest | `intel/world/*` | `domain.public-osint` | public/authorized only |
| 16 | Markets / digital assets | freshness/provider health | `data/markets/*` | `domain.markets` | source freshness required |
| 17 | Weather / environment | freshness, fallback, stale guard | `data/weather/*` | `domain.weather` | public sources only |
| 18 | Sports / Cibona | freshness/content integrity | `data/sports/*` | `project.sports` | source evidence required |
| 19 | Corporate / reports | public corporate/report surfaces | `corporate/*` | `domain.corporate` | factual only |
| 20 | Mobile / context gateway | private MASTER access model | `platform/context/*` | `domain.context` | auth boundary preserved |
| 21 | Observability / evidence | traces, ledgers, outcomes | `ops/evidence/*` | `domain.evidence` | append-only preferred |
| 22 | Repair Department | root-cause + minimal FIX-ONCE | leased target path only | `domain.repair` | one repair lease per target |
| 23 | Security / intelligence integration readiness | prep-only adapters/manifests | `intel/readiness/*` | `domain.intel-readiness` | never CONNECT without owner gate |

## Knowledge transfer contract

Promotion lifecycle:

`OBSERVED -> CANDIDATE -> SANDBOX_VERIFIED -> SHADOW_VERIFIED -> DOMAIN_VERIFIED -> GLOBAL_VERIFIED`

Negative outcomes route to `QUARANTINED` or `REJECTED` with a failure lesson and rollback target.

A promoted object must include provenance, timestamp, trust/confidence, scope, applicable task classes, risk class, evaluator result, reuse evidence, TTL/staleness, contradictions, rollback target and allowed consumer classes.

Consumers fetch only the minimum relevant verified subset for the task. Cross-project transfer requires context-fit evaluation; project-specific facts do not become global merely through repetition.

## Collision policy

1. Read pools may overlap.
2. Test pools may overlap if they do not mutate shared state.
3. Only one write lease may exist for a path/resource.
4. Cross-cutting changes require evaluator + Chief Engineer review before Integration Writer.
5. On conflict, lower-priority write is deferred or resegmented; never force-overwrite.
6. Main SHA is re-read immediately before any write/merge/deploy.

## Current P0 isolation

Latest verified exact-SHA evidence available to this manifest: Actions jobs may fail before receiving a runner or executing steps. This is treated as runner-allocation/execution-layer P0 and must not be misclassified as a code-step failure. Until an exact-SHA job receives a runner and executes steps successfully, CI/Actions health must remain unverified/degraded.

Runner-independent projects continue with static analysis, manifests, documentation, source validation, queue cleanup, knowledge/evidence work and safe branch-local changes that do not require claiming CI health.
