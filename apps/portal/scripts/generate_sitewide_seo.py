#!/usr/bin/env python3
"""Compatibility bridge for site-wide SEO generation."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCRIPT_DIR = Path(__file__).resolve().parent
SELF = Path(__file__).resolve()

CANDIDATE_PATTERNS = ("*site*seo*.py", "*seo*generator*.py", "*generate*seo*.py", "*sitemap*.py")
REQUIRED_FILES = (
    "apps/portal/index.html", "apps/portal/en/index.html", "apps/portal/sitemap.xml", "apps/portal/robots.txt",
    "apps/portal/contact/index.html", "apps/portal/media-application/index.html", "apps/portal/the-code/index.html",
    "apps/portal/publications/index.html", "apps/portal/objave/index.html", "apps/portal/analize/index.html",
    "apps/portal/komentari/index.html", "apps/portal/en/publications/index.html",
    "apps/portal/en/analyses/index.html", "apps/portal/en/commentary/index.html",
    "apps/portal/digital-workforce/index.html", "apps/portal/editor-desk/index.html",
)
CANONICAL_FILES = tuple(path for path in REQUIRED_FILES if path.endswith("index.html"))
SITEMAP_ENTRIES = (
    ("https://gnk-asg.hr/digital-workforce/", "2026-07-15", "weekly", "0.8"),
    ("https://gnk-asg.hr/editor-desk/", "2026-07-15", "daily", "0.8"),
)
CANONICAL_HOST = "https://gnk-asg.hr/"
LEGACY_CANONICAL_HOST = "https://www.gnk-asg.hr/"


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


def normalize_canonical_hosts() -> None:
    changed: list[str] = []
    canonical_pattern = re.compile(
        r'(<link\b[^>]*\brel=["\']canonical["\'][^>]*\bhref=["\'])https://www\.gnk-asg\.hr/',
        flags=re.IGNORECASE,
    )
    reverse_pattern = re.compile(
        r'(<link\b[^>]*\bhref=["\'])https://www\.gnk-asg\.hr/([^"\']*["\'][^>]*\brel=["\']canonical["\'])',
        flags=re.IGNORECASE,
    )
    for relative in CANONICAL_FILES:
        path = ROOT / relative
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        updated = canonical_pattern.sub(r'\1https://gnk-asg.hr/', text)
        updated = reverse_pattern.sub(r'\1https://gnk-asg.hr/\2', updated)
        if updated != text:
            path.write_text(updated, encoding="utf-8")
            changed.append(relative)
    if changed:
        print("Normalized canonical host in: " + ", ".join(changed))


def ensure_sitemap_entries() -> None:
    sitemap_path = ROOT / "apps/portal/sitemap.xml"
    text = sitemap_path.read_text(encoding="utf-8")
    additions = []
    for url, lastmod, changefreq, priority in SITEMAP_ENTRIES:
        if url not in text:
            additions.append(
                f'  <url><loc>{url}</loc><lastmod>{lastmod}</lastmod>'
                f'<changefreq>{changefreq}</changefreq><priority>{priority}</priority></url>'
            )
    if additions:
        if "</urlset>" not in text:
            raise SystemExit("Site-wide SEO generation failed: sitemap.xml has no closing urlset tag.")
        text = text.replace("</urlset>", "\n".join(additions) + "\n</urlset>")
        sitemap_path.write_text(text, encoding="utf-8")
        print(f"Added {len(additions)} missing sitemap entries.")


def validate_existing_seo() -> None:
    missing = [path for path in REQUIRED_FILES if not (ROOT / path).is_file()]
    if missing:
        raise SystemExit("Site-wide SEO validation failed. Missing files:\n" + "\n".join(f" - {p}" for p in missing))

    invalid: list[str] = []
    for relative in CANONICAL_FILES:
        text = (ROOT / relative).read_text(encoding="utf-8", errors="replace")
        lower = text.lower()
        if 'rel="canonical"' not in lower and "rel='canonical'" not in lower:
            invalid.append(f"{relative}: missing canonical link")
        if re.search(r'<link\b[^>]*\brel=["\']canonical["\'][^>]*\bhref=["\']https://www\.gnk-asg\.hr/', text, re.IGNORECASE) or re.search(r'<link\b[^>]*\bhref=["\']https://www\.gnk-asg\.hr/[^>]*\brel=["\']canonical["\']', text, re.IGNORECASE):
            invalid.append(f"{relative}: canonical host must be {CANONICAL_HOST}")
        if "<title" not in lower:
            invalid.append(f"{relative}: missing title")
        if 'name="description"' not in lower and "name='description'" not in lower:
            invalid.append(f"{relative}: missing meta description")

    sitemap = (ROOT / "apps/portal/sitemap.xml").read_text(encoding="utf-8", errors="replace")
    for url in ("https://gnk-asg.hr/", "https://gnk-asg.hr/en/", *(item[0] for item in SITEMAP_ENTRIES)):
        if url not in sitemap:
            invalid.append(f"sitemap.xml: missing {url}")

    robots = (ROOT / "apps/portal/robots.txt").read_text(encoding="utf-8", errors="replace").lower()
    if "sitemap:" not in robots:
        invalid.append("robots.txt: missing Sitemap directive")
    if invalid:
        raise SystemExit("Site-wide SEO validation failed:\n" + "\n".join(f" - {item}" for item in invalid))
    print("Site-wide SEO generation and validation passed.")


def main() -> int:
    delegate = find_delegate()
    if delegate is not None:
        completed = subprocess.run([sys.executable, str(delegate)], cwd=ROOT, check=False)
        if completed.returncode:
            return completed.returncode
    normalize_canonical_hosts()
    ensure_sitemap_entries()
    validate_existing_seo()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
