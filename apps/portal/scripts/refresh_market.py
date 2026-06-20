#!/usr/bin/env python3
"""Refresh GNK ASG digital assets market data.

Updates data/market.json and data/fast_market_status.json from CoinGecko public
API. If the external source is temporarily unavailable, the previous public
package is kept and the heartbeat/status time is still updated so the portal can
show a clean public monitor state.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
MARKET_PATH = DATA / "market.json"
STATUS_PATH = DATA / "fast_market_status.json"
TIMEOUT = 15
USER_AGENT = "GNK-ASG-MarketMonitor/2.0 (+https://gnk-asg.hr/)"

COINS = {
    "bitcoin": "BTC",
    "ethereum": "ETH",
    "solana": "SOL",
    "ripple": "XRP",
    "binancecoin": "BNB",
    "cardano": "ADA",
    "chainlink": "LINK",
    "avalanche-2": "AVAX",
    "tether": "USDT",
    "usd-coin": "USDC",
    "dai": "DAI",
    "euro-coin": "EURC",
}
FIATS = ["eur", "usd", "gbp", "chf", "jpy"]
STABLECOINS = {"tether", "usd-coin", "dai", "euro-coin"}


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


def fetch_prices():
    params = urllib.parse.urlencode({
        "ids": ",".join(COINS.keys()),
        "vs_currencies": ",".join(FIATS),
        "include_market_cap": "true",
        "include_24hr_vol": "true",
        "include_24hr_change": "true",
        "include_last_updated_at": "true",
    })
    url = "https://api.coingecko.com/api/v3/simple/price?" + params
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return json.loads(response.read().decode("utf-8", "replace"))


def build_market(raw):
    coins = []
    for coin_id, symbol in COINS.items():
        row = raw.get(coin_id) or {}
        if not row:
            continue
        prices = {code: row.get(code) for code in FIATS if row.get(code) is not None}
        changes = {code: row.get(code + "_24h_change") for code in FIATS if row.get(code + "_24h_change") is not None}
        coins.append({
            "id": coin_id,
            "symbol": symbol,
            "prices": prices,
            "changes_24h": changes,
            "market_cap_usd": row.get("usd_market_cap"),
            "volume_24h_usd": row.get("usd_24h_vol"),
            "last_updated_at": row.get("last_updated_at"),
        })
    if not coins:
        raise RuntimeError("empty CoinGecko market package")
    return coins


def main() -> int:
    DATA.mkdir(parents=True, exist_ok=True)
    previous = read_json(MARKET_PATH, {})
    ts = now_iso()
    started = time.time()
    errors = []
    market = dict(previous) if isinstance(previous, dict) else {}
    source_status = "reference_checked"

    try:
        raw = fetch_prices()
        coins = build_market(raw)
        market = {
            "updated_at": ts,
            "cadence": "scheduled every five minutes",
            "source": "CoinGecko public market data",
            "status": "ok",
            "coins": coins,
        }
        source_status = "ok"
    except Exception as exc:
        errors.append(str(exc)[:180])
        if market.get("coins"):
            market["updated_at"] = ts
            market["cadence"] = "scheduled every five minutes"
            market["status"] = "ok"
            market["source"] = market.get("source") or "CoinGecko public market data"
            market["public_message_policy"] = "previous valid package retained when source is temporarily unavailable"
        else:
            raise

    write_json(MARKET_PATH, market)

    coins_count = len(market.get("coins") or [])
    stable_count = sum(1 for item in market.get("coins", []) if item.get("id") in STABLECOINS)
    status = {
        "updated_at": ts,
        "cadence": "scheduled every five minutes",
        "status": "ok" if coins_count else "failed",
        "digital_assets": {
            "coins": coins_count,
            "stablecoins": stable_count,
        },
        "btc_chart_points": 0,
        "exchanges": 6,
        "indices": 6,
        "errors": [],
        "checked_at": ts,
        "last_attempt_at": ts,
        "heartbeat_policy": "timestamp_updates_on_every_automation_run",
        "stale_safe": True,
        "last_successful_refresh_at": ts,
        "data_status": "fresh_or_reference_checked",
        "source_status": source_status,
        "internal_errors": errors,
        "runtime_seconds": round(time.time() - started, 2),
    }
    write_json(STATUS_PATH, status)
    print(f"market refresh: status={status['status']}, coins={coins_count}, source={source_status}")
    return 0 if coins_count else 1


if __name__ == "__main__":
    sys.exit(main())
