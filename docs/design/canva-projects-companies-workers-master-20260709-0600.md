# Canva Design Brief — Projects / Companies / Workers Master

Date: 2026-07-09 06:00 CEST
Branch: `design/canva-pcw-20260709-0600`
Scope: Canva-side visual reference only. No deploy. No mail. No campaign. No DNS, Cloudflare, secrets, token, bindings, auth/session/operator logic, or production workflow changes.

## Purpose

Create a black/gold Canva master reference for the **Projects / Companies / Workers** area of the GNEW / GNK ASG Portal / THE CODE system.

This module must be suitable for later HTML/CSS/JS implementation in `beckuphome-gnk/gnk-asg-portal`, but this increment is **documentation/design-only**.

## Visual target

Use the already imported Canva references as the visual language:

- `GNK ASG / GNK DINAMO — THE CODE Canva Import 2026-10-07`
- `GNK Premium UI — Admin Center Reference`
- `GNK Premium UI — Contact Center Reference`
- `GNK Premium UI — Mail Studio Reference`
- `GNK Premium UI — THE CODE Desktop Reference`

Core language:

- deep black / carbon background
- gold border system
- glass cards
- premium enterprise dashboard feel
- cinematic THE CODE hierarchy
- compact operator-grade navigation
- no loud gradients except controlled gold glow
- all important status badges must be legible in dark mode

## Module architecture

The design should have three connected but clearly separated zones:

1. **Projects**
   - public-facing project tiles
   - stage/status badge
   - sector/category
   - short description
   - primary CTA: `View project`
   - secondary CTA: `Open documents` only if content is public-safe

2. **Companies**
   - company/entity cards
   - jurisdiction badge
   - relationship/role tag
   - sector
   - visibility state: `Public`, `Internal`, `Restricted`
   - public cards must not expose private IDs, secrets, tokens, internal notes, or unpublished financial data

3. **Workers / Operators**
   - worker/operator directory shell
   - role-based tiles only
   - no personal private data in the Canva public design
   - show generic roles such as `Admin`, `Operator`, `Editor`, `Reviewer`, `Finance`, `Legal`, `Media`
   - final implementation must keep any protected user data behind session/auth layer

## Page composition

### Header

- left: GNK ASG / GNK DINAMO group mark placeholder
- center/right: module title `Projects · Companies · Workers`
- subtitle: `Enterprise registry, project map and role-based workspace`
- top status pill: `Design reference / no live action`

### Navigation strip

Use tabs:

- `Projects`
- `Companies`
- `Workers`
- `Documents`
- `Audit trail`

Tabs are visual only at this stage.

### Hero panel

Text:

> Enterprise registry layer for projects, group entities and role-based workspaces. Designed for public-safe discovery first, protected operations second.

Metrics placeholders only:

- `Projects mapped`
- `Entities grouped`
- `Roles prepared`
- `Restricted items protected`

No fake numbers. Use dashes or placeholders unless verified source data exists.

### Main layout

Desktop reference:

- 12-column grid
- left filter rail, 3 columns
- central card grid, 6 columns
- right context panel, 3 columns

Mobile reference:

- stacked header
- horizontal chips
- single-column cards
- context panel collapses below selected card

## Card rules

### Project card

Fields:

- title
- category
- stage
- short summary
- source status: `Verified`, `Draft`, `Needs review`
- safe CTA

Forbidden:

- deployment controls
- campaign triggers
- mail sending buttons
- private contract data unless explicitly marked public

### Company card

Fields:

- entity name
- jurisdiction
- group role
- sector
- public-safe note
- relationship badge

Forbidden:

- bank data
- KYC files
- unpublished ownership details unless already approved for publication
- hidden admin identifiers

### Worker/role card

Fields:

- role title
- permission group label
- allowed workspace
- status badge

Forbidden:

- real passwords
- tokens
- personal contact data
- authentication bypass text

## Implementation handoff notes

Later HTML/CSS/JS should map the Canva design to:

- reusable `RegistryShell`
- `ProjectCard`
- `CompanyCard`
- `RoleCard`
- `FilterRail`
- `ContextPanel`
- `VisibilityBadge`
- `SourceStatusBadge`

Data must be separated from view code. Public index must only read public-safe data. Protected modules must continue to require existing auth/session/operator protection.

## Security boundaries

Hard exclusions for this increment:

- no deploy
- no GitHub Actions run
- no old workflow rerun
- no Cloudflare edit
- no DNS edit
- no secret/token edit
- no mail sending
- no campaign execution
- no mail test
- no production binding edit
- no admin/session/operator protection changes
- no Mail Studio send logic changes

## Acceptance checklist

- [ ] Canva reference clearly matches black/gold premium UI system
- [ ] Projects, Companies and Workers are visually distinct
- [ ] No fake metrics are introduced
- [ ] No private identifiers or sensitive records are shown
- [ ] Public-safe and protected content are clearly separated
- [ ] Future implementation path is componentized
- [ ] Deploy requires explicit user approval

## Next safe step

Create the next Canva-side design/documentation increment for **Contact / Admin Center shell** or refine this module into a Canva visual reference before touching implementation code.
