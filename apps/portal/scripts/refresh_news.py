#!/usr/bin/env python3
"""Refresh GNK ASG public business news.

This script is intentionally dependency-free. It reads public RSS feeds, merges
new items with existing data/news.json and data/news_archive.json, keeps the
latest 500 public cards and the next 400 archive cards, and writes a heartbeat
status to data/update_status.json on every run.
"""

from __future__ import annotations

import email.utils
import hashlib
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
NEWS_PATH = DATA / "news.json"
ARCHIVE_PATH = DATA / "news_archive.json"
STATUS_PATH = DATA / "update_status.json"

PUBLIC_LIMIT = 500
ARCHIVE_LIMIT = 400
TIMEOUT = 10
USER_AGENT = "GNK-ASG-NewsMonitor/2.0 (+https://gnk-asg.hr/)"

# Public RSS sources and Google News RSS searches. No API keys required.
SOURCES = [
    # Croatia / business
    ("hrvatska", "economy", "Poslovni dnevnik", "https://www.poslovni.hr/feed"),
    ("hrvatska", "economy", "Lider", "https://lidermedia.hr/rss"),
    ("hrvatska", "economy", "Hina", "https://www.hina.hr/rss"),
    ("hrvatska", "economy", "Google News HR Business", "https://news.google.com/rss/search?q=poslovanje+OR+ekonomija+OR+financije+Croatia&hl=hr&gl=HR&ceid=HR:hr"),
    ("hrvatska", "technology", "Google News HR Technology", "https://news.google.com/rss/search?q=tehnologija+OR+AI+OR+fintech+Croatia&hl=hr&gl=HR&ceid=HR:hr"),

    # Region
    ("slovenija", "economy", "Google News Slovenia Business", "https://news.google.com/rss/search?q=Slovenija+gospodarstvo+OR+finance+OR+podjetja&hl=sl&gl=SI&ceid=SI:sl"),
    ("srbija", "economy", "Google News Serbia Business", "https://news.google.com/rss/search?q=Srbija+privreda+OR+ekonomija+OR+biznis&hl=sr&gl=RS&ceid=RS:sr"),
    ("bih", "economy", "Google News BiH Business", "https://news.google.com/rss/search?q=Bosna+Hercegovina+ekonomija+OR+biznis+OR+privreda&hl=bs&gl=BA&ceid=BA:bs"),

    # International business and markets
    ("international", "economy", "Reuters Business", "https://news.google.com/rss/search?q=Reuters+business+markets+economy&hl=en&gl=US&ceid=US:en"),
    ("international", "economy", "AP Business", "https://news.google.com/rss/search?q=AP+business+economy+markets&hl=en&gl=US&ceid=US:en"),
    ("international", "economy", "CNBC", "https://www.cnbc.com/id/10001147/device/rss/rss.html"),
    ("international", "economy", "BBC Business", "https://feeds.bbci.co.uk/news/business/rss.xml"),
    ("international", "economy", "The Guardian Business", "https://www.theguardian.com/uk/business/rss"),

    # Technology / AI
    ("technology", "technology", "TechCrunch", "https://techcrunch.com/feed/"),
    ("technology", "technology", "The Verge", "https://www.theverge.com/rss/index.xml"),
    ("technology", "technology", "Wired", "https://www.wired.com/feed/rss"),
    ("technology", "technology", "Google News AI", "https://news.google.com/rss/search?q=artificial+intelligence+business+investment+technology&hl=en&gl=US&ceid=US:en"),
    ("technology", "technology", "Google News Data Centers", "https://news.google.com/rss/search?q=data+centers+AI+energy+business&hl=en&gl=US&ceid=US:en"),

    # Digital assets / fintech / crypto
    ("digital-assets", "digital-assets", "CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/"),
    ("digital-assets", "digital-assets", "Cointelegraph", "https://cointelegraph.com/rss"),
    ("digital-assets", "digital-assets", "Google News Bitcoin", "https://news.google.com/rss/search?q=bitcoin+crypto+exchange+stablecoin+fintech+regulation&hl=en&gl=US&ceid=US:en"),
    ("digital-assets", "digital-assets", "Google News Stablecoin", "https://news.google.com/rss/search?q=stablecoin+regulation+central+bank+fintech&hl=en&gl=US&ceid=US:en"),

    # Asia and Africa business coverage
    ("international", "economy", "Asia Business", "https://news.google.com/rss/search?q=Asia+business+investment+markets+technology&hl=en&gl=US&ceid=US:en"),
    ("international", "economy", "Africa Business", "https://news.google.com/rss/search?q=Africa+business+investment+markets+technology&hl=en&gl=US&ceid=US:en"),
    ("international", "economy", "UAE Business", "https://news.google.com/rss/search?q=UAE+Dubai+business+investment+fintech&hl=en&gl=AE&ceid=AE:en"),
    ("international", "economy", "India Business", "https://news.google.com/rss/search?q=India+business+fintech+technology+markets&hl=en&gl=IN&ceid=IN:en"),
    ("international", "economy", "Singapore Business", "https://news.google.com/rss/search?q=Singapore+business+fintech+markets+technology&hl=en&gl=SG&ceid=SG:en"),
    ("international", "economy", "Kenya Nigeria Ghana Business", "https://news.google.com/rss/search?q=Kenya+Nigeria+Ghana+business+fintech+technology&hl=en&gl=US&ceid=US:en"),

    # Food, energy, oil, organic, sport tech
    ("economy", "economy", "Food Industry", "https://news.google.com/rss/search?q=food+industry+organic+products+edible+oil+protein+business&hl=en&gl=US&ceid=US:en"),
    ("economy", "economy", "Energy Oil", "https://news.google.com/rss/search?q=oil+energy+markets+business+investment&hl=en&gl=US&ceid=US:en"),
    ("sport", "technology", "Sports Performance Technology", "https://news.google.com/rss/search?q=sports+performance+tracking+wearables+analytics+technology&hl=en&gl=US&ceid=US:en"),
    ("mobilnost", "technology", "Mobility Technology", "https://news.google.com/rss/search?q=mobility+technology+electric+vehicles+markets&hl=en&gl=US&ceid=US:en"),
]

