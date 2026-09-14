#!/usr/bin/env python3
"""Fail-closed static audit for public route <-> sitemap/canonical parity.

This audit intentionally distinguishes physical discoverability from indexing. It never
claims INDEXED. It validates committed static sources only.
"""
from __future__ import annotations

from collections import Counter
from html import unescape
from pathlib import Path
import re
import sys
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[3]
PORTAL = ROOT / "apps/portal"
ORIGIN = "https://gnk-asg.hr"
EXCLUDED_DIR_NAMES = {
    ".git", ".github", "__preview", "node_modules", "vendor", "dist", "build", "coverage"
}


def first(pattern: str, text: str) -> str:
    match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return ""
    return unescape(re.sub(r"\s+", " ", match.group(1)).strip())


def canonical(text: str) -> str:
    for pattern in (
        r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']',
        r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']canonical["\']',
    ):
        value = first(pattern, text)
        if value:
            return value
    return ""


def robots_meta(text: str) -> str:
    for pattern in (
        r'<meta[^>]+name=["\']robots["\'][^>]+content=["\']([^"\']*)["\']',
        r'<meta[^>]+content=["\']([^"\']*)["\'][^>]+name=["\']robots["\']',
    ):
        value = first(pattern, text)
        if value:
            return value.lower()
    return ""


def route_for(path: Path) -> str:
    relative = path.relative_to(PORTAL).as_posix()
    if relative == "index.html":
        return "/"
    return "/" + relative.removesuffix("index.html")


def url_for(path: Path) -> str:
    return ORIGIN + route_for(path)


def is_excluded(path: Path) -> bool:
    relative = path.relative_to(PORTAL)
    return any(part in EXCLUDED_DIR_NAMES for part in relative.parts)


def physical_pages() -> list[Path]:
    return sorted(path for path in PORTAL.rglob("index.html") if not is_excluded(path))


def sitemap_locations() -> tuple[list[str], list[str]]:
    path = PORTAL / "sitemap.xml"
    if not path.is_file():
        raise RuntimeError("missing apps/portal/sitemap.xml")
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        raise RuntimeError(f"invalid sitemap.xml: {exc}") from exc

    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    nodes = root.findall("s:url/s:loc", ns)
    locations = [(node.text or "").strip() for node in nodes]
    errors: list[str] = []

    if not nodes:
        errors.append("sitemap.xml contains no url/loc entries")

    empty_count = sum(1 for value in locations if not value)
    if empty_count:
        errors.append(f"sitemap.xml contains empty loc entries: {empty_count}")

    nonempty = [value for value in locations if value]
    duplicates = sorted(url for url, count in Counter(nonempty).items() if count > 1)
    for url in duplicates:
        errors.append(f"duplicate sitemap URL: {url}")

    for url in nonempty:
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.netloc != "gnk-asg.hr":
            errors.append(f"sitemap URL is not canonical first-party HTTPS: {url}")
        if parsed.query or parsed.fragment:
            errors.append(f"sitemap URL contains query or fragment: {url}")

    return nonempty, errors


def local_path_for_url(url: str) -> Path | None:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.netloc != "gnk-asg.hr":
        return None
    if parsed.query or parsed.fragment:
        return None
    route = parsed.path or "/"
    if not route.startswith("/"):
        return None
    if route == "/":
        return PORTAL / "index.html"
    if route.endswith("/"):
        return PORTAL / route.lstrip("/") / "index.html"
    return None


def main() -> int:
    errors: list[str] = []
    try:
        sitemap_locations_list, sitemap_errors = sitemap_locations()
    except RuntimeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    errors.extend(sitemap_errors)
    sitemap = set(sitemap_locations_list)

    pages = physical_pages()
    if not pages:
        print("ERROR: no public index.html pages found", file=sys.stderr)
        return 1

    canonical_owner: dict[str, str] = {}
    indexable_urls: set[str] = set()
    noindex_urls: set[str] = set()

    for path in pages:
        rel = path.relative_to(ROOT).as_posix()
        text = path.read_text(encoding="utf-8", errors="replace")
        expected = url_for(path)
        found = canonical(text)
        robots = robots_meta(text)
        robots_tokens = {token.strip() for token in re.split(r"[,;]", robots) if token.strip()}
        noindex = "noindex" in robots_tokens or "none" in robots_tokens

        if noindex:
            noindex_urls.add(expected)
            if expected in sitemap:
                errors.append(f"noindex route present in sitemap: {expected} ({rel})")
        else:
            indexable_urls.add(expected)
            if expected not in sitemap:
                errors.append(f"indexable physical route missing from sitemap: {expected} ({rel})")
            if not found:
                errors.append(f"indexable route missing canonical: {rel}")
            elif found != expected:
                errors.append(f"canonical mismatch: {rel}: {found} != {expected}")

        if found:
            previous = canonical_owner.get(found)
            if previous and previous != rel:
                errors.append(f"duplicate canonical target: {found}: {previous}, {rel}")
            else:
                canonical_owner[found] = rel

    same_origin_sitemap = {
        url for url in sitemap
        if urlparse(url).scheme == "https"
        and urlparse(url).netloc == "gnk-asg.hr"
        and not urlparse(url).query
        and not urlparse(url).fragment
    }
    for url in sorted(same_origin_sitemap):
        local = local_path_for_url(url)
        if local is None:
            errors.append(f"sitemap URL is not a canonical directory route: {url}")
        elif not local.is_file():
            errors.append(f"sitemap URL has no physical index.html: {url} -> {local.relative_to(ROOT).as_posix()}")

    missing_from_physical = same_origin_sitemap - indexable_urls
    for url in sorted(missing_from_physical - noindex_urls):
        local = local_path_for_url(url)
        if local is not None and local.is_file():
            errors.append(f"sitemap route not classified indexable by physical audit: {url}")

    if errors:
        print("Public route/sitemap parity audit FAILED", file=sys.stderr)
        for error in errors:
            print(f" - {error}", file=sys.stderr)
        return 1

    print(
        "Public route/sitemap parity audit PASSED: "
        f"physical={len(pages)} indexable={len(indexable_urls)} noindex={len(noindex_urls)} "
        f"sitemap_same_origin={len(same_origin_sitemap)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
