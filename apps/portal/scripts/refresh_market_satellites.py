#!/usr/bin/env python3
"""Refresh legacy market satellite datasets under the canonical market writer.

Writes ONLY:
- stablecoins.json
- btc_chart.json
- exchange_compare.json

The canonical market.json / market_indices.json / fast_market_status.json files
remain owned by the root refresh-index-live-data workflow's existing processors.
On upstream failure, prior values are preserved and only check/attempt metadata
advances; updated_at advances only after a successful data refresh.
"""
from __future__ import annotations
import datetime as dt
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"
NOW=dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
UA="GNK-ASG-Market-Satellites/1.0"
STABLECOINS={
    "tether":{"symbol":"USDT","peg":"usd","issuer":"Tether"},
    "usd-coin":{"symbol":"USDC","peg":"usd","issuer":"Circle"},
    "dai":{"symbol":"DAI","peg":"usd","issuer":"Sky ecosystem"},
    "first-digital-usd":{"symbol":"FDUSD","peg":"usd","issuer":"First Digital"},
    "paypal-usd":{"symbol":"PYUSD","peg":"usd","issuer":"Paxos / PayPal"},
    "euro-coin":{"symbol":"EURC","peg":"eur","issuer":"Circle"},
}
PREFERRED_EXCHANGES={"Binance","Coinbase Exchange","Kraken","OKX","Bitstamp","Crypto.com Exchange","Bybit"}
POLICY="checked_at advances on every canonical writer attempt; updated_at advances only on successful upstream refresh"
CADENCE="twice daily via canonical Refresh index live data workflow"

def load(name,default=None):
    try:
        value=json.loads((DATA/name).read_text(encoding="utf-8"))
        return value if isinstance(value,dict) else (default or {})
    except Exception:
        return default or {}

def save(name,payload):
    (DATA/name).write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

def fetch_json(url):
    last=None
    for attempt in range(3):
        try:
            req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"application/json"})
            with urllib.request.urlopen(req,timeout=25) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            last=exc
            if attempt<2:
                time.sleep(attempt+1)
    raise last or RuntimeError("upstream unavailable")

def success(payload):
    payload=dict(payload)
    payload.update({
        "checked_at":NOW,
        "updated_at":NOW,
        "last_attempt_at":NOW,
        "last_successful_refresh_at":NOW,
        "heartbeat_policy":POLICY,
        "stale_safe":True,
        "data_status":"fresh",
        "status":"ok",
        "writer_contract":"refresh-index-live-data",
        "cadence":CADENCE,
    })
    payload.pop("refresh_error",None)
    return payload

def stale(name,error):
    payload=load(name,{"status":"partial"})
    prior=payload.get("last_successful_refresh_at") or payload.get("updated_at") or payload.get("checked_at")
    payload.update({
        "checked_at":NOW,
        "last_attempt_at":NOW,
        "last_successful_refresh_at":prior,
        "heartbeat_policy":POLICY,
        "stale_safe":True,
        "data_status":"stale_previous_values_preserved",
        "status":"partial",
        "refresh_error":str(error)[:160],
        "writer_contract":"refresh-index-live-data",
        "cadence":CADENCE,
    })
    return payload

def update_stablecoins():
    name="stablecoins.json"
    try:
        ids=",".join(STABLECOINS)
        query=urllib.parse.urlencode({
            "ids":ids,
            "vs_currencies":"usd,eur",
            "include_market_cap":"true",
            "include_24hr_vol":"true",
            "include_24hr_change":"true",
            "include_last_updated_at":"true",
        })
        raw=fetch_json("https://api.coingecko.com/api/v3/simple/price?"+query)
        rows=[]
        for coin_id,meta in STABLECOINS.items():
            item=raw.get(coin_id)
            if not item or item.get(meta["peg"]) is None:
                continue
            price=float(item[meta["peg"]])
            deviation=round((price-1.0)*100,4)
            rows.append({
                "id":coin_id,**meta,
                "price_peg_currency":price,
                "price_usd":item.get("usd"),
                "price_eur":item.get("eur"),
                "deviation_percent":deviation,
                "abs_deviation_percent":abs(deviation),
                "change_24h_percent":item.get(meta["peg"]+"_24h_change"),
                "market_cap_usd":item.get("usd_market_cap"),
                "volume_24h_usd":item.get("usd_24h_vol"),
                "last_updated_at":item.get("last_updated_at"),
            })
        if not rows:
            raise RuntimeError("empty stablecoin dataset")
        rows.sort(key=lambda row:row.get("abs_deviation_percent",0),reverse=True)
        payload=success({
            "source":"CoinGecko public market data",
            "reference":"Observed market deviation from stated reference currency; not a reserve or redemption assessment.",
            "regulatory_notice":"GNK ASG d.o.o. does not issue or offer a stablecoin through this display.",
            "stablecoins":rows,
        })
    except Exception as exc:
        payload=stale(name,exc)
    save(name,payload)
    return {"file":name,"status":payload.get("status"),"checked_at":payload.get("checked_at"),"updated_at":payload.get("updated_at")}

def update_btc_chart():
    name="btc_chart.json"
    try:
        values=fetch_json("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=eur&days=7").get("prices",[])
        if not values:
            raise RuntimeError("empty BTC chart")
        payload=success({"currency":"EUR","days":7,"source":"CoinGecko public market data","prices":values})
    except Exception as exc:
        payload=stale(name,exc)
    save(name,payload)
    return {"file":name,"status":payload.get("status"),"checked_at":payload.get("checked_at"),"updated_at":payload.get("updated_at")}

def update_exchange_compare():
    name="exchange_compare.json"
    try:
        rows=fetch_json("https://api.coingecko.com/api/v3/coins/bitcoin/tickers?include_exchange_logo=true&depth=true&order=volume_desc&page=1").get("tickers",[])
        result=[]
        for row in rows:
            market=(row.get("market") or {}).get("name")
            if market not in PREFERRED_EXCHANGES or any(item["exchange"]==market for item in result):
                continue
            result.append({
                "exchange":market,
                "pair":f"{row.get('base','')}/{row.get('target','')}",
                "last_usd":(row.get("converted_last") or {}).get("usd"),
                "volume_usd":(row.get("converted_volume") or {}).get("usd"),
                "spread_percent":row.get("bid_ask_spread_percentage"),
                "trust_score":row.get("trust_score"),
                "timestamp":row.get("timestamp"),
                "trade_url":row.get("trade_url"),
            })
        result.sort(key=lambda item:float(item.get("volume_usd") or 0),reverse=True)
        if not result:
            raise RuntimeError("empty exchange comparison")
        payload=success({
            "asset":"Bitcoin",
            "source":"CoinGecko exchange ticker aggregation",
            "exchanges":result[:7],
            "disclaimer":"Comparative informational display of public ticker data; not an exchange recommendation or order-execution service.",
        })
    except Exception as exc:
        payload=stale(name,exc)
    save(name,payload)
    return {"file":name,"status":payload.get("status"),"checked_at":payload.get("checked_at"),"updated_at":payload.get("updated_at")}

def main():
    DATA.mkdir(parents=True,exist_ok=True)
    result=[update_stablecoins(),update_btc_chart(),update_exchange_compare()]
    print(json.dumps({"checked_at":NOW,"writer":"refresh-index-live-data","files":result},ensure_ascii=False))

if __name__=="__main__":
    main()
