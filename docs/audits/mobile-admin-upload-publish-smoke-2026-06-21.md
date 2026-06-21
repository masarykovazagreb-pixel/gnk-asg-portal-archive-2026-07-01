# GNK ASG mobile admin upload and publish smoke proof — 2026-06-21

## Scope

This evidence applies only to the private development branch `experience-ai-live-overview`. No production route, storage binding, secret or public article was modified.

## Result

- Test script: `scripts/mobile-admin-upload-publish-smoke.mjs`
- Checks passed: **20/20**
- Checks failed: **0**
- Status: **PASS**
- Production network used: **false**
- Production writes: **false**
- Publish simulation: **FakeKV only**
- Live bulk email sending: **false**

## Proven flow

The smoke test verifies the complete repository-level mobile administration path:

1. mobile camera/image file input is present;
2. upload uses the protected operator route and authorization headers;
3. the secure operator rejects unauthorized upload access;
4. upload `FormData` contains the title and image file;
5. the actual Publish Worker rejects a missing operator token;
6. the actual Publish Worker accepts a valid test token;
7. dry-run validates a 500+ word article without any KV write;
8. active HTML such as `script` and inline `onclick` is removed;
9. a short article is rejected;
10. a publish operation succeeds only against an in-memory fake KV store;
11. the expected fake-KV article and index records are created;
12. duplicate slugs are blocked;
13. an explicit update is accepted;
14. the simulated article is retrievable as JSON and rendered HTML with structured data.

## Source identity proof

The isolated workspace used source files whose calculated Git blob SHAs matched the current repository blobs exactly:

| File | Git blob SHA |
|---|---|
| `apps/portal/operator-mobile/index.html` | `3e9f825f2dd5bb1fdaf67f9fc9adbb3a2cff04c0` |
| `apps/portal/assets/mobile-admin-publisher.js` | `6965707276bed18777ffe5895c2b668586c03ba5` |
| `workers/gnk-asg-direct-operator/src/index-secure.js` | `701349795222c08172b4509997cf85e0cf4ad069` |
| `workers/gnk-asg-publish-operator/src/index.js` | `857a7b3214719c98ea20764fc41dc925e981a1ff` |

Generated evidence hashes:

- `report.json` SHA-256: `ef5a82cbf4d1b68b31b398ddb9cf8b456c26bf2a74a27adc341dfa7a7def01fc`
- `report.md` SHA-256: `f251d619e15b2271e07da5d43f74656496e1e8b545065ac6eb2e31714d18b6ca`

## CI integration

The test is integrated into `.github/workflows/phase1-critical-audit.yml`, including syntax validation, execution, summary output and artifact retention.

At commit `780eb85966dec4f3a06e48c3a086b48eb9ab5b6d`, GitHub-hosted workflow jobs failed before executing any step. Both the Runner Diagnostic job and the Phase 1 Critical Audit job returned `steps: null`. Therefore:

- the isolated test result is valid repository-level evidence;
- the latest GitHub CI must **not** be described as green;
- final CI readiness remains open until GitHub-hosted jobs execute normally and reproduce the result.

## Safety state

- PR merged: **false**
- Production deploy: **not performed**
- `PRODUCTION_APPROVED` marker: **not created**
- Secrets changed: **false**
- DNS changed: **false**
- Cloudflare production routes changed: **false**
- Production KV/D1/R2 writes: **false**
- Real public article published: **false**

## Readiness interpretation

This closes the isolated repository-level mobile upload/dry-run/publish smoke requirement. A browser-based preview deployment test and authorized runtime storage rehearsal remain separate open requirements and are not claimed by this proof.
