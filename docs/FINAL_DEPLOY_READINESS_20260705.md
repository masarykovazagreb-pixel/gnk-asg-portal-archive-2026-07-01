# GNK ASG Enterprise Platform — Final Deploy Readiness

Date: 2026-07-05
Review branch: `enterprise-portal-ui-v3-20260704`
Pull request: `#329`
Reviewed head: `d7be9b5e21c2138a41140b150689b7908f7b67bd`
Status: DRAFT / REVIEW ONLY / NOT MERGED / NOT DEPLOYED TO PRODUCTION

## Verified review state

- Pull request is open, draft and mergeable.
- All GitHub Actions checks associated with the reviewed head completed successfully.
- Isolated Worker preview deployment completed successfully.
- Preview URL: `https://gnk-asg-enterprise-review-v3.beckuphome.workers.dev`
- Preview merge revision: `b14f3a9dccd7c464ac7766b04689f8cbcabad795`
- Preview metadata confirms `productionRoutes=false`.
- Preview metadata confirms `mailSending=false`.
- Public preview endpoints and protected Enterprise route were verified by the preview workflow.

## Production deployment control

The production workflow no longer deploys automatically after a push to `main`.

Production requires all of the following:

1. The requested revision is on `main`.
2. The production workflow is started manually with `workflow_dispatch`.
3. The exact executive approval phrase is supplied:
   `Odobravam kontrolirani deploy - token 1203`
4. Validation and production-environment gates complete successfully.

On pull requests, only validation runs. The production authorization and deployment jobs are skipped.

## Admin Executive Portfolio

The protected Admin landing page now loads an executive portfolio view containing:

- 28 project programmes in the master portfolio;
- 19 runtime-connected projects;
- 9 additional real initiatives marked `pending-runtime-integration`;
- functional project owner and accountable workflow profile;
- teams and function distribution;
- backlog and active work packages;
- milestones and deadlines;
- documents;
- dependencies;
- risks;
- worker status;
- audit references and audit event counts;
- review gate;
- budget and financial model.

Unconfirmed owners, deadlines, budgets and funding models are never invented. They are displayed as `NIJE POSTAVLJENO`, `not-set` or `not-approved`.

## Operational workforce

- Configured operational workflow profiles: 1,537
- Primary and support tasks: 3,074
- Initial in-progress profiles: 880
- Scheduled profiles: 219
- Standby profiles: 219
- Review-required profiles: 219

Each assignment contains:

- worker ID and function;
- primary and support project;
- primary and support task;
- work state and progress;
- assigned/start timestamps;
- heartbeat and next checkpoint;
- evidence requirement;
- peer review requirement;
- audit reference and audit trail.

## Public portal and information boundary

The public portal catalogue explicitly allows only approved public datasets, reports, publications, news, documents, visuals, group-network information and public system status.

Never-public information includes:

- operator and administrator tokens;
- API keys and secrets;
- private recipients and email addresses;
- unapproved drafts and internal comments;
- private audit records and security incidents;
- internal registry documents before approval;
- personal data not explicitly approved for publication;
- DNS, Cloudflare and deployment secrets.

The public dashboard and catalogue display the intended executive schedule:

- 08:00 Europe/Zagreb — package enters Executive Office review;
- 08:00–09:00 — APPROVE, STOP, HOLD or CANCEL window;
- 09:00 — no response means approved by silence for reversible content and operational packages only.

Production deploy, DNS changes, payments and mass email/SMS remain explicit-only actions.

## Known blocker before final production approval

The public catalogue and dashboard are aligned to the 08:00–09:00 policy, but the existing `public-operations-v1.js` backend still uses its earlier 08:00 approval cutoff. Its backend cutoff and tests must be updated to 09:00 before the 99% automation / 1% executive-decision policy can be declared fully implemented.

This mismatch does not unlock production deployment, DNS or mass delivery. Automatic publication remains disabled in review. It is nevertheless a release blocker because the backend and public policy must agree.

## Final production checklist

- [x] Review branch remains isolated from production routes.
- [x] Mail and campaign sending remain disabled in review.
- [x] Current CI is green.
- [x] Isolated preview deploy and route checks pass.
- [x] Protected Admin and Enterprise routes are verified.
- [x] Admin Executive Portfolio contract passes.
- [x] Worker assignment lifecycle contract passes.
- [x] Production workflow is manual-only and exact-approval gated.
- [ ] Backend 08:00–09:00 approval cutoff is aligned and tested.
- [ ] Final authenticated visual/mobile inspection is recorded.
- [ ] PR is explicitly approved and moved out of draft.
- [ ] Exact production deploy command is received.
- [ ] Post-deploy smoke tests pass.
- [ ] Backup/mirror is completed and verified.

## Decision

Current state is suitable for final review and controlled completion. It is not yet suitable for production deployment because the backend approval cutoff remains inconsistent with the approved 08:00–09:00 operating policy.
