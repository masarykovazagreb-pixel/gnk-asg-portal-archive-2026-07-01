#!/usr/bin/env python3
from __future__ import annotations
import csv
import datetime as dt
import io
import json
import math
import statistics
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
NOW = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
UA = 'GNK-ASG-Market-Monitor/1.0'


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
    with urllib.request.urlopen(req, timeout=25) as response:
        return response.read()


def read_json(name: str, default):
    try:
        return json.loads((DATA / name).read_text(encoding='utf-8'))
    except Exception:
        return default


def write_json(name: str, value) -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def pct(first: float, last: float) -> float:
    return round(((last / first) - 1) * 100, 2) if first else 0.0


def indexed(points: list[list[float]]) -> list[list[float]]:
    if not points or not points[0][1]:
        return []
    first = points[0][1]
    return [[stamp, round(value / first * 100, 4)] for stamp, value in points]


def returns(points: list[list[float]]) -> list[float]:
    vals = [float(point[1]) for point in points if point[1] is not None]
    return [(vals[i] / vals[i - 1]) - 1 for i in range(1, len(vals)) if vals[i - 1]]


def correlation(a: list[list[float]], b: list[list[float]]):
    x, y = returns(a), returns(b)
    count = min(len(x), len(y))
    if count < 3:
        return None
    x, y = x[-count:], y[-count:]
    mx, my = statistics.mean(x), statistics.mean(y)
    numerator = sum((vx - mx) * (vy - my) for vx, vy in zip(x, y))
    denom = math.sqrt(sum((vx - mx) ** 2 for vx in x) * sum((vy - my) ** 2 for vy in y))
    return round(numerator / denom, 3) if denom else None


def coingecko() -> tuple[dict, list[list[float]]]:
    ids = 'bitcoin,ethereum,solana,ripple,binancecoin,tether,usd-coin,cardano'
    fiats = 'eur,usd,gbp,chf,jpy'
    url = f'https://api.coingecko.com/api/v3/simple/price?ids={ids}&vs_currencies={fiats}&include_24hr_change=true'
    raw = json.loads(get(url).decode('utf-8'))
    symbols = {'bitcoin':'BTC','ethereum':'ETH','solana':'SOL','ripple':'XRP','binancecoin':'BNB','tether':'USDT','usd-coin':'USDC','cardano':'ADA'}
    coins = [{'id': key, 'symbol': symbol, 'prices': {fiat: raw[key].get(fiat) for fiat in fiats.split(',')}, 'changes_24h': {fiat: raw[key].get(fiat + '_24h_change') for fiat in fiats.split(',')}} for key, symbol in symbols.items() if key in raw]
    market = {'updated_at': NOW.isoformat(), 'source': 'CoinGecko public market data', 'refresh_frequency': 'Every 5 minutes', 'status': 'ok', 'coins': coins}
    chart_url = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily'
    btc = [[int(stamp), float(value)] for stamp, value in json.loads(get(chart_url).decode('utf-8')).get('prices', [])]
    return market, btc


def stooq(symbol: str) -> list[list[float]]:
    start = (NOW - dt.timedelta(days=45)).strftime('%Y%m%d')
    end = NOW.strftime('%Y%m%d')
    url = f'https://stooq.com/q/d/l/?s={symbol}&d1={start}&d2={end}&i=d'
    body = get(url).decode('utf-8', errors='ignore')
    rows = csv.DictReader(io.StringIO(body))
    result = []
    for row in rows:
        try:
            day = dt.datetime.strptime(row['Date'], '%Y-%m-%d').replace(tzinfo=dt.timezone.utc)
            close = float(row['Close'])
            result.append([int(day.timestamp() * 1000), close])
        except Exception:
            continue
    return result[-31:]


def asset(points: list[list[float]], unit: str) -> dict:
    return {'current': round(float(points[-1][1]), 4), 'unit': unit, 'change_30d_percent': pct(float(points[0][1]), float(points[-1][1])), 'points': points, 'indexed_points': indexed(points)}


def macro_market(btc_points: list[list[float]]) -> dict:
    previous = read_json('macro_market.json', {'assets': {}})
    fallback = previous.get('assets', {})
    series = {'btc': btc_points}
    lookups = {'gold': ('xauusd', 'USD / trojska unca'), 'oil': ('brent', 'USD / barel'), 'usd': ('eurusd', 'EUR / USD')}
    assets = {'btc': asset(btc_points, 'USD / BTC')}
    for key, (symbol, unit) in lookups.items():
        try:
            points = stooq(symbol)
            if len(points) < 3:
                raise ValueError('insufficient points')
            series[key] = points
            assets[key] = asset(points, unit)
        except Exception:
            old = fallback.get(key)
            if old:
                assets[key] = old
                series[key] = old.get('points', [])
    return {'updated_at': NOW.isoformat(), 'range_days': 30, 'refresh_frequency': 'Every 5 minutes', 'sources': {'btc':'CoinGecko public market data', 'gold':'Stooq public data', 'oil':'Stooq public data', 'usd':'Stooq public data'}, 'assets': assets, 'correlations': {'btc_gold': correlation(series.get('btc', []), series.get('gold', [])), 'btc_oil': correlation(series.get('btc', []), series.get('oil', [])), 'btc_usd': correlation(series.get('btc', []), series.get('usd', []))}}


def ecb_rates() -> dict:
    xml = get('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml')
    root = ET.fromstring(xml)
    rates = {}
    day = None
    for element in root.iter():
        if element.attrib.get('time'):
            day = element.attrib['time']
        if element.attrib.get('currency') and element.attrib.get('rate'):
            rates[element.attrib['currency']] = float(element.attrib['rate'])
    selected = {key: rates.get(key) for key in ('USD','GBP','CHF','JPY') if key in rates}
    return {'updated_at': NOW.isoformat(), 'ecb': {'status':'ok', 'reference_date': day, 'base_currency':'EUR', 'source':'European Central Bank reference rates', 'rates': selected}}


def main() -> None:
    status = read_json('update_status.json', {})
    try:
        market, btc = coingecko()
        write_json('market.json', market)
        write_json('btc_chart.json', {'updated_at': NOW.isoformat(), 'currency':'USD', 'days':30, 'refresh_frequency':'Every 5 minutes', 'source':'CoinGecko public market data', 'prices': btc})
        macro = macro_market(btc)
        write_json('macro_market.json', macro)
        status['market'] = {'status':'ok', 'coins':len(market['coins']), 'macro_assets':len(macro['assets']), 'refresh_frequency':'Every 5 minutes', 'updated_at': NOW.isoformat()}
    except Exception as error:
        status['market_fast_error'] = str(error)[:180]
    try:
        write_json('open_data.json', ecb_rates())
    except Exception as error:
        status['open_data_error'] = str(error)[:180]
    status['updated_at'] = NOW.isoformat()
    write_json('update_status.json', status)
    print(json.dumps(status, ensure_ascii=False))


if __name__ == '__main__':
    main()
