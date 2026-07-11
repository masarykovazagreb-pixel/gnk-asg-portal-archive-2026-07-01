#!/usr/bin/env python3
from __future__ import annotations
import datetime as dt
import json
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
NOW = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
UA = 'GNK-ASG-Markets/1.1'
TROY_OZ_PER_KG = 32.1507465686


def read(name: str, default):
    try:
        return json.loads((DATA / name).read_text(encoding='utf-8'))
    except Exception:
        return default


def write(name: str, value) -> None:
    (DATA / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def fetch_json(url: str):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=25) as response:
        return json.loads(response.read().decode('utf-8'))


def pct(start: float, end: float) -> float:
    return round(((end / start) - 1.0) * 100.0, 2) if start else 0.0


def yahoo_index(symbol: str) -> dict:
    encoded = urllib.parse.quote(symbol, safe='')
    payload = fetch_json(f'https://query1.finance.yahoo.com/v8/finance/chart/{encoded}?range=1mo&interval=1d')
    result = payload['chart']['result'][0]
    stamps = result.get('timestamp', [])
    closes = result['indicators']['quote'][0].get('close', [])
    points = [[int(stamp) * 1000, float(value)] for stamp, value in zip(stamps, closes) if value is not None]
    if not points:
        raise ValueError(f'No data returned for {symbol}')
    meta = result.get('meta', {})
    return {
        'value': round(points[-1][1], 2),
        'change_percent': pct(points[0][1], points[-1][1]),
        'currency': meta.get('currency', 'USD'),
        'points': points,
        'status': 'public_market_feed'
    }


def update_asg() -> dict:
    profile = read('asg_gold_asset.json', {})
    macro = read('macro_market.json', {})
    assets = macro.get('assets', {})
    gold = assets.get('gold', {})
    usd = assets.get('usd', {})
    ounce_usd = gold.get('current')
    if ounce_usd:
        kg_usd = float(ounce_usd) * TROY_OZ_PER_KG
        asg_usd = kg_usd / 100.0
        eur_per_usd = float(usd.get('current') or 0)
        profile.update({
            'updated_at': NOW,
            'gold_reference_usd_per_kg': round(kg_usd, 2),
            'current_value_usd': round(asg_usd, 2),
            'current_value_eur': round(asg_usd * eur_per_usd, 2) if eur_per_usd else None,
            'change_30d_percent': gold.get('change_30d_percent'),
            'reference_supply_value_usd': round(asg_usd * float(profile.get('total_supply', 0)), 2),
            'price_source': 'Gold reference price from portal market feed'
        })
    write('asg_gold_asset.json', profile)
    return profile


def update_stocks() -> dict:
    output = read('stock_exchanges.json', {'markets': []})
    output['refresh_frequency'] = 'Hourly public reference update'
    output['refresh_frequency_hr'] = 'Satno osvježavanje referentnih javnih podataka'
    output['refresh_frequency_en'] = 'Hourly public reference data refresh'
    mappings = {'nyse': '^NYA', 'nasdaq': '^IXIC'}
    for market in output.get('markets', []):
        symbol = mappings.get(market.get('id'))
        if not symbol:
            continue
        try:
            market.update(yahoo_index(symbol))
        except Exception as error:
            market['refresh_error'] = str(error)[:100]
    output['updated_at'] = NOW
    output['automated_sources'] = {'nyse': 'Yahoo Finance public chart feed; verify at NYSE official source', 'nasdaq': 'Yahoo Finance public chart feed; verify at Nasdaq official source'}
    write('stock_exchanges.json', output)
    return output


def main() -> None:
    asg = update_asg()
    stocks = update_stocks()
    print(json.dumps({'asg_usd': asg.get('current_value_usd'), 'market_cards': len(stocks.get('markets', [])), 'updated_at': NOW}, ensure_ascii=False))


if __name__ == '__main__':
    main()
