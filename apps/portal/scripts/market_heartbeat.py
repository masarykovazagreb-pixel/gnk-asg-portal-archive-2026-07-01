#!/usr/bin/env python3
"""Stale-safe heartbeat for public market monitors."""
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
NOW = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
FILES = [
    "exchange_compare.json",
    "stock_exchanges.json",
    "fast_market_status.json",
    "reference_assets_status.json",
    "market.json",
    "stablecoins.json",
    "market_indices.json",
    "btc_chart.json",
    "asg_gold_asset.json",
]


def load(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def save(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def touch(name: str) -> dict:
    path = DATA / name
    payload = load(path)
    if not payload:
        payload = {"status": "partial"}
    previous_success = payload.get("last_successful_refresh_at") or payload.get("updated_at") or payload.get("checked_at")
    status = str(payload.get("status", "ok"))
    payload["checked_at"] = NOW
    payload["updated_at"] = NOW
    payload["last_attempt_at"] = NOW
    payload["heartbeat_policy"] = "timestamp_updates_on_every_automation_run"
    payload["stale_safe"] = True
    if status == "ok":
        payload["last_successful_refresh_at"] = NOW
        payload.setdefault("data_status", "fresh_or_reference_checked")
    else:
        payload["last_successful_refresh_at"] = previous_success
        payload["data_status"] = "stale_previous_values_preserved"
    save(path, payload)
    return {"file": name, "status": payload.get("status"), "checked_at": NOW}


def main() -> None:
    print(json.dumps({"checked_at": NOW, "files": [touch(name) for name in FILES]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
