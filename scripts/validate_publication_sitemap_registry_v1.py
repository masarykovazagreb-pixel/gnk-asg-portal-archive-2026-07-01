#!/usr/bin/env python3
"""Validate approved editorial routes against the public sitemap and portal files."""
from __future__ import annotations

import json
import os
import sys
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
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
# Existing sitemap debt is reported, but every approval from this point forward is blocking.
ENFORCEMENT_START = datetime.fromisoformat("2026-08-06T00:00:00+02:00").astimezone(timezone.utc)


class CanonicalParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.canonicals: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "link":
            return
        values = {key.lower(): (value or "") for key, value in attrs}
        rel_tokens = {token.lower() for token in values.get("rel", "").split()}
        if "canonical" in rel_tokens and values.get("href"):
            self.canonicals.append(values["href"].strip())


def parse_date(value: str) -> datetime:
    value = value.strip()
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    result = datetime.fromisoformat(value)
    if result.tzinfo is None:
        result = result.replace(tzinfo=timezone.utc)
    return result.astimezone(timezone.utc)


def route_to_file(route: str) -> Path:
    return PORTAL / route.strip("/") / "index.html"


def emit_annotation(level: str, message: str) -> None:
    safe = message.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
    print(f"::{level} file=apps/portal/sitemap.xml::{safe}")


def write_summary(evidence: dict[str, object]) -> None:
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return
    errors = evidence["errors"]
    warnings = evidence["warnings"]
    legacy = evidence["legacyMissingRoutes"]
    lines = [
        "## Publication sitemap / registry gate",
        "",
        f"- Published routes in manifest: **{evidence['publishedRoutes']}**",
        f"- Sitemap URLs: **{evidence['sitemapUrls']}**",
        f"- Blocking errors: **{len(errors)}**",
        f"- Warnings: **{len(warnings)}**",
        f"- Historical missing routes (pre-enforcement): **{len(legacy)}**",
        "",
    ]
    if errors:
        lines.extend(["### Blocking errors", *[f"- {item}" for item in errors], ""])
    if legacy:
        lines.extend([
            "### Historical sitemap debt",
            "These routes predate the enforcement boundary and remain visible in the JSON artifact for controlled remediation.",
            "",
            *[f"- {item}" for item in legacy[:25]],
        ])
        if len(legacy) > 25:
            lines.append(f"- … and {len(legacy) - 25} more in the artifact")
    Path(summary_path).write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    legacy_missing: list[str] = []

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
            try:
                stamp = parse_date(str(stamp_raw))
            except ValueError:
                errors.append(f"Published package {package.get('id')} has invalid timestamp: {stamp_raw!r}")
                continue
            for route in routes:
                if isinstance(route, str) and route.startswith(PUBLIC_PREFIXES):
                    published[route] = max(published.get(route, stamp), stamp)
        elif status in {"hold", "held", "draft", "blocked", "cancelled"}:
            for route in routes:
                if isinstance(route, str) and route.startswith(PUBLIC_PREFIXES):
                    held_routes.add(route)

    for route, published_at in sorted(published.items()):
        page = route_to_file(route)
        if not page.is_file():
            errors.append(f"Published route has no portal file: {route}")
            continue

        loc = ORIGIN + route
        html = page.read_text(encoding="utf-8", errors="replace")
        parser = CanonicalParser()
        parser.feed(html)
        if parser.canonicals != [loc]:
            errors.append(f"Portal canonical mismatch for {route}: {parser.canonicals or 'missing'}")

        rows = sitemap_rows.get(loc)
        if not rows:
            message = f"Published route missing from sitemap: {route}"
            if published_at >= ENFORCEMENT_START:
                errors.append(message)
            else:
                legacy_missing.append(route)
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
            errors.append(f"Stale lastmod for {route}: {lastmod_at.date()} < publication {published_at.date()}")

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

    evidence: dict[str, object] = {
        "version": "GNK_ASG_PUBLICATION_SITEMAP_REGISTRY_GATE_V2",
        "enforcementStart": ENFORCEMENT_START.isoformat(),
        "publishedRoutes": len(published),
        "heldRoutes": len(held_routes),
        "sitemapUrls": len(all_locs),
        "unregisteredAuthoredRoutes": len(unregistered),
        "legacyMissingRoutes": legacy_missing,
        "errors": errors,
        "warnings": warnings,
    }
    out = ROOT / "artifacts" / "publication-sitemap-registry"
    out.mkdir(parents=True, exist_ok=True)
    (out / "report.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(evidence, ensure_ascii=False, indent=2))
    write_summary(evidence)

    for message in errors:
        emit_annotation("error", message)
    for message in warnings:
        emit_annotation("warning", message)
    if legacy_missing:
        emit_annotation("warning", f"Historical sitemap debt: {len(legacy_missing)} published routes predate enforcement and are missing.")

    if errors:
        print(f"Publication sitemap/registry validation failed with {len(errors)} error(s).", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
