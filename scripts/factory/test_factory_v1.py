#!/usr/bin/env python3
"""Gate for the factory standard (read-only).

Fails if any indexable page lacks the visible entity line or the owner
hashtags, or if a meta description is longer than 160 displayed characters.
Thresholds are the current measured state, so regressions fail CI.
"""
import json
import os
import subprocess
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))


def main():
    subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "factory", "audit_portal.py")],
                   check=True, stdout=subprocess.DEVNULL)
    with open(os.path.join(ROOT, "artifacts", "factory", "audit.json"), encoding="utf-8") as f:
        a = json.load(f)
    failures = []
    if a["missing_entity"]:
        failures.append(f"missing entities: {a['missing_entity']}")
    if a["pages_with_owner_hashtags"] != a["indexable_pages"]:
        failures.append(f"owner hashtags on {a['pages_with_owner_hashtags']}/{a['indexable_pages']} pages")
    if a["meta_description"].get("long", 0) > 0:
        failures.append(f"meta descriptions over 160 chars: {a['meta_description']['long']}")
    if a["broken_local_images"] > 11:
        failures.append(f"broken local images rose to {a['broken_local_images']} (baseline 11 = /api/img)")
    if a["broken_internal_links"] > 2:
        failures.append(f"broken internal links rose to {a['broken_internal_links']} (baseline 2)")
    # radio promo blok (faza 6): idempotentnost na svim stranicama
    rc = subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "factory", "radio_promo_v1.py"), "--check"],
                        capture_output=True, text=True)
    if rc.returncode:
        failures.append("radio promo block drift: " + rc.stdout.strip()[-200:])
    # kvaliteta slika (faza 5): nečitljive slike ne smiju rasti (početno stanje 5)
    subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "factory", "image_quality.py")],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with open(os.path.join(ROOT, "artifacts", "factory", "image-quality.json"), encoding="utf-8") as f:
        iq = json.load(f)["summary"]["flag_counts"]
    if iq.get("necitljiva", 0) > 5:
        failures.append(f"unreadable images rose to {iq.get('necitljiva')} (baseline 5)")
    for f in failures:
        print("FAIL", f)
    print(json.dumps({"indexable": a["indexable_pages"], "failures": failures}, ensure_ascii=False))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
