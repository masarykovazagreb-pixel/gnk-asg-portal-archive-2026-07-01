# MASTER ASG / NN — runner-allocation P0 audit

Timestamp: 2026-09-09 07:10 Europe/Zagreb
Source of truth: `masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01`
Base exact SHA: `2c9df80ae2379641b6528a2a56d8b07cf50050e0`

## Current exact-SHA evidence

- `main` is still `2c9df80ae2379641b6528a2a56d8b07cf50050e0`.
- Latest verified scheduled run: `Actions Execution Probe` run `34313688999`, created `2026-09-09T05:08:34Z` on exact SHA `2c9df80ae2379641b6528a2a56d8b07cf50050e0`.
- Run conclusion: `failure`.
- Only job: `probe`, job id `102345364296`, status `completed`, conclusion `failure`.
- Job `steps` are `null`; there is no evidence that any workflow step executed.
- This supersedes the prior 2026-09-08 probe as the freshest P0 evidence.

## Classification

Treat as runner-allocation / workflow-execution P0 until contradicted by newer exact-SHA evidence. This is not sufficient evidence of a code-step failure. Do not blind-rerun this probe.

CI/Actions must remain NOT HEALTHY until at least one exact-SHA job obtains a runner and executes real steps successfully.

## Isolation / parallel execution rule

The runner P0 is isolated. Runner-independent R0/R1 work across the other 22 MASTER projects remains allowed and should continue without starvation. Write/merge/deploy remains serialized through the Single Integration Writer and exact-SHA/CAS discipline.

## Runner-independent SEO finding retained

`apps/portal/sitemap-index.xml` still registers six sitemaps: main, editorial, corporate-editorials, visual, image, and world-topics-image. Current index lastmods are `2026-08-26` for main/editorial/visual/image/world-topics-image and `2026-08-30` for corporate-editorials. Freshness parity remains open and must not be reported closed without a source-backed regeneration/update plus regression verification.

## Next evidence threshold

Close or downgrade this P0 only after a newer exact-SHA scheduled job proves runner assignment and successful executed steps, or GitHub-side evidence conclusively identifies another root cause.
