#!/usr/bin/env python3
"""Finalize and strictly validate committed site-wide SEO artifacts."""
from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[3]
PORTAL = ROOT / "apps/portal"
REPORT_PATH = PORTAL / "data" / "seo-report.json"

REQUIRED_HTML = (
    "index.html",
    "en/index.html",
    "digital-workforce/index.html",
    "editor-desk/index.html",
    "objave/index.html",
    "analize/index.html",
    "komentari/index.html",
    "en/publications/index.html",
    "en/analyses/index.html",
    "en/commentary/index.html",
)

REQUIRED_URLS = (
    "https://gnk-asg.hr/",
    "https://gnk-asg.hr/en/",
    "https://gnk-asg.hr/digital-workforce/",
    "https://gnk-asg.hr/editor-desk/",
)

SITEMAP_ENTRIES = (
    ("https://gnk-asg.hr/digital-workforce/", "2026-07-15", "weekly", "0.8"),
    ("https://gnk-asg.hr/editor-desk/", "2026-07-15", "daily", "0.8"),
)


def write_report(*, errors: list[str], sitemap_locations: list[str]) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    passed = not errors
    report = {
        "ok": passed,
        "status": "passed" if passed else "failed",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generator": "finalize_sitewide_seo.py",
        "summary": {
            "passed": passed,
            "failed": not passed,
            "error_count": len(errors),
            "html_pages_checked": len(REQUIRED_HTML),
            "required_urls_checked": len(REQUIRED_URLS),
            "sitemap_url_count": len(sitemap_locations),
        },
        "checks": {
            "html_metadata": {"ok": passed, "pages": list(REQUIRED_HTML)},
            "sitemap": {"ok": passed, "required_urls": list(REQUIRED_URLS), "locations": sitemap_locations},
            "robots": {"ok": passed, "sitemap_directive": "https://gnk-asg.hr/sitemap.xml"},
        },
        "errors": errors,
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"SEO report written to {REPORT_PATH.relative_to(ROOT)}.")


def fail(messages: list[str], sitemap_locations: list[str] | None = None) -> None:
    write_report(errors=messages, sitemap_locations=sitemap_locations or [])
    formatted = "\n".join(f" - {message}" for message in messages)
    raise SystemExit(f"Site-wide SEO finalization failed:\n{formatted}")


def ensure_required_sitemap_entries() -> None:
    path = PORTAL / "sitemap.xml"
    if not path.is_file():
        fail(["missing apps/portal/sitemap.xml"])
    text = path.read_text(encoding="utf-8")
    additions: list[str] = []
    for url, lastmod, changefreq, priority in SITEMAP_ENTRIES:
        if url not in text:
            additions.append(
                f"  <url><loc>{url}</loc><lastmod>{lastmod}</lastmod>"
                f"<changefreq>{changefreq}</changefreq><priority>{priority}</priority></url>"
            )
    if not additions:
        return
    if "</urlset>" not in text:
        fail(["sitemap.xml has no closing urlset tag"])
    updated = text.replace("</urlset>", "\n".join(additions) + "\n</urlset>")
    path.write_text(updated, encoding="utf-8")
    print(f"Added {len(additions)} required sitemap entries during finalization.")


def validate_html() -> list[str]:
    errors: list[str] = []
    for relative in REQUIRED_HTML:
        path = PORTAL / relative
        if not path.is_file():
            errors.append(f"missing HTML file: apps/portal/{relative}")
            continue
        text = path.read_text(encoding="utf-8", errors="replace").lower()
        checks = {
            "title": "<title",
            "description": 'name="description"',
            "canonical": 'rel="canonical"',
        }
        for label, marker in checks.items():
            if marker not in text and marker.replace('"', "'") not in text:
                errors.append(f"apps/portal/{relative}: missing {label}")
    return errors


def sitemap_locations() -> tuple[list[str], list[str]]:
    path = PORTAL / "sitemap.xml"
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        return [], [f"sitemap.xml is not valid XML: {exc}"]
    namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locations = sorted({(node.text or "").strip() for node in root.findall("s:url/s:loc", namespace)})
    errors: list[str] = []
    for url in REQUIRED_URLS:
        if url not in locations:
            errors.append(f"sitemap.xml missing URL: {url}")
    if "" in locations:
        errors.append("sitemap.xml contains an empty URL")
    return locations, errors


def validate_robots() -> list[str]:
    path = PORTAL / "robots.txt"
    if not path.is_file():
        return ["missing apps/portal/robots.txt"]
    text = path.read_text(encoding="utf-8", errors="replace").lower()
    errors: list[str] = []
    if "sitemap:" not in text:
        errors.append("robots.txt missing Sitemap directive")
    if "gnk-asg.hr/sitemap.xml" not in text:
        errors.append("robots.txt Sitemap directive does not point to gnk-asg.hr/sitemap.xml")
    return errors


def main() -> int:
    ensure_required_sitemap_entries()
    locations, sitemap_errors = sitemap_locations()
    errors = [*validate_html(), *sitemap_errors, *validate_robots()]
    if errors:
        fail(errors, locations)
    write_report(errors=[], sitemap_locations=locations)
    print("Site-wide SEO finalization passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
