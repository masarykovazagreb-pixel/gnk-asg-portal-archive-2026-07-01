# Digital Workforce — source comparison and integration decision

Date: 2026-07-16
Status: audit only; no deployment or infrastructure change

## Executive decision

The supplied technical manual describes a complete standalone Cloudflare Worker application. It must **not** be deployed beside or over the current GNK ASG runtime as a second Digital Workforce backend.

The canonical implementation already lives inside the existing `gnk-asg-direct-operator` Worker chain and must remain the sole runtime owner for Digital Workforce and Editor Desk routes.

## Canonical implementation on `main`

### Public surfaces

- `apps/portal/digital-workforce/index.html`
- `apps/portal/editor-desk/index.html`
- `apps/portal/workers/`

### Worker integration

- `workers/gnk-asg-direct-operator/src/index-digital-workforce-v1.js`
- `workers/gnk-asg-direct-operator/src/digital-workforce-api-v1.js`
- base runtime: `workers/gnk-asg-direct-operator/src/index-unified-auth-v17.js`

### Existing API contract

- `GET /api/public/digital-workforce/health`
- `GET /api/public/editor-desk`
- authenticated `GET|POST|PUT /api/admin/editor-desk`

### Existing persistence and safety

- existing `GNK_ASG_D1` binding;
- lazy creation of `editor_desk_packages`;
- embedded safe fallback when no stored package exists;
- operator-session validation through `/api/operator-auth-check`;
- sensitive hold lane excluded from public responses;
- current Worker wrapper preserves the existing scheduled and email handlers instead of replacing them.

## Supplied standalone application

The supplied manual describes a separate Worker with:

- its own `src/index.js` runtime;
- its own D1 schema with 12 tables;
- its own KV namespace;
- its own static asset host;
- its own `/api/public/*` and `/api/admin/*` route tree;
- its own cron engine at 08:00 and 09:00 Zagreb time;
- its own Anthropic API integration;
- its own admin-token authentication;
- its own sitemap, robots and newsroom article rendering.

This is not a drop-in frontend package. It is an alternative application architecture.

## Capability mapping

| Supplied capability | Current state | Decision |
|---|---|---|
| Public Digital Workforce landing | Implemented | Keep current page |
| Public Editor Desk package | Implemented | Keep current API and page |
| Protected Editor Desk writes | Implemented | Keep operator-session auth |
| Readiness endpoint | Implemented | Keep current health contract |
| D1 persistence | Partially implemented | Extend existing schema only through reviewed migrations |
| 1,573 synthetic worker catalogue | Existing public catalogue | Reuse `/workers/`; do not seed a second catalogue |
| Nine project areas | Present as approved public package | Extend current payload/schema if required |
| Risks, tasks, trades and bulletins | Not fully implemented in the canonical module | Candidate features for incremental integration |
| 90-day historical and forward seed data | Not integrated | Treat as content import, not runtime replacement |
| 08:00 preparation / 09:00 publication engine | Not approved for activation | Do not add cron or scheduled writes without a separate explicit decision |
| Anthropic report generation | Not integrated | Do not add secret or external model call in this audit |
| Admin token with fallback `1203` | Rejected | Existing authenticated operator session remains mandatory |
| Separate subdomain or Worker route | Rejected for current integration | Keep existing canonical domain and Worker chain |
| Separate sitemap/robots ownership | Rejected | Portal SEO pipeline remains canonical |

## Material conflicts

1. **Authentication conflict** — a bearer/admin token, especially a default fallback value, is weaker and incompatible with the existing operator-session boundary.
2. **Route ownership conflict** — a separate Worker would compete for public, admin, sitemap, robots and asset routes.
3. **Persistence conflict** — a second D1 database and KV namespace would create divergent operational truth.
4. **Scheduler conflict** — a new cron could publish or mutate state independently of the established runtime controls.
5. **SEO conflict** — the supplied Worker wants to own sitemap, robots and article rendering already governed by the portal SEO pipeline.
6. **Runtime conflict** — replacing the canonical wrapper would risk bypassing existing auth, mail safety, contact, media and other runtime contracts.

## Safe integration backlog

Only the following may be considered for later incremental PRs:

1. Define normalized D1 migrations for projects, risks, tasks, bulletins, opinions and plan data under the existing binding.
2. Import approved seed content after provenance and public/private classification review.
3. Extend `/api/public/editor-desk` or add narrowly scoped public endpoints under the current Worker wrapper.
4. Add corresponding authenticated admin endpoints using the existing operator-session check.
5. Add contract tests proving sensitive data never reaches public responses.
6. Keep all scheduled generation and external AI calls disabled until separately authorized.

## Prohibited implementation path

Do not:

- deploy the supplied standalone Worker;
- create another D1 database or KV namespace;
- add a new Worker route, custom domain or subdomain;
- introduce `ADMIN_TOKEN` fallback authentication;
- add or activate cron triggers;
- add Anthropic or other API secrets;
- replace `index-unified-auth-v17.js` or the active wrapper chain;
- send test or production mail;
- alter DNS, Cloudflare routes, bindings, secrets or tokens.

## Conclusion

The source package is useful as a **functional specification and content source**, not as the production runtime. Future work must port selected capabilities into the existing canonical architecture through small, reviewed and test-backed changes.
