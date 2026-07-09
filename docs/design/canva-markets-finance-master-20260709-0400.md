# Canva Markets / Finance Master — 2026-07-09 04:00

## Scope

Safe Canva-side design reference for the public/controlled `Markets` and `Finance signal` surfaces of the GNEW / GNK ASG Portal / THE CODE system.

This is **design documentation only**. It is written so the visual system can later be implemented in HTML/CSS/JS in `beckuphome-gnk/gnk-asg-portal` without touching deploy, DNS, secrets, Cloudflare routes, production bindings, authentication, operator protection, Mail Studio send logic, campaign logic, or backend mail execution.

## Visual target

Use the existing black/gold Canva-style reference system:

- black base: `#000000`, `#050505`, `#080808`
- gold signal: `#c9a84c`
- low-light borders: `#151515`, `#1a1a1a`, `#c9a84c22`
- muted text: `#333333`, `#777777`, `#bbbbbb`
- terminal typography: Courier / mono for status, code, counters, IDs
- editorial typography: Georgia / serif for high-level narrative lines
- motion language: scanline, pulse, soft gold glow, progress bar, small terminal state changes

The layout must feel like the same family as:

- THE CODE cinematic black/gold countdown
- Admin Center black/gold shell
- Mail Studio dark/gold module cards
- Contact Center structured operational cards

## Page/module role

The Markets / Finance module is not a trading platform and must not imply live regulated financial advice.

Its role is:

1. present public market intelligence and group signal context,
2. separate factual company/project metrics from external market indicators,
3. provide a future-safe UI shell for analytics cards,
4. prepare a consistent design system for later backend integration.

## Primary screen concept

### Hero / header

Title:

```text
MARKETS / FINANCE SIGNAL
```

Subtitle:

```text
Global context. Group indicators. Public intelligence layer.
```

Top-right status pill:

```text
READ ONLY · NO EXECUTION
```

Small terminal caption:

```text
GNK ASG Portal · Finance Dashboard · Public / Controlled View
```

## Layout grid

Use a 12-column desktop grid with a narrow mobile collapse path.

Desktop:

- left rail: navigation / module list
- center: market signal cards and chart placeholders
- right rail: group financial indicators and risk notes

Mobile:

- header
- status strip
- stacked cards
- expandable notes

## Main card groups

### 1. Market signal strip

Cards:

- EUR / USD
- EUR / HRK historical reference
- Energy index placeholder
- Construction cost index placeholder
- Technology / AI index placeholder
- Sports / media market placeholder

Each card must include:

- label
- value placeholder
- trend placeholder
- timestamp placeholder
- source placeholder

Example component text:

```text
EUR / USD
--.--
Δ --.--%
Source pending · Read-only
```

### 2. Group financial snapshot

Cards:

- Group revenue
- EBITDA / operating indicator
- Net profit
- Equity ratio
- Long-term debt
- Number of entities
- Countries / locations

Use conservative labels. Avoid unsupported claims in UI text. Any actual value later inserted must have a source, date, and approval.

Recommended placeholder format:

```text
GROUP REVENUE
source-bound value
YYYY · consolidated / management source
```

### 3. Finance risk panel

Right-side panel title:

```text
RISK / SOURCE CONTROL
```

Rows:

- `Public data only`
- `No trading execution`
- `No mail trigger`
- `No campaign trigger`
- `Source required before publishing`
- `Manual approval before deploy`

This panel must be visually present on desktop and mobile.

### 4. Chart placeholders

Charts are visual placeholders only at Canva stage:

- line chart: market trend
- bar chart: group indicator comparison
- donut/ring: capital structure placeholder
- timeline: project finance milestones

All charts should use black panels, thin gold axis accents, and muted grey labels. No fake exact data unless explicitly sourced.

## Interaction notes for later implementation

Future HTML/CSS/JS implementation should keep this module passive by default:

- no order execution
- no external transaction action
- no email send action
- no campaign action
- no hidden admin or operator shortcut
- no public exposure of protected endpoints

Allowed future frontend-only actions:

- filter period
- switch metric group
- open source note drawer
- export visual snapshot only if backend later approves
- switch public/controlled copy blocks depending on auth state

## Copy blocks

### Public warning copy

```text
This dashboard is an informational signal layer. It does not execute trades, send messages, run campaigns, or publish financial advice.
```

### Internal controlled copy

```text
Values shown here require source confirmation, date stamping, and manual approval before public release.
```

### Source placeholder copy

```text
Source pending. Do not publish numerical value until verified.
```

## Canva build guidance

Create/refine one Canva board/page with these sections:

1. dark hero header with module title and read-only pill,
2. six market signal cards,
3. group financial snapshot cards,
4. central chart placeholder row,
5. right risk/source control rail,
6. mobile stacked variant strip,
7. component legend for later CSS tokens.

Canvas format recommendation:

- desktop frame: 1440 × 1100 or 1920 × 1200
- secondary mobile frame: 390 × 844
- export/reference name: `GNK Markets Finance Signal Master`

## Implementation token map

Suggested CSS variables for later repo implementation:

```css
:root {
  --gnk-bg: #000000;
  --gnk-panel: #050505;
  --gnk-panel-2: #080808;
  --gnk-border: #1a1a1a;
  --gnk-gold: #c9a84c;
  --gnk-gold-soft: #c9a84c22;
  --gnk-text: #bbbbbb;
  --gnk-muted: #333333;
  --gnk-ok: #1e4a1e;
  --gnk-danger: #7a2a2a;
}
```

## Non-goals

This increment must not include:

- production deploy
- workflow rerun
- Cloudflare changes
- DNS changes
- secret/token changes
- mail send or mail test
- campaign send or campaign test
- admin/session protection change
- operator protection change
- Mail Studio send logic change
- backend endpoint exposure

## Acceptance checklist

The design reference is acceptable only if:

- it stays visually consistent with black/gold THE CODE references,
- it is clearly read-only,
- it contains source-control warnings,
- it avoids fake exact financial data,
- it can be implemented later as static HTML/CSS first,
- it does not require production/backend changes to exist as a design artifact.

## Next safe step

Create the next Canva-side design brief for `News / Publications` or open a PR for these design-only branches after user approval. Do not deploy without explicit approval.
