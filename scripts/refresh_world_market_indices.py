#!/usr/bin/env python3
from __future__ import annotations

import csv
import io
import json
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "apps/portal/data"
UA = {"User-Agent": "GNK-ASG-Public-Data-Refresh/1.0"}

INDEXES = {
    "sp500": {"symbol": "^spx", "label": "S&P 500", "region": "SAD"},
    "nasdaq": {"symbol": "^ndq", "label": "Nasdaq Composite", "region": "SAD"},
    "dax": {"symbol": "^dax", "label": "DAX", "region": "Njemačka"},
    "ftse": {"symbol": "^ftse", "label": "FTSE 100", "region": "UK"},
    "nikkei": {"symbol": "^n225", "label": "Nikkei 225", "region": "Japan"},
    "cac40": {"symbol": "^cac", "label": "CAC 40", "region": "Francuska"},
}


def get_quote(symbol: str) -> list[str]:
    # Stooq's quote endpoint is reliable for one symbol per request; the
    # multi-symbol `s=` form can return HTTP 404 and must not be used here.
    query = urllib.parse.urlencode({"s": symbol, "f": "sd2t2ohlc", "h": "", "e": "csv"})
    request = urllib.request.Request(f"https://stooq.com/q/l/?{query}", headers=UA)
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read().decode("utf-8", errors="replace")
    rows = list(csv.reader(io.StringIO(raw)))
    if len(rows) < 2:
        raise RuntimeError("missing quote row")
    row = rows[1]
    if len(row) < 7 or row[0].strip().lower() != symbol.lower():
        raise RuntimeError("invalid quote row")
    return row


def main() -> int:
    DATA.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()
    indices: list[dict] = []
    errors: list[dict] = []

    for key, meta in INDEXES.items():
        try:
            row = get_quote(meta["symbol"])
            session_open = float(row[3])
            close_price = float(row[6])
            if session_open <= 0 or close_price <= 0:
                raise ValueError("non-positive market value")
            indices.append(
                {
                    "id": key,
                    "symbol": meta["symbol"],
                    "label": meta["label"],
                    "region": meta["region"],
                    "current": close_price,
                    # Kept for compatibility with the portal contract. The
                    # Stooq quote feed exposes session open, not prior-day
                    # close, in this field set.
                    "previous_close": session_open,
                    "change_percent": round(((close_price / session_open) - 1) * 100, 2),
                    "as_of": row[1] if len(row) > 1 else None,
                }
            )
        except Exception as exc:
            errors.append({"id": key, "error": f"{type(exc).__name__}: {str(exc)[:120]}"})
        time.sleep(0.15)

    payload = {
        "updated_at": now,
        "cadence": "scheduled every fifteen minutes",
        "source": "Stooq public market quote feed (single-symbol requests)",
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
