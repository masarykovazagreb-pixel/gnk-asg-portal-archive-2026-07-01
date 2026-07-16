#!/usr/bin/env python3
"""Strict, deterministic and read-only validation of committed SEO sources."""
from __future__ import annotations

from datetime import datetime, timezone
from html import unescape
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[3]
PORTAL = ROOT / "apps/portal"
REPORT_PATH = PORTAL / "data" / "seo-report.json"

REQUIRED_HTML = (
    "index.html", "en/index.html", "contact/index.html", "media-application/index.html",
    "the-code/index.html", "publications/index.html", "digital-workforce/index.html",
    "editor-desk/index.html", "objave/index.html", "analize/index.html", "komentari/index.html",
    "en/publications/index.html", "en/analyses/index.html", "en/commentary/index.html",
)
REQUIRED_URLS = (
    "https://gnk-asg.hr/", "https://gnk-asg.hr/en/",
    "https://gnk-asg.hr/digital-workforce/", "https://gnk-asg.hr/editor-desk/",
)


def route_for(relative: str) -> str:
    return "/" if relative == "index.html" else "/" + relative.removesuffix("index.html")


def url_for(relative: str) -> str:
    return "https://gnk-asg.hr" + route_for(relative)


def first(pattern: str, text: str) -> str:
    match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return ""
    return unescape(re.sub(r"\s+", " ", match.group(1)).strip())


def meta(name: str, text: str) -> str:
    for pattern in (
        rf'<meta[^>]+name=["\']{re.escape(name)}["\'][^>]+content=["\']([^"\']*)["\']',
        rf'<meta[^>]+content=["\']([^"\']*)["\'][^>]+name=["\']{re.escape(name)}["\']',
    ):
        value = first(pattern, text)
        if value:
            return value
    return ""


def canonical(text: str) -> str:
    for pattern in (
        r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']*)["\']',
        r'<link[^>]+href=["\']([^"\']*)["\'][^>]+rel=["\']canonical["\']',
    ):
        value = first(pattern, text)
        if value:
            return value
    return ""


def annotate(path: str, message: str) -> None:
    safe = message.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
    print(f"::error file={path}::{safe}", file=sys.stderr)


def page_records() -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    for relative in REQUIRED_HTML:
        path = PORTAL / relative
        exists = path.is_file()
        text = path.read_text(encoding="utf-8", errors="replace") if exists else ""
        expected = url_for(relative)
        title = first(r"<title[^>]*>(.*?)</title>", text)
        description = meta("description", text)
        found_canonical = canonical(text)
        errors: list[str] = []
        if not exists:
            errors.append("missing_file")
        if not title:
            errors.append("missing_title")
        if not description:
            errors.append("missing_description")
        if not found_canonical:
            errors.append("missing_canonical")
        elif found_canonical != expected:
            errors.append(f"canonical_mismatch:{found_canonical}")
        valid = not errors
        records.append({
            "route": route_for(relative), "path": f"apps/portal/{relative}",
            "file": f"apps/portal/{relative}", "url": expected,
            "title": title, "description": description, "canonical": found_canonical,
            "expectedCanonical": expected, "exists": exists, "titleOk": bool(title),
            "descriptionOk": bool(description), "canonicalOk": found_canonical == expected,
            "ok": valid, "valid": valid, "errors": errors,
        })
    return records


def validate_xml(relative: str) -> tuple[list[str], list[str]]:
    path = PORTAL / relative
    if not path.is_file():
        return [], [f"missing apps/portal/{relative}"]
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        return [], [f"{relative} is not valid XML: {exc}"]
    locations: list[str] = []
    if relative == "sitemap.xml":
        namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        locations = sorted({(node.text or "").strip() for node in root.findall("s:url/s:loc", namespace)})
        missing = [url for url in REQUIRED_URLS if url not in locations]
        return locations, [f"sitemap.xml missing URL: {url}" for url in missing]
    return locations, []


def write_report(pages: list[dict[str, object]], sitemap_urls: list[str], errors: list[str]) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now(timezone.utc).isoformat()
    passed = not errors
    report = {
        "ok": passed, "valid": passed, "status": "passed" if passed else "failed",
        "generated_at": generated_at, "generatedAt": generated_at,
        "generator": "finalize_sitewide_seo.py", "publicPages": pages,
        "publicPageCount": len(pages), "pages": pages,
        "routes": [page["route"] for page in pages], "sitemapUrls": sitemap_urls,
        "sitemapUrlCount": len(sitemap_urls), "requiredUrls": list(REQUIRED_URLS),
        "summary": {
            "passed": passed, "failed": not passed, "error_count": len(errors),
            "errorCount": len(errors), "html_pages_checked": len(REQUIRED_HTML),
            "publicPages": len(pages), "publicPageCount": len(pages),
            "required_urls_checked": len(REQUIRED_URLS), "sitemap_url_count": len(sitemap_urls),
            "sitemapUrlCount": len(sitemap_urls),
        },
        "checks": {
            "html_metadata": {"ok": all(page["ok"] for page in pages), "pages": pages},
            "sitemap": {"ok": not any("sitemap.xml" in error for error in errors), "required_urls": list(REQUIRED_URLS), "locations": sitemap_urls},
            "robots": {"ok": not any("robots.txt" in error for error in errors), "sitemap_directive": "https://gnk-asg.hr/sitemap.xml"},
        },
        "errors": errors,
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    pages = page_records()
    errors: list[str] = []
    for page in pages:
        for error in page["errors"]:
            message = f"{page['path']}: {error}; expected canonical {page['expectedCanonical']}"
            errors.append(message)
            annotate(str(page["path"]), message)

    sitemap_urls, sitemap_errors = validate_xml("sitemap.xml")
    _, image_sitemap_errors = validate_xml("image-sitemap.xml")
    errors.extend(sitemap_errors)
    errors.extend(image_sitemap_errors)
    for message in [*sitemap_errors, *image_sitemap_errors]:
        annotate("apps/portal/sitemap.xml" if message.startswith("sitemap") else "apps/portal/image-sitemap.xml", message)

    robots_path = PORTAL / "robots.txt"
    if not robots_path.is_file():
        errors.append("missing apps/portal/robots.txt")
        annotate("apps/portal/robots.txt", "missing robots.txt")
    else:
        robots = robots_path.read_text(encoding="utf-8", errors="replace").lower()
        if "sitemap:" not in robots or "gnk-asg.hr/sitemap.xml" not in robots:
            errors.append("robots.txt Sitemap directive is missing or non-canonical")
            annotate("apps/portal/robots.txt", "Sitemap directive is missing or non-canonical")

    write_report(pages, sitemap_urls, errors)
    if errors:
        print("Site-wide SEO finalization failed:", file=sys.stderr)
        for error in errors:
            print(f" - {error}", file=sys.stderr)
        return 1
    print("Site-wide SEO finalization passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
