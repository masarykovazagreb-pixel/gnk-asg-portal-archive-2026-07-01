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

INDEXES = {
    "sp500": {"symbol": "^spx", "label": "S&P 500", "region": "SAD"},
    "nasdaq": {"symbol": "^ndq", "label": "Nasdaq Composite", "region": "SAD"},
    "dax": {"symbol": "^dax", "label": "DAX", "region": "Njemačka"},
    "ftse": {"symbol": "^ftse", "label": "FTSE 100", "region": "UK"},
    "nikkei": {"symbol": "^n225", "label": "Nikkei 225", "region": "Japan"},
    "cac40": {"symbol": "^cac", "label": "CAC 40", "region": "Francuska"},
}


def get(url: str) -> bytes:
    request = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def refresh_market_indices(now: str) -> int:
    codes = ",".join(meta["symbol"] for meta in INDEXES.values())
    url = f"https://stooq.com/q/l/?s={codes}&f=sd2t2ohlc&h&e=csv"
    indices: list[dict] = []
    errors: list[dict] = []
    try:
        raw = get(url).decode("utf-8", errors="replace")
        lines = [line for line in raw.strip().splitlines() if line]
        rows: dict[str, list[str]] = {}
        for line in lines[1:]:
            cols = line.split(",")
            if cols:
                rows[cols[0].strip().lower()] = cols
        for key, meta in INDEXES.items():
            cols = rows.get(meta["symbol"].lower())
            if not cols or len(cols) < 7:
                errors.append({"id": key, "error": "missing_row"})
                continue
            try:
                open_price = float(cols[3])
                close_price = float(cols[6])
            except (ValueError, IndexError):
                errors.append({"id": key, "error": "invalid_values"})
                continue
            if open_price <= 0:
                errors.append({"id": key, "error": "invalid_open"})
                continue
            indices.append({
                "id": key,
                "symbol": meta["symbol"],
                "label": meta["label"],
                "region": meta["region"],
                "current": close_price,
                "previous_close": open_price,
                "change_percent": round(((close_price / open_price) - 1) * 100, 2),
                "as_of": cols[1] if len(cols) > 1 else None,
            })
    except Exception as exc:
        errors.append({"id": "all", "error": str(exc)[:150]})

    (DATA / "market_indices.json").write_text(
        json.dumps({
            "updated_at": now,
            "cadence": "09:05 and 17:05 Europe/Zagreb",
            "source": "Stooq public market quote feed",
            "indices": indices,
            "errors": errors,
            "notice": "Informativni prikaz posljednjih dostupnih vrijednosti; podatci mogu biti odgođeni.",
        }, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    status = {
        "updated_at": now,
        "cadence": "09:05 and 17:05 Europe/Zagreb",
        "status": "ok" if len(indices) == len(INDEXES) else ("partial" if indices else "degraded"),
        "indices": len(indices),
        "errors": errors,
    }
    (DATA / "fast_market_status.json").write_text(
        json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return len(indices)


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
        "cadence": "09:05 and 17:05 Europe/Zagreb",
        "source": "CoinGecko public market data",
        "status": "ok",
        "coins": coins,
    }
    (DATA / "market.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main() -> int:
    """Refresh market data only.

    News/Aktual ownership belongs exclusively to GNK News Refresh V2. Keeping
    market and news writers separate prevents duplicate refreshes, stale archive
    rewrites and cross-workflow races on news.json/news_archive.json.
    """
    DATA.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()
    refresh_market(now)
    index_count = refresh_market_indices(now)
    market = json.loads((DATA / "market.json").read_text(encoding="utf-8"))
    if market.get("updated_at") != now or len(market.get("coins", [])) != 4:
        raise SystemExit("Market live-data validation failed")
    if index_count == 0:
        raise SystemExit("Market index refresh returned no indices")
    print(json.dumps({
        "ok": True,
        "market_updated_at": now,
        "coins": len(market.get("coins", [])),
        "indices": index_count,
        "news_writer": "GNK News Refresh V2",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
