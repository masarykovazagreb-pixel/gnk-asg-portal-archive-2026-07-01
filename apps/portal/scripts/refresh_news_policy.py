#!/usr/bin/env python3
"""Refresh business news with the GNK ASG public/archive retention policy.

Policy:
- expose the newest 100 items in data/news.json;
- place all older unique items in data/news_archive.json;
- whenever the archive exceeds 2,000 items, remove the oldest 1,000;
- repeat the 1,000-item prune batch until the archive is back at or below 2,000.

The RSS sources, parsing, filtering and deduplication are reused from
refresh_news.py so this file changes retention only.
"""

from __future__ import annotations

import sys
import json
import time
import urllib.error
import xml.etree.ElementTree as ET

import refresh_news as base

PUBLIC_LIMIT = 100
ARCHIVE_TRIGGER = 2000
ARCHIVE_DELETE_OLDEST = 1000

DW_NEWSROOM_API = "https://gnk-asg.hr/api/public/digital-workforce/newsroom"
DW_DEBUG = {}


def fetch_digital_workforce_items():
    """Pull the current Digital Workforce simulation newsroom items so
    they also surface on AKTUAL MEDIA, clearly labeled as internal
    simulation content -- never mixed in as if it were real external
    journalism. Uses base.make_record for a schema-consistent record,
    with source/group/category deliberately distinct from any real
    news source, and links back to the existing newsroom tab (no
    individual article pages exist yet, so we do not fabricate a
    canonical URL that would 404).
    """
    debug = {}
    try:
        raw = base.fetch_url(DW_NEWSROOM_API)
        debug["raw_len"] = len(raw)
        payload = json.loads(raw)
        debug["payload_keys"] = list(payload.keys()) if isinstance(payload, dict) else "not_a_dict"
    except Exception as exc:
        debug["error"] = f"{type(exc).__name__}: {exc}"
        print(f"digital-workforce newsroom fetch failed (non-fatal): {exc}")
        DW_DEBUG.update(debug)
        return []

    items = payload.get("items", []) if isinstance(payload, dict) else []
    debug["item_count"] = len(items)
    records = []
    for i, item in enumerate(items):
        image = item.get("seo", {}).get("image", "")
        if image and image.startswith("/"):
            image = "https://gnk-asg.hr" + image
        record = base.make_record(
            title=item.get("title", ""),
            url=f"https://gnk-asg.hr/digital-workforce/newsroom/#item-{i}",
            summary=item.get("excerpt", ""),
            source="GNK ASG Newsroom (interna simulacija)",
            group="digital-workforce-simulation",
            category="digital-workforce-simulation",
            published_at=item.get("publishedAt", base.now_iso()),
            image=image,
        )
        records.append(record)
    debug["records_built"] = len(records)
    DW_DEBUG.update(debug)
    return records


