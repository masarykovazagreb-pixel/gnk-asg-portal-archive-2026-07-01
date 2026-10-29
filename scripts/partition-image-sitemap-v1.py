#!/usr/bin/env python3
"""Prepare Cloudflare-safe image sitemaps while preserving every indexed URL.

Only operates in the exact-SHA deployment workspace. Does not update Git.
"""
from __future__ import annotations

import os
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ASSET_LIMIT = 25 * 1024 * 1024
PART_TARGET = 5 * 1024 * 1024
PART_MAX_URLS = 45000
PREFIX = 'https://gnk-asg.hr/image-sitemaps/'
ROOT_PREFIX = 'https://gnk-asg.hr/image-sitemap-'
URL_ENTRY = re.compile(r'<url(?:\s[^>]*)?>.*?</url>', re.DOTALL)


def validate_xml(path: Path) -> None:
    try:
        ET.parse(path)
    except ET.ParseError as exc:
        raise RuntimeError(f'Invalid sitemap XML: {path}: {exc}') from exc


def split_sitemap(portal: Path) -> int:
    original = portal / 'image-sitemap.xml'
    if not original.is_file():
        raise RuntimeError(f'Required image sitemap missing: {original}')
    size = original.stat().st_size
    if size <= ASSET_LIMIT:
        validate_xml(original)
        root = ET.parse(original).getroot()
        if root.tag.endswith('sitemapindex'):
            ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
            targets = root.findall('.//sm:loc', ns)
            if not targets:
                raise RuntimeError('Empty image sitemap index')
            for loc in targets:
                url = loc.text or ''
                # Dva dopuštena oblika: /image-sitemaps/<dio>.xml (izvorni dogovor) i
                # /image-sitemap-NN.xml u korijenu portala (već objavljeni dijelovi).
                if url.startswith(PREFIX):
                    part = portal / 'image-sitemaps' / url[len(PREFIX):]
                elif url.startswith(ROOT_PREFIX) and '/' not in url[len(ROOT_PREFIX):]:
                    part = portal / url[len(ROOT_PREFIX) - len('image-sitemap-'):]
                else:
                    raise RuntimeError(f'Unexpected sitemap target: {url}')
                if not part.is_file() or part.stat().st_size > ASSET_LIMIT:
                    raise RuntimeError(f'Image sitemap part missing/oversized: {part}')
                validate_xml(part)
        print(f'Image sitemap already under asset limit ({size} bytes).')
        return 0

    xml = original.read_text(encoding='utf-8')
    op = re.search(r'<urlset\b[^>]*>', xml)
    cl = re.search(r'</urlset>\s*$', xml)
    if not op or not cl or cl.start() <= op.end():
        raise RuntimeError('Large image sitemap is not a conventional URL set; refusing lossy partition')
    header = xml[:op.end()]
    body = xml[op.end():cl.start()]
    suffix = '\n</urlset>\n'
    if not header.lstrip().startswith('<?xml'):
        raise RuntimeError('Missing XML declaration in oversized image sitemap')

    parts: list[list[str]] = []
    current: list[str] = []
    overhead = len((header + suffix).encode('utf-8'))
    bytes_now = overhead
    previous = 0
    total = 0
    for match in URL_ENTRY.finditer(body):
        if body[previous:match.start()].strip():
            raise RuntimeError('Unexpected content between image sitemap URL entries')
        block = match.group()
        block_bytes = len(block.encode('utf-8')) + 1
        if block_bytes + overhead > PART_TARGET:
            raise RuntimeError('A single image sitemap URL entry exceeds the partition budget')
        if current and (bytes_now + block_bytes > PART_TARGET or len(current) >= PART_MAX_URLS):
            parts.append(current)
            current = []
            bytes_now = overhead
        current.append(block)
        bytes_now += block_bytes
        previous = match.end()
        total += 1
    if body[previous:].strip() or not total:
        raise RuntimeError('Image sitemap has unparsed trailing content or no URL entries')
    if current:
        parts.append(current)

    directory = portal / 'image-sitemaps'
    directory.mkdir(exist_ok=True)
    names = []
    for n, entries in enumerate(parts, start=1):
        name = f'part-{n:04d}.xml'
        target = directory / name
        payload = header + '\n' + '\n'.join(entries) + suffix
        if len(payload.encode('utf-8')) > PART_TARGET:
            raise RuntimeError(f'Partition unexpectedly exceeds target size: {name}')
        target.write_text(payload, encoding='utf-8')
        validate_xml(target)
        names.append(name)
    index = ('<?xml version="1.0" encoding="UTF-8"?>\n'
             '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
             + ''.join(f'  <sitemap><loc>{PREFIX}{name}</loc></sitemap>\n' for name in names)
             + '</sitemapindex>\n')
    ET.fromstring(index)
    # Modify the oversized asset only after all shards validate.
    original.write_text(index, encoding='utf-8')
    print(f'Image sitemap partitioned: {size} source bytes, {total} URL entries, '
          f'{len(names)} validated files, {original.stat().st_size} index bytes.')
    return len(names)


def validate_portal_assets(portal: Path) -> None:
    oversized = []
    for root, _dirs, files in os.walk(portal):
        for filename in files:
            path = Path(root) / filename
            if path.stat().st_size > ASSET_LIMIT:
                oversized.append(str(path.relative_to(portal)))
                if len(oversized) >= 8:
                    break
        if len(oversized) >= 8:
            break
    if oversized:
        raise RuntimeError('Cloudflare 25 MiB asset limit exceeded: ' + ', '.join(oversized))


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit('Usage: partition_image_sitemap_v1.py <apps/portal>')
    portal = Path(sys.argv[1]).resolve()
    split_sitemap(portal)
    validate_portal_assets(portal)
    print('Cloudflare asset size preflight OK.')


if __name__ == '__main__':
    main()
