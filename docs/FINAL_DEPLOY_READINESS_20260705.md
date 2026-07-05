# GNK ASG Enterprise Platform — Final Deploy Readiness

Date: 2026-07-05  
Review branch: `enterprise-portal-ui-v3-20260704`  
Pull request: `#329`  
Reviewed head: `1023a3f7a6bcba81e696779688726af67d1e734e`  
Preview merge revision: `9c91bc4621bbd7b79e311938ec91fa81885a6c86`  
Status: DRAFT / REVIEW ONLY / NOT MERGED / NOT DEPLOYED TO PRODUCTION

## Verified review state

- Pull request is open, draft and mergeable.
- Release, Enterprise Runtime, Enterprise Final Review, Company Operations, Digital Workforce, Admin, Mail, Media, Index, Design, SEO and V2 publication-detail checks pass.
- Isolated Worker preview deployment completed successfully.
- Preview URL: `https://gnk-asg-enterprise-review-v3.beckuphome.workers.dev`
- Preview metadata confirms `productionRoutes=false`.
- Preview metadata confirms `mailSending=false`.
- Preview workflow verified the public health endpoint and Public Operations page.
- Preview workflow verified that the protected Enterprise route returns the authentication boundary.
- A workflow named `Deploy GNK ASG production` may report success during pull-request validation. That result is not evidence of a production deployment.

## Production deployment control

The production workflow does not deploy automatically from this review branch.

Production requires all of the following:

1. The approved revision is merged to `main`.
2. The production workflow is started manually.
3. The exact executive approval phrase is supplied:
   `Odobravam kontrolirani deploy - token 1203`
4. Validation and production-environment gates complete successfully.
5. Post-deploy smoke checks and rollback readiness are confirmed.

Silence never authorizes production merge, deploy, DNS or route changes, secrets, payments, contracts, mass email or SMS.

## Enterprise and Admin scope

The protected platform includes:

- Admin Center and Executive Portfolio;
- Enterprise Project Center and Mission Control;
- Mail Studio and mail-status contracts;
- Media Command Center and public media application;
- Registry, SEO, editorial and design-review modules;
- Company Operations and Digital Workforce views;
- deployment, recovery and audit controls.

The Executive Portfolio contains 28 programmes: 19 runtime-connected and 9 marked for pending runtime integration. Unknown owners, deadlines, budgets and funding models are not invented and remain `NIJE POSTAVLJENO`, `not-set` or `not-approved`.

## Group companies and operational profiles

- Group companies represented: 45.
- Internally coded operating companies: 43.
- Configured system-generated operational profiles: 1,537.
- Functions: 27.
- Primary and support task relationships: 3,074.

Company Operations exposes approved aggregates only:

- internal display code;
- city, country, region and timezone;
- local time and availability;
- functions and connected projects;
- active work, decision-review and publication capacity.

Internal company and profile codes are display identifiers. They are not registration, tax or legal numbers.

The public GNK profile format is:

`GNK-0000 · Firstname S. · position · company · origin country · work country · local time · availability`

These are system-generated operational profiles. They are not claims of real natural persons or confirmed employment relationships. Message content, contacts, attachments, counterparties and private assignments remain hidden.

## Public portal

The review package contains:

- premium public index;
- THE CODE project and New York countdown;
- Corporate Newsroom, news and publications;
- Public Operations and governance board;
- Group Companies directory;
- GNK profile directory and live collaboration matrix;
- public Media Kit centres;
- public media application in HR and EN;
- market and finance modules;
- legal, contact and document routes.

All eight current Croatian publication teasers now have corresponding detail pages. `Check Publication Detail Pages V2` validates the linked files and their title, description and canonical metadata.

A legacy `Check Publication Detail Pages V1` workflow remains in the repository and reports a stale failure because of its obsolete exact-card-count assertion. The active V2 validator passes and the pull request remains mergeable. V1 should be archived or removed when GitHub workflow-file editing is available; it is not a runtime or content failure.

## Management Finance Cockpit

`/financije/` now reads `public-management-finance-v1.json` and displays:

- FY2025 management baseline;
- H1 2026 management estimate;
- FY2026 linear projection;
- methodology and disclosure;
- public operational categories;
- never-public bookkeeping boundaries.

The H1 2026 estimate is 98% of the comparable FY2025 value. The FY2026 projection is H1 multiplied by two. Both are management information and are not bookkeeping entries, tax filings, audit opinions or guarantees of future results.

## Executive review schedule

The backend and public policy are aligned:

- before 08:00 Europe/Zagreb — package preparation;
- 08:00–08:59 — awaiting Executive Office review;
- at or after 09:00 — approved by silence only when no STOP, HOLD or CANCEL exists;
- explicit APPROVE overrides the timing window;
- held, stopped and cancelled states may be publicly visible but cannot release the package.

Production deploy, DNS changes, payments, contracts and mass delivery remain explicit-only actions.

## Information boundary

Never-public information includes:

- tokens, API keys and secrets;
- private recipients and message content;
- unapproved drafts and comments;
- private audit and incident records;
- registry material before approval;
- personal data not explicitly approved for publication;
- private financial documents, accounts, journal entries, invoices, bank transactions, payroll and bookkeeping attachments;
- DNS, Cloudflare and deployment secrets.

## Final production checklist

- [x] Review branch isolated from production routes.
- [x] Mail and campaign sending disabled in review.
- [x] Pull request synchronized with `main` and mergeable.
- [x] Backend 08:00–09:00 approval model aligned and tested.
- [x] Company Operations and 1,537-profile contracts pass.
- [x] Finance Cockpit has explicit non-booking disclosure.
- [x] Eight current HR publication detail routes exist.
- [x] Active Publication Detail Pages V2 validator passes.
- [x] Isolated preview deployment and route checks pass.
- [x] Protected Enterprise authentication boundary verified.
- [x] Production workflow remains exact-approval gated.
- [ ] Legacy Publication Detail Pages V1 workflow archived or removed.
- [ ] Final authenticated desktop/mobile visual inspection recorded.
- [ ] Backup and rollback snapshot verified immediately before merge.
- [ ] Pull request explicitly approved and moved out of draft.
- [ ] Exact production deploy phrase received.
- [ ] Post-deploy public, Admin, Mail and Worker smoke tests pass.

## Decision

Current state: **CONDITIONAL GO for final visual review and controlled deployment preparation.**

The technical platform, isolated preview, core runtime contracts and active publication validator pass. Production remains locked until the final visual/mobile inspection, backup/rollback verification, explicit PR approval and exact production deploy phrase are completed.
