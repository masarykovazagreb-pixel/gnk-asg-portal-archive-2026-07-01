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

## Deterministic public-network repair (8 November 2026)

- The source-preserving staging run [#42505778286](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/runs/42505778286) successfully regenerated, checked, and committed derived sites, transfer inventory, synchronization status, design token links and public status snapshot.
- Generated commit `939e80eee16d6d7454c305fa1712f988fac8ead8` changed **995 paths** (288 new files, zero deletions) and was limited to the explicit generated-data/site allowlist; stage rejected protected news paths, file deletions and any rewrite exceeding 4000 paths.
- Verified in staging by canonical checks: `tests/test-sites-network-v1.mjs`, `scripts/build-prenos-hub-v1.mjs --check`, `tests/test-sync-status-v1.mjs`, `tests/test-design-system-v1.mjs`, `scripts/public-status-snapshot-v1.mjs --check`.
- Remaining full `All gates (portal)` failures on previous HEAD were 12 of 109. Those results do not yet prove current full CI is green; this human-app-authored documentation-only update triggers a fresh check on the exact HEAD and must not be treated as merge/deployment approval.

## Audited complete metadata rebuild (8 November 2026, 18:14 UTC)

- Staging [run #42508024608](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/runs/42508024608) finished **SUCCESS**, including the guarded metadata repair.
- Generated commit `e198c912404704be36ee12ffeaf2f7b1a839a5a9` modifies **20,213 public portal paths** and deletes **zero files**. It applies canonical WebSite JSON-LD, brand/favicon, factory attribution and refresh-data-day layers.
- Before committing, the staging job compared the full rendered visible editorial text of **all 20,192 changed HTML documents** against their original commit, after removing only approved added UI/metadata blocks and normalized network-lead variants; the comparison passed. Protected archived news were separately audited to ensure no body/markup changes beyond existing refresh script dates.
- Canonical generators and their read-only checks passed in staging: WebSite JSON-LD validator (18,941 eligible public pages, exactly one site node each), factory standard, brand mark and portal refresh.
- This source-only documentation commit triggers **fresh GitHub App-authored CI** on the exact HEAD. Earlier full `All gates (portal)` on `2740ea933cf201beb136316bd8c9d7f424a113c2` was **104/109**, not green. Do not merge PR #395, deploy main, or declare LIVE until current full CI and deployment are independently proven.

## Final canonical brand remediation and current-main integration

- On commit `f77a494db068714f6893da3490c9a2c3d38fa0c7`, full All gates run [#42510539620](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/runs/42510539620) passed **108 of 109** checks; only weekly favicon brand parity failed. No bypass was applied.
- The generated weekly favicon was made canonical at commit `ba267242f68a8d3277a005fb975d4c60416164c6`; the original weekly generator asset was corrected at commit `e1a71e29f30e0639e0ae34d7266e331200e75fb9`, so regeneration retains the canonical icon.
- Main commit `3cc80279e8dfbff5300d4eedfba85496d30222c6` (latest World Monitor data) was integrated safely into staging as merge commit `1d16b3ab7e62bdfbe8fafbecc6ef8df73802e60c` without force push; main has not been deployed from this staging branch.
- This review-only documentation commit requests a real fresh PR CI run on the current exact SHA, including `All gates (portal)`, editorial policy, and production package validation. Do not mark PR ready or deploy unless all mandatory checks pass and approval requirements are satisfied.

## CI revalidation after fixing icon contract and updating main

- Last full `All gates (portal)` on integration HEAD `62ae7031` was **108/109**, failing only the icon markup contract for the HR/EN network source pages.
- Generator `scripts/factory/build-public-network-inventory-v1.mjs` and both generated HR/EN `mreza/izvori/index.html` pages were fixed atomically in commit `9d95c5f7b20a4fe393812586f5216ffe8531b0fb`; no article body was changed.
- Safely integrated the latest `main` at `f5ef0fbe99cfc1c4e6ce7c91b57948cf60a440eb` using GitHub-calculated merge tree in merge commit `f1c621791059038c875bdb5bfb88bd8db1e094c9`. No force push and no deletion performed by this operation.
- This documentation update requests REAL review-triggered CI on the latest integrated HEAD. Previous checks do not count. Keep PR draft until all required checks complete successfully; only then consider normal PR merge and separately authorized exact-SHA production deployment.
