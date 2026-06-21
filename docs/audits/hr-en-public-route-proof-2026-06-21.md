# GNK ASG HR/EN public route proof — 2026-06-21

## Scope

This evidence applies to the private development branch `experience-ai-live-overview`. It does not approve or trigger production publication.

## Result

- Audit script: `scripts/hr-en-public-route-audit.mjs`
- Public navigation entries audited: **30**
- Unique static route files audited: **20**
- Checks passed: **137/137**
- Checks failed: **0**
- Audit status: **PASS**
- Production touched: **false**
- Production deploy performed: **false**

The audit verifies public HR/EN navigation key and href uniqueness, physical route-file presence, non-empty route files, HR/EN key pairing, explicit navigation schema version and configured HR/EN home routes.

## Media Kit gap closure

The earlier run reported four failures, all caused by the declared `/media-kit/` route being absent for both language inventories. The gap was closed by adding separate controlled-release information hubs:

- HR: `apps/portal/media-kit/index.html`
- EN: `apps/portal/en/media-kit/index.html`
- Navigation schema updated to version 7, with the EN entry pointing to `/en/media-kit/`.

The pages include canonical and reciprocal hreflang metadata. They do not publish unapproved ZIP/PDF brand packages, final brand guidelines or unrestricted-use assets.

## Content identity proof

The isolated audit workspace used a repository snapshot produced by the last successful preview workflow and overlaid the exact current GitHub blobs from the branch:

| File | Git blob SHA |
|---|---|
| `apps/portal/media-kit/index.html` | `35a0333fb22add7dc47b6d31c36c388677622d4a` |
| `apps/portal/en/media-kit/index.html` | `bdefce4be91ceecb26531dea0a8b70ec34437ad9` |
| `apps/portal/data/navigation.json` | `3cefdc11a7415c7244e65eb926756ce926f45584` |

The locally calculated Git blob SHAs matched the GitHub blob SHAs exactly before the audit was executed.

Generated isolated evidence hashes:

- `route-audit.json` SHA-256: `288554a9425769dc1f93e9d7e232e11fc02e8e2246d6ab487349705616c0f883`
- `route-audit.md` SHA-256: `714ad6130fd50b5b39d074a6f32a1df11a43b583943f303a8663956a89e715d6`

## GitHub Actions infrastructure observation

At head commit `e47ca7455da5e86184ccfd0c7e8d9655dba4883a`, all PR workflows failed before executing any job step. Both the Runner Diagnostic job and the Release Package job were returned with `steps: null`, and the job log blob was unavailable. This is recorded as an external runner-start blocker, not as proof of a code failure or a successful CI run.

The repository-level route audit is therefore proven in isolation, while the requirement for a completely green final GitHub CI remains open until GitHub-hosted jobs execute normally again.

## Safety state

- PR merged: **false**
- Production deploy: **not performed**
- `PRODUCTION_APPROVED` marker: **not created**
- Secrets changed: **false**
- DNS changed: **false**
- Cloudflare production routes changed: **false**
- Live bulk email sending: **disabled**

## Readiness interpretation

This closes only the repository-static HR/EN public route inventory gap. It does not by itself prove HTTP runtime behavior, mobile-admin publish smoke behavior, cloud runtime restore, or final 100% project readiness.
