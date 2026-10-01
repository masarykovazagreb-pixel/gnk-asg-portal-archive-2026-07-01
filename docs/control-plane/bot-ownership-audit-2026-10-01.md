# MASTER ASG bot ownership audit — 2026-10-01

Source lock: `f49d683d057713f146a7a1b46838f235f7f10160` on `main`.

This document records only writer behavior proven by recent commits. It is an audit/ownership proposal, not proof that branch protection or runtime enforcement exists.

| Proven producer / commit signature | Domain | Proven write paths | Ownership finding | Required handoff / restriction |
|---|---|---|---|---|
| `Refresh GNK ASG news feed` | AKTUAL / GNK News | `apps/portal/data/news.json`, `news_archive.json`, `news-automation-status.json`, **`freshness-status.json`** | Canonical owner of news payloads; shared freshness write conflicts with Weather | News owns news payload/status only. Freshness aggregate must have one dedicated aggregator writer or serialized handoff. |
| `Weather: refresh Zagreb data` | Weather | `apps/portal/data/weather-zagreb.json`, **`freshness-status.json`** | Canonical owner of weather payload; shared freshness write conflicts with News | Weather owns weather payload only. It must hand weather timestamp/state to the single freshness aggregator. |
| `World Monitor: refresh data (free sources)` | World Monitor | World Monitor data payload changed in verified commit | No overlap proven in this audit | Keep domain-scoped; do not expand write set without ownership review. |
| `AEO+Entity: refresh visibility artefacts` | SEO/AEO | `apps/portal/atom.xml`, `apps/portal/en/atom.xml`, HR/EN feeds, `apps/portal/llms-full.txt`, `apps/portal/data/seo-audit/social-meta-guard.json` | Direct automated visibility-artifact writer proven | Keep SEO/AEO ownership constrained to declared generated artefacts; workflow/config/editorial changes remain PR-only. |

## P0 collision isolated

Both GNK News and Weather independently rewrite `apps/portal/data/freshness-status.json`.

This is a real multi-writer path. On 2026-10-01 the News refresh recalculated the aggregate and marked Weather stale; the later Weather refresh rewrote the same aggregate and returned it to fresh. Even when both calculations are individually correct, independent read/modify/write ownership creates a race/lost-update surface.

## Minimal safe remediation

1. Do **not** add another writer.
2. Select one existing freshness aggregation path as canonical.
3. Domain producers write only their own payload/status.
4. The canonical aggregator reads domain timestamps/statuses and alone writes `freshness-status.json`.
5. Add concurrency for that aggregator and a path-ownership validator rejecting direct writes to the aggregate from domain producers.
6. Keep this change PR-first; no direct-main control-plane modification.

## Truthful limitations

Repository access available to this audit has push/pull but not admin/maintain permission. This document does not claim branch protection or required checks are enforced. Preventive branch rules require repository administration; until then, repository-level validators provide detection but cannot substitute for branch protection.
