#!/usr/bin/env python3
"""Refresh stock-exchange references and the informational ASG gold-linked profile.

The output is informational only. The script records a current automated check
on every run while preserving the latest successful market value if a public
source is temporarily unavailable. It does not represent an offer, trading
service, price guarantee or issuance of a regulated crypto-asset.
"""
from __future__ import annotations

import datetime as dt
import json
import math
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
NOW = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
UA = "GNK-ASG-Reference-Assets/1.0"
TROY_OZ_PER_KG = 32.1507465686
KG_PER_ASG = 0.01


def load(name: str, default):
    try:
        return json.loads((DATA / name).read_text(encoding="utf-8"))
    except Exception:
        return default


def save(name: str, payload) -> None:
    (DATA / name).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def fetch_json(url: str):
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(request, timeout=25) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as exc:
            last_error = exc
            if attempt < 2:
                time.sleep(attempt + 1)
    raise last_error or RuntimeError("Javni tržišni izvor nije dostupan")


def yahoo_series(symbol: str, days: str = "1mo", interval: str = "1d") -> dict:
    encoded = urllib.parse.quote(symbol, safe="")
    last_error: Exception | None = None
    for host in ("query1.finance.yahoo.com", "query2.finance.yahoo.com"):
        try:
            url = f"https://{host}/v8/finance/chart/{encoded}?range={days}&interval={interval}&includePrePost=false&events=history"
            payload = fetch_json(url)
            result = (payload.get("chart", {}).get("result") or [None])[0] or {}
            meta = result.get("meta", {})
            stamps = result.get("timestamp", [])
            closes = ((result.get("indicators", {}).get("quote", [{}])[0] or {}).get("close", []))
            points = [[int(stamp) * 1000, round(float(close), 8)] for stamp, close in zip(stamps, closes) if close is not None and math.isfinite(float(close))]
            if not points:
                raise ValueError("Nema dostupnih tržišnih vrijednosti")
            first, latest = float(points[0][1]), float(points[-1][1])
            return {
                "value": round(latest, 2),
                "change_percent": round(((latest / first) - 1) * 100, 2) if first else None,
                "points": points[-31:],
                "currency": meta.get("currency") or "USD",
                "source_timestamp": dt.datetime.fromtimestamp(points[-1][0] / 1000, tz=dt.timezone.utc).replace(microsecond=0).isoformat(),
            }
        except Exception as exc:
            last_error = exc
    raise last_error or RuntimeError("Javni tržišni izvor nije dostupan")


def base_croatian_market(market_id: str, name: str, symbol: str, official_url: str, delay_hr: str, delay_en: str) -> dict:
    return {
        "id": market_id,
        "exchange": "Zagrebačka burza",
        "name": name,
        "symbol": symbol,
        "region_hr": "Hrvatska",
        "region_en": "Croatia",
        "status": "official_online",
        "delay_hr": delay_hr,
        "delay_en": delay_en,
        "official_url": official_url,
        "value": None,
        "change_percent": None,
        "points": [],
        "checked_at": NOW,
    }


def international_market(previous: dict, market_id: str, exchange: str, name: str, symbol: str, official_url: str) -> tuple[dict, dict | None]:
    row = {
        "id": market_id,
        "exchange": exchange,
        "name": name,
        "symbol": symbol,
        "region_hr": "SAD",
        "region_en": "USA",
        "status": "public_market_feed",
        "delay_hr": "Javni informativni indeksni podatak; vrijednost može biti odgođena",
        "delay_en": "Public informational index data; value may be delayed",
        "official_url": official_url,
        "checked_at": NOW,
    }
    try:
        refreshed = yahoo_series(symbol)
        row.update(refreshed)
        row["last_successful_refresh_at"] = NOW
        return row, None
    except Exception as exc:
        row.update({key: previous.get(key) for key in ("value", "change_percent", "points", "currency", "source_timestamp", "last_successful_refresh_at") if key in previous})
        row["status"] = "public_market_feed_stale"
        row["refresh_error"] = str(exc)[:120]
        return row, {"market": market_id, "error": str(exc)[:120]}


