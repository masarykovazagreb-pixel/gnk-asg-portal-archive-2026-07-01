#!/usr/bin/env python3
"""Finalize and strictly validate committed site-wide SEO artifacts."""
from __future__ import annotations

from datetime import datetime, timezone
from html import unescape
import json
from pathlib import Path
import re
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


def extract_first(pattern: str, text: str) -> str:
    match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return ""
    return unescape(re.sub(r"\s+", " ", match.group(1)).strip())


def extract_meta(name: str, text: str) -> str:
    patterns = (
        rf'<meta[^>]+name=["\']{re.escape(name)}["\'][^>]+content=["\']([^"\']*)["\']',
        rf'<meta[^>]+content=["\']([^"\']*)["\'][^>]+name=["\']{re.escape(name)}["\']',
    )
    for pattern in patterns:
        value = extract_first(pattern, text)
        if value:
            return value
    return ""


def extract_link(rel: str, text: str) -> str:
    patterns = (
        rf'<link[^>]+rel=["\']{re.escape(rel)}["\'][^>]+href=["\']([^"\']*)["\']',
        rf'<link[^>]+href=["\']([^"\']*)["\'][^>]+rel=["\']{re.escape(rel)}["\']',
    )
    for pattern in patterns:
        value = extract_first(pattern, text)
        if value:
            return value
    return ""


def public_page_records() -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    for relative in REQUIRED_HTML:
        path = PORTAL / relative
        exists = path.is_file()
        text = path.read_text(encoding="utf-8", errors="replace") if exists else ""
        route = page_route(relative)
        expected_url = page_url(relative)
        title = extract_first(r"<title[^>]*>(.*?)</title>", text)
        description = extract_meta("description", text)
        canonical = extract_link("canonical", text)
        title_ok = bool(title)
        description_ok = bool(description)
        canonical_ok = canonical == expected_url
        page_errors: list[str] = []
        if not exists:
            page_errors.append("missing_file")
        if not title_ok:
            page_errors.append("missing_title")
        if not description_ok:
            page_errors.append("missing_description")
        if not canonical:
            page_errors.append("missing_canonical")
        elif not canonical_ok:
            page_errors.append("canonical_mismatch")
        valid = exists and title_ok and description_ok and canonical_ok
        records.append({
            "route": route,
            "path": f"apps/portal/{relative}",
            "file": f"apps/portal/{relative}",
            "url": expected_url,
            "title": title,
            "description": description,
            "canonical": canonical,
            "expectedCanonical": expected_url,
            "exists": exists,
            "titleOk": title_ok,
            "descriptionOk": description_ok,
            "canonicalOk": canonical_ok,
            "ok": valid,
            "valid": valid,
            "errors": page_errors,
        })
    return records


def write_report(*, errors: list[str], sitemap_locations: list[str]) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    pages = public_page_records()
    page_errors = [f"{page['route']}: {error}" for page in pages for error in page["errors"]]
    all_errors = [*errors, *page_errors]
    passed = not all_errors
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
            "error_count": len(all_errors),
            "errorCount": len(all_errors),
            "html_pages_checked": len(REQUIRED_HTML),
            "publicPages": len(pages),
            "required_urls_checked": len(REQUIRED_URLS),
            "sitemap_url_count": len(sitemap_locations),
        },
        "checks": {
            "html_metadata": {"ok": all(page["ok"] for page in pages), "pages": pages},
            "sitemap": {"ok": not errors, "required_urls": list(REQUIRED_URLS), "locations": sitemap_locations},
            "robots": {"ok": not any("robots.txt" in error for error in errors), "sitemap_directive": "https://gnk-asg.hr/sitemap.xml"},
        },
        "errors": all_errors,
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
    for page in public_page_records():
        for error in page["errors"]:
            errors.append(f"{page['file']}: {error}")
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
