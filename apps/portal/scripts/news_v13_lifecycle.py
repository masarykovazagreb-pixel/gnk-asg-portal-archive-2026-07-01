#!/usr/bin/env python3
"""GNK ASG news lifecycle V14: 100 public, archive 900 -> 450, real images only."""
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
UA = 'GNK-ASG-News-V14/1.0'
TIMEOUT = 10
WORKERS = 16
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
    text = re.sub(r'<script[\s\S]*?</script>|<style[\s\S]*?</style>', ' ', text, flags=re.I)
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


def valid_url(value, base=SITE):
    try:
        url = urllib.parse.urljoin(base, html.unescape(str(value or '').strip()))
        parsed = urllib.parse.urlsplit(url)
        return url if parsed.scheme in {'http', 'https'} and parsed.netloc else ''
    except Exception:
        return ''


def fetch_bytes(url, accept='*/*', range_header=None):
    headers = {'User-Agent': UA, 'Accept': accept, 'Accept-Language': 'hr,en;q=0.8'}
    if range_header:
        headers['Range'] = range_header
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return response.read(4_000_000), response.headers, response.geturl(), int(getattr(response, 'status', 200) or 200)


def lname(tag):
    return str(tag or '').split('}')[-1].split(':')[-1].lower()


def element_text(item, names):
    wanted = {name.lower() for name in names}
    for node in list(item):
        if lname(node.tag) in wanted:
            value = ''.join(node.itertext()).strip()
            if value:
                return value
    return ''


def item_link(item):
    for node in list(item):
        if lname(node.tag) != 'link':
            continue
        href = node.get('href') or node.get('url')
        if href:
            return valid_url(href)
        value = ''.join(node.itertext()).strip()
        if value:
            return valid_url(value)
    return ''


def first_image(item, article_url):
    for node in item.iter():
        tag = lname(node.tag)
        if tag not in {'thumbnail', 'content', 'enclosure', 'image'}:
            continue
        mime = str(node.get('type') or node.get('medium') or '').lower()
        url = valid_url(node.get('url') or node.get('href'), article_url)
        if url and (tag != 'enclosure' or not mime or mime.startswith('image/') or mime == 'image'):
            return url
    raw = ' '.join(element_text(item, names) for names in [{'description'}, {'summary'}, {'content', 'encoded'}])
    match = re.search(r'<img[^>]+(?:src|data-src)=["\']([^"\']+)', raw, re.I)
    return valid_url(match.group(1), article_url) if match else ''


def probe_image(url):
    if not url or url == FALLBACK_IMAGE or url.startswith('data:'):
        return False, ''
    try:
        body, headers, final_url, status = fetch_bytes(url, 'image/avif,image/webp,image/*,*/*;q=0.8', 'bytes=0-65535')
        kind = str(headers.get('content-type') or '').lower().split(';')[0]
        ok = status in {200, 206} and kind.startswith('image/') and (len(body) >= 1024 or kind == 'image/svg+xml')
        return ok, final_url if ok else ''
    except Exception:
        return False, ''


def source_items(source, cutoff, limit):
    body, headers, final_url, status = fetch_bytes(source['url'], 'application/rss+xml,application/atom+xml,application/xml,text/xml,*/*')
    root = ET.fromstring(body)
    elements = [node for node in root.iter() if lname(node.tag) in {'item', 'entry'}]
    rows = []
    for item in elements[:limit]:
        title = clean(element_text(item, {'title'}))
        link = item_link(item)
        published = parse_date(element_text(item, {'pubdate', 'published', 'updated', 'date'}))
        summary = clean(element_text(item, {'description', 'summary', 'content', 'encoded'}))[:700]
        if not title or not link or not published or published < cutoff or len(summary) < 80:
            continue
        publisher = clean(element_text(item, {'source', 'creator', 'author'})) or source.get('name', 'Javni izvor')
        image = first_image(item, link)
        row_id = hashlib.sha256((title + link).encode()).hexdigest()[:18]
        rows.append({
            'id': row_id,
            'title': title,
            'url': link,
            'summary': summary,
            'source': publisher,
            'region': source.get('name', publisher),
            'sourceId': source.get('id'),
            'sourceFeed': final_url,
            'group': source.get('group', 'other'),
            'category': source.get('category', 'news'),
            'published_at': published.isoformat(),
            'image': image,
            'imageAlt': title,
            'imageCredit': publisher,
            'share_url': f'/podijeli/vijest/{row_id}/',
        })
    return {
        'source': source.get('name', source.get('id', 'RSS')),
        'sourceId': source.get('id'),
        'configuredUrl': source.get('url'),
        'finalUrl': final_url,
        'httpStatus': status,
        'contentType': str(headers.get('content-type') or ''),
        'itemCount': len(rows),
        'ok': bool(rows),
        'items': rows,
    }


