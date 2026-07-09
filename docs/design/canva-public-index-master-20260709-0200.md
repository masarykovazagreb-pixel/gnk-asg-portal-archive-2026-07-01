# GNK ASG / GNK DINAMO — Canva Public Index Master Layout

Status: design reference only. No deploy. No production binding changes. No mail/campaign execution.

## Purpose

This document defines the Canva-side master design target for the public index / home page before HTML/CSS/JS implementation in `beckuphome-gnk/gnk-asg-portal`.

The page must look like one premium enterprise platform, not a collage of old blocks. Canva is the visual master. Repo implementation comes later as code.

## Visual Target

Use the imported/converted Canva references as the visual source:

- THE CODE HTML import: `GNK ASG / GNK DINAMO — THE CODE Canva Import 2026-10-07`
- Admin Center reference
- Contact Center reference
- Mail Studio reference
- THE CODE desktop reference

Shared style:

- black base background: near-black, not flat gray
- gold primary accent: premium muted gold, no yellow/orange cheap glow
- glass cards with soft transparent black fill
- thin gold borders and inner shadow
- cinematic dashboard feeling
- world map / global network background
- enterprise-grade typography with strong hierarchy
- same header/footer logic as backend UI shell
- no random gradients, no blue/red legacy UI, no cartoon icons

## Public Index Layout — Canva Frame

Recommended desktop canvas: 1920 x 1080 first, then adapt to responsive implementation.

### 1. Global Header

Content:

- GNK ASG / GNK DINAMO wordmark area
- navigation: Home, THE CODE, Markets, News, Projects, Companies, Workers, Contact
- language switch: HR / EN
- protected entry button: Admin Center

Rules:

- protected/admin links must be visually present but clearly separated
- public page must not expose admin data
- header must be identical design family as backend shell

### 2. Hero Section

Primary message:

`GNK ASG / GNK DINAMO Enterprise Digital Platform`

Secondary message:

`THE CODE · Markets · Companies · Workers · Projects · Finance · Publications`

Hero visual:

- dark world map or global network mesh
- gold node lines
- central glass card with platform title
- right-side KPI/dashboard cards
- lower hero strip with live module badges

Hero CTAs:

- `Enter THE CODE`
- `View Markets`
- `Contact`

### 3. Platform Modules Grid

Cards:

- THE CODE
- Markets
- News
- Projects
- Companies
- Workers
- Contact
- Publications
- Finance
- Reports / Analytics

Each card contains:

- module title
- one-line public description
- status badge: Public / Protected / Data-backed
- route link placeholder

### 4. THE CODE Preview Strip

Must be a real HTML project later, not a static image.

Canva visual:

- cinematic black/gold mini-player
- terminal activation lines
- countdown/world clock motif
- Boulder → Zagreb → New York → Earth narrative

Implementation note:

- embed as route `/the-code/`
- preserve the uploaded HTML film engine concept
- separate public display from admin controls

### 5. Finance / Markets Band

Public-safe cards only:

- market snapshot placeholder
- finance KPI placeholder
- publications/report link placeholder
- backend status public summary placeholder

Use only data safe for public index. If API route does not exist, implementation must use fallback public JSON.

Expected sources later:

- `/data/finance-kpi-2025.json`
- `/api/markets/snapshot`
- `/api/public/status`
- `/data/portal-version.json`

### 6. News / Publications Band

Cards:

- latest news
- archive
- publications / objave
- PDF reports

Expected sources later:

- `/data/news.json`
- `/data/news_archive.json`
- `/data/gallery.json`

### 7. Contact / Access Band

Public contact block:

- contact form CTA
- media/application CTA if public-safe
- companies/workers links
- protected admin entry separated and labeled

No mail sending from public page in this design increment.

### 8. Footer

Footer columns:

- GNK ASG / GNK DINAMO
- Public modules
- Legal / Publications
- Protected system entry

Include subtle version/status line later from `/data/portal-version.json`.

## Design Tokens for Later CSS

```css
:root {
  --gnk-black: #030303;
  --gnk-panel: rgba(10, 10, 10, 0.78);
  --gnk-panel-strong: rgba(16, 13, 7, 0.88);
  --gnk-gold: #c9a84c;
  --gnk-gold-soft: rgba(201, 168, 76, 0.32);
  --gnk-gold-line: rgba(201, 168, 76, 0.22);
  --gnk-text: #f4f0e6;
  --gnk-muted: #9d9276;
  --gnk-danger: #b45353;
  --gnk-ok: #75b77b;
  --gnk-radius-lg: 24px;
  --gnk-radius-md: 16px;
  --gnk-shadow-gold: 0 0 44px rgba(201, 168, 76, 0.14);
}
```

## HTML/CSS Implementation Target Later

First repo PR after Canva approval should create or update:

- `apps/portal/assets/gnk-brand-tokens.css`
- `apps/portal/assets/gnk-premium-ui.css`
- `apps/portal/assets/gnk-premium-ui.js`

Then apply to:

- `index.html`
- `en/index.html`
- `the-code/index.html`

No backend route changes in first implementation PR.

## Risk Controls

Hard no-go items:

- no deploy
- no Actions activation
- no Cloudflare token/secrets/routes/DNS changes
- no mail send or test send
- no campaign execution
- no admin/session/operator protection changes
- no production binding edits

Critical UX risk:

A Canva mockup can look premium while the portal remains functionally disconnected. The design must therefore map every visual card to a later code route/source, otherwise it becomes decorative noise.

## Next Safe Step

Create Canva master public index layout using this structure, then convert it into the first HTML/CSS design-system PR only after explicit approval.
