#!/usr/bin/env python3
"""Regression: Cloudflare 25 MiB limit must not break any image sitemap URLs."""
from pathlib import Path
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

script = Path(__file__).with_name('partition-image-sitemap-v1.py')
with tempfile.TemporaryDirectory() as directory:
    portal = Path(directory)
    entries = '\n'.join(
        f'<url><loc>https://gnk-asg.hr/galerija/{i}/</loc>'
        f'<image:image><image:loc>https://gnk-asg.hr/assets/{i}.jpg</image:loc></image:image></url>'
        for i in range(240000)
    )
    initial = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
        + entries + '\n</urlset>\n'
    )
    sitemap = portal / 'image-sitemap.xml'
    sitemap.write_text(initial, encoding='utf-8')
    assert sitemap.stat().st_size > 25 * 1024 * 1024

    subprocess.run([sys.executable, str(script), str(portal)], check=True)
    ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    index = ET.parse(sitemap).getroot()
    urls = index.findall('.//sm:loc', ns)
    assert len(urls) > 1, 'Expected multiple sitemap partitions'

    count = 0
    for url in urls:
        part = portal / 'image-sitemaps' / url.text.rsplit('/', 1)[-1]
        assert part.stat().st_size <= 25 * 1024 * 1024
        count += len(ET.parse(part).getroot().findall('sm:url', ns))
    assert count == 240000, f'Lost image sitemap URLs: {count}/240000'
    subprocess.run([sys.executable, str(script), str(portal)], check=True)
    print(f'PASS: retained {count} indexed pages in {len(urls)} XML shards.')
