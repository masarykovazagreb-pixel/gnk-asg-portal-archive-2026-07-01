#!/usr/bin/env python3
"""Generira automatski GNK ASG Market Intelligence pregled.

Prikuplja javno dostupne indikativne tržišne vremenske serije za burzovne
indekse, valute, plemenite metale, energiju, poljoprivredne robe i digitalnu
imovinu. Izračunava relativne promjene, volatilnost, korelacije i automatske
opisne zaključke. Nije investicijski savjet.
"""
from __future__ import annotations

import datetime as dt
import json
import math
import statistics
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
CONFIG = DATA / "intelligence_assets.json"
NOW = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
UA = "GNK-ASG-Market-Intelligence/1.0"


def load_json(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def save_json(path: Path, payload) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=35) as response:
        return json.loads(response.read().decode("utf-8"))


def quote_series(symbol: str, invert: bool = False) -> list[list[float]]:
    encoded = urllib.parse.quote(symbol, safe="")
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}?range=3mo&interval=1d&includePrePost=false&events=history"
    payload = fetch_json(url)
    result = (payload.get("chart", {}).get("result") or [{}])[0]
    stamps = result.get("timestamp", [])
    closes = (((result.get("indicators", {}).get("quote") or [{}])[0]).get("close") or [])
    points = []
    for stamp, close in zip(stamps, closes):
        if close is None:
            continue
        value = float(close)
        if not math.isfinite(value) or value == 0:
            continue
        if invert:
            value = 1 / value
        points.append([int(stamp) * 1000, round(value, 8)])
    return points[-65:]


def pct_change(points: list[list[float]], sessions: int) -> float | None:
    if len(points) < 2:
        return None
    base_index = max(0, len(points) - sessions - 1)
    base, last = points[base_index][1], points[-1][1]
    return round((last / base - 1) * 100, 2) if base else None


def daily_returns(points: list[list[float]]) -> list[float]:
    return [(points[i][1] / points[i - 1][1]) - 1 for i in range(1, len(points)) if points[i - 1][1]]


def annualised_volatility(points: list[list[float]]) -> float | None:
    values = daily_returns(points[-31:])
    return round(statistics.stdev(values) * math.sqrt(252) * 100, 2) if len(values) >= 3 else None


def indexed(points: list[list[float]], sessions: int = 30) -> list[list[float]]:
    rows = points[-(sessions + 1):]
    if not rows or not rows[0][1]:
        return []
    base = rows[0][1]
    return [[row[0], round(row[1] / base * 100, 4)] for row in rows]


def corr(left: list[float], right: list[float]) -> float | None:
    count = min(len(left), len(right), 30)
    if count < 4:
        return None
    a, b = left[-count:], right[-count:]
    mean_a, mean_b = sum(a) / count, sum(b) / count
    top = sum((x - mean_a) * (y - mean_b) for x, y in zip(a, b))
    bot = math.sqrt(sum((x - mean_a) ** 2 for x in a) * sum((y - mean_b) ** 2 for y in b))
    return round(top / bot, 3) if bot else None


def signed(value: float | None) -> str:
    return "n/d" if value is None else ("+" if value >= 0 else "") + f"{value:.2f}%"


def trend_text(asset: dict) -> str:
    change = asset.get("change_30d_percent")
    if change is None:
        return "Za ovu imovinu nema dovoljno podataka za opis trenda."
    if change >= 8:
        tone = "snažan rast"
    elif change >= 2:
        tone = "umjeren rast"
    elif change <= -8:
        tone = "snažan pad"
    elif change <= -2:
        tone = "umjeren pad"
    else:
        tone = "relativno stabilno kretanje"
    return f"{asset['label']} bilježi {tone} u promatranom razdoblju ({signed(change)} kroz približno 30 trgovinskih dana)."


