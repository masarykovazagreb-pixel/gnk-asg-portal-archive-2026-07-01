# Operator OS / Mission Control Status Panel

Branch: `enterprise-os-v2-finalbuild`
Mode: review-only until explicit user approval

## Purpose

This document defines the first safe implementation slice for the Enterprise OS v2 supervisory layer. It does not change production routes, DNS, Cloudflare configuration, secrets, mail delivery or deployment behavior.

The panel is a non-destructive oversight surface for existing portal capabilities and planned Enterprise OS v2 modules.

## Primary Status Areas

| Area | Status signal | Allowed action | Blocked action |
|---|---|---|---|
| Campaign Mailer | template, queue, test mode, last controlled test | preview and draft-only review | mass sending or unapproved recipient list delivery |
| Mail Studio | compose surface, signature, autoresponder preview | local preview and single approved test draft | sender spoofing, secret exposure, media blast |
| Email Status | inbound/outbound visibility, errors, bounce notes | read-only diagnostics | hidden resend loops or bulk retry |
| Media Center | accreditation, newsroom, contact intake | form/workflow review | unapproved publication or distribution |
| News / Publishing | draft, review, approved, scheduled, published, held, archived | metadata/readiness audit | public switch without approval |
| SEO / Publications | meta, schema, OG, canonical, hreflang, sitemap, internal links | checklist and readiness scoring | automatic public indexing changes without review |
| Registry Center | DZIV, EUIPO, WIPO, Colorado, Sudski registar, FINA | deadline and evidence tracking | automatic filing or legal submission |
| Deployment / Recovery | branch, build, backup, rollback, review gate | visibility and checklist | merge, deploy, DNS or Cloudflare route change |
| Approval Queue | pending admin actions | approve/hold concept only | production execution without explicit final approval |

## Minimum UI Contract

The first UI slice should be built as a passive dashboard with these sections:

1. **Executive Guard Bar**
   - Current branch: `enterprise-os-v2-finalbuild`
   - Production state: unchanged
   - Deploy permission: blocked until explicit user approval
   - Mail blast permission: blocked
   - DNS / Cloudflare / secrets: blocked

2. **Module Health Grid**
   - Campaign Mailer
   - Mail Studio
   - Email Status
   - Media Center
   - Publishing
   - SEO
   - Registry
   - Recovery
   - Approval Queue

3. **Risk Register**
   - Red: any destructive or external action
   - Amber: incomplete review, missing test evidence, unknown route
   - Green: static review artifact or read-only diagnostic

4. **Next Action Queue**
   - one task per row
   - owner or role
   - status
   - evidence link
   - approval requirement

5. **Mobile Admin Compact View**
   - pending approvals
   - registry deadlines
   - publishing readiness
   - mail test status
   - recovery status

## Transparency Requirements

Digital workers, AI Manager, AI Director, Executive Office, Supervisory Board and manager layers must be described as an AI-supported operating model, Global Operations Center or Digital Operations Team unless a role is a legally real person or formally appointed real-world function.

Do not present synthetic workers as real employees.

## Acceptance Checklist for This Slice

- [ ] Panel route or component is added only on the v2 branch.
- [ ] Existing production routes are not replaced.
- [ ] No mail send action is wired.
- [ ] No deploy action is wired.
- [ ] No secret or environment file is touched.
- [ ] No DNS or Cloudflare file/configuration is touched.
- [ ] All status labels distinguish live facts, review-only status and strategic/planned items.
- [ ] Mobile layout is readable before final deploy review.

## Next Small Technical Step

Locate the portal routing structure and add a passive `MissionControl`/`OperatorOS` component or page behind a clearly review-only path. If routing cannot be safely determined, first add static component stubs and tests without exporting them into production navigation.
