# GitHub Actions quota blocker — 2026-06-21

## Scope

Branch: `experience-ai-live-overview`

Production changed: false.
Secrets, DNS, routes and Cloudflare production settings changed: false.

## Confirmed cause

The `beckuphome-gnk` account has used all GitHub Actions minutes included in the current billing cycle:

- Included minutes: 2,000
- Used minutes: 2,000
- Usage: 100%
- Actions budget: 0 USD, therefore additional runs are blocked
- Scheduled reset: 2026-07-01

## Evidence observed before confirmation

- Phase 1 Critical Audit run `27901709114` failed before the first workflow step.
- Runner Diagnostic run `27901709127` failed before the first workflow step.
- Both jobs returned no steps and no downloadable logs.
- The same pre-step failure affected all pull-request workflows.

## Final conclusion

This is not a demonstrated application-code failure and not a defect in the GitHub-hosted runner configuration. The workflows are blocked because the monthly Actions quota is exhausted and overage spending is disabled.

## Operating model until reset

1. Continue direct repository inspection and small modular commits.
2. Run offline, regression, security and read-only network audits locally from `G:\GNK` using `tools/local-all-phases/run-all-phases-local.ps1`.
3. Keep production deploy, merge, secrets, DNS and route changes locked.
4. Do not treat failed or missing Actions runs as code failures while the quota block remains active.
5. After 2026-07-01, run the minimal heartbeat first, then the Phase 1 Critical Audit, then the remaining preview workflows.
