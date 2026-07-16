#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "apps/portal/data"
EXPECTED = {"BTC", "ETH", "SOL", "XRP"}
CURRENCIES = {"eur", "usd", "gbp", "chf", "jpy"}


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
    news = json.loads((DATA / "news.json").read_text(encoding="utf-8"))
    status = json.loads((DATA / "news-status.json").read_text(encoding="utf-8"))

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

    if not isinstance(news, list) or len(news) < 3:
        fail("news feed must contain at least three items")
    seen_ids: set[str] = set()
    seen_urls: set[str] = set()
    newest: datetime | None = None
    hosts: set[str] = set()
    for item in news:
        item_id = str(item.get("id", "")).strip()
        title = str(item.get("title", "")).strip()
        url = str(item.get("url", "")).strip()
        published = parse_time(item.get("published_at", ""))
        parsed = urlparse(url)
        if not item_id or len(item_id) < 12 or not title or len(title) < 8:
            fail("news item has invalid id or title")
        if item_id in seen_ids or url in seen_urls:
            fail("news feed contains duplicate id or URL")
        seen_ids.add(item_id); seen_urls.add(url)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            fail(f"news URL is not a safe public HTTPS URL: {url}")
        hosts.add(parsed.hostname.lower())
        if published > now + timedelta(minutes=5):
            fail(f"news item is dated in the future: {title}")
        newest = published if newest is None or published > newest else newest
        if item.get("share_url") != f"/podijeli/vijest/{item_id}/":
            fail(f"invalid share URL for {item_id}")
    if newest is None or now - newest > timedelta(days=3):
        fail("news feed has no item newer than three days")

    status_time = parse_time(status.get("updated_at", ""))
    if now - status_time > timedelta(minutes=15):
        fail("news status is stale")
    if status.get("items") != len(news):
        fail("news status item count does not match feed")
    if not isinstance(status.get("sources_ok"), int) or status["sources_ok"] < 1:
        fail("no news source succeeded")
    if status.get("sources_total") != 3:
        fail("news source count contract changed unexpectedly")

    print(json.dumps({
        "ok": True,
        "market_age_seconds": round(age),
        "market_assets": sorted(symbols),
        "news_items": len(news),
        "news_hosts": len(hosts),
        "newest_news_at": newest.isoformat(),
        "sources_ok": status["sources_ok"],
        "sources_total": status["sources_total"],
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