def main() -> int:
    base.DATA.mkdir(parents=True, exist_ok=True)
    fetched = []
    errors = []
    success = 0
    started = time.time()

    for group, category, source, url in base.SOURCES:
        try:
            raw = base.fetch_url(url)
            parsed = base.parse_feed(raw, group, category, source)
            fetched.extend(parsed)
            success += 1
        except (urllib.error.URLError, TimeoutError, ET.ParseError, Exception) as exc:
            errors.append({"source": source, "group": group, "error": str(exc)[:180]})

    dw_items = fetch_digital_workforce_items()
    if dw_items:
        fetched.extend(dw_items)
        print(f"digital-workforce newsroom: added {len(dw_items)} simulation items (clearly labeled, distinct category)")

    existing_public = base.read_json(base.NEWS_PATH, [])
    existing_archive = base.read_json(base.ARCHIVE_PATH, [])
    merged = base.merge_unique(fetched, existing_public, existing_archive)

    with_image = [item for item in merged if item.get("image")]
    without_image = [item for item in merged if not item.get("image")]

    # Digital Workforce simulation items are published on a slower
    # (roughly every-2-day) cadence than the constantly-refreshing
    # real-time RSS sources, so by pure recency they would almost
    # always fall outside the "top 100 newest" window and end up in
    # the archive tier, effectively invisible on AKTUAL MEDIA. Since
    # there are at most a handful of them, guarantee their visibility
    # by pulling them to the front of the public tier explicitly,
    # rather than relying on the recency sort alone.
    dw_items = [item for item in with_image if item.get("group") == "digital-workforce-simulation"]
    other_items = [item for item in with_image if item.get("group") != "digital-workforce-simulation"]
    public = dw_items + other_items[:max(0, PUBLIC_LIMIT - len(dw_items))]
    archive = other_items[max(0, PUBLIC_LIMIT - len(dw_items)):] + without_image
    archive_items_before_prune = len(archive)
    removed_oldest = 0
    prune_batches = 0

    while len(archive) > ARCHIVE_TRIGGER:
        batch = min(ARCHIVE_DELETE_OLDEST, len(archive))
        archive = archive[:-batch]
        removed_oldest += batch
        prune_batches += 1

    base.write_json(base.NEWS_PATH, public)
    base.write_json(base.ARCHIVE_PATH, archive)

    by_group = {}
    for item in public:
        group = item.get("group", "unknown")
        by_group[group] = by_group.get(group, 0) + 1

    ratio = success / len(base.SOURCES) if base.SOURCES else 0
    status_name = "ok" if public and ratio >= 0.5 else "degraded" if public else "failed"
    ts = base.now_iso()
    status = base.read_json(base.STATUS_PATH, {}) if base.STATUS_PATH.exists() else {}
    status.update({
        "updated_at": ts,
        "news": {
            "updated_at": ts,
            "status": status_name,
            "engine": "github_actions_rss_refresh_v4_retention_policy",
            "cadence": "hourly at minute 17 UTC plus manual workflow_dispatch",
            "source_success_policy": "publish_when_public_items_available_and_at_least_50_percent_sources_synced",
            "source_success_threshold": 0.5,
            "source_success_ratio": round(ratio, 3),
            "source_sync_status": "complete" if not errors else "partial_with_public_fallback",
            "configured_sources": len(base.SOURCES),
            "successful_sources": success,
            "failed_sources": len(errors),
            "storage_policy": "public_latest_100_archive_all_older_prune_oldest_1000_repeatedly_when_archive_exceeds_2000",
            "public_items": len(public),
            "max_public_items": PUBLIC_LIMIT,
            "archive_items": len(archive),
            "archive_prune_trigger": ARCHIVE_TRIGGER,
            "archive_delete_oldest_batch": ARCHIVE_DELETE_OLDEST,
            "archive_items_before_prune": archive_items_before_prune,
            "archive_prune_batches": prune_batches,
            "discarded_archive_overflow_items": removed_oldest,
            "fetched_candidates": len(fetched),
            "duplicates_or_blocked_removed": max(
                0,
                len(fetched) + len(existing_public) + len(existing_archive) - len(merged),
            ),
            "request_timeout_seconds": base.TIMEOUT,
            "network_workers": 1,
            "share_previews_ready": 0,
            "by_group": by_group,
            "errors": errors[:20],
            "preview_errors": [],
            "checked_at": ts,
            "last_attempt_at": ts,
            "heartbeat_policy": "news_status_updates_on_every_automation_run_even_when_content_is_unchanged",
            "stale_safe": True,
            "last_successful_refresh_at": ts if public else status.get("news", {}).get("last_successful_refresh_at"),
            "data_status": "fresh_or_reference_checked",
            "runtime_seconds": round(time.time() - started, 2),
        },
        "dw_integration_debug_temporary": DW_DEBUG,
    })
    base.write_json(base.STATUS_PATH, status)

    print(
        "news refresh: "
        f"status={status_name}, public={len(public)}, archive={len(archive)}, "
        f"archive_before_prune={archive_items_before_prune}, "
        f"prune_batches={prune_batches}, removed_oldest={removed_oldest}, "
        f"sources={success}/{len(base.SOURCES)}"
    )
    if errors:
        print("source errors:")
        for error in errors[:10]:
            print("-", error)

    return 0 if public else 1


if __name__ == "__main__":
    sys.exit(main())
