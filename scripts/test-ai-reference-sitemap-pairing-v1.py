#!/usr/bin/env python3
import importlib.util
from pathlib import Path

script = Path(__file__).with_name("generate-sitemaps.py")
spec = importlib.util.spec_from_file_location("sitemap_builder", script)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

entries = [
    ("https://gnk-asg.hr/ai/", "2026-10-16", "main"),
    ("https://gnk-asg.hr/ai/hr/", "2026-10-16", "main"),
]
xml = module.render_urlset(entries)
expected = {
    'hreflang="en" href="https://gnk-asg.hr/ai/"',
    'hreflang="hr" href="https://gnk-asg.hr/ai/hr/"',
    'hreflang="x-default" href="https://gnk-asg.hr/ai/"',
}
for marker in expected:
    assert marker in xml, f"Generated sitemap is missing alternate: {marker}"
assert xml.count('hreflang="x-default"') == 2, "Both localized routes need reciprocal x-default annotations."
print("AI English/Croatian sitemap pairing and x-default contract: PASS")
