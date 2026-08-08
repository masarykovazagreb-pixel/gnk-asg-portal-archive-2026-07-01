#!/usr/bin/env python3
from __future__ import annotations

import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "apps/portal/data"
UA = {"User-Agent": "GNK-ASG-Public-Data-Refresh/1.0"}
COINS = "bitcoin,ethereum,solana,ripple"
CURRENCIES = "eur,usd,gbp,chf,jpy"
CADENCE = "twice daily around 09:05 and 17:05 Europe/Zagreb"


def get(url: str) -> bytes:
    request = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def refresh_market(now: str) -> None:
    url = (
        "https://api.coingecko.com/api/v3/simple/price"
        f"?ids={COINS}&vs_currencies={CURRENCIES}"
        "&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true&include_last_updated_at=true"
    )
    raw = json.loads(get(url))
    coins = []
    for coin_id in COINS.split(","):
        item = raw.get(coin_id) or {}
        symbol = {"bitcoin": "BTC", "ethereum": "ETH", "solana": "SOL", "ripple": "XRP"}[coin_id]
        coins.append({
            "id": coin_id,
            "symbol": symbol,
            "prices": {currency: item.get(currency) for currency in CURRENCIES.split(",")},
            "changes_24h": {currency: item.get(f"{currency}_24h_change") for currency in CURRENCIES.split(",")},
            "market_cap_usd": item.get("usd_market_cap"),
            "volume_24h_usd": item.get("usd_24h_vol"),
            "last_updated_at": item.get("last_updated_at"),
        })
    if not all(coin["prices"].get("eur") for coin in coins):
        raise RuntimeError("CoinGecko response is incomplete")
    payload = {
        "updated_at": now,
        "cadence": CADENCE,
        "source": "CoinGecko public market data",
        "status": "ok",
        "coins": coins,
    }
    (DATA / "market.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main() -> int:
    """Refresh crypto market data only.

    Ownership is intentionally split: this script owns market.json,
    refresh_world_market_indices.py owns market_indices.json and
    fast_market_status.json, and GNK News Refresh V2 exclusively owns
    Aktual/news files. This prevents cross-workflow and intra-workflow races.
    """
    DATA.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()
    refresh_market(now)
    market = json.loads((DATA / "market.json").read_text(encoding="utf-8"))
    if market.get("updated_at") != now or len(market.get("coins", [])) != 4:
        raise SystemExit("Market live-data validation failed")
    print(json.dumps({
        "ok": True,
        "market_updated_at": now,
        "coins": len(market.get("coins", [])),
        "indices_writer": "refresh_world_market_indices.py",
        "news_writer": "GNK News Refresh V2",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
