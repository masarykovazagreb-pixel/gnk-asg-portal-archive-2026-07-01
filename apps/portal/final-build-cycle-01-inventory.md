# Final Build Cycle 01 — Inventory and Scope Checkpoint

Status: review-only artifact. No production route, DNS, secret, deployment, merge or mass-email behavior is changed by this file.

## Confirmed repository facts

- Repository: `beckuphome-gnk/gnk-asg-portal`
- Default branch used for this review cycle: `main`
- Review-only policy present at `apps/portal/final-build-review-policy.md`
- `apps/portal/package.json` exists and currently exposes `test:e2e` with Playwright only.
- No destructive action was taken in this cycle.

## Active final-build policy constraints

Before explicit deploy approval, the build may only add or improve review pages, manifests, preview modules, SEO/schema/print/PDF structures, deployment checklists and recovery notes.

Forbidden before explicit deploy approval:

- replacing the current homepage or public pages
- removing existing working modules
- deploying to production
- changing DNS
- changing Cloudflare production routes
- changing secrets
- enabling mass sending
- sending campaign emails

## Target operating model

The platform should function as an Enterprise Operating System around the existing portal, not as a replacement until approved.

Primary supervisory layer:

- Operator OS
- Mission Control
- Executive Office
- Approval Queue
- Deployment / Recovery Center

Existing systems to supervise:

- Campaign Mailer
- Mail Studio
- Email Status
- Media Center
- News / Publishing workflows
- Registry Center
- SEO / Publishing Engine
- Digital Workforce
- Mobile Admin

## Public / review content target

The public-facing review build should include a structured `About the Group / Global Organization` layer:

- GNK DINAMO Ltd. Group HQ: Boulder, Colorado, USA
- GNK ASG d.o.o. as regional connected company
- leadership and UBO information
- global map and group network
- 43 companies / GNK entity slots
- THE CODE as a strategic project
- print/PDF-ready sections
- transparent wording for digital workers as `Global Operations Center` / `Digital Operations Team`, not as real employees where that could mislead

## Strategic indicators rule

Use separate labels for statutory facts versus non-statutory strategic indicators.

Recommended public wording:

> Strategic Performance Monitor — non-statutory internal strategic indicators and operational projections. These indicators do not replace statutory accounting records, audited financial reports or official annual results.

Croatian wording:

> Strateški pokazatelji poslovanja — neslužbeni interni strateški pokazatelji i operativne projekcije. Ovi pokazatelji ne zamjenjuju knjigovodstvene evidencije, revidirane financijske izvještaje niti službene godišnje rezultate.

## First technical next step

Create a review-only manifest for the Enterprise Platform modules. The manifest should be static data first, so UI pages can render from one source without affecting production routes.

Suggested next file:

`apps/portal/review-manifests/enterprise-platform.manifest.json`

Minimum manifest sections:

- modules
- existingSystems
- digitalOperationsTeam
- registrySources
- seoPublishingChecks
- approvalQueue
- deploymentGuards
- publicPages
- strategicIndicators

## Test plan for the next cycle

1. Verify whether `review-manifests` exists.
2. Add the manifest if missing.
3. Keep all fields static and review-only.
4. Do not wire it into production routes until a later approved preview step.
