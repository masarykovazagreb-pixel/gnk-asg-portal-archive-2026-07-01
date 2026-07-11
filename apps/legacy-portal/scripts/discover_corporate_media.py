#!/usr/bin/env python3
"""Provjeri javne medijske rezultate bez automatske objave na portalu.

Rubrika GNK ASG u medijima prikazuje samo stavke koje su ručno odobrene.
Otkriveni javni rezultati koriste se isključivo za statusnu provjeru; ne ulaze
u data/media_approved.json bez ovlaštene radnje odobravanja.
"""
from __future__ import annotations

import email.utils
import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
CONFIG = DATA / "media_queries.json"
PUBLIC_ITEMS = DATA / "media_approved.json"
REMOVED = DATA / "media_removed.json"
STATUS = DATA / "media_monitor_status.json"
UA = "GNK-ASG-Controlled-Media-Monitor/5.0"


def load(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def save(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def clean(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text or "")
    return re.sub(r"\s+", " ", text).strip()


def removed_urls(value) -> set[str]:
    urls: set[str] = set()
    if not isinstance(value, list):
        return urls
    for item in value:
        url = item if isinstance(item, str) else item.get("url", "") if isinstance(item, dict) else ""
        url = str(url).strip()
        if url:
            urls.add(url)
    return urls


def fetch_feed(query: str) -> set[str]:
    encoded = urllib.parse.quote_plus(query)
    url = f"https://news.google.com/rss/search?q={encoded}&hl=hr&gl=HR&ceid=HR:hr"
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=20) as response:
        root = ET.fromstring(response.read())
    links: set[str] = set()
    for row in root.findall("./channel/item"):
        link = clean(row.findtext("link", ""))
        if link:
            links.add(link)
    return links


def approved_visible_items(current, excluded: set[str]) -> list[dict]:
    if not isinstance(current, list):
        return []
    output = []
    for item in current:
        if not isinstance(item, dict):
            continue
        url = str(item.get("url", "")).strip()
        if url and url not in excluded and item.get("approval") == "manual":
            output.append(item)
    return sorted(output, key=lambda item: str(item.get("published_at", "")), reverse=True)


def main() -> None:
    config = load(CONFIG, {})
    excluded = removed_urls(load(REMOVED, []))
    approved = approved_visible_items(load(PUBLIC_ITEMS, []), excluded)
    checked_queries = 0
    detected_urls: set[str] = set()
    errors: list[str] = []
    timestamp = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    for subject in config.get("subjects", []):
        subject_name = str(subject.get("name", "")).strip()
        for base_query in subject.get("queries", []):
            checked_queries += 1
            query = str(base_query).strip() + " when:30d"
            try:
                detected_urls.update(url for url in fetch_feed(query) if url not in excluded)
            except Exception as error:
                errors.append(f"{subject_name}: {str(error)[:100]}")

    save(PUBLIC_ITEMS, approved)
    status = {
        "status": "ok" if not errors else "partial",
        "updated_at": timestamp,
        "checked_queries": checked_queries,
        "public_results_detected": len(detected_urls),
        "published_public": len(approved),
        "removed_urls": len(excluded),
        "public_display_policy": "manual_approval_only",
        "privacy_notice": "Only manually approved public corporate-media results are displayed; authorised removals remain excluded.",
        "errors_count": len(errors),
    }
    save(STATUS, status)
    print(json.dumps(status, ensure_ascii=False))


if __name__ == "__main__":
    main()
