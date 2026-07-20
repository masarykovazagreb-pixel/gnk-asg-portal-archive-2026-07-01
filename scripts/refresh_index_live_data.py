#!/usr/bin/env python3
from __future__ import annotations

import email.utils
import hashlib
import html
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "apps/portal/data"
UA = {"User-Agent": "GNK-ASG-Public-Data-Refresh/1.0"}
COINS = "bitcoin,ethereum,solana,ripple"
CURRENCIES = "eur,usd,gbp,chf,jpy"
RSS = [
    ("BBC Business", "international", "economy", "https://feeds.bbci.co.uk/news/business/rss.xml"),
    ("The Verge", "technology", "technology", "https://www.theverge.com/rss/index.xml"),
    ("Cointelegraph", "digital-assets", "digital-assets", "https://cointelegraph.com/rss"),
]

PUBLIC_LIMIT = 100
ARCHIVE_TRIGGER = 2000
ARCHIVE_DELETE_OLDEST = 1000


def get(url: str) -> bytes:
    request = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def text(node: ET.Element | None, *names: str) -> str:
    if node is None:
        return ""
    for name in names:
        child = node.find(name)
        if child is not None and child.text:
            return child.text.strip()
    return ""


def clean(value: str) -> str:
    value = html.unescape(re.sub(r"<[^>]+>", " ", value or ""))
    return re.sub(r"\s+", " ", value).strip()


