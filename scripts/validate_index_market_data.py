#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "apps/portal/data"
EXPECTED = {"BTC", "ETH", "SOL", "XRP"}
CURRENCIES = {"eur", "usd", "gbp", "chf", "jpy"}
CADENCE = "scheduled hourly at minute 05 UTC"


def parse_time(value: str) -> datetime:
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def fail(message: str) -> None:
    raise SystemExit(f"index market-data contract failed: {message}")


def fresh(payload: dict, field: str = "updated_at") -> float:
    now = datetime.now(timezone.utc)
    updated = parse_time(payload.get(field, ""))
    age = (now - updated).total_seconds()
    if age < -120 or age > 900:
        fail(f"{field} timestamp outside freshness window: {age:.0f}s")
    return age


def main() -> int:
    market = json.loads((DATA / "market.json").read_text(encoding="utf-8"))
    indices_payload = json.loads((DATA / "market_indices.json").read_text(encoding="utf-8"))
    fast_status = json.loads((DATA / "fast_market_status.json").read_text(encoding="utf-8"))

    market_age = fresh(market)
    index_age = fresh(indices_payload)
    status_age = fresh(fast_status)

    if market.get("status") != "ok":
        fail("crypto market status is not ok")
    if market.get("cadence") != CADENCE:
        fail("crypto market cadence does not match the hourly workflow")
    coins = market.get("coins")
    if not isinstance(coins, list) or len(coins) != 4:
        fail("market must contain exactly four crypto assets")
    symbols = {str(item.get("symbol", "")).upper() for item in coins}
    if symbols != EXPECTED:
        fail(f"unexpected crypto asset set: {sorted(symbols)}")
    for item in coins:
        prices = item.get("prices") or {}
        changes = item.get("changes_24h") or {}
        if set(prices) != CURRENCIES or set(changes) != CURRENCIES:
            fail(f"currency contract mismatch for {item.get('symbol')}")
        if any(not isinstance(prices.get(currency), (int, float)) or prices[currency] <= 0 for currency in CURRENCIES):
            fail(f"invalid price data for {item.get('symbol')}")
        if not isinstance(item.get("market_cap_usd"), (int, float)) or item["market_cap_usd"] <= 0:
            fail(f"invalid market cap for {item.get('symbol')}")
        if not isinstance(item.get("volume_24h_usd"), (int, float)) or item["volume_24h_usd"] < 0:
            fail(f"invalid volume for {item.get('symbol')}")

    if indices_payload.get("cadence") != CADENCE or fast_status.get("cadence") != CADENCE:
        fail("market-index cadence does not match the hourly workflow")
    indices = indices_payload.get("indices")
    if not isinstance(indices, list) or len(indices) < 1:
        fail("market index feed contains no usable index")
    if fast_status.get("status") not in {"ok", "partial"}:
        fail("fast market status is degraded")
    if fast_status.get("indices") != len(indices):
        fail("fast market status count does not match market_indices.json")
    for item in indices:
        if not item.get("id") or not item.get("label"):
            fail("market index is missing identity fields")
        if not isinstance(item.get("current"), (int, float)) or item["current"] <= 0:
            fail(f"invalid current value for index {item.get('id')}")
        if not isinstance(item.get("change_percent"), (int, float)):
            fail(f"invalid change value for index {item.get('id')}")

    print(json.dumps({
        "ok": True,
        "market_age_seconds": round(market_age),
        "index_age_seconds": round(index_age),
        "status_age_seconds": round(status_age),
        "crypto_assets": sorted(symbols),
        "market_indices": len(indices),
        "news_files_touched": False,
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
