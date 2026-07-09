# English index parity upgrade — 2026-07-09

## Purpose

Replace the minimal English placeholder with a real public English entry page that mirrors the Croatian portal information architecture.

## What changed

`apps/portal/en/index.html` now includes:

- GNK ASG / GNK DINAMO public hero
- THE CODE section
- finance disclosure cards
- group disclosure cards
- company network section
- worker network section
- projects section
- operations/audit/queues route links
- public/protected route badges
- deploy baseline notice

## Safety

No backend logic was changed.
No deploy workflow was changed.
No DNS, Cloudflare route, secret, token, KV, mail or campaign setting was changed.

## Important note

The English route is now suitable as a public entry point, but it should still be visually polished in a later Canva/static-asset PR after the route baseline remains stable.
