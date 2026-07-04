# GNK DINAMO Ltd. Group / GNK ASG Enterprise Digital Platform

## Final Build Inventory — Operator OS / Mission Control

Status: controlled pre-deploy development document. This file does not change production routes, DNS, secrets, Cloudflare bindings, mail sending, or deployment behavior.

## Current repository signals verified

- The repository is the private development base for the GNK ASG portal and related Cloudflare Workers.
- The active public frontend is documented under `apps/portal`.
- Cloudflare Workers are documented under `workers` and must remain free of secrets.
- Shared UI, navigation, API, SEO and theme assets are planned under `packages`.
- Route, endpoint and binding contracts are planned under `contracts`.
- Production `gnk-asg.hr` is not changed by this inventory.
- No Cloudflare deploy is executed by this inventory.

## Existing frontend checkpoint

Verified active portal file:

- `apps/portal/index.html`

Observed active modules or navigation targets from the portal shell:

- Corporate profile
- Finance section
- Markets / `trzista`
- Publications / `objave`
- News / `vijesti`
- Auto Editor modal
- Visual Index
- PDF Center / documents modal
- AI assistant
- Contact
- Legal
- Operator Dashboard / admin
- App surface
- HR / EN language split

Observed SEO baseline in the active portal shell:

- canonical URL
- robots and googlebot directives
- Open Graph metadata
- Twitter card metadata
- HR, EN and x-default hreflang links
- JSON-LD graph for WebSite, Organization, Person and WebPage
- social-card image metadata

## Operator OS target scope

Mission Control must act as a non-destructive supervision layer over existing systems, not as a replacement for existing production modules.

Primary monitored areas:

1. Campaign Mailer
2. Mail Studio
3. Email Status
4. Media Center
5. News workflow
6. Publications workflow
7. SEO / Publishing Engine
8. Registry Center
9. Deployment Status
10. Recovery Status
11. Mobile Admin
12. Approval Queue
13. Digital Operations Team
14. AI Manager
15. AI Director
16. Executive Office

## Digital Operations identity policy

Use operational profiles, not claims of real employees.

Allowed presentation pattern:

- Name + initial, e.g. Sofia P.
- Worker ID, e.g. REG-017
- Country / region
- Time zone
- Languages
- Department
- Assigned company or entity
- Role
- Status
- Workload
- KPI summary
- Reporting line

Avoid:

- Full invented biographies
- Claims that operational profiles are real employees
- Fake personal employment histories
- Fake personal contact details
- Any representation that can mislead users into believing a fictional person is a real human employee

Preferred wording:

- Global Operations Center
- Digital Operations Team
- Operations Profile
- Worker ID
- Assigned Role
- Mission Queue
- Approval Status

## Organization model target

Top layer:

- Executive Office
- Supervisory Board
- AI Director
- AI Managers
- Department Managers
- Digital Operations Workers

Public group layer:

- GNK DINAMO Ltd. Group — HQ Boulder, Colorado, USA
- GNK ASG d.o.o. — regional affiliated company, Zagreb, Croatia
- THE CODE — strategic project
- 43 companies / GNK entities as a scalable group map

## Registry Center target scope

Registry Center should track status, deadlines and document queues across:

- DZIV
- EUIPO
- WIPO
- Colorado registry
- Croatian Court Register / Sudski registar
- FINA
- internal corporate records

Minimum fields:

- jurisdiction
- matter type
- registry body
- mark or company reference
- filing date
- deadline
- current status
- risk level
- next action
- owner profile
- document link placeholder
- approval requirement

## SEO / Publishing Engine target checklist

Each public page should have:

- title
- meta description
- canonical
- robots policy
- Open Graph title
- Open Graph description
- Open Graph image
- Twitter card
- hreflang where applicable
- JSON-LD where applicable
- image alt metadata
- internal links
- sitemap inclusion marker
- print/PDF readiness marker where needed

## Mobile Admin / Approval Queue target checklist

Approval queue must support:

- draft content approval
- publication approval
- media email approval
- registry action approval
- SEO metadata approval
- deployment approval
- recovery action approval

Hard safety rules:

- no mass email sending without explicit confirmation
- no DNS change without explicit confirmation
- no Cloudflare route change without explicit confirmation
- no secret changes through the UI
- no production deploy without explicit confirmation

## Next smallest technical step

Create a static Operator OS contract/data module that defines:

- monitored modules
- worker departments
- registry status fields
- approval queue types
- SEO checklist fields
- deployment safety gates

This should be added as data/config first, then connected to UI after review.
