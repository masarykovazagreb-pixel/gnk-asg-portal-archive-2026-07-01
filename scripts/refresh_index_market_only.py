#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone

import refresh_index_live_data as base

CADENCE = "scheduled hourly at minute 05 UTC"


def rewrite_cadence() -> None:
    for name in ("market.json", "market_indices.json", "fast_market_status.json"):
        path = base.DATA / name
        payload = json.loads(path.read_text(encoding="utf-8"))
        payload["cadence"] = CADENCE
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    base.DATA.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()
    base.refresh_market(now)
    index_count = base.refresh_market_indices(now)
    rewrite_cadence()

    market = json.loads((base.DATA / "market.json").read_text(encoding="utf-8"))
    if market.get("updated_at") != now or len(market.get("coins", [])) != 4:
        raise SystemExit("Index market-data validation failed")
    if index_count < 1:
        raise SystemExit("No public market index was refreshed")

    print(json.dumps({
        "ok": True,
        "market_updated_at": now,
        "crypto_assets": len(market.get("coins", [])),
        "market_indices": index_count,
        "news_writer": "GNK ASG News Refresh only",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
