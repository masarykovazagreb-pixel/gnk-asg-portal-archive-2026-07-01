#!/usr/bin/env python3
"""Validate every generated Aktual Media column page against the SEO contract."""
from __future__ import annotations
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
PORTAL = ROOT / "apps" / "portal"
DATA = PORTAL / "data" / "kolumne.json"
REQUIRED = ('<link rel="canonical"','hreflang="hr"','hreflang="en"','hreflang="x-default"','property="og:title"','property="og:description"','property="og:image"','name="twitter:card"','name="twitter:title"','name="twitter:description"','name="twitter:image"','"@type":"OpinionNewsArticle"','"image":{"@type":"ImageObject"','"publisher":{"@type":"Organization"','"logo":{"@type":"ImageObject"','"author":{"@type":"Person","@id":"https://gnk-asg.hr/#nermin-sefic"','"datePublished"')
def main() -> None:
    source = json.loads(DATA.read_text(encoding="utf-8"))
    items = source if isinstance(source, list) else source.get("items", [])
    column_items = [item for item in items if str(item.get("path") or "").startswith("/gnk-aktual/kolumne/")]
    failures=[]
    for item in column_items:
        slug=item["slug"]
        image=item.get("slika","")
        if not (image.startswith("/assets/") or image.startswith("/spt/") or image.startswith("https://")): failures.append(f"{slug}: approved topic image required")
        if not item.get("slika_autor") or not item.get("slika_licenca"): failures.append(f"{slug}: image author/licence required")
        if image.startswith("https://") and not item.get("slika_izvor"): failures.append(f"{slug}: external image source required")
        if not item.get("slika_alt") or not item.get("slika_alt_en"): failures.append(f"{slug}: HR/EN image alt required")
        if str(item.get("objavljeno","")) >= "2026-10-01" and image.startswith("/assets/people/nermin-sefic/"): failures.append(f"{slug}: recent story must use a topic image, not the author portrait")
        for lang,path in (("hr",PORTAL/"gnk-aktual"/"kolumne"/slug/"index.html"),("en",PORTAL/"en"/"gnk-aktual"/"columns"/slug/"index.html")):
            if not path.exists(): failures.append(f"{lang}:{slug}: missing {path.relative_to(ROOT)}"); continue
            text=path.read_text(encoding="utf-8")
            for needle in REQUIRED:
                if needle not in text: failures.append(f"{lang}:{slug}: missing {needle}")
            expected=f"/gnk-aktual/kolumne/{slug}/" if lang=="hr" else f"/en/gnk-aktual/columns/{slug}/"
            if image not in text: failures.append(f"{lang}:{slug}: topic image mismatch")
            if "image-credit" not in text: failures.append(f"{lang}:{slug}: image credit missing")
            if 'data-author-mark="nermin-sefic"' not in text: failures.append(f"{lang}:{slug}: canonical author hashtags missing")
            if expected not in text: failures.append(f"{lang}:{slug}: canonical/route mismatch")
    if failures: raise SystemExit("Aktual column SEO validation failed:\n- " + "\n- ".join(failures))
    print(f"Validated {len(column_items)*2} Aktual Media column pages")
if __name__ == "__main__": main()
