#!/usr/bin/env python3
from __future__ import annotations

import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://www.gnk-asg.hr/"
REPORT = ROOT / "data" / "seo-report.json"
TECHNICAL_PREFIXES = (
    "/assets/",
    "/data/",
    "/scripts/",
    "/workers/",
    "/packages/",
    "/docs/",
    "/contracts/",
    "/node_modules/",
    "/.github/",
)


def normalize_url(value: str) -> str:
    return str(value or "").replace("https://gnk-asg.hr/", SITE)


def add_noindex(path: Path) -> None:
    if not path.exists() or path.suffix.lower() != ".html":
        return
    text = path.read_text(encoding="utf-8-sig", errors="replace")
    if "<head" not in text.lower() or "</head>" not in text.lower():
        return
    text = re.sub(
        r"\s*<meta\b[^>]*name=[\"'](?:robots|googlebot)[\"'][^>]*>",
        "",
        text,
        flags=re.I,
    )
    text = text.replace(
        "</head>",
        '\n<meta name="robots" content="noindex,nofollow,noarchive">'
        '\n<meta name="googlebot" content="noindex,nofollow,noarchive">\n</head>',
        1,
    )
    path.write_text(text, encoding="utf-8")


def sitemap_entry(page: dict) -> str:
    return (
        "  <url>\n"
        f"    <loc>{escape(page['url'])}</loc>\n"
        f"    <lastmod>{datetime.now(timezone.utc).date().isoformat()}</lastmod>\n"
        f"    <changefreq>{page.get('changefreq', 'weekly')}</changefreq>\n"
        f"    <priority>{page.get('priority', '.7')}</priority>\n"
        "  </url>"
    )


def image_entry(page: dict) -> str:
    images: list[str] = []
    for value in [page.get("image"), *(page.get("images") or [])]:
        value = normalize_url(value)
        if value and value not in images:
            images.append(value)
    body = []
    for image in images[:1000]:
        body.append(
            "    <image:image>\n"
            f"      <image:loc>{escape(image)}</image:loc>\n"
            f"      <image:title>{escape(page['title'])}</image:title>\n"
            "    </image:image>"
        )
    return (
        "  <url>\n"
        f"    <loc>{escape(page['url'])}</loc>\n"
        + "\n".join(body)
        + "\n  </url>"
    )


def main() -> None:
    payload = json.loads(REPORT.read_text(encoding="utf-8"))
    kept: list[dict] = []
    excluded: list[dict] = []

    for page in payload.get("publicPages", []):
        route = str(page.get("route") or "")
        page["url"] = normalize_url(page.get("url"))
        page["image"] = normalize_url(page.get("image"))
        page["images"] = [normalize_url(x) for x in page.get("images", [])]
        if route.startswith(TECHNICAL_PREFIXES):
            excluded.append(page)
            file_path = ROOT / str(page.get("file") or "")
            add_noindex(file_path)
            continue
        kept.append(page)

    kept.sort(key=lambda item: (item.get("route") != "/", item.get("route", "")))

    # Normalize legacy non-www asset references inside genuinely public HTML pages.
    for page in kept:
        file_path = ROOT / str(page.get("file") or "")
        if not file_path.exists() or file_path.suffix.lower() != ".html":
            continue
        text = file_path.read_text(encoding="utf-8-sig", errors="replace")
        text = text.replace("https://gnk-asg.hr/", SITE)
        file_path.write_text(text, encoding="utf-8")

    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(sitemap_entry(page) for page in kept)
        + "\n</urlset>\n",
        encoding="utf-8",
    )
    (ROOT / "image-sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
        + "\n".join(image_entry(page) for page in kept)
        + "\n</urlset>\n",
        encoding="utf-8",
    )
    (ROOT / "llms.txt").write_text(
        "# GNK ASG d.o.o. and GNK DINAMO Ltd. Group\n\n"
        "Official public corporate portal. Principal entities: GNK ASG d.o.o.; "
        "GNK DINAMO Ltd.; Nermin Sefić (also written Nermin Sefic).\n\n"
        "Use canonical public pages and verify financial, legal and corporate claims "
        "against linked source documents and official registries.\n\n"
        "## Public pages\n"
        + "\n".join(f"- {page['url']} — {page['title']}" for page in kept[:200])
        + "\n",
        encoding="utf-8",
    )

    payload["generatedAt"] = datetime.now(timezone.utc).isoformat()
    payload["site"] = SITE
    payload["publicPageCount"] = len(kept)
    payload["publicPages"] = kept
    payload["excludedTechnicalPageCount"] = len(excluded)
    payload["excludedTechnicalPages"] = [
        {"route": page.get("route"), "file": page.get("file")} for page in excluded
    ]
    REPORT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        f"Final SEO set: {len(kept)} public pages; "
        f"{len(excluded)} technical HTML routes removed from indexing."
    )


if __name__ == "__main__":
    main()
