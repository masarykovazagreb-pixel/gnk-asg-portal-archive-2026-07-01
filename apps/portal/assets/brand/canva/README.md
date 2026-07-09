# Canva static asset staging

This directory is reserved for reviewed static exports from Canva.

## Rules

- Do not paste raw Canva-generated HTML into production.
- Use Canva for visual source work only.
- Export static assets as PNG, WebP or safe SVG after visual approval.
- Keep file names dated and descriptive.
- Reference assets from reviewed portal HTML/CSS/JS only.
- Do not store Canva credentials, edit URLs, API tokens or private links here.

## Current source

The current Canva working copy for THE CODE visual upgrade is tracked in:

`docs/portal/canva-web-asset-pipeline-20260709.md`

## Safety

Static asset staging must not trigger mail, campaigns, DNS changes, Cloudflare route changes, secret changes or Worker binding changes.