def validate_row(row):
    row = dict(row)
    if not row.get('title') or len(clean(row.get('summary'))) < 80 or not clean(row.get('source')) or not valid_url(row.get('url')):
        return None
    ok, image = probe_image(valid_url(row.get('image')))
    if not ok:
        return None
    row['image'] = image
    row['imageAlt'] = clean(row.get('imageAlt')) or row['title']
    row['imageCredit'] = clean(row.get('imageCredit')) or row['source']
    row['imageVerified'] = True
    row['imageVerifiedAt'] = NOW.isoformat()
    row['imageVerification'] = 'remote_content_type_and_minimum_size'
    row.setdefault('share_url', f"/podijeli/vijest/{re.sub(r'[^a-zA-Z0-9_-]+', '', str(row.get('id') or ''))}/")
    return row


def normalized_saved(rows):
    result = []
    for row in rows if isinstance(rows, list) else []:
        if not isinstance(row, dict):
            continue
        if not row.get('title') or len(clean(row.get('summary'))) < 80 or not clean(row.get('source')):
            continue
        if not valid_url(row.get('url')) or not valid_url(row.get('image')) or str(row.get('image')).endswith('news-fallback.svg'):
            continue
        result.append(dict(row))
    return result


def signature(row):
    parsed = urllib.parse.urlsplit(str(row.get('url', '')).lower())
    host_path = parsed.netloc.removeprefix('www.') + parsed.path.rstrip('/')
    title = re.sub(r'[^a-z0-9]+', ' ', str(row.get('title', '')).lower()).strip()
    return row.get('id') or host_path or title


def dedupe(rows):
    seen = set()
    output = []
    for row in sorted(rows, key=lambda item: str(item.get('published_at', '')), reverse=True):
        key = signature(row)
        if not key or key in seen:
            continue
        seen.add(key)
        output.append(row)
    return output


