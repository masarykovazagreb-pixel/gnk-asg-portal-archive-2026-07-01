#!/usr/bin/env python3
"""Manage automatic corporate-media visibility through an authorised workflow.

The monitor publishes matching public results automatically. This workflow can
remove a public URL persistently or restore/add a specifically verified URL.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_ITEMS = ROOT / "data" / "media_approved.json"
REMOVED = ROOT / "data" / "media_removed.json"


def value(name: str) -> str:
    return os.environ.get(name, "").strip()


def valid_public_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def load_items(path: Path) -> list:
    try:
        items = json.loads(path.read_text(encoding="utf-8"))
        return items if isinstance(items, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def write(path: Path, items: list) -> None:
    path.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    action = value("MEDIA_ACTION").lower()
    url = value("MEDIA_URL")
    if action not in {"approve", "remove"}:
        raise SystemExit("Action must be approve or remove.")
    if not valid_public_url(url):
        raise SystemExit("A valid public http/https source URL is required.")

    items = [item for item in load_items(PUBLIC_ITEMS) if str(item.get("url", "")).strip() != url]
    removed = [item for item in load_items(REMOVED) if str(item.get("url", "")).strip() != url]

    if action == "remove":
        removed.append({
            "url": url,
            "removed_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "reason": "authorised_public_removal"
        })
    else:
        title = value("MEDIA_TITLE")
        source = value("MEDIA_SOURCE")
        published_at = value("MEDIA_DATE")
        summary = value("MEDIA_SUMMARY")
        subject = value("MEDIA_SUBJECT") or "GNK ASG d.o.o."
        if not title or not source:
            raise SystemExit("Title and source are required for approval or restoration.")
        if published_at:
            try:
                datetime.fromisoformat(published_at.replace("Z", "+00:00"))
            except ValueError as exc:
                raise SystemExit("Published date must be ISO format, for example 2026-05-23.") from exc
        else:
            published_at = datetime.now(timezone.utc).date().isoformat()
        items.append({
            "title": title,
            "summary": summary,
            "url": url,
            "source": source,
            "published_at": published_at,
            "subject": subject,
            "approved_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "approval": "manual"
        })

    items.sort(key=lambda item: str(item.get("published_at", "")), reverse=True)
    write(PUBLIC_ITEMS, items)
    write(REMOVED, removed)
    print(f"{action}: {url}; visible items: {len(items)}; removed URLs: {len(removed)}")


if __name__ == "__main__":
    main()
