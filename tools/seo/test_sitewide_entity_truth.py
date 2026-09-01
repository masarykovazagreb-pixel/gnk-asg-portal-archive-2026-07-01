#!/usr/bin/env python3
"""Regression gate for truth-conditional sitewide entity SEO.

Global runtime may always emit Organization/WebSite; Person/GNK DINAMO/author
signals must activate only from page-local evidence.
"""
from pathlib import Path
import re

TARGET = Path('workers/gnk-asg-direct-operator/src/sitewide-entity-seo-v1.js')
text = TARGET.read_text(encoding='utf-8')
checks = {
    'truth helper exists': 'function pageTruth(html)' in text,
    'person relevance is conditional': 'if(truth.person)' in text,
    'group relevance is conditional': 'if(truth.group)' in text,
    'author metadata is conditional': 'truth.explicitAuthor?' in text and 'authorMeta' in text,
    'global keyword stuffing removed': '<meta name="keywords"' not in text,
    'global person-first graph removed': not re.search(r"const graph=\[\s*\{\s*'@type':'Person'", text),
    'organization remains global': "'@type':'Organization'" in text and "'@id':`${ORIGIN}/#organization`" in text,
    'website remains global': "'@type':'WebSite'" in text,
    'truth version marker present': 'TRUTH_CONDITIONAL' in text,
}
failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items(): print(f"{'PASS' if ok else 'FAIL'}: {name}")
if failed: raise SystemExit('sitewide entity truth regression: ' + ', '.join(failed))
print(f'PASS: {len(checks)} sitewide entity truth invariants')
