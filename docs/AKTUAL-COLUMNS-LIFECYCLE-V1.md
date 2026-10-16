# AKTUAL MEDIA columns: lifecycle and archive (v1)

## Canonical sources

- `apps/portal/data/editorial-registry.json` is authoritative for what is published and its canonical Croatian/English routes.
- `content/factory-queue/queue.json`, `content/factory-queue/kolumne/*.html`, and `apps/portal/data/content-queue-state.json` track scheduled Content Factory work and idempotent publication state.
- `/gnk-aktual/kolumne/` and `/en/gnk-aktual/columns/` are generated public indexes. They include only `status: "published"` registry records. Existing published card summaries are preserved; newly published cards use their registry descriptions.
- `apps/portal/data/kolumne.json` is a legacy mixed editorial-links feed, not a draft store. It also contains SPT and commentary records; column generators must filter by canonical column route and published registry status.

Do not add unpublished manuscripts to `apps/portal/data/kolumne.json` or `apps/portal/data/kolumne-red/`: those paths are beneath the served portal root. The lifecycle audit checks that every column entry in the mixed JSON feed is already registered as published, while ignoring its unrelated SPT and commentary records. The legacy Markdown files currently there are already-published source duplicates. The old direct publisher is now read-only and makes no network calls or writes.

## Lifecycle

1. **Draft/backlog:** keep the working item in `content/factory-queue/kolumne/<slug>.html` and its calendar row in `content/factory-queue/queue.json`. The route must not already exist, the item must pass the Content Factory preflight, and publication state must not already contain its ID.
2. **Optional public announcement:** a title/date appears in the public index only when the pending queue row explicitly has `publicListingApproved: true`, a non-empty `editorialApprovalRef`, and a distinct `publicTitleHr`. `publicTitleEn` and localized teaser fields are optional. Put only the approved public copy in those fields—never draft body text. Upcoming items are not links and do not enter the published `ItemList` schema.
3. **Scheduled publication:** the existing Content Queue workflow remains the publication authority. This change does not add a cron, force a dispatch, remove holds, or publish anything now. A due item still passes the existing duplicate/hold preflight and exact-SHA release fence.
4. **Published:** the publisher writes the page/registry/state, creates/reuses the local GNK editorial cover, applies the route-scoped SEO/attribution materializer, then rebuilds both column indexes from the registry. Repeated runs are idempotent. A missing cover or route blocks the release rather than silently omitting the column.

The index synchronizer also runs when no queue item is due, so an explicitly approved upcoming title can appear at the next normal Content Queue run. It updates only the two column index pages; it does not publish a manuscript or make an external distribution call.

## Current baseline (2026-10-16)

- 29 unique published Croatian columns and 29 published English column pages are present in the canonical registry and their respective indexes.
- 26 Content Factory column rows already have published-state records and matching registry routes; they are history, not an unpublished backlog to replay.
- The three legacy Markdown files under `apps/portal/data/kolumne-red/` also match already-published columns.
- No unpublished column queue item or future public announcement is currently recorded. No new titles, dates, or manuscript text were invented for the calendar.

## Validation commands

```sh
node scripts/test-aktual-columns-lifecycle-v1.mjs
node scripts/build-aktual-columns-index-v1.mjs --check
python3 scripts/validate_aktual_columns.py
node scripts/audit-aktual-columns-lifecycle-v1.mjs
```

`audit-aktual-columns-lifecycle-v1.mjs` is read-only. The index builder defaults to a dry run; `--write` is used by the guarded publisher to reconcile the archive. `--check` fails if generated indexes are stale.
