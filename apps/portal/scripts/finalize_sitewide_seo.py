#!/usr/bin/env python3
"""Strict final validation for committed site-wide SEO artifacts.

This historical entrypoint is called by the production workflow after the SEO
generator. It validates that the generated/committed assets are internally
consistent and that the new Digital Workforce routes are represented.
"""
from __future__ import annotations

from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[3]
PORTAL = ROOT / "apps/portal"

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


def fail(messages: list[str]) -> None:
    formatted = "\n".join(f" - {message}" for message in messages)
    raise SystemExit(f"Site-wide SEO finalization failed:\n{formatted}")


def validate_html() -> list[str]:
    errors: list[str] = []
    for relative in REQUIRED_HTML:
        path = PORTAL / relative
        if not path.is_file():
            errors.append(f"missing HTML file: apps/portal/{relative}")
            continue
        text = path.read_text(encoding="utf-8", errors="replace").lower()
        checks = {
            "title": "<title",
            "description": 'name="description"',
            "canonical": 'rel="canonical"',
        }
        for label, marker in checks.items():
            if marker not in text and marker.replace('"', "'") not in text:
                errors.append(f"apps/portal/{relative}: missing {label}")
    return errors


def validate_sitemap() -> list[str]:
    errors: list[str] = []
    path = PORTAL / "sitemap.xml"
    if not path.is_file():
        return ["missing apps/portal/sitemap.xml"]
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        return [f"sitemap.xml is not valid XML: {exc}"]
    namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locations = {
        (node.text or "").strip()
        for node in root.findall("s:url/s:loc", namespace)
    }
    for url in REQUIRED_URLS:
        if url not in locations:
            errors.append(f"sitemap.xml missing URL: {url}")
    if len(locations) != len([value for value in locations if value]):
        errors.append("sitemap.xml contains an empty URL")
    return errors


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
    errors = [*validate_html(), *validate_sitemap(), *validate_robots()]
    if errors:
        fail(errors)
    print("Site-wide SEO finalization passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
