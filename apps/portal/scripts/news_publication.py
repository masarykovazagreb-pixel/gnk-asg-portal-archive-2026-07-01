#!/usr/bin/env python3
"""Jedini proces vijesti: dohvat, deduplikacija, arhiva, share prikazi i status."""
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
import textwrap
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
SHARE = ROOT / 'podijeli' / 'vijest'
IMAGES = ROOT / 'assets' / 'news-preview'
SITE = 'https://gnk-asg.hr'
NOW = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
UA = 'GNK-ASG-News-Publication/1.0'
PUBLIC_LIMIT = 500
ARCHIVE_LIMIT = 400
PREVIEW_LIMIT = 80
TIMEOUT = 6
WORKERS = 12
MIN_SOURCE_SUCCESS_RATIO = 0.80
CADENCE_LABEL = 'scheduled every one hour and twenty-one minutes'


def read_json(name, default):
    try:
        return json.loads((DATA / name).read_text(encoding='utf-8'))
    except Exception:
        return default


def save_json(name, data):
    target = DATA / name
    fd, tmp = tempfile.mkstemp(prefix=target.name + '.', suffix='.tmp', dir=str(DATA))
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
            handle.write('\n')
        os.replace(tmp, target)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def clean(value):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html.unescape(str(value or ''))).replace('&nbsp;', ' ')).strip()


def date(value):
    try:
        parsed = email.utils.parsedate_to_datetime(str(value or ''))
        return (parsed if parsed.tzinfo else parsed.replace(tzinfo=dt.timezone.utc)).astimezone(dt.timezone.utc)
    except Exception:
        try:
            return dt.datetime.fromisoformat(str(value).replace('Z', '+00:00')).astimezone(dt.timezone.utc)
        except Exception:
            return None


def fetch(url):
    req = urllib.request.Request(
        url,
        headers={'User-Agent': UA, 'Accept': 'application/rss+xml,application/xml,text/xml,*/*'},
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as reply:
        return reply.read()


def gnews(q):
    return 'https://news.google.com/rss/search?q=' + urllib.parse.quote(q) + '&hl=hr&gl=HR&ceid=HR:hr'


def fetch_source(source, cutoff, limit):
    try:
        xml = fetch(source.get('url') or gnews(source['q']))
        output = []
        for item in ET.fromstring(xml).findall('.//item')[:limit]:
            title = clean(item.findtext('title'))
            url = clean(item.findtext('link'))
            published = date(clean(item.findtext('pubDate')))
            if not title or not url or not published or published < cutoff:
                continue
            headline, publisher = title.rsplit(' - ', 1) if ' - ' in title else (title, source.get('name', 'Javni izvor'))
            output.append({
                'id': hashlib.sha256((headline + url).encode()).hexdigest()[:18],
                'title': headline,
                'url': url,
                'summary': clean(item.findtext('description'))[:240],
                'source': publisher,
                'region': source.get('name', 'Javni izvor'),
                'group': source.get('group', 'other'),
                'category': source.get('category', 'news'),
                'published_at': published.isoformat(),
            })
        return output, None
    except Exception as exc:
        return [], {'source': source.get('name', 'RSS'), 'error': str(exc)[:110]}


def url_key(value):
    parsed = urllib.parse.urlsplit(str(value or ''))
    host = parsed.netloc.lower().removeprefix('www.')
    path = parsed.path.rstrip('/').lower()
    return f'{host}{path}' if host and path else str(value or '').lower().strip()


def title_key(value):
    text = unicodedata.normalize('NFKD', clean(value)).encode('ascii', 'ignore').decode().lower()
    text = re.sub(r'\s+[-|–—]\s+(n1|klix|akta|capital|biznis|poslovni|cnbc|techcrunch).*$', '', text)
    return re.sub(r'[^a-z0-9]+', ' ', text).strip()


def saved(rows):
    if not isinstance(rows, list):
        return []
    return [r for r in rows if isinstance(r, dict) and r.get('title') and r.get('url') and date(r.get('published_at'))]


def unique(rows, rules):
    selected = []
    ids = set()
    urls = set()
    signatures = set()
    removed = 0
    for row in rows:
        title = str(row.get('title', '')).lower()
        url = str(row.get('url', '')).lower()
        ident = str(row.get('id', ''))
        canonical = url_key(url)
        signature = (row.get('group', ''), row.get('category', ''), title_key(title))
        is_blocked = any(str(x).lower() in title for x in rules.get('title_terms', []) if x) or any(str(x).lower() in url for x in rules.get('urls', []) if x)
        if is_blocked or ident in ids or (canonical and canonical in urls) or (signature[2] and signature in signatures):
            removed += 1
            continue
        selected.append(row)
        ids.add(ident)
        urls.add(canonical)
        signatures.add(signature)
    return selected, removed


def font(size, bold=False):
    paths = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
    ]
    for path in paths:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def crop(value, length):
    value = clean(value)
    return value if len(value) <= length else value[:length - 1].rstrip() + '…'


