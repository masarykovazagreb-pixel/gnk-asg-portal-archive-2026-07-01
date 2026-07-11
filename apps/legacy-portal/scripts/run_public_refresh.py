#!/usr/bin/env python3
from __future__ import annotations
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / 'data' / 'news_config_v2.json'
NEWS = ROOT / 'data' / 'news.json'
STATUS = ROOT / 'data' / 'update_status.json'
ORIGINAL = CONFIG.read_text(encoding='utf-8')
PRIVATE_TERMS = ('gnk asg', 'gnk dinamo ltd', 'nermin sefić', 'nermin sefic')


def is_moderated_item(item):
    haystack = ' '.join(str(item.get(field, '')) for field in ('title', 'summary', 'source', 'region')).lower()
    return item.get('group') == 'mentions' or any(term in haystack for term in PRIVATE_TERMS)


try:
    settings = json.loads(ORIGINAL)
    settings['max_items'] = 1000
    settings['queries'] = [item for item in settings.get('queries', []) if item.get('group') != 'mentions']
    CONFIG.write_text(json.dumps(settings, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    subprocess.check_call([sys.executable, str(ROOT / 'scripts' / 'update_feeds_v2.py')])
    public_items = json.loads(NEWS.read_text(encoding='utf-8'))
    public_items = [item for item in public_items if not is_moderated_item(item)][:1000]
    NEWS.write_text(json.dumps(public_items, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if STATUS.exists():
        status = json.loads(STATUS.read_text(encoding='utf-8'))
        if isinstance(status.get('news'), dict):
            counts = {}
            for item in public_items:
                group = item.get('group', 'other')
                counts[group] = counts.get(group, 0) + 1
            status['news']['public_items'] = len(public_items)
            status['news']['capacity'] = 1000
            status['news']['by_group'] = counts
            status['news']['moderated_public_mentions'] = 0
        STATUS.write_text(json.dumps(status, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
finally:
    CONFIG.write_text(ORIGINAL, encoding='utf-8')
