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


def page_route(relative: str) -> str:
    if relative == "index.html":
        return "/"
    return "/" + relative.removesuffix("index.html")


def page_url(relative: str) -> str:
    return "https://gnk-asg.hr" + page_route(relative)


def public_page_records(errors: list[str]) -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    for relative in REQUIRED_HTML:
        path = PORTAL / relative
        text = path.read_text(encoding="utf-8", errors="replace").lower() if path.is_file() else ""
        title_ok = "<title" in text
        description_ok = 'name="description"' in text or "name='description'" in text
        canonical_ok = 'rel="canonical"' in text or "rel='canonical'" in text
        valid = path.is_file() and title_ok and description_ok and canonical_ok
        route = page_route(relative)
        file_path = f"apps/portal/{relative}"
        records.append({
            "route": route,
            "path": file_path,
            "file": file_path,
            "url": page_url(relative),
            "exists": path.is_file(),
            "title": title_ok,
            "titleOk": title_ok,
            "description": description_ok,
            "descriptionOk": description_ok,
            "canonical": canonical_ok,
            "canonicalOk": canonical_ok,
            "ok": valid,
            "valid": valid,
            "errors": [error for error in errors if file_path in error],
        })
    return records


def write_report(*, errors: list[str], sitemap_locations: list[str]) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    passed = not errors
    pages = public_page_records(errors)
    generated_at = datetime.now(timezone.utc).isoformat()
    report = {
        "ok": passed,
        "valid": passed,
        "status": "passed" if passed else "failed",
        "generated_at": generated_at,
        "generatedAt": generated_at,
        "generator": "finalize_sitewide_seo.py",
        "publicPages": pages,
        "publicPageCount": len(pages),
        "pages": pages,
        "routes": [page["route"] for page in pages],
        "sitemapUrls": sitemap_locations,
        "sitemapUrlCount": len(sitemap_locations),
        "requiredUrls": list(REQUIRED_URLS),
        "summary": {
            "passed": passed,
            "failed": not passed,
            "error_count": len(errors),
            "errorCount": len(errors),
            "html_pages_checked": len(REQUIRED_HTML),
            "publicPages": len(pages),
            "publicPageCount": len(pages),
            "required_urls_checked": len(REQUIRED_URLS),
            "sitemap_url_count": len(sitemap_locations),
            "sitemapUrlCount": len(sitemap_locations),
        },
        "checks": {
            "html_metadata": {"ok": all(page["ok"] for page in pages), "pages": pages},
            "sitemap": {"ok": all(url in sitemap_locations for url in REQUIRED_URLS), "required_urls": list(REQUIRED_URLS), "locations": sitemap_locations},
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
    path.write_text(text.replace("</urlset>", "\n".join(additions) + "\n</urlset>"), encoding="utf-8")
    print(f"Added {len(additions)} required sitemap entries during finalization.")


def validate_html() -> list[str]:
    errors: list[str] = []
    for relative in REQUIRED_HTML:
        path = PORTAL / relative
        if not path.is_file():
            errors.append(f"missing HTML file: apps/portal/{relative}")
            continue
        text = path.read_text(encoding="utf-8", errors="replace").lower()
        checks = {"title": "<title", "description": 'name="description"', "canonical": 'rel="canonical"'}
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
    errors = [f"sitemap.xml missing URL: {url}" for url in REQUIRED_URLS if url not in locations]
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
