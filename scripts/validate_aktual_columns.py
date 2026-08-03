#!/usr/bin/env python3
"""Validate every generated Aktual Media column page against the SEO contract."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PORTAL = ROOT / "apps" / "portal"
DATA = PORTAL / "data" / "kolumne.json"

REQUIRED = (
    '<link rel="canonical"',
    'hreflang="hr"',
    'hreflang="en"',
    'hreflang="x-default"',
    'property="og:title"',
    'property="og:description"',
    'property="og:image"',
    'name="twitter:card"',
    'name="twitter:title"',
    'name="twitter:description"',
    'name="twitter:image"',
    '"@type":"OpinionNewsArticle"',
    '"image":{"@type":"ImageObject"',
    '"publisher":{"@type":"Organization"',
    '"logo":{"@type":"ImageObject"',
    '"author":{"@type":"Person","name":"Nermin Sefić"}',
    '"datePublished"',
)


def main() -> None:
    items = json.loads(DATA.read_text(encoding="utf-8")).get("items", [])
    failures: list[str] = []
    for item in items:
        slug = item["slug"]
        for lang, path in (
            ("hr", PORTAL / "gnk-aktual" / "kolumne" / slug / "index.html"),
            ("en", PORTAL / "en" / "gnk-aktual" / "columns" / slug / "index.html"),
        ):
            if not path.exists():
                failures.append(f"{lang}:{slug}: missing {path.relative_to(ROOT)}")
                continue
            text = path.read_text(encoding="utf-8")
            for needle in REQUIRED:
                if needle not in text:
                    failures.append(f"{lang}:{slug}: missing {needle}")
            expected_path = f"/gnk-aktual/kolumne/{slug}/" if lang == "hr" else f"/en/gnk-aktual/columns/{slug}/"
            if expected_path not in text:
                failures.append(f"{lang}:{slug}: canonical/route mismatch")
    if failures:
        raise SystemExit("Aktual column SEO validation failed:\n- " + "\n- ".join(failures))
    print(f"Validated {len(items) * 2} Aktual Media column pages")


if __name__ == "__main__":
    main()
