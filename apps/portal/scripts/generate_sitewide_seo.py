#!/usr/bin/env python3
"""Compatibility bridge for site-wide SEO generation.

The production workflow invokes this historical path. If a newer SEO generator
exists, this script delegates to it. Otherwise it performs strict validation of
the canonical SEO artifacts already committed to the portal.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCRIPT_DIR = Path(__file__).resolve().parent
SELF = Path(__file__).resolve()

CANDIDATE_PATTERNS = (
    "*site*seo*.py",
    "*seo*generator*.py",
    "*generate*seo*.py",
    "*sitemap*.py",
)

REQUIRED_FILES = (
    "apps/portal/index.html",
    "apps/portal/en/index.html",
    "apps/portal/sitemap.xml",
    "apps/portal/robots.txt",
    "apps/portal/objave/index.html",
    "apps/portal/analize/index.html",
    "apps/portal/komentari/index.html",
    "apps/portal/en/publications/index.html",
    "apps/portal/en/analyses/index.html",
    "apps/portal/en/commentary/index.html",
    "apps/portal/digital-workforce/index.html",
    "apps/portal/editor-desk/index.html",
)

CANONICAL_FILES = (
    "apps/portal/index.html",
    "apps/portal/en/index.html",
    "apps/portal/objave/index.html",
    "apps/portal/analize/index.html",
    "apps/portal/komentari/index.html",
    "apps/portal/en/publications/index.html",
    "apps/portal/en/analyses/index.html",
    "apps/portal/en/commentary/index.html",
    "apps/portal/digital-workforce/index.html",
    "apps/portal/editor-desk/index.html",
)


def find_delegate() -> Path | None:
    seen: set[Path] = set()
    for pattern in CANDIDATE_PATTERNS:
        for path in sorted(SCRIPT_DIR.glob(pattern)):
            resolved = path.resolve()
            if resolved == SELF or resolved in seen or not path.is_file():
                continue
            seen.add(resolved)
            return path
    return None


def validate_existing_seo() -> None:
    missing = [path for path in REQUIRED_FILES if not (ROOT / path).is_file()]
    if missing:
        formatted = "\n".join(f" - {path}" for path in missing)
        raise SystemExit(f"Site-wide SEO validation failed. Missing files:\n{formatted}")

    invalid: list[str] = []
    for relative in CANONICAL_FILES:
        text = (ROOT / relative).read_text(encoding="utf-8", errors="replace").lower()
        if 'rel="canonical"' not in text and "rel='canonical'" not in text:
            invalid.append(f"{relative}: missing canonical link")
        if "<title" not in text:
            invalid.append(f"{relative}: missing title")
        if 'name="description"' not in text and "name='description'" not in text:
            invalid.append(f"{relative}: missing meta description")

    sitemap = (ROOT / "apps/portal/sitemap.xml").read_text(encoding="utf-8", errors="replace")
    for url in (
        "https://gnk-asg.hr/",
        "https://gnk-asg.hr/en/",
        "https://gnk-asg.hr/digital-workforce/",
        "https://gnk-asg.hr/editor-desk/",
    ):
        if url not in sitemap:
            invalid.append(f"sitemap.xml: missing {url}")

    robots = (ROOT / "apps/portal/robots.txt").read_text(encoding="utf-8", errors="replace").lower()
    if "sitemap:" not in robots:
        invalid.append("robots.txt: missing Sitemap directive")

    if invalid:
        formatted = "\n".join(f" - {item}" for item in invalid)
        raise SystemExit(f"Site-wide SEO validation failed:\n{formatted}")

    print("Site-wide SEO artifacts already exist; compatibility validation passed.")


def main() -> int:
    delegate = find_delegate()
    if delegate is not None:
        print(f"Delegating site-wide SEO generation to {delegate.relative_to(ROOT)}")
        completed = subprocess.run([sys.executable, str(delegate)], cwd=ROOT, check=False)
        return completed.returncode
    validate_existing_seo()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