BLOCKED_TITLE_PATTERNS = [
    re.compile(r"\bhoroscope\b", re.I),
    re.compile(r"\blottery\b", re.I),
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path, default):
    try:
        if not path.exists() or path.stat().st_size == 0:
            return default
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def clean_text(value: str) -> str:
    value = html.unescape(value or "")
    value = re.sub(r"<[^>]+>", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def parse_date(value: str) -> str:
    if not value:
        return now_iso()
    try:
        dt = email.utils.parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat()
    except Exception:
        return now_iso()


def item_id(url: str, title: str) -> str:
    return hashlib.sha1((url or title).encode("utf-8", "ignore")).hexdigest()[:18]


def fetch_url(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return response.read()


def parse_feed(raw: bytes, group: str, category: str, default_source: str):
    root = ET.fromstring(raw)
    channel_items = root.findall(".//item")
    atom_items = root.findall("{http://www.w3.org/2005/Atom}entry")
    items = []

    for node in channel_items:
        title = clean_text(node.findtext("title"))
        url = clean_text(node.findtext("link"))
        if not url:
            guid = clean_text(node.findtext("guid"))
            url = guid if guid.startswith("http") else ""
        summary = clean_text(node.findtext("description") or node.findtext("summary") or title)
        pub = parse_date(node.findtext("pubDate") or node.findtext("dc:date") or "")
        source_node = node.find("source")
        source = clean_text(source_node.text if source_node is not None else "") or default_source
        if title and url:
            items.append(make_record(title, url, summary, source, group, category, pub))

    for node in atom_items:
        title = clean_text(node.findtext("{http://www.w3.org/2005/Atom}title"))
        link = ""
        for link_node in node.findall("{http://www.w3.org/2005/Atom}link"):
            href = link_node.attrib.get("href", "")
            if href:
                link = href
                break
        summary = clean_text(node.findtext("{http://www.w3.org/2005/Atom}summary") or node.findtext("{http://www.w3.org/2005/Atom}content") or title)
        pub = parse_date(node.findtext("{http://www.w3.org/2005/Atom}updated") or node.findtext("{http://www.w3.org/2005/Atom}published") or "")
        if title and link:
            items.append(make_record(title, link, summary, default_source, group, category, pub))
    return items


def make_record(title: str, url: str, summary: str, source: str, group: str, category: str, published_at: str):
    title = clean_text(title)[:220]
    summary = clean_text(summary)[:360]
    url = url.strip()
    # Google News sometimes wraps source links; keep the public URL, browser will resolve it.
    uid = item_id(url, title)
    return {
        "id": uid,
        "title": title,
        "url": url,
        "summary": summary or title,
        "source": clean_text(source)[:80] or "Public RSS",
        "region": clean_text(source)[:80] or group,
        "group": group,
        "category": category,
        "published_at": published_at,
        "share_url": f"/podijeli/vijest/{uid}/",
    }


def is_blocked(item) -> bool:
    title = item.get("title", "")
    if not title or not item.get("url"):
        return True
    return any(pattern.search(title) for pattern in BLOCKED_TITLE_PATTERNS)


def stamp(item) -> float:
    try:
        return datetime.fromisoformat(str(item.get("published_at", "")).replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


def merge_unique(*collections):
    seen = set()
    merged = []
    for collection in collections:
        for raw in collection or []:
            item = dict(raw)
            if not item.get("id"):
                item["id"] = item_id(item.get("url", ""), item.get("title", ""))
            key = item.get("id") or item.get("url")
            if not key or key in seen or is_blocked(item):
                continue
            seen.add(key)
            merged.append(item)
    merged.sort(key=stamp, reverse=True)
    return merged


def main() -> int:
    DATA.mkdir(parents=True, exist_ok=True)
    fetched = []
    errors = []
    success = 0
    started = time.time()

    for group, category, source, url in SOURCES:
        try:
            raw = fetch_url(url)
            parsed = parse_feed(raw, group, category, source)
            fetched.extend(parsed)
            success += 1
        except (urllib.error.URLError, TimeoutError, ET.ParseError, Exception) as exc:
            errors.append({"source": source, "group": group, "error": str(exc)[:180]})

    existing_public = read_json(NEWS_PATH, [])
    existing_archive = read_json(ARCHIVE_PATH, [])
    merged = merge_unique(fetched, existing_public, existing_archive)
    public = merged[:PUBLIC_LIMIT]
    archive = merged[PUBLIC_LIMIT:PUBLIC_LIMIT + ARCHIVE_LIMIT]

    write_json(NEWS_PATH, public)
    write_json(ARCHIVE_PATH, archive)

    by_group = {}
    for item in public:
        by_group[item.get("group", "unknown")] = by_group.get(item.get("group", "unknown"), 0) + 1

    ratio = success / len(SOURCES) if SOURCES else 0
    status_name = "ok" if public and ratio >= 0.5 else "degraded" if public else "failed"
    ts = now_iso()
    status = read_json(STATUS_PATH, {}) if STATUS_PATH.exists() else {}
    status.update({
        "updated_at": ts,
        "news": {
            "updated_at": ts,
            "status": status_name,
            "engine": "github_actions_rss_refresh_v2",
            "cadence": "scheduled every 30 minutes plus manual workflow_dispatch",
            "source_success_policy": "publish_when_public_items_available_and_at_least_50_percent_sources_synced",
            "source_success_threshold": 0.5,
            "source_success_ratio": round(ratio, 3),
            "source_sync_status": "complete" if not errors else "partial_with_public_fallback",
            "configured_sources": len(SOURCES),
            "successful_sources": success,
            "failed_sources": len(errors),
            "storage_policy": "public_latest_500_archive_latest_400_older_overflow_removed",
            "public_items": len(public),
            "max_public_items": PUBLIC_LIMIT,
            "archive_items": len(archive),
            "max_archive_items": ARCHIVE_LIMIT,
            "discarded_archive_overflow_items": max(0, len(merged) - PUBLIC_LIMIT - ARCHIVE_LIMIT),
            "fetched_candidates": len(fetched),
            "duplicates_or_blocked_removed": max(0, len(fetched) + len(existing_public) + len(existing_archive) - len(merged)),
            "request_timeout_seconds": TIMEOUT,
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
    write_json(STATUS_PATH, status)
    print(f"news refresh: status={status_name}, public={len(public)}, archive={len(archive)}, sources={success}/{len(SOURCES)}")
    if errors:
        print("source errors:")
        for error in errors[:10]:
            print("-", error)
    return 0 if public else 1


if __name__ == "__main__":
    sys.exit(main())
