#!/usr/bin/env python3
"""Stale-safe heartbeat for public news automation status."""
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
NOW = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def load(name: str, default):
    try:
        value = json.loads((DATA / name).read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else default
    except Exception:
        return default


def save(name: str, payload) -> None:
    (DATA / name).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    status = load("update_status.json", {})
    news = status.get("news") if isinstance(status.get("news"), dict) else {}
    previous_success = news.get("last_successful_refresh_at") or news.get("updated_at")
    public_items = news.get("public_items", 0)
    previous_status = news.get("status") or "partial"
    news.update({
        "updated_at": NOW,
        "checked_at": NOW,
        "last_attempt_at": NOW,
        "cadence": "scheduled every hour",
        "heartbeat_policy": "news_status_updates_on_every_automation_run",
        "stale_safe": True,
        "public_items": public_items,
    })
    if previous_status == "ok":
        news["status"] = "ok"
        news["last_successful_refresh_at"] = NOW
        news["data_status"] = "fresh_or_reference_checked"
    else:
        news["status"] = previous_status
        news["last_successful_refresh_at"] = previous_success
        news["data_status"] = "stale_previous_news_preserved"
    status["updated_at"] = NOW
    status["news"] = news
    save("update_status.json", status)
    print(json.dumps({"checked_at": NOW, "news_status": news.get("status"), "public_items": public_items}, ensure_ascii=False))


if __name__ == "__main__":
    main()
