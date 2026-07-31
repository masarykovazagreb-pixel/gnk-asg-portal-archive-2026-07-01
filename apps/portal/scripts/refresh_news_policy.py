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

# /gnk-aktual/ trazi najmanje 100 vijesti sa slikom I tekstom u rotaciji.
# Budzet je namjerno veci od 100 jer dio stavki otpadne na simulacijski feed
# i na clanke s prekratkim sazetkom.
PUBLIC_LIMIT = 150
MIN_SUMMARY_CHARS = 40
ARCHIVE_TRIGGER = 2000
ARCHIVE_DELETE_OLDEST = 1000

DW_NEWSROOM_API = "https://gnk-asg.hr/api/public/digital-workforce/newsroom"


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
        payload = json.loads(raw)
    except Exception as exc:
        print(f"digital-workforce newsroom fetch failed (non-fatal): {exc}")
        return []

    items = payload.get("items", []) if isinstance(payload, dict) else []
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

    # Cibona: gazda je odlucio da rubrika mora izlaziti bez obzira na sliku -
    # stavke bez fotografije dobivaju sluzbeni grb kluba kao zadanu sliku,
    # umjesto da se odbace filtrom za sliku niz dolje.
    for item in fetched:
        if item.get("group") == "cibona" and not item.get("image"):
            item["image"] = "/assets/cibona-logo.png"

    existing_public = base.read_json(base.NEWS_PATH, [])
    existing_archive = base.read_json(base.ARCHIVE_PATH, [])
    merged = base.merge_unique(fetched, existing_public, existing_archive)

    # Javni skup uzima samo stavke koje imaju i sliku i upotrebljiv sazetak —
    # stranica ionako odbacuje kartice bez jednog od toga, pa bi inace
    # trosile mjesta u budzetu.
    def _usable(item):
        return bool(item.get("image")) and len(str(item.get("summary") or "")) >= MIN_SUMMARY_CHARS

    with_image = [item for item in merged if _usable(item)]
    without_image = [item for item in merged if not _usable(item)]

    # Digital Workforce simulation items publish roughly every 2 days,
    # far slower than the constantly-refreshing real-time RSS sources.
    # They must still be GUARANTEED a spot in the public tier (not
    # buried in archive), but must NOT be placed ahead of fresher real
    # news: the AKTUAL MEDIA frontend uses items[0] as the featured
    # headline article and rotates a sliding window through array
    # order for its "10 newest" section, so simply prepending DW items
    # (an earlier version of this fix did exactly that) freezes the
    # featured headline on a days-old DW item and breaks the rotation
    # -- exactly the "glavna objava stoji" bug the owner reported.
    # Real news is sorted newest-first as normal; DW items are
    # APPENDED within the public budget so they remain visible in the
    # full list and eventually cycle through "10 newest" rotation,
    # without ever displacing genuinely fresher real news from the
    # featured slot or the front of the rotation.
    dw_items = [item for item in with_image if item.get("group") == "digital-workforce-simulation"]
    other_items = [item for item in with_image if item.get("group") != "digital-workforce-simulation"]
    real_slot_count = max(0, PUBLIC_LIMIT - len(dw_items))

    # Kvote po kategoriji i po mediju.
    #
    # Bez ovoga se javni skup puni samo po vremenu objave, pa kategorije s
    # brzim feedovima (tportal, Business Insider) pojedu mjesta, a
    # 'Tehnologija' i 'Digitalna imovina' ostanu s 2-5 vijesti -- premalo da
    # se blok na /gnk-aktual/ uopce popuni, zbog cega je izgledalo kao da
    # stranica ponavlja iste vijesti.
    #
    # Prvi prolaz uzima do MAX_PER_SOURCE po mediju i do CATEGORY_QUOTA po
    # kategoriji; ostatak se dodaje kronoloski da se popuni budzet.
    CATEGORY_QUOTA = {
        "economy": 36,
        "international": 32,
        "technology": 30,
        "digital-assets": 26,
        "hrvatska": 26,
    }
    MAX_PER_SOURCE = 8

    per_group: dict[str, int] = {}
    per_source: dict[str, int] = {}
    balanced: list[dict] = []
    leftover: list[dict] = []
    for item in other_items:
        group = item.get("group", "international")
        source = item.get("source", "?")
        quota = CATEGORY_QUOTA.get(group, 12)
        if per_group.get(group, 0) < quota and per_source.get(source, 0) < MAX_PER_SOURCE:
            per_group[group] = per_group.get(group, 0) + 1
            per_source[source] = per_source.get(source, 0) + 1
            balanced.append(item)
        else:
            leftover.append(item)

    ordered = balanced + leftover
    public = ordered[:real_slot_count] + dw_items
    archive = ordered[real_slot_count:] + without_image
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
