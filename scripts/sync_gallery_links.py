#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path.cwd()
PORTAL = ROOT / "apps" / "portal"
HR_INDEX = PORTAL / "visual-index" / "index.html"
EN_INDEX = PORTAL / "en" / "visual-index" / "index.html"
VG = json.loads((PORTAL / "data" / "visual_gallery.json").read_text(encoding="utf-8"))

items = sorted(VG.get("items", []), key=lambda x: x["id"])

hr_links = "".join(f'<li><a href="/visual-index/{it["id"]}/">{it["title"]}</a></li>' for it in items)
hr_html = HR_INDEX.read_text(encoding="utf-8")
hr_start = hr_html.find('<ul class="visual-index-static-links">')
hr_end = hr_html.find('</ul>', hr_start)
if hr_start < 0 or hr_end < 0:
    raise SystemExit('HR visual-index static-link marker missing')
hr_html = hr_html[:hr_start] + f'<ul class="visual-index-static-links">{hr_links}</ul>' + hr_html[hr_end+5:]
HR_INDEX.write_text(hr_html, encoding="utf-8")

en_links = "".join(f'<li><a href="/en/visual-index/{it["id"]}/">{it["title"]}</a></li>' for it in items)
en_html = EN_INDEX.read_text(encoding="utf-8")
en_start = en_html.find('<ul class="visual-index-static-links">')
en_end = en_html.find('</ul>', en_start)
if en_start < 0 or en_end < 0:
    raise SystemExit('EN visual-index static-link marker missing')
en_html = en_html[:en_start] + f'<ul class="visual-index-static-links">{en_links}</ul>' + en_html[en_end+5:]
EN_INDEX.write_text(en_html, encoding="utf-8")

print(f"Synced {len(items)} items to HR and EN visual-index pages.")
