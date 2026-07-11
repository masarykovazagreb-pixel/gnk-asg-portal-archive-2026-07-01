#!/usr/bin/env python3
"""Update public market intelligence datasets on a five-minute cadence.

Outputs are informational market observations only. They do not represent an
exchange service, issuance, stablecoin offering, investment advice or a price
guarantee by GNK ASG d.o.o. or GNK DINAMO Ltd.

A temporary external-feed failure is disclosed as a partial refresh instead of
blocking publication and leaving an obsolete public timestamp visible.
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
UA = "GNK-ASG-Market-Intelligence/3.2"
FIATS = ["eur", "usd", "gbp", "chf", "jpy"]
COINS = {"bitcoin":"BTC","ethereum":"ETH","solana":"SOL","ripple":"XRP","binancecoin":"BNB","cardano":"ADA","chainlink":"LINK","avalanche-2":"AVAX","tether":"USDT","usd-coin":"USDC","dai":"DAI","euro-coin":"EURC"}
STABLECOINS = {"tether":{"symbol":"USDT","peg":"usd","issuer":"Tether"},"usd-coin":{"symbol":"USDC","peg":"usd","issuer":"Circle"},"dai":{"symbol":"DAI","peg":"usd","issuer":"Sky ecosystem"},"first-digital-usd":{"symbol":"FDUSD","peg":"usd","issuer":"First Digital"},"paypal-usd":{"symbol":"PYUSD","peg":"usd","issuer":"Paxos / PayPal"},"euro-coin":{"symbol":"EURC","peg":"eur","issuer":"Circle"}}
INDEXES = {"sp500":{"symbol":"^GSPC","label":"S&P 500","region":"SAD"},"nasdaq":{"symbol":"^IXIC","label":"Nasdaq Composite","region":"SAD"},"stoxx50":{"symbol":"^STOXX50E","label":"EURO STOXX 50","region":"Europa"},"dax":{"symbol":"^GDAXI","label":"DAX","region":"Njemačka"},"ftse":{"symbol":"^FTSE","label":"FTSE 100","region":"UK"},"nikkei":{"symbol":"^N225","label":"Nikkei 225","region":"Japan"}}
PREFERRED_EXCHANGES = {"Binance","Coinbase Exchange","Kraken","OKX","Bitstamp","Crypto.com Exchange","Bybit"}
def fetch_json(url: str):
    last_error = None
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as exc:
            last_error = exc
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
    raise last_error
def save(name: str, payload) -> None:
    (DATA / name).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
def simple_prices(ids: list[str]) -> dict:
    query = urllib.parse.urlencode({"ids": ",".join(ids), "vs_currencies": ",".join(FIATS), "include_market_cap": "true", "include_24hr_vol": "true", "include_24hr_change": "true", "include_last_updated_at": "true"})
    return fetch_json("https://api.coingecko.com/api/v3/simple/price?" + query)
def update_coins_and_stablecoins() -> dict:
    raw = simple_prices(list(dict.fromkeys([*COINS.keys(), *STABLECOINS.keys()])))
    coins = [{"id": coin_id, "symbol": symbol, "prices": {currency: raw[coin_id].get(currency) for currency in FIATS}, "changes_24h": {currency: raw[coin_id].get(currency + "_24h_change") for currency in FIATS}, "market_cap_usd": raw[coin_id].get("usd_market_cap"), "volume_24h_usd": raw[coin_id].get("usd_24h_vol"), "last_updated_at": raw[coin_id].get("last_updated_at")} for coin_id, symbol in COINS.items() if coin_id in raw]
    save("market.json", {"updated_at": NOW, "cadence": "scheduled every five minutes", "source": "CoinGecko public market data", "status": "ok", "coins": coins, "disclaimer": "Informativni tržišni prikaz; nije usluga trgovanja niti investicijski savjet."})
    stable = []
    for coin_id, meta in STABLECOINS.items():
        item = raw.get(coin_id)
        if not item or item.get(meta["peg"]) is None:
            continue
        price = float(item[meta["peg"]]); deviation = round((price - 1.0) * 100, 4)
        stable.append({"id": coin_id, **meta, "price_peg_currency": price, "price_usd": item.get("usd"), "price_eur": item.get("eur"), "deviation_percent": deviation, "abs_deviation_percent": abs(deviation), "change_24h_percent": item.get(meta["peg"] + "_24h_change"), "market_cap_usd": item.get("usd_market_cap"), "volume_24h_usd": item.get("usd_24h_vol"), "last_updated_at": item.get("last_updated_at")})
    stable.sort(key=lambda row: row.get("abs_deviation_percent", 0), reverse=True)
    save("stablecoins.json", {"updated_at": NOW, "cadence": "scheduled every five minutes", "source": "CoinGecko public market data", "reference": "Observed market deviation from stated reference currency; not a reserve or redemption assessment.", "regulatory_notice": "GNK ASG d.o.o. ne izdaje niti nudi stablecoin kroz ovaj prikaz. Svaki budući token zahtijevao bi zasebnu pravnu, regulatornu i tehničku procjenu prije javne ponude.", "stablecoins": stable})
    return {"coins": len(coins), "stablecoins": len(stable)}
def update_btc_chart() -> int:
    values = fetch_json("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=eur&days=7").get("prices", [])
    save("btc_chart.json", {"updated_at": NOW, "currency": "EUR", "days": 7, "source": "CoinGecko public market data", "prices": values})
    return len(values)
def update_exchanges() -> int:
    rows = fetch_json("https://api.coingecko.com/api/v3/coins/bitcoin/tickers?include_exchange_logo=true&depth=true&order=volume_desc&page=1").get("tickers", [])
    result = []
    for row in rows:
        market = (row.get("market") or {}).get("name")
        if market not in PREFERRED_EXCHANGES or any(item["exchange"] == market for item in result):
            continue
        result.append({"exchange": market, "pair": f"{row.get('base','')}/{row.get('target','')}", "last_usd": (row.get("converted_last") or {}).get("usd"), "volume_usd": (row.get("converted_volume") or {}).get("usd"), "spread_percent": row.get("bid_ask_spread_percentage"), "trust_score": row.get("trust_score"), "timestamp": row.get("timestamp"), "trade_url": row.get("trade_url")})
    result.sort(key=lambda item: float(item.get("volume_usd") or 0), reverse=True)
    save("exchange_compare.json", {"updated_at": NOW, "cadence": "scheduled every five minutes", "asset": "Bitcoin", "source": "CoinGecko exchange ticker aggregation", "exchanges": result[:7], "disclaimer": "Usporedni informativni prikaz javno dostupnih ticker podataka; nije preporuka burze niti usluga izvršenja naloga."})
    return len(result[:7])
def yahoo_intraday(symbol: str) -> dict:
    encoded = urllib.parse.quote(symbol, safe="")
    payload = fetch_json(f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}?range=5d&interval=5m&includePrePost=false&events=history")
    result = (payload.get("chart", {}).get("result") or [None])[0] or {}; meta = result.get("meta", {})
    closes = ((result.get("indicators", {}).get("quote", [{}])[0] or {}).get("close", [])); values = [float(v) for v in closes if v is not None and math.isfinite(float(v))]
    current = values[-1] if values else meta.get("regularMarketPrice"); previous = meta.get("chartPreviousClose") or meta.get("previousClose")
    return {"current": current, "previous_close": previous, "change_percent": round(((float(current) / float(previous)) - 1) * 100, 2) if current and previous else None, "currency": meta.get("currency"), "market_time": meta.get("regularMarketTime")}
def update_indices() -> int:
    indices, errors = [], []
    for key, meta in INDEXES.items():
        try: indices.append({"id": key, **meta, **yahoo_intraday(meta["symbol"])})
        except Exception as exc: errors.append({"id": key, "error": str(exc)[:120]})
    save("market_indices.json", {"updated_at": NOW, "cadence": "scheduled every five minutes", "source": "Public market quote feed", "indices": indices, "errors": errors, "notice": "Informativni prikaz posljednjih dostupnih vrijednosti; podatci mogu biti odgođeni."})
    return len(indices)
def main() -> None:
    summary, errors = {}, []
    for label, function in (("digital_assets", update_coins_and_stablecoins), ("btc_chart_points", update_btc_chart), ("exchanges", update_exchanges), ("indices", update_indices)):
        try: summary[label] = function()
        except Exception as exc: errors.append({"module": label, "error": str(exc)[:150]})
    status = {"updated_at": NOW, "cadence": "scheduled every five minutes", "status": "ok" if not errors else "partial", **summary, "errors": errors}
    save("fast_market_status.json", status)
    print(json.dumps(status, ensure_ascii=False))
if __name__ == "__main__": main()