def make_image(row, target):
    image = Image.new('RGB', (1200, 630), '#061326')
    draw = ImageDraw.Draw(image, 'RGBA')
    for y in range(630):
        draw.line((0, y, 1200, y), fill=(6 + int(5 * y / 630), 19 + int(16 * y / 630), 38 + int(31 * y / 630), 255))
    draw.ellipse((840, -100, 1250, 310), fill=(33, 105, 177, 42))
    draw.ellipse((930, 20, 1160, 250), fill=(212, 175, 55, 34))
    gold = '#d4af37'
    draw.rounded_rectangle((70, 56, 215, 113), radius=28, fill=(212, 175, 55, 28), outline=gold, width=2)
    draw.text((94, 75), 'NEWS', font=font(18, True), fill=gold)
    draw.text((72, 168), f"GNK ASG  •  {crop(str(row.get('group', 'news')).upper(), 18)}", font=font(18, True), fill=gold)
    y = 219
    for line in textwrap.wrap(crop(row.get('title', 'Business & Technology News'), 120), width=39)[:3]:
        draw.text((72, y), line, font=font(40, True), fill='#ffffff')
        y += 53
    if row.get('summary'):
        draw.text((74, min(y + 21, 442)), textwrap.shorten(crop(row['summary'], 130), width=88, placeholder='…'), font=font(17), fill='#bdcede')
    draw.line((74, 515, 660, 515), fill=gold, width=2)
    draw.text((74, 542), crop(row.get('source', 'Javni izvor'), 52), font=font(17), fill='#a9bfd4')
    draw.text((933, 540), 'gnk-asg.hr', font=font(17, True), fill=gold)
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, format='PNG', optimize=True)


def make_page(row, image_url, share_url):
    title = html.escape(crop(row.get('title', ''), 160), quote=True)
    desc = html.escape(crop(row.get('summary', '') or 'Otvorite izvor za cjelovitu objavu.', 240), quote=True)
    source = html.escape(crop(row.get('source', 'Javni izvor'), 80), quote=True)
    original = html.escape(clean(row.get('url', '')), quote=True)
    return f'''<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} | GNK ASG Business News</title><meta name="description" content="{desc}"><meta name="robots" content="noindex,follow"><link rel="canonical" href="{original}"><meta property="og:type" content="article"><meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta property="og:url" content="{share_url}"><meta property="og:image" content="{image_url}"><meta property="og:image:type" content="image/png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{image_url}"><style>body{{font-family:Arial,sans-serif;background:#07162d;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0}}.card{{max-width:700px;padding:34px;border:1px solid rgba(212,175,55,.4);border-radius:22px}}small{{color:#d4af37;font-weight:800}}p{{color:#c2d0e2}}a{{display:inline-flex;margin-top:12px;background:#d4af37;color:#07162d;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:800}}</style></head><body><main class="card"><small>{source}</small><h1>{title}</h1><p>{desc}</p><a href="{original}" target="_blank" rel="noopener nofollow">Otvori izvor →</a></main></body></html>'''


