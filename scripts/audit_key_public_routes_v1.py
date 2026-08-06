#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PORTAL = ROOT / "apps/portal"
LOCAL_BASE = "http://127.0.0.1:4173"
LIVE_BASE = "https://gnk-asg.hr"
ROUTES = (
    "/",
    "/objave/",
    "/gnk-aktual/",
    "/trzista/",
    "/digital-workforce/",
    "/objave/likvidnosni-jaz-i-upravljanje-obrtnim-kapitalom/",
)
REQUIRED_META = (
    "description",
    "robots",
    "twitter:card",
)
REQUIRED_OG = (
    "og:title",
    "og:description",
    "og:url",
    "og:image",
)


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title = ""
        self._in_title = False
        self.h1_count = 0
        self.meta: dict[str, str] = {}
        self.links: list[str] = []
        self.canonical = ""
        self.jsonld: list[str] = []
        self._jsonld = False
        self._jsonld_buf: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {k.lower(): (v or "") for k, v in attrs}
        if tag == "title":
            self._in_title = True
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "meta":
            key = (values.get("name") or values.get("property") or "").lower()
            if key:
                self.meta[key] = values.get("content", "").strip()
        elif tag == "link":
            rel = values.get("rel", "").lower().split()
            href = values.get("href", "").strip()
            if "canonical" in rel:
                self.canonical = href
            if href:
                self.links.append(href)
        elif tag == "a":
            href = values.get("href", "").strip()
            if href:
                self.links.append(href)
        elif tag == "script" and values.get("type", "").lower() == "application/ld+json":
            self._jsonld = True
            self._jsonld_buf = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
        elif tag == "script" and self._jsonld:
            self._jsonld = False
            self.jsonld.append("".join(self._jsonld_buf).strip())
            self._jsonld_buf = []

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data
        if self._jsonld:
            self._jsonld_buf.append(data)


def request(url: str, attempts: int = 3, timeout: int = 20) -> tuple[int, str, dict[str, str]]:
    headers = {"User-Agent": "GNK-ASG-CI-Audit/1.0"}
    last_error = ""
    for attempt in range(1, attempts + 1):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as response:
                body = response.read().decode("utf-8", errors="replace")
                return response.status, body, {k.lower(): v for k, v in response.headers.items()}
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = str(exc)
            if attempt < attempts:
                time.sleep(attempt * 2)
    raise RuntimeError(f"request failed after {attempts} attempts: {url}: {last_error}")


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def validate_page(base: str, route: str, check_internal_links: bool) -> dict[str, object]:
    errors: list[str] = []
    url = urllib.parse.urljoin(base + "/", route.lstrip("/"))
    status, html, headers = request(url)
    if status != 200:
        fail(errors, f"{route}: expected HTTP 200, received {status}")
    if "text/html" not in headers.get("content-type", ""):
        fail(errors, f"{route}: content-type is not text/html")

    parser = PageParser()
    parser.feed(html)
    title = re.sub(r"\s+", " ", parser.title).strip()
    if not title:
        fail(errors, f"{route}: missing title")
    if parser.h1_count != 1:
        fail(errors, f"{route}: expected exactly one H1, found {parser.h1_count}")
    for key in REQUIRED_META:
        if not parser.meta.get(key):
            fail(errors, f"{route}: missing meta {key}")
    for key in REQUIRED_OG:
        if not parser.meta.get(key):
            fail(errors, f"{route}: missing {key}")
    if not parser.canonical:
        fail(errors, f"{route}: missing canonical")
    elif not parser.canonical.startswith(LIVE_BASE):
        fail(errors, f"{route}: canonical must use {LIVE_BASE}")

    valid_jsonld = 0
    for raw in parser.jsonld:
        if not raw:
            continue
        try:
            json.loads(raw)
            valid_jsonld += 1
        except json.JSONDecodeError as exc:
            fail(errors, f"{route}: invalid JSON-LD: {exc}")
    if valid_jsonld == 0:
        fail(errors, f"{route}: no valid JSON-LD block")

    checked_links = 0
    if check_internal_links:
        seen: set[str] = set()
        for href in parser.links:
            if href.startswith(("mailto:", "tel:", "javascript:", "#")):
                continue
            absolute = urllib.parse.urljoin(url, href)
            parsed = urllib.parse.urlparse(absolute)
            if parsed.netloc not in {"127.0.0.1:4173", "localhost:4173"}:
                continue
            normalized = urllib.parse.urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", "", ""))
            if normalized in seen:
                continue
            seen.add(normalized)
            try:
                link_status, _, _ = request(normalized, attempts=2, timeout=10)
                checked_links += 1
                if link_status >= 400:
                    fail(errors, f"{route}: broken internal link {href} -> {link_status}")
            except RuntimeError as exc:
                fail(errors, f"{route}: broken internal link {href}: {exc}")
            if checked_links >= 40:
                break

    return {
        "route": route,
        "url": url,
        "status": status,
        "title": title,
        "h1_count": parser.h1_count,
        "jsonld_blocks": valid_jsonld,
        "internal_links_checked": checked_links,
        "errors": errors,
    }


def validate_discovery(base: str) -> list[dict[str, object]]:
    results: list[dict[str, object]] = []
    for route, marker in (("/robots.txt", "Sitemap:"), ("/sitemap-index.xml", "<sitemapindex")):
        url = urllib.parse.urljoin(base + "/", route.lstrip("/"))
        status, body, _ = request(url)
        errors: list[str] = []
        if status != 200:
            errors.append(f"{route}: expected HTTP 200, received {status}")
        if marker not in body:
            errors.append(f"{route}: missing marker {marker}")
        results.append({"route": route, "url": url, "status": status, "errors": errors})
    return results


def main() -> int:
    if not PORTAL.exists():
        raise SystemExit("apps/portal not found")

    mode = "--live" if "--live" in sys.argv else "--local"
    base = LIVE_BASE if mode == "--live" else LOCAL_BASE
    reports = [validate_page(base, route, check_internal_links=(mode == "--local")) for route in ROUTES]
    reports.extend(validate_discovery(base))
    errors = [error for report in reports for error in report["errors"]]

    output = {
        "ok": not errors,
        "mode": mode.removeprefix("--"),
        "base": base,
        "routes": reports,
        "error_count": len(errors),
        "errors": errors,
    }
    out_dir = ROOT / "artifacts" / "key-routes-quality"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f"audit-{mode.removeprefix('--')}.json").write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
