# Canva Security Center / Audit Logs Master — 2026-07-09 09:00

## Goal

Create the Canva-side visual reference for the protected Security Center and Audit Logs module of the GNEW / GNK ASG Portal / THE CODE system.

This is a design-only reference. It must be suitable for later HTML/CSS/JS implementation in `beckuphome-gnk/gnk-asg-portal`.

No production deployment, mail send, campaign execution, DNS change, Cloudflare route change, secret/token change, or auth/session/operator change is authorized by this document.

## Visual target

Use the existing imported black/gold Canva-style references as the visual target:

- premium black background
- restrained gold accents
- glass/card panels
- cinematic admin feel
- clear enterprise typography
- strong separation between view-only status and locked actions
- no raw sensitive values

## Page role

This module is a protected admin-side visibility layer. It is not a control panel for dangerous actions.

The Canva reference should communicate:

- security status awareness
- audit trail readability
- operator accountability
- safe review workflow
- locked destructive/production actions

## Primary screen structure

### 1. Protected header

Title:

```text
SECURITY CENTER / AUDIT LOGS
```

Subtitle:

```text
Protected visibility layer for system events, review history and operational integrity.
```

Header badges:

```text
PROTECTED
VIEW-ONLY
NO DEPLOY
NO MAIL SEND
```

Visual rules:

- use gold badge borders
- do not show token/session values
- do not show real environment variable names beyond generic labels
- do not show live deploy controls

### 2. Security status cards

Create four top-level cards:

1. Authentication Layer
2. Operator Access
3. Mail / Campaign Guard
4. Deployment Guard

Each card should use a simple status vocabulary:

```text
Protected
Review required
Locked
Not exposed
```

Do not use green/red panic UI unless later backed by real data. Prefer neutral enterprise indicators.

### 3. Audit log table

Create a central audit table mockup with columns:

- Time
- Actor
- Area
- Event
- Risk Level
- Review Status

Example placeholder rows only:

```text
09:00  System  Design Docs  Canva brief created  Low  Recorded
08:00  System  Admin Shell  Visual reference updated  Low  Recorded
07:00  System  Contact  Public inquiry brief prepared  Low  Recorded
```

Important: placeholders must be visibly marked as design placeholders. Do not imply real audit data unless connected to a verified backend source later.

### 4. Review queue panel

Right-side panel:

```text
REVIEW QUEUE
- Security copy review
- Audit table data source review
- Admin-only route check
- Public/private boundary check
```

Buttons must be visual-only:

```text
Review Details
Export Draft
```

Do not include:

- approve deploy
- send campaign
- rotate token
- open production route
- bypass auth

### 5. Locked actions panel

Create a lower card named:

```text
LOCKED ACTIONS
```

Rows:

```text
Deploy production — locked
Send mail — locked
Run campaign — locked
Change DNS / Cloudflare — locked
Modify secrets / tokens — locked
Change admin/session protection — locked
```

This panel must be visually clear but non-operational.

### 6. Public/private boundary panel

Add a small architecture card:

```text
PUBLIC SIDE
Index / THE CODE / Markets / News / Publications / Contact

PROTECTED SIDE
Admin Center / Operator Dashboard / Mail Studio / Campaign Approval / Security Center / Audit Logs
```

Rule note:

```text
Public pages must not expose protected routes, tokens, mail controls, campaign actions or backend internals.
```

### 7. Audit detail modal mockup

Optional Canva frame or overlay:

Title:

```text
Audit Event Detail
```

Fields:

- event summary
- actor type
- module
- timestamp
- risk level
- linked review note
- immutable log notice

Footer copy:

```text
Audit records are informational and must not expose secrets or raw protected payloads.
```

## Implementation notes for later repo work

Later implementation should be split into:

- protected route shell
- server-side audit source
- role-aware read access
- immutable audit-event model
- redaction layer for sensitive values
- UI filter/search by module and risk level
- export only after admin review

No public route should render this module.

## Design tokens for later HTML/CSS

Suggested CSS token map:

```css
--gnk-bg: #050505;
--gnk-panel: rgba(255,255,255,0.045);
--gnk-panel-border: rgba(212,175,55,0.28);
--gnk-gold: #d4af37;
--gnk-gold-soft: rgba(212,175,55,0.14);
--gnk-text: #f5f0dc;
--gnk-muted: rgba(245,240,220,0.68);
--gnk-danger-muted: rgba(255,120,90,0.14);
```

These are design placeholders only and should be reconciled with the existing portal token system before implementation.

## Risk rules

This design must not:

- deploy anything
- send mail
- trigger campaigns
- expose Mail Studio send actions
- expose campaign run controls
- expose token values
- expose secret names or values
- expose Cloudflare account or route details
- expose private backend payloads
- alter admin/session/operator protection
- imply production readiness without verification

## Acceptance checklist

- black/gold premium style matches imported Canva references
- Security Center is clearly protected, not public
- Audit Logs are readable and marked as placeholder unless real data exists later
- dangerous actions are shown as locked/non-operational
- no sensitive values visible
- no deploy/mail/campaign controls
- ready for later HTML/CSS/JS conversion

## Final boundary

This document is a Canva/design reference only. Any future implementation, pull request merge, or deployment requires explicit separate approval.
