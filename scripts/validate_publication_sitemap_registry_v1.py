#!/usr/bin/env python3
"""Validate approved editorial routes against the public sitemap and portal files."""
from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PORTAL = ROOT / "apps" / "portal"
MANIFEST = PORTAL / "data" / "editorial-plan" / "manifest.json"
SITEMAP = PORTAL / "sitemap.xml"
ORIGIN = "https://gnk-asg.hr"
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
PUBLIC_PREFIXES = ("/objave/", "/komentari/", "/analize/", "/publications/", "/comments/", "/analysis/")


def parse_date(value: str) -> datetime:
    value = value.strip()
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    result = datetime.fromisoformat(value)
    if result.tzinfo is None:
        result = result.replace(tzinfo=timezone.utc)
    return result.astimezone(timezone.utc)


def route_to_file(route: str) -> Path:
    clean = route.strip("/")
    return PORTAL / clean / "index.html"


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    root = ET.parse(SITEMAP).getroot()

    sitemap_rows: dict[str, list[str]] = {}
    all_locs: list[str] = []
    for node in root.findall("sm:url", NS):
        loc = (node.findtext("sm:loc", default="", namespaces=NS) or "").strip()
        if not loc:
            errors.append("Sitemap entry without <loc>.")
            continue
        lastmod = (node.findtext("sm:lastmod", default="", namespaces=NS) or "").strip()
        all_locs.append(loc)
        sitemap_rows.setdefault(loc, []).append(lastmod)

    for loc, count in Counter(all_locs).items():
        if count > 1:
            errors.append(f"Duplicate sitemap URL ({count}x): {loc}")

    published: dict[str, datetime] = {}
    held_routes: set[str] = set()
    for package in manifest.get("packages", []):
        status = str(package.get("status", "")).lower()
        routes = package.get("publishedRoutes") or package.get("completedRoutes") or []
        if status == "published" and package.get("deployApproved") is True:
            stamp_raw = package.get("publishedAt") or package.get("publishAt")
            if not stamp_raw:
                errors.append(f"Published package {package.get('id')} has no publication timestamp.")
                continue
            stamp = parse_date(str(stamp_raw))
            for route in routes:
                if route.startswith(PUBLIC_PREFIXES):
                    published[route] = max(published.get(route, stamp), stamp)
        elif status in {"hold", "held", "draft", "blocked", "cancelled"}:
            for route in routes:
                if route.startswith(PUBLIC_PREFIXES):
                    held_routes.add(route)

    for route, published_at in sorted(published.items()):
        page = route_to_file(route)
        if not page.is_file():
            errors.append(f"Published route has no portal file: {route}")
            continue

        loc = ORIGIN + route
        rows = sitemap_rows.get(loc)
        if not rows:
            errors.append(f"Published route missing from sitemap: {route}")
            continue
        lastmod = rows[0]
        if not lastmod:
            errors.append(f"Published route has no sitemap lastmod: {route}")
            continue
        try:
            lastmod_at = parse_date(lastmod)
        except ValueError:
            errors.append(f"Invalid lastmod {lastmod!r}: {route}")
            continue
        if lastmod_at.date() < published_at.date():
            errors.append(
                f"Stale lastmod for {route}: {lastmod_at.date()} < publication {published_at.date()}"
            )

        html = page.read_text(encoding="utf-8", errors="replace")
        canonical = f'<link rel="canonical" href="{loc}">'
        if canonical not in html:
            errors.append(f"Portal canonical mismatch or missing: {route}")

    for route in sorted(held_routes):
        loc = ORIGIN + route
        if loc in sitemap_rows:
            errors.append(f"Held route is exposed in sitemap: {route}")
        if route_to_file(route).is_file():
            warnings.append(f"Held route file exists and requires publication-policy review: {route}")

    public_sitemap_routes = {
        urlparse(loc).path
        for loc in all_locs
        if urlparse(loc).netloc == "gnk-asg.hr" and urlparse(loc).path.startswith(PUBLIC_PREFIXES)
    }
    unregistered = sorted(public_sitemap_routes - set(published))
    if unregistered:
        warnings.append(
            f"{len(unregistered)} authored sitemap routes are not represented as approved publishedRoutes in manifest."
        )

    evidence = {
        "version": "GNK_ASG_PUBLICATION_SITEMAP_REGISTRY_GATE_V1",
        "publishedRoutes": len(published),
        "heldRoutes": len(held_routes),
        "sitemapUrls": len(all_locs),
        "unregisteredAuthoredRoutes": len(unregistered),
        "errors": errors,
        "warnings": warnings,
    }
    out = ROOT / "artifacts" / "publication-sitemap-registry"
    out.mkdir(parents=True, exist_ok=True)
    (out / "report.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(evidence, ensure_ascii=False, indent=2))

    if errors:
        print(f"Publication sitemap/registry validation failed with {len(errors)} error(s).", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