def previews(rows):
    made = 0
    errors = []
    for row in rows[:PREVIEW_LIMIT]:
        ident = clean(row.get('id', ''))
        if not ident:
            continue
        row['share_url'] = f'/podijeli/vijest/{ident}/'
        target = SHARE / ident / 'index.html'
        png = IMAGES / f'{ident}.png'
        try:
            if not png.exists():
                make_image(row, png)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(make_page(row, SITE + f'/assets/news-preview/{ident}.png', SITE + row['share_url']), encoding='utf-8')
            made += 1
        except Exception as exc:
            errors.append({'item': ident, 'error': str(exc)[:110]})
    return made, errors


def main():
    conf = read_json('news_config_v2.json', {})
    cutoff = NOW - dt.timedelta(days=max(1, int(conf.get('retention_days', 30))))
    per_source = max(20, min(100, int(conf.get('max_per_source', 60))))
    sources = list(conf.get('sources', [])) + list(conf.get('queries', []))
    rows = []
    errors = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = [pool.submit(fetch_source, source, cutoff, per_source) for source in sources]
        for future in concurrent.futures.as_completed(futures):
            result, error = future.result()
            rows.extend(result)
            if error:
                errors.append(error)

    configured_sources = len(sources)
    failed_sources = len(errors)
    successful_sources = max(0, configured_sources - failed_sources)
    source_success_ratio = round(successful_sources / configured_sources, 4) if configured_sources else 1.0
    source_sync_status = 'complete_by_80_percent_rule' if source_success_ratio >= MIN_SOURCE_SUCCESS_RATIO else 'below_threshold'

    old_public = saved(read_json('news.json', []))
    old_archive = saved(read_json('news_archive.json', []))
    all_rows, removed = unique(
        sorted(rows + old_public + old_archive, key=lambda row: str(row.get('published_at', '')), reverse=True),
        read_json('blocked_news.json', {'urls': [], 'title_terms': []}),
    )
    public = all_rows[:min(PUBLIC_LIMIT, max(1, int(conf.get('max_items', PUBLIC_LIMIT))))]
    overflow = all_rows[len(public):]
    archive = overflow[:ARCHIVE_LIMIT]
    made, preview_errors = previews(public)
    counts = {}
    for row in public:
        counts[row.get('group', 'other')] = counts.get(row.get('group', 'other'), 0) + 1

    status_value = 'ok' if public and source_success_ratio >= MIN_SOURCE_SUCCESS_RATIO else 'degraded'
    status = read_json('update_status.json', {})
    status['updated_at'] = NOW.isoformat()
    status['news'] = {
        'updated_at': NOW.isoformat(),
        'status': status_value,
        'engine': 'single_publication_engine_v1',
        'cadence': CADENCE_LABEL,
        'source_success_policy': 'publish_when_at_least_80_percent_of_sources_are_synced',
        'source_success_threshold': MIN_SOURCE_SUCCESS_RATIO,
        'source_success_ratio': source_success_ratio,
        'source_sync_status': source_sync_status,
        'configured_sources': configured_sources,
        'successful_sources': successful_sources,
        'failed_sources': failed_sources,
        'storage_policy': 'public_latest_500_archive_latest_400_older_overflow_removed',
        'public_items': len(public),
        'max_public_items': PUBLIC_LIMIT,
        'archive_items': len(archive),
        'max_archive_items': ARCHIVE_LIMIT,
        'discarded_archive_overflow_items': max(0, len(overflow) - ARCHIVE_LIMIT),
        'fetched_candidates': len(rows),
        'duplicates_or_blocked_removed': removed,
        'request_timeout_seconds': TIMEOUT,
        'network_workers': WORKERS,
        'share_previews_ready': made,
        'by_group': counts,
        'errors': errors,
        'preview_errors': preview_errors,
    }
    save_json('news.json', public)
    save_json('news_archive.json', archive)
    save_json('update_status.json', status)
    print(json.dumps(status['news'], ensure_ascii=False))

    if not public:
        raise SystemExit('Objava vijesti nije uspjela: javni skup je prazan.')
    if source_success_ratio < MIN_SOURCE_SUCCESS_RATIO:
        raise SystemExit(f'Objava vijesti zaustavljena: uspješno je sinkronizirano samo {source_success_ratio:.0%} izvora, a prag je 80%.')


if __name__ == '__main__':
    main()
