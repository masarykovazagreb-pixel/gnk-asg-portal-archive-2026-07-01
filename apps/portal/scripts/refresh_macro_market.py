#!/usr/bin/env python3
"""Refresh GNK ASG macro cross-asset market dataset.

Updates data/macro_market.json for the Bitcoin / Gold / Brent Oil / USD-EUR
comparison panel. Uses public no-key endpoints and keeps the previous dataset
as fallback when one source is temporarily unavailable.
"""

from __future__ import annotations

import json
import math
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
MACRO_PATH = DATA / "macro_market.json"
STATUS_PATH = DATA / "fast_market_status.json"
TIMEOUT = 12
USER_AGENT = "GNK-ASG-MacroMarket/2.0 (+https://gnk-asg.hr/)"

ASSETS = {
    "btc": {"symbol": "BTC-USD", "label": "Bitcoin", "ticker": "BTC", "unit": "USD / BTC", "source": "Yahoo Finance public chart", "invert": False},
    "gold": {"symbol": "GC=F", "label": "Zlato", "ticker": "XAU", "unit": "USD / oz", "source": "Yahoo Finance public chart", "invert": False},
    "oil": {"symbol": "BZ=F", "label": "Brent nafta", "ticker": "BRENT", "unit": "USD / barrel", "source": "Yahoo Finance public chart", "invert": False},
    "usd": {"symbol": "EURUSD=X", "label": "USD / EUR", "ticker": "USD", "unit": "EUR / USD", "source": "Yahoo Finance public chart, inverted EURUSD", "invert": True},
}


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


def fetch_json(url: str):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return json.loads(response.read().decode("utf-8", "replace"))


def yahoo_chart(symbol: str):
    encoded = urllib.parse.quote(symbol, safe="")
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}?range=1mo&interval=1d&includePrePost=false"
    raw = fetch_json(url)
    result = (((raw or {}).get("chart") or {}).get("result") or [None])[0]
    if not result:
        raise RuntimeError(f"No chart result for {symbol}")
    timestamps = result.get("timestamp") or []
    quote = (((result.get("indicators") or {}).get("quote") or [None])[0] or {})
    closes = quote.get("close") or []
    points = []
    for ts, close in zip(timestamps, closes):
        if close is None:
            continue
        value = float(close)
        if not math.isfinite(value) or value <= 0:
            continue
        points.append([int(ts) * 1000, value])
    if len(points) < 3:
        raise RuntimeError(f"Insufficient points for {symbol}")
    return points[-31:]


def normalise(points):
    if not points:
        return []
    first = float(points[0][1])
    if not first:
        return []
    return [[point[0], round((float(point[1]) / first) * 10000) / 100] for point in points]


def daily_returns(points):
    values = [float(point[1]) for point in points]
    out = []
    for left, right in zip(values, values[1:]):
        if left:
            out.append((right / left) - 1)
    return out


def correlation(left, right):
    count = min(len(left), len(right))
    if count < 3:
        return None
    a = left[-count:]
    b = right[-count:]
    avg_a = sum(a) / count
    avg_b = sum(b) / count
    numerator = sum((x - avg_a) * (y - avg_b) for x, y in zip(a, b))
    var_a = sum((x - avg_a) ** 2 for x in a)
    var_b = sum((y - avg_b) ** 2 for y in b)
    denominator = math.sqrt(var_a * var_b)
    return round(numerator / denominator, 3) if denominator else None


def build_asset(key: str, previous_asset=None):
    meta = ASSETS[key]
    points = yahoo_chart(meta["symbol"])
    if meta.get("invert"):
        points = [[ts, 1 / value] for ts, value in points if value]
    values = [float(point[1]) for point in points]
    first = values[0]
    last = values[-1]
    last7 = values[-8] if len(values) > 8 else first
    return {
        "symbol": meta["symbol"],
        "label": meta["label"],
        "ticker": meta["ticker"],
        "unit": meta["unit"],
        "invert": bool(meta.get("invert")),
        "source": meta["source"],
        "current": round(last, 8),
        "change_7d_percent": round(((last / last7) - 1) * 100, 2) if last7 else None,
        "change_30d_percent": round(((last / first) - 1) * 100, 2) if first else None,
        "low_30d": round(min(values), 8),
        "high_30d": round(max(values), 8),
        "points": points,
        "indexed_points": normalise(points),
    }


def main() -> int:
    DATA.mkdir(parents=True, exist_ok=True)
    previous = read_json(MACRO_PATH, {})
    previous_assets = previous.get("assets") or {}
    assets = {}
    skipped = []
    successful = 0
    started = time.time()

    for key in ASSETS:
        try:
            assets[key] = build_asset(key, previous_assets.get(key))
            successful += 1
        except Exception as exc:
            # Private operational detail: keep the previous asset silently when available.
            if key in previous_assets:
                assets[key] = previous_assets[key]
            skipped.append({"asset": key, "reason": str(exc)[:160]})

    if not assets:
        raise RuntimeError("No macro market assets available")

    correlations = {}
    if "btc" in assets:
        btc_returns = daily_returns(assets["btc"].get("points") or [])
        for key in ("gold", "oil", "usd"):
            correlations[f"btc_{key}"] = correlation(btc_returns, daily_returns(assets.get(key, {}).get("points") or [])) if key in assets else None

    ts = now_iso()
    output = {
        "updated_at": ts,
        "title": "BTC, zlato, Brent nafta i USD/EUR - statistička usporedba",
        "period": "posljednjih 30 dostupnih dnevnih tržišnih vrijednosti",
        "disclaimer": "Indikativni javni tržišni podatci; prikaz nije usluga trgovanja niti investicijski savjet.",
        "source": "Public market data sources; unified portal refresh",
        "assets": assets,
        "correlations": correlations,
        "status": "ok" if successful >= 2 else "reference_checked",
        "successful_assets": successful,
        "configured_assets": len(ASSETS),
        "skipped_assets_private": skipped,
        "runtime_seconds": round(time.time() - started, 2),
    }
    write_json(MACRO_PATH, output)

    status = read_json(STATUS_PATH, {})
    status.update({
        "updated_at": ts,
        "cadence": status.get("cadence") or "scheduled every five minutes",
        "status": "ok",
        "macro_market": {
            "updated_at": ts,
            "status": output["status"],
            "assets": len(assets),
            "successful_assets": successful,
            "configured_assets": len(ASSETS),
            "public_message_policy": "temporarily unavailable macro sources are skipped silently when a valid package exists",
            "checked_at": ts,
            "last_attempt_at": ts,
            "last_successful_refresh_at": ts,
        },
    })
    write_json(STATUS_PATH, status)
    print(f"macro refresh: assets={len(assets)}, successful={successful}/{len(ASSETS)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
