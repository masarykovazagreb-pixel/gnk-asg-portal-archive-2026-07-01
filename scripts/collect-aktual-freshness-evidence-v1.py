#!/usr/bin/env python3
"""Collect truth-preserving AKTUAL freshness evidence from repository output.

This collector does not mutate producer data and never treats a timestamp bump as a
successful refresh. It derives the newest published item, item count and content
fingerprint from apps/portal/data/news.json so maintenance can classify the public
surface independently of GitHub Actions runner health.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


def parse_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    value = value.strip()
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        raise ValueError(f"timestamp must be timezone-aware: {value}")
    return dt.astimezone(timezone.utc)


def iso(dt: datetime | None) -> str | None:
    return dt.isoformat().replace("+00:00", "Z") if dt else None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--news", default="apps/portal/data/news.json")
    parser.add_argument("--cadence-minutes", type=int, default=120)
    parser.add_argument("--now", help="ISO-8601 evaluation time; defaults to current UTC")
    parser.add_argument("--output")
    args = parser.parse_args()

    path = Path(args.news)
    raw = path.read_bytes()
    data = json.loads(raw.decode("utf-8-sig"))
    items = data if isinstance(data, list) else data.get("items", [])
    if not isinstance(items, list):
        raise SystemExit("AKTUAL news payload must be a list or object with items[]")

    timestamps: list[datetime] = []
    malformed = 0
    for item in items:
        if not isinstance(item, dict):
            malformed += 1
            continue
        value = item.get("published_at") or item.get("publishedAt")
        try:
            ts = parse_ts(value)
        except (TypeError, ValueError):
            malformed += 1
            continue
        if ts:
            timestamps.append(ts)

    latest = max(timestamps) if timestamps else None
    now = parse_ts(args.now) if args.now else datetime.now(timezone.utc)
    if now is None:
        raise SystemExit("invalid evaluation time")
    age_minutes = ((now - latest).total_seconds() / 60.0) if latest else None
    cadence = max(1, args.cadence_minutes)
    missed_cycles = (age_minutes / cadence) if age_minutes is not None else None

    if latest is None:
        state, reason = "BLOCKED", "no valid published timestamp in AKTUAL output"
    elif age_minutes <= cadence:
        state, reason = "FRESH", "newest published item is within cadence"
    elif age_minutes >= cadence * 2:
        state, reason = "DEGRADED", "newest published item exceeds root-cause/self-heal threshold"
    else:
        state, reason = "STALE", "newest published item is older than cadence"

    report = {
        "version": 1,
        "producer_id": "aktual-media",
        "source_path": str(path),
        "evaluated_at": iso(now),
        "cadence_minutes": cadence,
        "state": state,
        "reason": reason,
        "item_count": len(items),
        "valid_timestamp_count": len(timestamps),
        "malformed_item_count": malformed,
        "observed_output_at": iso(latest),
        "age_minutes": round(age_minutes, 2) if age_minutes is not None else None,
        "missed_cycles": round(missed_cycles, 2) if missed_cycles is not None else None,
        "output_fingerprint": hashlib.sha256(raw).hexdigest(),
        "last_success_at": None,
        "last_success_evidence": "UNAVAILABLE_FROM_STATIC_OUTPUT",
        "truth_note": "Static output freshness does not prove producer execution success or search indexing.",
    }
    rendered = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if args.output:
        Path(args.output).write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")
    return 0 if state == "FRESH" else 2


if __name__ == "__main__":
    raise SystemExit(main())
