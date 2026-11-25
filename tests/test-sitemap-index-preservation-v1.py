#!/usr/bin/env python3
"""The legacy generator may not erase independently maintained sitemap entries."""
import importlib.util
import pathlib
import xml.etree.ElementTree as ET

root = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('generate_sitemaps', root / 'scripts/generate-sitemaps.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
existing = (root / 'apps/portal/sitemap-index.xml').read_text(encoding='utf-8')
targets = {'sitemap.xml', 'editorial-sitemap.xml', 'visual-sitemap.xml'}
output = module.preserve_sitemap_index(existing, targets)

def entries(xml):
    return {e.find('s:loc',ns).text: e.findtext('s:lastmod', default=None, namespaces=ns) for e in ET.fromstring(xml).findall('s:sitemap',ns)}

before, after = entries(existing), entries(output)
assert set(before) <= set(after), 'other sitemaps were lost'
for url, lastmod in before.items():
    if url.rsplit('/',1)[-1] not in targets:
        assert after[url] == lastmod, f'changed unrelated lastmod: {url}'
for name in targets:
    assert module.BASE_URL+'/'+name in after and after[module.BASE_URL+'/'+name] is None
assert entries(module.preserve_sitemap_index(output,targets)) == after
assert 'https://gnk-asg.hr/en/gnk-aktual/media/sitemap.xml' in after
assert 'https://gnk-asg.hr/kanal/zagreb/sitemap.xml' in after
try:
    module.preserve_sitemap_index('<invalid/>',targets)
    raise AssertionError('invalid sitemap index accepted')
except ValueError:
    pass
print(f'PASS: preserves {len(before)} registered sitemaps and does not invent lastmod')