def iso_date(value: str) -> str:
    if not value:
        return datetime.now(timezone.utc).isoformat()
    try:
        parsed = email.utils.parsedate_to_datetime(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat()
    except Exception:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat()
        except Exception:
            return datetime.now(timezone.utc).isoformat()


INDEXES = {
    "sp500": {"symbol": "^spx", "label": "S&P 500", "region": "SAD"},
    "nasdaq": {"symbol": "^ndq", "label": "Nasdaq Composite", "region": "SAD"},
    "dax": {"symbol": "^dax", "label": "DAX", "region": "Njemačka"},
    "ftse": {"symbol": "^ftse", "label": "FTSE 100", "region": "UK"},
    "nikkei": {"symbol": "^n225", "label": "Nikkei 225", "region": "Japan"},
    "cac40": {"symbol": "^cac", "label": "CAC 40", "region": "Francuska"},
}


def refresh_market_indices(now: str) -> int:
    """Refresh market_indices.json + fast_market_status.json via Stooq CSV.

    Uses Stooq instead of Yahoo Finance (the prior apps/legacy-portal script's
    source), which is unauthenticated and reliably reachable from GitHub
    Actions runners -- the same source already proven working in the
    Cloudflare Worker's /api/public-world-markets endpoint.
    """
    codes = ",".join(meta["symbol"] for meta in INDEXES.values())
    url = f"https://stooq.com/q/l/?s={codes}&f=sd2t2ohlc&h&e=csv"
    indices: list[dict] = []
    errors: list[dict] = []
    try:
        raw = get(url).decode("utf-8", errors="replace")
        lines = [line for line in raw.strip().splitlines() if line]
        rows = {}
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
            change_percent = round(((close_price / open_price) - 1) * 100, 2)
            indices.append({
                "id": key,
                "symbol": meta["symbol"],
                "label": meta["label"],
                "region": meta["region"],
                "current": close_price,
                "previous_close": open_price,
                "change_percent": change_percent,
                "as_of": cols[1] if len(cols) > 1 else None,
            })
    except Exception as exc:
        errors.append({"id": "all", "error": str(exc)[:150]})

    (DATA / "market_indices.json").write_text(
        json.dumps(
            {
                "updated_at": now,
                "cadence": "scheduled every fifteen minutes",
                "source": "Stooq public market quote feed",
                "indices": indices,
                "errors": errors,
                "notice": "Informativni prikaz posljednjih dostupnih vrijednosti; podatci mogu biti odgođeni.",
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    status = {
        "updated_at": now,
        "cadence": "scheduled every fifteen minutes",
        "status": "ok" if indices and not errors else ("partial" if indices else "degraded"),
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
    payload = {"updated_at": now, "cadence": "scheduled every fifteen minutes", "source": "CoinGecko public market data", "status": "ok", "coins": coins}
    (DATA / "market.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def parse_feed(source: str, group: str, category: str, url: str) -> list[dict]:
    root = ET.fromstring(get(url))
    entries = root.findall(".//item") or root.findall("{http://www.w3.org/2005/Atom}entry")
    output = []
    for entry in entries[:80]:
        title = clean(text(entry, "title", "{http://www.w3.org/2005/Atom}title"))
        link = text(entry, "link")
        if not link:
            atom_link = entry.find("{http://www.w3.org/2005/Atom}link")
            link = atom_link.get("href", "") if atom_link is not None else ""
        summary = clean(text(entry, "description", "summary", "{http://www.w3.org/2005/Atom}summary", "{http://purl.org/rss/1.0/modules/content/}encoded"))
        published = text(entry, "pubDate", "published", "updated", "{http://www.w3.org/2005/Atom}published", "{http://www.w3.org/2005/Atom}updated")
        if not title or not link:
            continue
        item_id = hashlib.sha256(link.encode("utf-8")).hexdigest()[:18]
        output.append({
            "id": item_id,
            "title": title,
            "url": link,
            "summary": summary[:420],
            "source": source,
            "region": source,
            "group": group,
            "category": category,
            "published_at": iso_date(published),
            "share_url": f"/podijeli/vijest/{item_id}/",
        })
    return output


def refresh_news() -> None:
    current_path = DATA / "news.json"
    archive_path = DATA / "news_archive.json"
    current = json.loads(current_path.read_text(encoding="utf-8")) if current_path.exists() else []
    archived = json.loads(archive_path.read_text(encoding="utf-8")) if archive_path.exists() else []
    if not isinstance(current, list) or not isinstance(archived, list):
        raise RuntimeError("News and archive payloads must be lists")
    fetched: list[dict] = []
    errors = []
    for source, group, category, url in RSS:
        try:
            fetched.extend(parse_feed(source, group, category, url))
        except Exception as exc:
            errors.append(f"{source}: {exc}")
    if not fetched:
        raise RuntimeError("All configured news feeds failed: " + "; ".join(errors))
    by_url = {item.get("url"): item for item in current + archived if item.get("url")}
    for item in fetched:
        by_url[item["url"]] = item
    merged = sorted(by_url.values(), key=lambda item: item.get("published_at", ""), reverse=True)
    public = merged[:PUBLIC_LIMIT]
    archive = merged[PUBLIC_LIMIT:]
    pruned = 0
    while len(archive) > ARCHIVE_TRIGGER:
        delete_count = min(ARCHIVE_DELETE_OLDEST, len(archive))
        archive = archive[:-delete_count]
        pruned += delete_count
    current_path.write_text(json.dumps(public, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    archive_path.write_text(json.dumps(archive, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    status = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "items": len(public),
        "archive_items": len(archive),
        "max_public_items": PUBLIC_LIMIT,
        "archive_prune_trigger": ARCHIVE_TRIGGER,
        "archive_delete_oldest_batch": ARCHIVE_DELETE_OLDEST,
        "pruned_items": pruned,
        "sources_ok": len(RSS) - len(errors),
        "sources_total": len(RSS),
        "errors": errors,
    }
    (DATA / "news-status.json").write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    DATA.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()
    refresh_market(now)
    refresh_market_indices(now)
    refresh_news()
    market = json.loads((DATA / "market.json").read_text(encoding="utf-8"))
    news = json.loads((DATA / "news.json").read_text(encoding="utf-8"))
    if market.get("updated_at") != now or len(market.get("coins", [])) != 4 or not news:
        raise SystemExit("Index live-data validation failed")
    print(json.dumps({"ok": True, "market_updated_at": now, "news_items": len(news)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
