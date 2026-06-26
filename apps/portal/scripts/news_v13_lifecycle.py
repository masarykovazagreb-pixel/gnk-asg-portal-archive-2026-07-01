#!/usr/bin/env python3
"""GNK ASG news lifecycle v13: public 100, archive 1000->500, RSS images, status."""
from __future__ import annotations

import concurrent.futures
import datetime as dt
import email.utils
import hashlib
import html
import json
import os
import re
import tempfile
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
SITE = 'https://gnk-asg.hr'
NOW = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
UA = 'GNK-ASG-News-V13/1.0'
PUBLIC_LIMIT = 100
ARCHIVE_LIMIT = 1000
ARCHIVE_PRUNE_TO = 500
TIMEOUT = 8
WORKERS = 12
FALLBACK_IMAGE = '/assets/news-fallback.svg'


def read_json(name, default):
    try:
        return json.loads((DATA / name).read_text(encoding='utf-8'))
    except Exception:
        return default


def save_json(name, payload):
    DATA.mkdir(parents=True, exist_ok=True)
    target = DATA / name
    fd, tmp = tempfile.mkstemp(prefix=target.name + '.', suffix='.tmp', dir=str(DATA))
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.write('\n')
        os.replace(tmp, target)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def clean(value):
    text = html.unescape(str(value or '')).replace('&nbsp;', ' ')
    text = re.sub(r'<[^>]+>', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def parse_date(value):
    try:
        parsed = email.utils.parsedate_to_datetime(str(value or ''))
        return (parsed if parsed.tzinfo else parsed.replace(tzinfo=dt.timezone.utc)).astimezone(dt.timezone.utc)
    except Exception:
        try:
            return dt.datetime.fromisoformat(str(value).replace('Z', '+00:00')).astimezone(dt.timezone.utc)
        except Exception:
            return None


def google_news_url(query):
    return 'https://news.google.com/rss/search?q=' + urllib.parse.quote(query) + '&hl=hr&gl=HR&ceid=HR:hr'


def fetch_bytes(url):
    request = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/rss+xml,application/xml,text/xml,*/*'})
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return response.read()


def valid_url(value):
    try:
        url = urllib.parse.urljoin(SITE, html.unescape(str(value or '').strip()))
        parsed = urllib.parse.urlsplit(url)
        return url if parsed.scheme in {'http', 'https'} and parsed.netloc else ''
    except Exception:
        return ''


def first_image(item):
    for element in list(item):
        tag = str(element.tag).lower()
        if tag.endswith('thumbnail') or tag.endswith('content') or tag == 'enclosure':
            url = valid_url(element.get('url') or element.get('href'))
            if url and (tag != 'enclosure' or str(element.get('type', '')).startswith('image/')):
                return url
    raw = ''.join([str(item.findtext('description') or ''), str(item.findtext('{http://purl.org/rss/1.0/modules/content/}encoded') or '')])
    match = re.search(r'<img[^>]+src=["\']([^"\']+)', raw, re.I)
    return valid_url(match.group(1)) if match else ''


def share_url_for(row_id):
    safe_id = re.sub(r'[^a-zA-Z0-9_-]+', '', str(row_id or ''))
    return f'/podijeli/vijest/{safe_id}/' if safe_id else ''


def source_items(source, cutoff, limit):
    url = source.get('url') or google_news_url(source['q'])
    xml = fetch_bytes(url)
    rows = []
    for item in ET.fromstring(xml).findall('.//item')[:limit]:
        title = clean(item.findtext('title'))
        link = valid_url(clean(item.findtext('link')))
        published = parse_date(clean(item.findtext('pubDate')))
        if not title or not link or not published or published < cutoff:
            continue
        headline, publisher = title.rsplit(' - ', 1) if ' - ' in title else (title, source.get('name', 'Javni izvor'))
        image = first_image(item) or FALLBACK_IMAGE
        row_id = hashlib.sha256((headline + link).encode()).hexdigest()[:18]
        rows.append({
            'id': row_id,
            'title': headline,
            'url': link,
            'summary': clean(item.findtext('description'))[:280],
            'source': publisher,
            'region': source.get('name', 'Javni izvor'),
            'group': source.get('group', 'other'),
            'category': source.get('category', 'news'),
            'published_at': published.isoformat(),
            'image': image,
            'imageAlt': headline,
            'imageCredit': publisher if image != FALLBACK_IMAGE else 'GNK ASG Visual Index fallback',
            'share_url': share_url_for(row_id),
        })
    return rows


def normalized_saved(rows):
    output = []
    for row in rows if isinstance(rows, list) else []:
        if not isinstance(row, dict) or not row.get('title') or not row.get('url') or not parse_date(row.get('published_at')):
            continue
        row.setdefault('image', FALLBACK_IMAGE)
        row.setdefault('imageAlt', row.get('title'))
        row.setdefault('imageCredit', row.get('source') or 'GNK ASG')
        row.setdefault('share_url', share_url_for(row.get('id')))
        output.append(row)
    return output


def signature(row):
    parsed = urllib.parse.urlsplit(str(row.get('url', '')).lower())
    host_path = parsed.netloc.removeprefix('www.') + parsed.path.rstrip('/')
    title = re.sub(r'[^a-z0-9]+', ' ', str(row.get('title', '')).lower()).strip()
    return row.get('id') or host_path or title


def dedupe(rows):
    seen = set()
    result = []
    for row in sorted(rows, key=lambda r: str(r.get('published_at', '')), reverse=True):
        key = signature(row)
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(row)
    return result


def main():
    config = read_json('news_config_v2.json', {})
    retention_days = max(1, int(config.get('retention_days', 30)))
    max_per_source = max(20, min(100, int(config.get('max_per_source', 80))))
    cutoff = NOW - dt.timedelta(days=retention_days)
    sources = list(config.get('sources', [])) + list(config.get('queries', []))
    fetched = []
    errors = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as executor:
        future_map = {executor.submit(source_items, source, cutoff, max_per_source): source for source in sources}
        for future in concurrent.futures.as_completed(future_map):
            source = future_map[future]
            try:
                fetched.extend(future.result())
            except Exception as exc:
                errors.append({'source': source.get('name', 'RSS'), 'error': str(exc)[:140]})
    combined = dedupe(fetched + normalized_saved(read_json('news.json', [])) + normalized_saved(read_json('news_archive.json', [])))
    public = combined[:PUBLIC_LIMIT]
    archive_pool = combined[PUBLIC_LIMIT:]
    archive = archive_pool[:ARCHIVE_LIMIT]
    pruned = 0
    if len(archive) >= ARCHIVE_LIMIT:
        pruned = max(0, len(archive) - ARCHIVE_PRUNE_TO)
        archive = archive[:ARCHIVE_PRUNE_TO]
    status_ok = bool(public) and len(errors) <= max(1, int(len(sources) * 0.30))
    by_group = {}
    for row in public:
        row.setdefault('share_url', share_url_for(row.get('id')))
        by_group[row.get('group', 'other')] = by_group.get(row.get('group', 'other'), 0) + 1
    for row in archive:
        row.setdefault('share_url', share_url_for(row.get('id')))
    status = {
        'ok': status_ok,
        'status': 'ok' if status_ok else 'degraded',
        'updated_at': NOW.isoformat(),
        'checked_at': NOW.isoformat(),
        'last_attempt_at': NOW.isoformat(),
        'last_successful_refresh_at': NOW.isoformat() if status_ok else None,
        'engine': 'news_v13_lifecycle',
        'cadence': 'scheduled at 09:00, 16:00 and 21:00 Europe/Zagreb',
        'timezone': 'Europe/Zagreb',
        'scheduled_hours_local': [9, 16, 21],
        'configured_sources': len(sources),
        'successful_sources': max(0, len(sources) - len(errors)),
        'failed_sources': len(errors),
        'public_items': len(public),
        'max_public_items': PUBLIC_LIMIT,
        'archive_items': len(archive),
        'max_archive_items': ARCHIVE_LIMIT,
        'archive_prune_to': ARCHIVE_PRUNE_TO,
        'discarded_archive_overflow_items': max(0, len(archive_pool) - ARCHIVE_LIMIT) + pruned,
        'fetched_candidates': len(fetched),
        'rss_images_enabled': True,
        'fallback_image': FALLBACK_IMAGE,
        'visual_index_fallback': '/visual-index/',
        'heartbeat_policy': 'news_status_updates_on_every_automation_run_even_when_content_is_unchanged',
        'source_success_threshold': 0.70,
        'by_group': by_group,
        'errors': errors,
    }
    update_status = read_json('update_status.json', {})
    previous_news_status = update_status.get('news') if isinstance(update_status.get('news'), dict) else {}
    if not status_ok and previous_news_status.get('last_successful_refresh_at'):
        status['last_successful_refresh_at'] = previous_news_status.get('last_successful_refresh_at')
    update_status['updated_at'] = NOW.isoformat()
    update_status['news'] = status
    save_json('news.json', public)
    save_json('news_archive.json', archive)
    save_json('news-automation-status.json', status)
    save_json('update_status.json', update_status)
    print(json.dumps(status, ensure_ascii=False))
    if not public:
        raise SystemExit('news.json is empty after refresh')


if __name__ == '__main__':
    main()
