# MASTER ASG bot/workflow ownership matrix

Evidence snapshot: 2026-10-01. Only ownership demonstrated by recent commits is recorded. This is not a runtime-health declaration.

## Control rule
One mutable resource/path has one canonical writer. Other workflows read/audit it and hand remediation to that writer. Workflow/config/editorial/control-plane changes are PR-only.

| Observed producer | Domain | Demonstrated write paths | Ownership |
|---|---|---|---|
| AEO+Entity refresh | SEO/AEO | apps/portal/atom.xml; apps/portal/en/atom.xml; apps/portal/feed.xml; apps/portal/en/feed.xml; apps/portal/llms-full.txt; apps/portal/data/seo-audit/social-meta-guard.json | provisional canonical owner of generated SEO artefacts |
| Weather refresh | Weather | apps/portal/data/weather-zagreb.json | canonical domain writer |
| World Monitor refresh | World Monitor | apps/portal/data/world-monitor.json | canonical domain writer |
| GNK ASG news refresh | AKTUAL/GNK News | apps/portal/data/news-automation-status.json and observed news artefacts | canonical domain writer |
| Index market refresh | Market | apps/portal/data/fast_market_status.json and index/market outputs | canonical domain writer |

## Confirmed single-writer conflict
`apps/portal/data/freshness-status.json` is written by at least three independent producers:
- Weather: `ca404381ca82938359337c31d904104a6b3d5f10`
- GNK ASG news/AKTUAL: `c60ee7adb3a35acc43da45450835ab825f7fda12`
- Index market: `cfcd335e4de26afa13b3ac9492a49aeec2189615`

This is last-writer-wins shared state and violates the ownership contract. Do not add another writer.

## Required remediation
1. Make one central freshness aggregator the sole writer of `freshness-status.json`.
2. Domain producers write only their own payload/status.
3. Aggregator reads domain statuses and atomically regenerates the combined snapshot.
4. Add aggregator concurrency plus path-ownership validation for direct data writers.
5. Keep Security/Control and AGENT-PORTAL-SUPERVISOR-001 read-only.
6. Mail, Mail Studio, SMTP/IMAP, DNS/MX, secrets and mail-related CI are out of scope.

## Workforce semantics
The 1,573 Digital Workforce entries remain modeled profiles with `profile-only` and `runtimeEvidence=false` unless workflow-run plus production-health evidence exists. Domain assignment never grants repository write access by itself.
