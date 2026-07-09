# Canva Design Brief — News / Publications Master

Date: 2026-07-09
Branch: `design/canva-news-publications-master-20260709-0500`
Scope: Canva-side visual and implementation reference only.
Production status: **No deploy. No mail. No campaign. No DNS/Cloudflare/secrets/auth changes.**

## Purpose

Create a black/gold Canva master reference for the public **News / Publications** module of the GNEW / GNK ASG Portal / THE CODE system.

This page must later translate cleanly into HTML/CSS/JS inside `beckuphome-gnk/gnk-asg-portal`, but this increment is only a design/documentation layer.

## Visual Target

Use the already imported Canva references as the style target:

- THE CODE HTML import
- Admin Center reference
- Contact Center reference
- Mail Studio reference
- THE CODE desktop reference

Core look:

- deep black background
- gold accent system
- glass-like cards
- cinematic editorial grid
- high-contrast typography
- restrained premium motion cues
- enterprise dashboard discipline, not a generic blog

## Module Identity

Working title:

`GNEW Intelligence / News & Publications`

Purpose of the module:

- publish verified official news
- host investor/media publications
- separate official releases from analysis/editorial material
- prepare later integration with newsroom, report, media-kit and THE CODE content

## Recommended Canva Page Structure

### 1. Hero / masthead

Content:

- title: `NEWS & PUBLICATIONS`
- subtitle: `Official releases, market intelligence, group updates and THE CODE editorial layer.`
- small label: `GNEW / GNK ASG / GNK DINAMO LTD. GROUP`
- right-side status capsule: `Verified publication stream`

Design:

- black radial gradient
- thin gold border frame
- small grid/scanline texture
- one premium gold CTA: `Latest official release`
- secondary CTA: `Publication archive`

### 2. Featured release card

Large left card for the latest official release.

Fields:

- category
- publication date
- headline
- 2–3 line abstract
- verification badge
- language tabs: `HR / EN`
- action: `Read release`

Implementation note:

- Later HTML card should support canonical URL, language switch and no fake dates.
- If no verified content exists, card must show `Draft / pending approval`, not invented news.

### 3. Editorial grid

Three-column card grid:

1. Official Releases
2. Market Notes
3. THE CODE Dispatches
4. Projects
5. Companies
6. Media Kit Updates

Each card should include:

- category chip
- title
- short summary
- status: `published`, `draft`, `review`, `archived`
- language indicator
- date field

Design:

- glass cards
- gold top border
- mono metadata
- subtle hover target state for later frontend

### 4. Publication archive / filter bar

Filter chips:

- All
- Official
- Markets
- Projects
- Companies
- Finance
- THE CODE
- Media
- Legal / Registry

Implementation note:

- Filters must be frontend-safe and data-driven.
- No live search backend assumption unless already implemented.

### 5. Report rail

Right-side or lower rail for serious documents:

- Annual / interim reports
- Investor notes
- Media memoranda
- Official statements
- PDF downloads

Required visual states:

- `Available`
- `Draft`
- `Restricted`
- `Requires approval`

Critical rule:

- Do not expose restricted documents publicly without explicit approval and implementation review.

### 6. Trust / verification strip

Add a bottom strip:

- `Source controlled`
- `Editorial reviewed`
- `No automated bulk publishing`
- `No mail campaign trigger`

Purpose:

- prevent Canva design from implying any automated publishing or mailing action.

## Frontend Token Notes

Suggested CSS tokens for later implementation:

```css
:root {
  --gnk-bg: #050505;
  --gnk-panel: rgba(255,255,255,.045);
  --gnk-panel-strong: rgba(255,255,255,.075);
  --gnk-gold: #d6b25e;
  --gnk-gold-soft: rgba(214,178,94,.24);
  --gnk-border: rgba(214,178,94,.26);
  --gnk-text: #f6f1e5;
  --gnk-muted: rgba(246,241,229,.66);
  --gnk-danger: #ff6b6b;
  --gnk-ok: #62d394;
}
```

Suggested frontend components:

- `NewsMasthead`
- `FeaturedReleaseCard`
- `PublicationGrid`
- `PublicationFilterBar`
- `ReportRail`
- `PublicationTrustStrip`

## Data Safety Rules

Hard requirements for later implementation:

- No invented financial data.
- No invented publication dates.
- No auto-send or campaign hooks.
- No mail approval logic changes.
- No protected admin/session/operator route changes.
- Public page must render safely even with empty publication data.
- Draft or restricted items must not appear as published.

## Canva Build Instruction

In Canva, create one master page/frame named:

`GNEW News Publications Master — Black Gold`

Recommended layout:

- 16:9 desktop master frame
- optional mobile vertical derivative later
- use same black/gold visual language as Admin Center, Contact Center, Mail Studio and THE CODE references
- keep text modular so each card can become a frontend component

## Acceptance Checklist

This increment is acceptable when:

- the News / Publications page has a clear black/gold Canva master direction
- the design separates official releases from editorial/analysis material
- report/download areas have explicit access/status states
- no fake data is required
- no production functionality is changed
- future HTML/CSS/JS implementation has component names and token hints

## Risk Check

Safe:

- documentation-only design brief
- no production deploy
- no workflow rerun
- no mail sending
- no campaign trigger
- no DNS/Cloudflare/secrets changes
- no admin/session/operator protection changes

Blocked without explicit approval:

- production deploy
- exposing restricted PDFs
- turning draft releases into published releases
- connecting publication cards to campaign or mail flows
- modifying Mail Studio send/approval logic
