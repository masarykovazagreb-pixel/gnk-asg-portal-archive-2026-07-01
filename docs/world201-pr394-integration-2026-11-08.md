# WORLD 201 – staged source integration from PR #394

Base: main at abe3d53781ed35b3e155e9117c90f1ed73d434ef (2026-11-08).
Source: arena/0ba72079-gnk-asg-portal-archive-2026-07 at f78fa225c36b39c3418f893a3c807317af58b69f.

This branch imports curated source scripts, editorial data, original weekly illustrations, and selective existing-writer workflow fixes. It deliberately does NOT merge the PR's stale generated HTML/XML, the PR394-only regeneration workflow, the PR394-specific CI mutation in all-gates, or the self-merging 10-minute release controller.

Do not overwrite newer main news, latest weather/market snapshots, or portal editorial outputs. Regenerate WORLD 201 country/city pages and the weekly archive from these sources on this branch. Check 201 countries / 10 cities, XML, links, and the latest main content before making PR ready. No deployment or merge is authorized by this source import.

Original PR #394 and its branch remain untouched. Existing public deployment must be verified separately.

## Regeneration verification

- Branch-only job `WORLD 201 integration - stage generated output only` succeeded at [run #42482106113](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/runs/42482106113).
- Generated output committed to this integration branch as `f908103b2ef3142707b13c7db0b1ab019e3da4c0` (201 countries, 10 cities, 211 RSS feeds, HR/EN weekly pages; checked by the staging job).
- PR #395 is draft. Bot-authored follow-on PR checks were marked `action_required`, so a separately authored review-trigger commit is used to obtain actual CI results.
- No release/deploy on `main` has been triggered by this branch. No result here proves the live website is updated.
