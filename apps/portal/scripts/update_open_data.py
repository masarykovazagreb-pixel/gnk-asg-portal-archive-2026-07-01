#!/usr/bin/env python3
"""Update ECB reference-rate public data without modifying market datasets."""
from __future__ import annotations
import datetime as dt
import json
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
NOW = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
UA = 'GNK-ASG-Open-Data/1.0'


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/xml'})
    with urllib.request.urlopen(request, timeout=25) as response:
        return response.read()


def main() -> None:
    root = ET.fromstring(fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'))
    rates = {}
    reference_date = None
    for element in root.iter():
        if element.attrib.get('time'):
            reference_date = element.attrib['time']
        if element.attrib.get('currency') and element.attrib.get('rate'):
            rates[element.attrib['currency']] = float(element.attrib['rate'])
    selected = {key: rates.get(key) for key in ('USD', 'GBP', 'CHF', 'JPY') if key in rates}
    payload = {
        'updated_at': NOW,
        'ecb': {
            'status': 'ok',
            'reference_date': reference_date,
            'base_currency': 'EUR',
            'source': 'European Central Bank reference rates',
            'rates': selected
        }
    }
    (DATA / 'open_data.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == '__main__':
    main()
