#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "apps/portal/data"
EXPECTED = {"BTC", "ETH", "SOL", "XRP"}
CURRENCIES = {"eur", "usd", "gbp", "chf", "jpy"}
EXPECTED_INDEXES = {"sp500", "nasdaq", "dax", "ftse", "nikkei", "cac40"}


def parse_time(value: str) -> datetime:
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def fail(message: str) -> None:
    raise SystemExit(f"index live-data contract failed: {message}")


def main() -> int:
    now = datetime.now(timezone.utc)
    market = json.loads((DATA / "market.json").read_text(encoding="utf-8"))
    market_indices = json.loads((DATA / "market_indices.json").read_text(encoding="utf-8"))
    fast_market_status = json.loads((DATA / "fast_market_status.json").read_text(encoding="utf-8"))

    updated = parse_time(market.get("updated_at", ""))
    age = (now - updated).total_seconds()
    if age < -120 or age > 900:
        fail(f"market timestamp outside freshness window: {age:.0f}s")
    if market.get("status") != "ok":
        fail("market status is not ok")
    coins = market.get("coins")
    if not isinstance(coins, list) or len(coins) != 4:
        fail("market must contain exactly four assets")
    symbols = {str(item.get("symbol", "")).upper() for item in coins}
    if symbols != EXPECTED:
        fail(f"unexpected asset set: {sorted(symbols)}")
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

    indices_updated = parse_time(market_indices.get("updated_at", ""))
    indices_age = (now - indices_updated).total_seconds()
    if indices_age < -120 or indices_age > 900:
        fail(f"market indices timestamp outside freshness window: {indices_age:.0f}s")
    indices = market_indices.get("indices")
    if not isinstance(indices, list) or len(indices) != len(EXPECTED_INDEXES):
        fail(f"market indices must contain exactly {len(EXPECTED_INDEXES)} entries")
    index_ids = {str(item.get("id", "")) for item in indices}
    if index_ids != EXPECTED_INDEXES:
        fail(f"unexpected market index set: {sorted(index_ids)}")
    if market_indices.get("errors"):
        fail(f"market indices contain source errors: {market_indices.get('errors')}")
    for item in indices:
        if not isinstance(item.get("current"), (int, float)) or item["current"] <= 0:
            fail(f"invalid current value for index {item.get('id')}")
        if not isinstance(item.get("previous_close"), (int, float)) or item["previous_close"] <= 0:
            fail(f"invalid previous close for index {item.get('id')}")
        if not isinstance(item.get("change_percent"), (int, float)):
            fail(f"invalid change percent for index {item.get('id')}")

    fast_updated = parse_time(fast_market_status.get("updated_at", ""))
    if abs((fast_updated - indices_updated).total_seconds()) > 5:
        fail("fast market status timestamp does not match market indices payload")
    if fast_market_status.get("status") != "ok":
        fail(f"fast market operational status is {fast_market_status.get('status')}")
    if fast_market_status.get("indices") != len(indices):
        fail("fast market index count does not match market indices payload")
    if fast_market_status.get("errors"):
        fail(f"fast market status contains source errors: {fast_market_status.get('errors')}")

    print(json.dumps({
        "ok": True,
        "market_age_seconds": round(age),
        "market_assets": sorted(symbols),
        "market_indices": sorted(index_ids),
        "market_indices_age_seconds": round(indices_age),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
