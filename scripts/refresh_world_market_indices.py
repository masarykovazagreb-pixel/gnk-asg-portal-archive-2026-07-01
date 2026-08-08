#!/usr/bin/env python3
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "apps/portal/data"
UA = {
    "User-Agent": "Mozilla/5.0 (compatible; GNK-ASG-Public-Data-Refresh/1.0; +https://gnk-asg.hr/)"
}

INDEXES = {
    "sp500": {"symbol": "^GSPC", "label": "S&P 500", "region": "SAD"},
    "nasdaq": {"symbol": "^IXIC", "label": "Nasdaq Composite", "region": "SAD"},
    "dax": {"symbol": "^GDAXI", "label": "DAX", "region": "Njemačka"},
    "ftse": {"symbol": "^FTSE", "label": "FTSE 100", "region": "UK"},
    "nikkei": {"symbol": "^N225", "label": "Nikkei 225", "region": "Japan"},
    "cac40": {"symbol": "^FCHI", "label": "CAC 40", "region": "Francuska"},
}


def get_quote(symbol: str) -> dict:
    encoded = urllib.parse.quote(symbol, safe="")
    last_error: Exception | None = None
    for host in ("query1.finance.yahoo.com", "query2.finance.yahoo.com"):
        url = (
            f"https://{host}/v8/finance/chart/{encoded}"
            "?range=5d&interval=1d&includePrePost=false&events=div%2Csplits"
        )
        try:
            request = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.loads(response.read())
            chart = payload.get("chart") or {}
            if chart.get("error"):
                raise RuntimeError(str(chart["error"])[:120])
            results = chart.get("result") or []
            if not results:
                raise RuntimeError("missing chart result")
            meta = results[0].get("meta") or {}
            current = meta.get("regularMarketPrice")
            previous = meta.get("chartPreviousClose") or meta.get("previousClose")
            if not isinstance(current, (int, float)) or not isinstance(previous, (int, float)):
                raise RuntimeError("missing current/previous-close values")
            if current <= 0 or previous <= 0:
                raise RuntimeError("non-positive market value")
            return {
                "current": float(current),
                "previous_close": float(previous),
                "market_time": meta.get("regularMarketTime"),
                "exchange": meta.get("exchangeName") or meta.get("fullExchangeName"),
            }
        except Exception as exc:
            last_error = exc
    raise RuntimeError(f"Yahoo chart endpoints failed: {type(last_error).__name__}: {str(last_error)[:100]}")


def main() -> int:
    # P0 invariant: publish success only when all six canonical world indices resolve.
    DATA.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()
    indices: list[dict] = []
    errors: list[dict] = []

    for key, meta in INDEXES.items():
        try:
            quote = get_quote(meta["symbol"])
            current = quote["current"]
            previous = quote["previous_close"]
            market_time = quote.get("market_time")
            as_of = (
                datetime.fromtimestamp(market_time, tz=timezone.utc).isoformat()
                if isinstance(market_time, (int, float))
                else now
            )
            indices.append(
                {
                    "id": key,
                    "symbol": meta["symbol"],
                    "label": meta["label"],
                    "region": meta["region"],
                    "current": current,
                    "previous_close": previous,
                    "change_percent": round(((current / previous) - 1) * 100, 2),
                    "as_of": as_of,
                    "exchange": quote.get("exchange"),
                }
            )
        except Exception as exc:
            errors.append({"id": key, "error": f"{type(exc).__name__}: {str(exc)[:120]}"})
        time.sleep(0.15)

    payload = {
        "updated_at": now,
        "cadence": "scheduled every fifteen minutes",
        "source": "Yahoo Finance public chart feed",
        "indices": indices,
        "errors": errors,
        "notice": "Informativni prikaz posljednjih dostupnih vrijednosti; podatci mogu biti odgođeni.",
    }
    (DATA / "market_indices.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    healthy = len(indices) == len(INDEXES) and not errors
    status = {
        "updated_at": now,
        "cadence": "scheduled every fifteen minutes",
        "status": "ok" if healthy else ("partial" if indices else "degraded"),
        "indices": len(indices),
        "errors": errors,
        "source": "Yahoo Finance public chart feed",
    }
    (DATA / "fast_market_status.json").write_text(
        json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    if not healthy:
        raise SystemExit(
            f"World-market refresh failed closed: {len(indices)}/{len(INDEXES)} indices; errors={errors}"
        )
    print(json.dumps({"ok": True, "indices": len(indices), "updated_at": now}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
