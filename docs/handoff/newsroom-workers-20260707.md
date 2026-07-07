# Newsroom workers audit layer — 2026-07-07

## Implemented in this review branch

- Added regional newsroom workers to `apps/portal/data/worker-results-3h.json`.
- Added `apps/portal/data/newsroom-workers-v1.json` with five regional desks:
  - Croatia / Southeast Europe
  - European Union
  - United States / North America
  - Middle East / North Africa
  - Asia-Pacific
- Added `apps/portal/data/newsroom-policy-v1.json` with editor-in-chief, daily comment target and approval rules.
- Updated `apps/portal/data/public-operational-feed.json` so the public feed exposes the newsroom worker layer.

## Editorial model

Nermin Sefic is the editor-in-chief and final approval authority. Newsroom workers are internal editorial worker profiles for monitoring, drafting, routing and review.

## Daily commentary target

Target: five original comments per day under the Nermin Sefic author line.

Default mode: draft first, editor approval required before public publishing.

## RSS model

RSS is used for source metadata, title, date, short feed summary where terms permit it, source name and canonical link. Full third-party articles must not be copied into the portal unless a specific licence permits it.

## Safety locks

- No automatic publication by default.
- No scraping claim.
- No bulk email.
- No external outreach.
- No third-party content republishing without attribution and rights review.
- No production deploy from this branch.
