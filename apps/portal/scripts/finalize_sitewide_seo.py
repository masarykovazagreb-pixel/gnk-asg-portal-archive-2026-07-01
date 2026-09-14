#!/usr/bin/env python3
"""Strict, deterministic and read-only validation of committed SEO sources."""
from __future__ import annotations

from datetime import datetime, timezone
from html import unescape
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[3]
PORTAL = ROOT / "apps/portal"
REPORT_PATH = PORTAL / "data" / "seo-report.json"
SITE_ORIGIN = "https://gnk-asg.hr"
IMAGE_EXTENSIONS = {".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"}

REQUIRED_HTML = (
    "index.html", "en/index.html", "contact/index.html", "media-application/index.html",
    "the-code/index.html", "publications/index.html", "digital-workforce/index.html",
    "editor-desk/index.html", "objave/index.html", "analize/index.html", "komentari/index.html",
    "en/publications/index.html", "en/analyses/index.html", "en/commentary/index.html",
)
REQUIRED_URLS = (
    "https://gnk-asg.hr/", "https://gnk-asg.hr/en/",
    "https://gnk-asg.hr/editor-desk/",
)
FORBIDDEN_SITEMAP_URLS = (
    # Digital Workforce was intentionally made public/indexable
    # earlier this session -- see the matching note in
    # generate_sitewide_seo.py. Kept the (now empty) tuple so any
    # future legitimately-forbidden route can still be added here.
)


def route_for(relative: str) -> str:
    return "/" if relative == "index.html" else "/" + relative.removesuffix("index.html")


def url_for(relative: str) -> str:
    return SITE_ORIGIN + route_for(relative)


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


def parse_xml(relative: str) -> tuple[ET.Element | None, list[str]]:
    path = PORTAL / relative
    if not path.is_file():
        return None, [f"missing apps/portal/{relative}"]
    try:
        return ET.parse(path).getroot(), []
    except ET.ParseError as exc:
        return None, [f"{relative} is not valid XML: {exc}"]


def validate_sitemap() -> tuple[list[str], list[str]]:
    root, errors = parse_xml("sitemap.xml")
    if root is None:
        return [], errors
    namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locations = sorted({(node.text or "").strip() for node in root.findall("s:url/s:loc", namespace)})
    missing = [url for url in REQUIRED_URLS if url not in locations]
    forbidden = [url for url in FORBIDDEN_SITEMAP_URLS if url in locations]
    errors.extend(f"sitemap.xml missing URL: {url}" for url in missing)
    errors.extend(f"sitemap.xml contains forbidden noindex URL: {url}" for url in forbidden)
    return locations, errors


def local_asset_path(image_url: str) -> Path | None:
    parsed = urlparse(image_url)
    if parsed.scheme != "https" or parsed.netloc != "gnk-asg.hr":
        return None
    relative = unquote(parsed.path).lstrip("/")
    return PORTAL / relative if relative else None