def category_conclusion(category: dict, assets: list[dict]) -> str:
    usable = [a for a in assets if a.get("change_30d_percent") is not None]
    if not usable:
        return "Nema dovoljno dostupnih podataka za automatski zaključak ove skupine."
    leader = max(usable, key=lambda a: a["change_30d_percent"])
    weakest = min(usable, key=lambda a: a["change_30d_percent"])
    return f"U skupini {category['label']} najveći 30-dnevni pomak bilježi {leader['label']} ({signed(leader['change_30d_percent'])}), dok je najslabije kretanje zabilježeno kod {weakest['label']} ({signed(weakest['change_30d_percent'])})."


def main() -> None:
    config = load_json(CONFIG, {"categories": []})
    output = {
        "updated_at": NOW.isoformat(),
        "title": "GNK ASG Global Market Intelligence",
        "period": "do 30 i 60 posljednjih dostupnih trgovinskih sesija",
        "notice": config.get("notice", "Informativni tržišni prikaz."),
        "categories": [],
        "cross_asset": {},
        "automated_analysis": [],
        "errors": []
    }
    flat = {}
    returns = {}
    for category in config.get("categories", []):
        category_row = {"id": category["id"], "label": category["label"], "assets": [], "analysis": ""}
        for asset in category.get("assets", []):
            try:
                points = quote_series(asset["symbol"], bool(asset.get("invert", False)))
                if not points:
                    raise ValueError("Nema dostupnih vrijednosti")
                values = [point[1] for point in points]
                row = {
                    **asset,
                    "current": values[-1],
                    "change_7d_percent": pct_change(points, 7),
                    "change_30d_percent": pct_change(points, 30),
                    "change_60d_percent": pct_change(points, 60),
                    "volatility_annualised_percent": annualised_volatility(points),
                    "low_30d": min(values[-31:]),
                    "high_30d": max(values[-31:]),
                    "points": points[-31:],
                    "indexed_points": indexed(points, 30),
                    "automatic_comment": ""
                }
                row["automatic_comment"] = trend_text(row)
                category_row["assets"].append(row)
                flat[asset["id"]] = row
                returns[asset["id"]] = daily_returns(points[-31:])
            except Exception as exc:
                output["errors"].append({"asset": asset.get("id", "unknown"), "error": str(exc)[:130]})
        category_row["analysis"] = category_conclusion(category, category_row["assets"])
        output["categories"].append(category_row)
    base = "btc"
    related = ["gold", "brent", "usd_eur", "sp500", "nasdaq", "wheat"]
    for item in related:
        if base in returns and item in returns:
            output["cross_asset"][f"{base}_{item}"] = {
                "label": f"Bitcoin / {flat[item]['label']}",
                "correlation_30d": corr(returns[base], returns[item]),
                "notice": "Korelacija dnevnih promjena; ne dokazuje uzročnost."
            }
    available = list(flat.values())
    gainers = sorted([a for a in available if a.get("change_30d_percent") is not None], key=lambda a: a["change_30d_percent"], reverse=True)
    if gainers:
        output["automated_analysis"].append(f"Najveći rast u praćenoj košarici bilježi {gainers[0]['label']} ({signed(gainers[0]['change_30d_percent'])}), dok najveći pad bilježi {gainers[-1]['label']} ({signed(gainers[-1]['change_30d_percent'])}).")
    volatile = sorted([a for a in available if a.get("volatility_annualised_percent") is not None], key=lambda a: a["volatility_annualised_percent"], reverse=True)
    if volatile:
        output["automated_analysis"].append(f"Najvišu procijenjenu godišnju volatilnost u zadnjih približno 30 sesija iskazuje {volatile[0]['label']} ({volatile[0]['volatility_annualised_percent']:.2f}%).")
    output["automated_analysis"].append("Automatski zaključci temelje se isključivo na numeričkom kretanju cijena i ne predstavljaju procjenu budućih rezultata niti preporuku za ulaganje.")
    save_json(DATA / "market_intelligence.json", output)
    print(json.dumps({"updated_at": output["updated_at"], "categories": len(output["categories"]), "assets": len(flat), "errors": output["errors"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
