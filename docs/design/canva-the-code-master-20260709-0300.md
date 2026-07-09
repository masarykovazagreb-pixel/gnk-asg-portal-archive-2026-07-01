# GNK ASG / GNK DINAMO — THE CODE Canva Master Layout

Date: 2026-07-09
Scope: THE CODE public module design reference only.
Branch: `design/canva-the-code-master-20260709-0300`

## Purpose

Create a Canva-side master design reference for the THE CODE module that can later be implemented in `beckuphome-gnk/gnk-asg-portal` as real HTML/CSS/JS.

This is not a production deploy and does not modify live routes, DNS, Cloudflare, secrets, auth, operator protection, Mail Studio sending, campaign sending, or backend logic.

## Existing Canva / reference inputs

Use the imported and generated Canva references already created from the uploaded black/gold assets:

- THE CODE HTML import: `https://www.canva.com/d/SnG99arFuF3r3aC`
- THE CODE desktop reference: `https://www.canva.com/d/SW2O39piFdnTmLR`
- Admin Center reference: `https://www.canva.com/d/c9GG7U_xVnFUbr5`
- Contact Center reference: `https://www.canva.com/d/3e-a5DF_QI8usYr`
- Mail Studio reference: `https://www.canva.com/d/x22Dyr2S2kS1gwl`

## Module target

THE CODE must remain a coded HTML project, not a flat Canva image.

The Canva design is the visual master. The repo implementation must preserve:

- animated scene sequence,
- countdown,
- world clocks,
- black/gold terminal atmosphere,
- premium GNK ASG / GNK DINAMO branding,
- cinematic launch narrative,
- responsive desktop and mobile behavior,
- route-safe integration with the public portal shell.

## Visual system

### Base style

- Background: deep black / graphite.
- Accent: restrained metallic gold.
- Layout: cinematic dashboard, not generic corporate template.
- Cards: glass panels, thin gold borders, soft glow.
- Typography: premium sans for shell, monospace/terminal for THE CODE internals.
- Motion: controlled, slow, cinematic; no cheap flashing.

### Required visual elements

- top shell/header aligned with the public portal design,
- GNK ASG + GNK DINAMO brand area,
- THE CODE hero block,
- activation status panel,
- countdown panel,
- world clock strip,
- global network / world-map layer,
- financial strength cards,
- code/terminal sequence block,
- CTA buttons: `Open THE CODE`, `View Press Kit`, `Contact`,
- footer consistent with the public portal.

## Desktop layout recommendation

1. Header shell
   - Left: GNK ASG / GNK DINAMO brand.
   - Center/right: Home, THE CODE, Markets, News, Projects, Companies, Contact.
   - Right status badge: `Protected Backend · Public View`.

2. Hero section
   - Left column: title, subtitle, activation date, narrative.
   - Right column: live THE CODE frame / terminal preview.

3. KPI row
   - Group revenue.
   - Net profit.
   - Equity ratio.
   - Long-term debt.
   - Group entities.
   - Continents.

4. Countdown + world clocks
   - Main countdown for New York activation.
   - Zagreb / London / Dubai / Tokyo compact clocks.

5. Global network section
   - abstract world-map or node grid.
   - cards for Europe, North America, Asia, Middle East, South America, Africa.

6. Footer
   - legal/brand note.
   - public links only.
   - no admin links unless protected route.

## Mobile layout recommendation

- Keep the THE CODE film frame at approximately phone ratio.
- Stack hero, frame, KPI cards, countdown, clocks, network cards.
- Avoid tiny text below 12px except terminal micro-labels.
- Fixed top nav should collapse to a compact menu.

## Implementation notes for later PR

Candidate future files:

- `apps/portal/assets/gnk-brand-tokens.css`
- `apps/portal/assets/gnk-premium-ui.css`
- `apps/portal/assets/gnk-premium-ui.js`
- `apps/portal/the-code/index.html`
- `apps/portal/en/the-code/index.html`

Do not hard-code private admin endpoints into public THE CODE pages.

Allowed public sources only:

- `/data/portal-version.json`
- `/data/finance-kpi-2025.json` if already public-safe
- `/api/public/status`
- `/api/public/activity`

If an API route is missing, use static fallback JSON only. Do not create privileged route exposure.

## Security boundaries

Do not change:

- production deploy,
- GitHub Actions state,
- Cloudflare token,
- `CLOUDFLARE_ACCOUNT_ID`,
- DNS/routes/secrets,
- production bindings,
- admin/session protection,
- operator protection,
- Mail Studio send logic,
- campaign/mail approval logic.

## Acceptance criteria

The Canva/design reference is acceptable when it defines:

- one unified black/gold visual direction,
- THE CODE as a real HTML module target,
- clear desktop + mobile section structure,
- public-only data boundary,
- no backend security regression,
- no deploy dependency.

## Next safe increment

Create the next Canva-side reference for `markets` or `finance dashboard`, using the same visual shell and KPI/card language, still without deploy.