def validate_image_sitemap(sitemap_urls: set[str]) -> tuple[dict[str, int], list[str]]:
    root, errors = parse_xml("image-sitemap.xml")
    if root is None:
        return {"pages": 0, "images": 0, "localAssets": 0}, errors

    namespace = {
        "s": "http://www.sitemaps.org/schemas/sitemap/0.9",
        "image": "http://www.google.com/schemas/sitemap-image/1.1",
    }
    page_count = 0
    image_count = 0
    local_assets = 0
    seen_pairs: set[tuple[str, str]] = set()

    for url_node in root.findall("s:url", namespace):
        page_count += 1
        page_loc = (url_node.findtext("s:loc", default="", namespaces=namespace) or "").strip()
        if not page_loc:
            errors.append("image-sitemap.xml contains url entry without loc")
        elif not page_loc.startswith(SITE_ORIGIN + "/"):
            errors.append(f"image-sitemap.xml contains non-canonical page URL: {page_loc}")
        elif page_loc not in sitemap_urls:
            errors.append(f"image-sitemap.xml page absent from sitemap.xml: {page_loc}")

        image_nodes = url_node.findall("image:image", namespace)
        if not image_nodes:
            errors.append(f"image-sitemap.xml page has no image entries: {page_loc or '<missing-loc>'}")
            continue

        for image_node in image_nodes:
            image_count += 1
            image_loc = (image_node.findtext("image:loc", default="", namespaces=namespace) or "").strip()
            if not image_loc:
                errors.append(f"image-sitemap.xml image missing image:loc on page: {page_loc or '<missing-loc>'}")
                continue

            pair = (page_loc, image_loc)
            if pair in seen_pairs:
                errors.append(f"image-sitemap.xml duplicate page/image pair: {page_loc} -> {image_loc}")
            seen_pairs.add(pair)

            asset = local_asset_path(image_loc)
            if asset is None:
                errors.append(f"image-sitemap.xml image is not an HTTPS first-party URL: {image_loc}")
                continue

            suffix = asset.suffix.lower()
            if suffix not in IMAGE_EXTENSIONS:
                errors.append(f"image-sitemap.xml image has unsupported extension: {image_loc}")
            if not asset.is_file():
                errors.append(f"image-sitemap.xml points to missing local asset: {image_loc}")
            else:
                local_assets += 1

    if page_count == 0:
        errors.append("image-sitemap.xml contains no page entries")
    if image_count == 0:
        errors.append("image-sitemap.xml contains no image entries")
    return {"pages": page_count, "images": image_count, "localAssets": local_assets}, errors


def write_report(
    pages: list[dict[str, object]],
    sitemap_urls: list[str],
    image_sitemap_summary: dict[str, int],
    errors: list[str],
) -> None:
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
        "imageSitemap": image_sitemap_summary,
        "summary": {
            "passed": passed, "failed": not passed, "error_count": len(errors),
            "errorCount": len(errors), "html_pages_checked": len(REQUIRED_HTML),
            "publicPages": len(pages), "publicPageCount": len(pages),
            "required_urls_checked": len(REQUIRED_URLS), "sitemap_url_count": len(sitemap_urls),
            "sitemapUrlCount": len(sitemap_urls),
            "image_sitemap_pages": image_sitemap_summary["pages"],
            "image_sitemap_images": image_sitemap_summary["images"],
            "image_sitemap_local_assets": image_sitemap_summary["localAssets"],
        },
        "checks": {
            "html_metadata": {"ok": all(page["ok"] for page in pages), "pages": pages},
            "sitemap": {
                "ok": not any("sitemap.xml" in error and "image-sitemap.xml" not in error for error in errors),
                "required_urls": list(REQUIRED_URLS),
                "locations": sitemap_urls,
            },
            "image_sitemap": {
                "ok": not any("image-sitemap.xml" in error for error in errors),
                **image_sitemap_summary,
            },
            "robots": {
                "ok": not any("robots.txt" in error for error in errors),
                "sitemap_directive": "https://gnk-asg.hr/sitemap.xml",
            },
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

    sitemap_urls, sitemap_errors = validate_sitemap()
    image_sitemap_summary, image_sitemap_errors = validate_image_sitemap(set(sitemap_urls))
    errors.extend(sitemap_errors)
    errors.extend(image_sitemap_errors)
    for message in sitemap_errors:
        annotate("apps/portal/sitemap.xml", message)
    for message in image_sitemap_errors:
        annotate("apps/portal/image-sitemap.xml", message)

    robots_path = PORTAL / "robots.txt"
    if not robots_path.is_file():
        errors.append("missing apps/portal/robots.txt")
        annotate("apps/portal/robots.txt", "missing robots.txt")
    else:
        robots = robots_path.read_text(encoding="utf-8", errors="replace").lower()
        if "sitemap:" not in robots or "gnk-asg.hr/sitemap.xml" not in robots:
            errors.append("robots.txt Sitemap directive is missing or non-canonical")
            annotate("apps/portal/robots.txt", "Sitemap directive is missing or non-canonical")

    write_report(pages, sitemap_urls, image_sitemap_summary, errors)
    if errors:
        print("Site-wide SEO finalization failed:", file=sys.stderr)
        for error in errors:
            print(f" - {error}", file=sys.stderr)
        return 1
    print("Site-wide SEO finalization passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
