# Production candidate validation

- Source branch: `main`
- Frozen source SHA: `a82af2a7256aa393883e3cf82a4317f82411fe7f`
- Purpose: trigger the repository's pull-request CI checks against the frozen production candidate.
- This file does not change portal runtime, Cloudflare configuration, mail infrastructure, scheduler behavior, routes, bindings, secrets, or production state.
- Production deployment remains separately gated by the approved deployment workflow and production environment approval.
