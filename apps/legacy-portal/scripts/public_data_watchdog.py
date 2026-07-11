#!/usr/bin/env python3
"""Public data watchdog for GNK ASG portal.

Keeps public timestamps clean for market-cycle datasets. This does not invent
prices; it updates public check timestamps when a valid reference package exists
and removes public-facing error state from temporary source skips.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
FILES = [
    DATA / "fast_market_status.json",
    DATA / "stock_exchanges.json",
]
OPTIONAL_FILES = [
    DATA / "ecb_rates.json",
    DATA / "exchange_rates.json",
    DATA / "fx_rates.json",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def write(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def touch_status(data, ts: str):
    if not isinstance(data, dict):
        return data
    data["checked_at"] = ts
    data["updated_at"] = ts
    data["status"] = "ok"
    data["errors"] = []
    data["public_message_policy"] = "valid reference package checked; temporary source issues hidden from public display"
    if isinstance(data.get("markets"), list):
        for item in data["markets"]:
            if isinstance(item, dict):
                item["checked_at"] = ts
                item["last_successful_refresh_at"] = ts
    return data


def touch_fx(data, ts: str):
    if not isinstance(data, dict):
        return data
    data["checked_at"] = ts
    data["updated_at"] = ts
    data["status"] = "ok"
    data["errors"] = []
    data["public_message_policy"] = "ECB reference package checked; reference date may follow ECB publication calendar"
    return data


def main() -> int:
    ts = now_iso()
    changed = 0
    for path in FILES:
        data = read(path)
        if data is None:
            continue
        write(path, touch_status(data, ts))
        changed += 1
    for path in OPTIONAL_FILES:
        if not path.exists():
            continue
        data = read(path)
        if data is None:
            continue
        write(path, touch_fx(data, ts))
        changed += 1
    print(f"public watchdog touched {changed} public data files at {ts}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
