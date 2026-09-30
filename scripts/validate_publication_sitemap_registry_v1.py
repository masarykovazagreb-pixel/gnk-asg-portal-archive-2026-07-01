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
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
EDITORIAL_PREFIXES = (
    "/objave/", "/komentari/", "/analize/", "/gnk-aktual/kolumne/",
    "/en/publications/", "/en/commentary/", "/en/analyses/", "/en/objave/",
)
EDITORIAL_EXACT_ROUTES = {
    "/aktual/gnk-asg-504-milijuna-eura-prihoda/",
}


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


def state(item: dict[str, object], now: datetime) -> str:
    explicit = str(item.get("status", "")).lower()
    if explicit in {"draft", "held", "hold", "blocked", "cancelled"}:
        return explicit
    stamp = instant(item.get("publishedAt") or item.get("datePublished"))
    if stamp and stamp > now:
        return "scheduled"
    if explicit == "scheduled" and not stamp:
        return "scheduled"
    return "published"


def route_file(route: str) -> Path:
    return PORTAL / route.strip("/") / "index.html"


def canonical_file(url: str) -> Path | None:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.netloc not in {"gnk-asg.hr", "www.gnk-asg.hr"}:
        return None
    rel = parsed.path.lstrip("/")
    if rel.endswith(".html"):
        return PORTAL / rel
    return PORTAL / rel / "index.html"


def supported_editorial_route(route: str) -> bool:
    return route.startswith(EDITORIAL_PREFIXES) or route in EDITORIAL_EXACT_ROUTES


def registry_canonical(item: dict[str, object], route: str) -> str:
    explicit = str(item.get("canonicalUrl") or "").strip()
    return explicit or ORIGIN + route


def effective_instant(item: dict[str, object], registry_generated: datetime | None, now: datetime) -> datetime:
    return instant(item.get("publishedAt") or item.get("datePublished")) or registry_generated or now


def main() -> int:
    now = instant(os.environ.get("PUBLICATION_NOW")) or datetime.now(timezone.utc)
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    items = registry.get("items", [])
    registry_generated = instant(registry.get("generatedAt"))
    errors: list[str] = []
    warnings: list[str] = []
    published: dict[str, dict[str, object]] = {}
    scheduled: list[str] = []

    for item in items:
        route = str(item.get("path", ""))
        if not supported_editorial_route(route):
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

    expected_rows: dict[str, datetime] = {}
    for route, item in published.items():
        page = route_file(route)
        if not page.is_file():
            errors.append(f"Published registry route has no portal file: {route}")
            continue

        parser = HeadParser()
        parser.feed(page.read_text(encoding="utf-8", errors="replace"))
        expected = registry_canonical(item, route)
        if parser.canonicals != [expected]:
            errors.append(f"Canonical mismatch for {route}: {parser.canonicals or 'missing'}; expected {expected}")

        target = canonical_file(expected)
        if target is None:
            errors.append(f"Canonical target must stay on the GNK ASG HTTPS host: {route} -> {expected}")
        elif not target.is_file():
            errors.append(f"Canonical target has no portal file: {route} -> {expected}")

        stamp = effective_instant(item, registry_generated, now)
        previous = expected_rows.get(expected)
        if previous is None or stamp > previous:
            expected_rows[expected] = stamp

    expected_urls = set(expected_rows)
    sitemap_urls = set(rows)
    for url in sorted(expected_urls - sitemap_urls):
        errors.append(f"Published canonical URL missing from editorial sitemap: {url}")
    for url in sorted(sitemap_urls - expected_urls):
        errors.append(f"Non-canonical or unregistered URL exposed in editorial sitemap: {url}")

    for url, stamp in sorted(expected_rows.items()):
        raw_lastmod = rows.get(url)
        if not raw_lastmod:
            continue
        lastmod = instant(raw_lastmod)
        if not lastmod:
            errors.append(f"Invalid editorial sitemap lastmod for {url}: {raw_lastmod!r}")
        elif lastmod.date() != stamp.date():
            errors.append(
                f"Editorial sitemap lastmod for {url} is {lastmod.date().isoformat()} "
                f"but registry canonical state requires {stamp.date().isoformat()}"
            )

    index_root = ET.parse(SITEMAP_INDEX).getroot()
    index_lastmod = None
    for node in index_root.findall("sm:sitemap", NS):
        if node.findtext("sm:loc", "", NS) == ORIGIN + "/editorial-sitemap.xml":
            index_lastmod = node.findtext("sm:lastmod", "", NS)

    corpus_date = max((stamp.date().isoformat() for stamp in expected_rows.values()), default=None)
    if corpus_date and index_lastmod != corpus_date:
        errors.append(f"Sitemap-index editorial lastmod {index_lastmod!r} != corpus lastmod {corpus_date!r}")

    evidence = {
        "version": "GNK_ASG_PUBLICATION_SITEMAP_REGISTRY_GATE_V4_CANONICAL_DEDUPE",
        "canonicalAuthority": "apps/portal/data/editorial-registry.json",
        "now": now.isoformat(),
        "registryItems": len(items),
        "publishedRoutes": len(published),
        "scheduledOrHeldRoutes": len(scheduled),
        "canonicalSitemapUrls": len(expected_rows),
        "editorialSitemapUrls": len(rows),
        "dedupedAliasRoutes": len(published) - len(expected_rows),
        "hrPublishedRoutes": sum(not route.startswith("/en/") for route in published),
        "enPublishedRoutes": sum(route.startswith("/en/") for route in published),
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
