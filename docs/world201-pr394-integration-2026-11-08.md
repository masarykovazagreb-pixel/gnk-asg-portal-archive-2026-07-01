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

- Canonical editorial registry and sitemap repair also succeeded in staging [run #42482497041](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/runs/42482497041); `editorial-registry.json`, `editorial-sitemap.xml` and `sitemap-index.xml` were refreshed by the existing canonical generators, not hand-edited. No article body was altered.
- This user-authored metadata-only commit asks GitHub to execute PR review checks on the final regenerated tree; the branch remains draft and must not be merged or deployed while any required gate fails.

## Follow-up staging: 8 November 2026, 17:19 UTC

- Newer main at `fed969e8a564d05614f23eedbab54e6d16f9ac72` was integrated via safe GitHub-calculated merge tree into staging with commit `750c4e23c7888c6d112836731691c65788a82124`, preserving newer main content without force push.
- WORLD 201 isolated staging run [#42503648974](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/runs/42503648974) passed checks for 211 country/city pages, 211 RSS feeds, XML sitemap, and Croatian/English weekly archive. No generated WORLD changes were required in that run.
- A guarded homepage parity remediation on staging (run [#42504117705](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/runs/42504117705)) completed successfully and produced staging commit `10a2bc593215900f75785161403295562c41adba`. The repair job permitted edits only to `apps/portal/index.html` and `apps/portal/en/index.html` and rejected deletion/unexpected paths.
- Bot commit checks show `action_required` rather than executed test results, so this documentation-only commit intentionally triggers fresh GitHub App-authored CI validation on the exact staging HEAD. Do NOT treat these checks as success; review gate logs and resolve any remaining issues before standard merge and exact-SHA production deploy.
