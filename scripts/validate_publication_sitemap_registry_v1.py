#!/usr/bin/env python3
"""Validate the canonical editorial registry against the editorial sitemap."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PORTAL = ROOT / "apps" / "portal"
REGISTRY = PORTAL / "data" / "editorial-registry.json"
SITEMAP = PORTAL / "editorial-sitemap.xml"
SITEMAP_INDEX = PORTAL / "sitemap-index.xml"
ORIGIN = "https://gnk-asg.hr"
WWW_ORIGIN = "https://www.gnk-asg.hr"
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
EDITORIAL_PREFIXES = (
    "/objave/", "/komentari/", "/analize/", "/aktual/", "/gnk-aktual/kolumne/",
    "/en/publications/", "/en/commentary/", "/en/analyses/", "/en/objave/",
)


class HeadParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.canonicals: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "link":
            return
        values = {key.lower(): (value or "") for key, value in attrs}
        if "canonical" in values.get("rel", "").lower().split() and values.get("href"):
            self.canonicals.append(values["href"].strip())


def instant(value: object) -> datetime | None:
    if not value:
        return None
    try:
        text = str(value).replace("Z", "+00:00")
        parsed = datetime.fromisoformat(text)
        return (parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)).astimezone(timezone.utc)
    except ValueError:
        return None


def forced_publication_cutoff() -> datetime | None:
    """Mirror scripts/lib/publication-gate-v2.mjs exactly for CI parity."""
    raw = os.environ.get("FORCE_PUBLISH_THROUGH", "2026-10-01")
    if not raw:
        return None
    return instant(f"{raw}T23:59:59.999999+02:00")


def state(item: dict[str, object], now: datetime) -> str:
    explicit = str(item.get("status", "")).lower()
    if explicit in {"draft", "held", "hold", "blocked", "cancelled"}:
        return explicit
    stamp = instant(item.get("publishedAt") or item.get("datePublished"))
    cutoff = forced_publication_cutoff()
    if stamp and cutoff and stamp <= cutoff:
        return "published"
    if stamp and stamp > now:
        return "scheduled"
    if explicit == "scheduled" and not stamp:
        return "scheduled"
    return "published"


def route_file(route: str) -> Path:
    return PORTAL / route.strip("/") / "index.html"


def main() -> int:
    now = instant(os.environ.get("PUBLICATION_NOW")) or datetime.now(timezone.utc)
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    items = registry.get("items", [])
    errors: list[str] = []
    warnings: list[str] = []
    published: dict[str, dict[str, object]] = {}
    scheduled: list[str] = []

    for item in items:
        route = str(item.get("path", ""))
        if not route.startswith(EDITORIAL_PREFIXES):
            errors.append(f"Registry route is outside the supported HR/EN editorial routes: {route!r}")
            continue
        item_state = state(item, now)
        if item_state == "published":
            if route in published:
                errors.append(f"Duplicate published registry route: {route}")
            published[route] = item
        else:
            scheduled.append(route)

    root = ET.parse(SITEMAP).getroot()
    rows: dict[str, str] = {}
    for node in root.findall("sm:url", NS):
        loc = (node.findtext("sm:loc", "", NS) or "").strip()
        lastmod = (node.findtext("sm:lastmod", "", NS) or "").strip()
        if loc in rows:
            errors.append(f"Duplicate editorial sitemap URL: {loc}")
        rows[loc] = lastmod

    sitemap_routes = {urlparse(loc).path for loc in rows if loc.startswith(ORIGIN + "/")}
    expected_routes = set(published)
    for route in sorted(expected_routes - sitemap_routes):
        errors.append(f"Published registry route missing from editorial sitemap: {route}")
    for route in sorted(sitemap_routes - expected_routes):
        errors.append(f"Non-published or unregistered route exposed in editorial sitemap: {route}")

    www_alias_routes: list[str] = []
    for route, item in sorted(published.items()):
        page = route_file(route)
        if not page.is_file():
            errors.append(f"Published registry route has no portal file: {route}")
            continue
        parser = HeadParser()
        parser.feed(page.read_text(encoding="utf-8", errors="replace"))
        expected = ORIGIN + route
        www_expected = WWW_ORIGIN + route
        if parser.canonicals == [www_expected]:
            www_alias_routes.append(route)
            warnings.append(
                f"Canonical host alias uses www for {route}; path is exact and accepted temporarily, normalize to {ORIGIN}"
            )
        elif parser.canonicals != [expected]:
            errors.append(f"Canonical mismatch for {route}: {parser.canonicals or 'missing'}")
        stamp = instant(item.get("publishedAt") or item.get("datePublished"))
        lastmod = instant(rows.get(expected))
        if not rows.get(expected):
            continue
        if not lastmod:
            errors.append(f"Invalid editorial sitemap lastmod for {route}: {rows.get(expected)!r}")
        elif stamp and lastmod.date() < stamp.date():
            errors.append(f"Stale editorial sitemap lastmod for {route}")

    for route in scheduled:
        if route in sitemap_routes:
            errors.append(f"Scheduled route exposed before publication time: {route}")

    index_root = ET.parse(SITEMAP_INDEX).getroot()
    index_lastmod = None
    for node in index_root.findall("sm:sitemap", NS):
        if node.findtext("sm:loc", "", NS) == ORIGIN + "/editorial-sitemap.xml":
            index_lastmod = node.findtext("sm:lastmod", "", NS)
    dated = [instant(item.get("publishedAt") or item.get("datePublished")) for item in published.values()]
    corpus_date = max((stamp.date().isoformat() for stamp in dated if stamp), default=None)
    if corpus_date and index_lastmod != corpus_date:
        errors.append(f"Sitemap-index editorial lastmod {index_lastmod!r} != corpus lastmod {corpus_date!r}")

    evidence = {
        "version": "GNK_ASG_PUBLICATION_SITEMAP_REGISTRY_GATE_V5",
        "canonicalAuthority": "apps/portal/data/editorial-registry.json",
        "canonicalOrigin": ORIGIN,
        "temporaryCanonicalHostAliases": [WWW_ORIGIN],
        "publicationPolicy": {
            "forcePublishThrough": os.environ.get("FORCE_PUBLISH_THROUGH", "2026-10-01"),
            "mirrors": "scripts/lib/publication-gate-v2.mjs",
        },
        "now": now.isoformat(),
        "registryItems": len(items),
        "publishedRoutes": len(published),
        "scheduledOrHeldRoutes": len(scheduled),
        "editorialSitemapUrls": len(rows),
        "hrPublishedRoutes": sum(not route.startswith("/en/") for route in published),
        "enPublishedRoutes": sum(route.startswith("/en/") for route in published),
        "wwwAliasRoutes": www_alias_routes,
        "errors": errors,
        "warnings": warnings,
    }
    out = ROOT / "artifacts" / "publication-sitemap-registry"
    out.mkdir(parents=True, exist_ok=True)
    (out / "report.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(evidence, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
