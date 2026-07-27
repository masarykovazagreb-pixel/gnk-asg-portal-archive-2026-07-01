#!/usr/bin/env python3
"""Deterministically prepare and validate committed site-wide SEO artifacts."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
REQUIRED_FILES = (
    "apps/portal/index.html", "apps/portal/en/index.html", "apps/portal/sitemap.xml", "apps/portal/robots.txt",
    "apps/portal/objave/index.html", "apps/portal/analize/index.html", "apps/portal/komentari/index.html",
    "apps/portal/en/publications/index.html", "apps/portal/en/analyses/index.html", "apps/portal/en/commentary/index.html",
    "apps/portal/digital-workforce/index.html", "apps/portal/editor-desk/index.html",
)
CANONICAL_FILES = tuple(path for path in REQUIRED_FILES if path.endswith("index.html"))
SITEMAP_ENTRIES = (
    ("https://gnk-asg.hr/editor-desk/", "2026-07-15", "daily", "0.8"),
)
FORBIDDEN_SITEMAP_URLS = (
    # Digital Workforce was intentionally made public/indexable
    # (noindex gate removed, canonical + hreflang set) earlier this
    # session -- it belongs in the sitemap now. Kept this tuple (empty)
    # rather than removing the whole mechanism, so any future
    # legitimately-forbidden route can still be added here.
)


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
        sitemap_path.write_text(text.replace("</urlset>", "\n".join(additions) + "\n</urlset>"), encoding="utf-8")
        print(f"Added {len(additions)} missing sitemap entries.")


def validate_existing_seo() -> None:
    missing = [path for path in REQUIRED_FILES if not (ROOT / path).is_file()]
    if missing:
        raise SystemExit("Site-wide SEO validation failed. Missing files:\n" + "\n".join(f" - {p}" for p in missing))

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
    for url in ("https://gnk-asg.hr/", "https://gnk-asg.hr/en/", *(item[0] for item in SITEMAP_ENTRIES)):
        if url not in sitemap:
            invalid.append(f"sitemap.xml: missing {url}")
    for url in FORBIDDEN_SITEMAP_URLS:
        if url in sitemap:
            invalid.append(f"sitemap.xml: forbidden noindex route present: {url}")

    robots = (ROOT / "apps/portal/robots.txt").read_text(encoding="utf-8", errors="replace").lower()
    if "sitemap:" not in robots:
        invalid.append("robots.txt: missing Sitemap directive")
    if invalid:
        raise SystemExit("Site-wide SEO validation failed:\n" + "\n".join(f" - {item}" for item in invalid))
    print("Site-wide SEO generation and validation passed.")


def main() -> int:
    ensure_sitemap_entries()
    validate_existing_seo()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