def update_stock_exchanges() -> tuple[dict, list[dict]]:
    previous_payload = load("stock_exchanges.json", {})
    previous_rows = {row.get("id"): row for row in previous_payload.get("markets", []) if isinstance(row, dict)}
    errors: list[dict] = []
    markets = [
        base_croatian_market("crobex", "CROBEX", "CBX", "https://zse.hr/hr/indeks/365?isin=HRZB00ICBEX6&tab=stock_info", "Službeni ZSE prikaz · odgoda 15 min", "Official ZSE display · 15 min delay"),
        base_croatian_market("crobex10", "CROBEX10", "CROBEX10", "https://zse.hr/hr/burzovni-indeksi/38", "Službeni ZSE online prikaz", "Official ZSE online display"),
    ]
    for args in (
        ("nyse", "New York Stock Exchange", "NYSE Composite", "^NYA", "https://www.nyse.com/quote/index/NYA"),
        ("nasdaq", "Nasdaq", "Nasdaq Composite", "^IXIC", "https://www.nasdaq.com/market-activity/index/comp"),
    ):
        row, error = international_market(previous_rows.get(args[0], {}), *args)
        markets.append(row)
        if error:
            errors.append(error)
    payload = {
        "checked_at": NOW,
        "updated_at": NOW,
        "status": "ok" if not errors else "partial",
        "refresh_frequency": "Automated reference check on the five-minute market cycle",
        "refresh_frequency_hr": "Automatska provjera u petominutnom tržišnom ciklusu",
        "refresh_frequency_en": "Automated check in the five-minute market cycle",
        "disclaimer_hr": "Informativni burzovni prikaz. Podatci mogu biti vremenski odgođeni; prije financijske odluke provjerite službeni izvor burze.",
        "disclaimer_en": "Informational stock-market display. Data may be delayed; verify the exchange official source before any financial decision.",
        "markets": markets,
        "errors": errors,
        "automated_sources": {
            "nyse": "Public market chart feed; verify at NYSE official source",
            "nasdaq": "Public market chart feed; verify at Nasdaq official source",
            "crobex": "Official ZSE link only",
            "crobex10": "Official ZSE link only",
        },
    }
    save("stock_exchanges.json", payload)
    return payload, errors


def update_asg_gold() -> tuple[dict, list[dict]]:
    previous = load("asg_gold_asset.json", {})
    errors: list[dict] = []
    payload = {
        **previous,
        "checked_at": NOW,
        "id": "asg-gold-reference",
        "name": "ASG Stable Coin",
        "ticker": "ASG",
        "issuer": "GNK DINAMO Ltd.",
        "status_hr": "Pre-launch informativni prikaz",
        "status_en": "Pre-launch informational display",
        "total_supply": int(previous.get("total_supply", 10000000)),
        "reference_rule_hr": "100 ASG = 1 kg zlata",
        "reference_rule_en": "100 ASG = 1 kg of gold",
        "formula_hr": "1 ASG = vrijednost 0,01 kg zlata",
        "formula_en": "1 ASG = value of 0.01 kg of gold",
        "legal_note_hr": "Informativni koncept vrijednosti vezan uz zlato. Nije javna ponuda, prospekt, bijela knjiga kriptoimovine, investicijski savjet niti potvrda izdavanja reguliranog stablecoina.",
        "legal_note_en": "Informational gold-linked value concept. Not a public offer, prospectus, crypto-asset white paper, investment advice or confirmation of issuance of a regulated stablecoin.",
        "visual_theme": "gold-corporate",
        "gold_kg_per_asg": KG_PER_ASG,
    }
    try:
        gold = yahoo_series("GC=F")
        eurusd = yahoo_series("EURUSD=X")
        gold_usd_per_kg = float(gold["value"]) * TROY_OZ_PER_KG
        asg_usd = gold_usd_per_kg * KG_PER_ASG
        eur_per_usd = 1 / float(eurusd["value"])
        asg_eur = asg_usd * eur_per_usd
        payload.update({
            "updated_at": NOW,
            "status": "ok",
            "current_value_usd": round(asg_usd, 2),
            "current_value_eur": round(asg_eur, 2),
            "gold_reference_usd_per_kg": round(gold_usd_per_kg, 2),
            "change_30d_percent": gold.get("change_percent"),
            "reference_supply_value_usd": round(asg_usd * payload["total_supply"], 2),
            "price_source": "Public gold futures reference and EUR/USD market quote feed; verify at official market source",
            "source_timestamp": gold.get("source_timestamp"),
            "last_successful_refresh_at": NOW,
        })
        payload.pop("refresh_error", None)
    except Exception as exc:
        errors.append({"asset": "asg_gold_reference", "error": str(exc)[:120]})
        payload["status"] = "partial"
        payload["refresh_error"] = str(exc)[:120]
    save("asg_gold_asset.json", payload)
    return payload, errors


def main() -> None:
    stocks, stock_errors = update_stock_exchanges()
    asg, asg_errors = update_asg_gold()
    errors = stock_errors + asg_errors
    status = {
        "checked_at": NOW,
        "status": "ok" if not errors else "partial",
        "markets": len(stocks.get("markets", [])),
        "asg_gold_status": asg.get("status", "partial"),
        "errors": errors,
    }
    save("reference_assets_status.json", status)
    print(json.dumps(status, ensure_ascii=False))


if __name__ == "__main__":
    main()
