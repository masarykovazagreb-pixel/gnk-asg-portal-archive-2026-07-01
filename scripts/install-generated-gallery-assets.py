from __future__ import annotations

import base64
import hashlib
import json
import shutil
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
STAGING = ROOT / "staging" / "generated-gallery"
MANIFEST_PATH = STAGING / "manifest.json"
CATALOG_PATH = ROOT / "apps" / "portal" / "data" / "generated-gallery-30.json"
VISUAL_GALLERY_PATH = ROOT / "apps" / "portal" / "data" / "visual_gallery.json"
TARGET_DIR = ROOT / "apps" / "portal" / "assets" / "seo-gallery" / "generated-2026-06"
AUTO_EDITOR_CATALOG = ROOT / "apps" / "portal" / "data" / "auto-editor-image-catalog.json"
IMAGE_SITEMAP = ROOT / "apps" / "portal" / "data" / "generated-gallery-30-image-sitemap.xml"
REPORT_PATH = ROOT / "apps" / "portal" / "data" / "generated-gallery-install-report.json"


def fail(message: str) -> None:
    raise SystemExit(message)


def main() -> None:
    if not MANIFEST_PATH.exists():
        fail("Missing staging manifest")

    staging_manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    parts = sorted(STAGING.glob("part-*.b64"))
    expected_parts = int(staging_manifest["parts"])
    if len(parts) != expected_parts:
        fail(f"Expected {expected_parts} parts, found {len(parts)}")

    encoded = "".join(path.read_text(encoding="ascii").strip() for path in parts)
    archive_bytes = base64.b64decode(encoded, validate=True)
    actual_sha = hashlib.sha256(archive_bytes).hexdigest()
    if actual_sha != staging_manifest["sha256"]:
        fail(f"SHA256 mismatch: {actual_sha}")

    archive_path = STAGING / "gallery.zip"
    archive_path.write_bytes(archive_bytes)
    TARGET_DIR.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(archive_path) as archive:
        names = [name for name in archive.namelist() if name.lower().endswith(".webp")]
        if len(names) != 30:
            fail(f"Expected 30 WebP files, found {len(names)}")
        for name in names:
            destination = TARGET_DIR / Path(name).name
            with archive.open(name) as source, destination.open("wb") as target:
                shutil.copyfileobj(source, target)
            if destination.stat().st_size < 20_000:
                fail(f"Image too small: {destination.name}")

    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    ready_items = []
    for item in catalog["items"]:
        filename = item["file"]
        local_path = TARGET_DIR / filename
        if not local_path.exists():
            fail(f"Catalog image missing: {filename}")
        item["status"] = "ready"
        item["eligible"] = True
        item["url"] = f"/assets/seo-gallery/generated-2026-06/{filename}"
        item["src"] = item["url"]
        item["width"] = 2048
        item["height"] = 1152
        item["mimeType"] = "image/webp"
        ready_items.append(item)

    catalog["productionLocked"] = True
    catalog["uploadRequired"] = False
    catalog["readyCount"] = len(ready_items)
    catalog["updatedAt"] = datetime.now(timezone.utc).isoformat()
    CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    visual = json.loads(VISUAL_GALLERY_PATH.read_text(encoding="utf-8"))
    existing = {entry.get("id"): entry for entry in visual.get("items", [])}
    for item in ready_items:
        existing[item["id"]] = {
            "id": item["id"],
            "src": item["url"],
            "topic": [item["category"], item["title"]],
            "countries": [],
            "title": item["title"],
            "alt": item["alt"],
            "description": item["caption"],
            "caption": item["caption"],
            "credit": item["credit"],
            "width": 2048,
            "height": 1152,
            "mimeType": "image/webp",
            "autoEditorEligible": True,
        }
    visual["items"] = list(existing.values())
    visual.setdefault("album", {})["updated_at"] = datetime.now(timezone.utc).date().isoformat()
    visual["album"]["generated_ready_count"] = len(ready_items)
    VISUAL_GALLERY_PATH.write_text(json.dumps(visual, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    auto_catalog = {
        "schemaVersion": 1,
        "version": "2026-06-20-generated-gallery-ready-v1",
        "selectionRules": {
            "exactTopicFirst": True,
            "categoryFallback": True,
            "leastRecentlyUsed": True,
            "preventReuseDays": 7,
            "fallback": "https://gnk-asg.hr/assets/gnk-asg-social-card.png",
        },
        "items": ready_items,
    }
    AUTO_EDITOR_CATALOG.write_text(json.dumps(auto_catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    image_nodes = []
    for item in ready_items:
        image_nodes.append(
            "<url><loc>https://gnk-asg.hr/visual-index/</loc>"
            f"<image:image><image:loc>https://gnk-asg.hr{escape(item['url'])}</image:loc>"
            f"<image:title>{escape(item['title'])}</image:title>"
            f"<image:caption>{escape(item['caption'])}</image:caption>"
            "</image:image></url>"
        )
    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
        + "\n".join(image_nodes)
        + "\n</urlset>\n"
    )
    IMAGE_SITEMAP.write_text(sitemap, encoding="utf-8")

    report = {
        "ok": True,
        "installed": len(ready_items),
        "sha256": actual_sha,
        "target": str(TARGET_DIR.relative_to(ROOT)),
        "catalog": str(CATALOG_PATH.relative_to(ROOT)),
        "visualGallery": str(VISUAL_GALLERY_PATH.relative_to(ROOT)),
        "autoEditorCatalog": str(AUTO_EDITOR_CATALOG.relative_to(ROOT)),
        "imageSitemap": str(IMAGE_SITEMAP.relative_to(ROOT)),
        "productionChanged": False,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    shutil.rmtree(STAGING)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
