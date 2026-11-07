#!/usr/bin/env python3
"""Validate downloaded feed/sitemap structure without fetching remote resources."""
import pathlib
import sys
import xml.etree.ElementTree as ET


def check(path, kind):
    raw = pathlib.Path(path).read_bytes()
    if len(raw) > 10_000_000 or b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
        raise ValueError(f'{kind}: XML size or declaration rejected')
    root = ET.fromstring(raw)
    local = lambda tag: tag.rsplit('}', 1)[-1].lower()
    if kind == 'feed':
        if local(root.tag) not in {'rss', 'feed'} or not any(local(x.tag) in {'item', 'entry'} for x in root.iter()):
            raise ValueError('feed: missing root or entries')
    elif kind == 'sitemap':
        if local(root.tag) not in {'urlset', 'sitemapindex'}:
            raise ValueError('sitemap: invalid root')
        if not any(local(x.tag) == 'loc' and (x.text or '').strip().startswith('https://gnk-asg.hr/') for x in root.iter()):
            raise ValueError('sitemap: no canonical location')
    else:
        raise ValueError('unknown XML kind')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('usage: world201-xml-proof-v1.py response-directory')
    try:
        directory = pathlib.Path(sys.argv[1])
        check(directory / 'feed.body', 'feed')
        check(directory / 'sitemap.body', 'sitemap')
    except (OSError, ValueError, ET.ParseError) as exc:
        print(f'XML proof failed: {exc}', file=sys.stderr)
        raise SystemExit(1)
    print('Feed and sitemap XML validated.')