def main():
    config = read_json('news_config_v2.json', {})
    public_limit = int(config.get('max_public_items', 100))
    archive_capacity = int(config.get('archive_capacity', 1000))
    archive_trigger = int(config.get('archive_prune_trigger', 900))
    archive_prune_to = int(config.get('archive_prune_to', 450))
    minimum_healthy = int(config.get('minimum_healthy_sources', 15))
    max_per_source = int(config.get('max_per_source', 30))
    cutoff = NOW - dt.timedelta(days=max(1, int(config.get('retention_days', 30))))
    sources = list(config.get('sources', []))

    source_results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as executor:
        future_map = {executor.submit(source_items, source, cutoff, max_per_source): source for source in sources}
        for future in concurrent.futures.as_completed(future_map):
            source = future_map[future]
            try:
                source_results.append(future.result())
            except Exception as exc:
                source_results.append({'source': source.get('name'), 'sourceId': source.get('id'), 'configuredUrl': source.get('url'), 'httpStatus': 0, 'itemCount': 0, 'ok': False, 'error': str(exc)[:180], 'items': []})

    fetched = [row for result in source_results for row in result.get('items', [])]
    verified_new = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = [executor.submit(validate_row, row) for row in fetched]
        for future in concurrent.futures.as_completed(futures):
            try:
                row = future.result()
                if row:
                    verified_new.append(row)
            except Exception:
                pass

    combined = dedupe(verified_new + normalized_saved(read_json('news.json', [])) + normalized_saved(read_json('news_archive.json', [])))
    public_candidates = combined[:max(public_limit * 3, 180)]
    public = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as executor:
        future_map = {executor.submit(validate_row, row): row for row in public_candidates}
        checked = {}
        for future in concurrent.futures.as_completed(future_map):
            original = future_map[future]
            try:
                checked[signature(original)] = future.result()
            except Exception:
                checked[signature(original)] = None
    for candidate in public_candidates:
        row = checked.get(signature(candidate))
        if row:
            public.append(row)
        if len(public) >= public_limit:
            break

    public_keys = {signature(row) for row in public}
    archive_pool = [row for row in combined if signature(row) not in public_keys]
    prune_triggered = len(archive_pool) >= archive_trigger
    archive = archive_pool[:archive_prune_to if prune_triggered else archive_capacity]
    discarded = max(0, len(archive_pool) - len(archive))

    healthy = sum(1 for result in source_results if result.get('ok'))
    valid_contract = all(row.get('title') and row.get('summary') and row.get('source') and row.get('url') and row.get('image') and row.get('imageVerified') for row in public)
    ok = bool(public) and healthy >= minimum_healthy and valid_contract
    by_group = {}
    for row in public:
        by_group[row.get('group', 'other')] = by_group.get(row.get('group', 'other'), 0) + 1

    source_health = [{key: value for key, value in result.items() if key != 'items'} for result in sorted(source_results, key=lambda item: str(item.get('source', '')))]
    status = {
        'ok': ok,
        'status': 'ok' if ok else 'degraded',
        'version': 'GNK_ASG_NEWS_V14_20260626',
        'engine': 'news_v14_lifecycle',
        'updated_at': NOW.isoformat(),
        'checked_at': NOW.isoformat(),
        'last_attempt_at': NOW.isoformat(),
        'last_successful_refresh_at': NOW.isoformat() if ok else None,
        'cadence': 'scheduled at 09:00, 16:00 and 21:00 Europe/Zagreb',
        'timezone': 'Europe/Zagreb',
        'scheduled_hours_local': [9, 16, 21],
        'configured_sources': len(sources),
        'minimum_healthy_sources': minimum_healthy,
        'healthy_sources': healthy,
        'failed_sources': len(sources) - healthy,
        'fetched_candidates': len(fetched),
        'verified_new_candidates': len(verified_new),
        'public_items': len(public),
        'max_public_items': public_limit,
        'public_contract': 'title+summary+source+article_url+verified_real_image',
        'archive_items': len(archive),
        'archive_capacity': archive_capacity,
        'archive_prune_trigger': archive_trigger,
        'archive_prune_to': archive_prune_to,
        'archive_prune_triggered': prune_triggered,
        'discarded_archive_items': discarded,
        'fallback_images_allowed': False,
        'rss_images_enabled': True,
        'open_graph_fallback_enabled': False,
        'by_group': by_group,
        'errors': [{'source': item.get('source'), 'error': item.get('error') or f"http_{item.get('httpStatus')}"} for item in source_results if not item.get('ok')],
    }
    update_status = read_json('update_status.json', {})
    previous = update_status.get('news') if isinstance(update_status.get('news'), dict) else {}
    if not ok and previous.get('last_successful_refresh_at'):
        status['last_successful_refresh_at'] = previous.get('last_successful_refresh_at')
    update_status['updated_at'] = NOW.isoformat()
    update_status['news'] = status

    save_json('news.json', public)
    save_json('news_archive.json', archive)
    save_json('news_sources_health.json', {'checkedAt': NOW.isoformat(), 'minimumHealthySources': minimum_healthy, 'sources': source_health})
    save_json('news-automation-status.json', status)
    save_json('update_status.json', update_status)
    print(json.dumps(status, ensure_ascii=False))
    if not public:
        raise SystemExit('news.json is empty after V14 refresh')
    if healthy < minimum_healthy:
        raise SystemExit(f'healthy_sources_{healthy}_below_required_{minimum_healthy}')
    if not valid_contract:
        raise SystemExit('public news contract validation failed')


if __name__ == '__main__':
    main()
