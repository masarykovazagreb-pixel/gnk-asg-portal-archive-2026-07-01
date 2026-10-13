#!/usr/bin/env python3
"""Validate every generated Aktual Media column page against the SEO contract."""
from __future__ import annotations
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
PORTAL = ROOT / "apps" / "portal"
DATA = PORTAL / "data" / "kolumne.json"
REQUIRED = ('<link rel="canonical"','hreflang="hr"','hreflang="en"','hreflang="x-default"','property="og:title"','property="og:description"','property="og:image"','name="twitter:card"','name="twitter:title"','name="twitter:description"','name="twitter:image"','"@type":"OpinionNewsArticle"','"image":{"@type":"ImageObject"','"publisher":{"@type":"Organization"','"logo":{"@type":"ImageObject"','"author":{"@type":"Person","@id":"https://gnk-asg.hr/nermin-sefic/#person"','"datePublished"','data-author-mark="nermin-sefic"')
def main() -> None:
    items = json.loads(DATA.read_text(encoding="utf-8")).get("items", [])
    failures=[]
    for item in items:
        slug=item["slug"]
        image=item.get("slika","")
        is_remote=image.startswith("http://") or image.startswith("https://")
        is_local=image.startswith("/assets/") or image.startswith("/spt/")
        if not image: failures.append(f"{slug}: image required")
        elif not (is_remote or is_local): failures.append(f"{slug}: image must be approved local asset or absolute URL")
        if is_remote and not (item.get("slika_autor") and item.get("slika_licenca") and item.get("slika_izvor")):
            failures.append(f"{slug}: remote image requires author, licence and source URL")
        if not item.get("slika_alt") or not item.get("slika_alt_en"): failures.append(f"{slug}: HR/EN image alt required")
        for lang,path in (("hr",PORTAL/"gnk-aktual"/"kolumne"/slug/"index.html"),("en",PORTAL/"en"/"gnk-aktual"/"columns"/slug/"index.html")):
            if not path.exists(): failures.append(f"{lang}:{slug}: missing {path.relative_to(ROOT)}"); continue
            text=path.read_text(encoding="utf-8")
            for needle in REQUIRED:
                if needle not in text: failures.append(f"{lang}:{slug}: missing {needle}")
            expected=f"/gnk-aktual/kolumne/{slug}/" if lang=="hr" else f"/en/gnk-aktual/columns/{slug}/"
            if image not in text: failures.append(f"{lang}:{slug}: topic image mismatch")
            if expected not in text: failures.append(f"{lang}:{slug}: canonical/route mismatch")
    if failures: raise SystemExit("Aktual column SEO validation failed:\n- " + "\n- ".join(failures))
    print(f"Validated {len(items)*2} Aktual Media column pages")
if __name__ == "__main__": main()
