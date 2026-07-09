# Canva web asset pipeline — 2026-07-09

## Purpose

Use Canva as the visual source layer for public web polish while keeping GitHub/Codex as the code, review and deploy control layer.

## Source design discovery

Canva search identified existing GNK ASG / THE CODE visual sources. The primary source selected for the web upgrade pipeline is:

- Original design ID: `DAHO16yQyGM`
- Original title: `GNK ASG / GNK DINAMO — THE CODE Canva Import 2026-10-07`
- Working copy design ID: `DAHO6p5ZvP4`
- Working copy title: `GNK ASG / GNK DINAMO — THE CODE Canva Import 2026-10-07`

The working copy was created so the original Canva source remains unchanged.

## Canva role

Canva is used for:

- THE CODE hero visual direction
- public landing section graphics
- report/download card visual polish
- media kit visuals
- social/newsroom thumbnails
- visual review before static export

Canva is not used for:

- deploy control
- DNS
- Cloudflare routes
- secrets/tokens/account IDs
- mail sending
- campaign launch
- Worker bindings

## GitHub / Codex role

GitHub and Codex remain authoritative for:

- source code changes
- route manifest
- workflow diagnostics
- PR review
- static asset integration
- safety guardrails
- deploy approval history

## Static export rule

No raw Canva HTML should be pasted into production.

Approved flow:

1. Create or edit visual in Canva.
2. Export only static assets such as PNG, WebP or SVG where safe.
3. Place exports under `apps/portal/assets/brand/canva/`.
4. Reference the asset from reviewed HTML/CSS/JS.
5. Validate through PR.
6. Deploy only with `Deploy Public Portal Assets Safe` after merge and explicit manual run.

## Naming convention

Recommended file names:

- `the-code-hero-20260709.webp`
- `portal-finance-cards-20260709.webp`
- `media-kit-cover-20260709.webp`
- `report-downloads-visual-20260709.webp`

## Current status

Pipeline is documented. No production asset has been changed by this document. No deploy is triggered.
