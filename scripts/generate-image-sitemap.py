#!/usr/bin/env python3
"""
Generates a comprehensive image sitemap (apps/portal/image-sitemap.xml)
covering every real, on-disk image used as the main visual on any
indexable page — article covers, gallery hero images, and a
homepage/og:image fallback for pages with neither.

This exists because Google Images only reliably discovers and indexes
images that are explicitly listed in an image sitemap (or otherwise
strongly linked); relying on crawlers finding <img> tags alone is much
weaker. More indexed images for GNK ASG / Nermin Sefić content means
more entry points into search results beyond plain text queries.

Run from the repo root:
    python3 scripts/generate-image-sitemap.py

After running, remember image-sitemap.xml must stay referenced in:
  - apps/portal/robots.txt (Sitemap: line)
  - apps/portal/sitemap-index.xml (<sitemap> entry)
This script does not touch those two files itself, since they're
maintained by scripts/generate-sitemaps.py and hand edits; re-check
both after adding a new sitemap type.
"""
import html
import os
import re
from collections import defaultdict

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORTAL_DIR = os.path.join(REPO_ROOT, "apps", "portal")
BASE_URL = "https://gnk-asg.hr"

# Reuse the same exclusions as generate-sitemaps.py so we never publish
# admin/operational pages or anything noindex'd.
EXCLUDE_PREFIXES = [
    "admin/", "admin-center/", "admin-login/", "control/", "kontrola-azuriranja/",
    "automation-status/", "webmail/", "mail-studio/", "campaign-mailer/",
    "email-status/", "worker-ops/", "operator-dashboard/", "digital-headquarters/",
    "digital-workforce/",
    "media-registration-admin/", "podijeli/", "dijeli/", "api/",
    "assets/", "data/", "docs/", "documents/", "downloads/", "scripts/",
    "tests/", "__preview/", ".github/", "artifacts/",
]
NOINDEX_RE = re.compile(
    r'<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*noindex', re.IGNORECASE
)
IMAGE_TAG_RE = re.compile(r'<img class="(?:article-cover|hero)" src="([^"]+)" alt="([^"]*)"')
GALLERY_IMG_RE = re.compile(r'<img src="(/assets/gallery/[^"]+)" alt="([^"]*)"')
OG_IMAGE_RE = re.compile(r'property="og:image" content="([^"]+)"')
TITLE_RE = re.compile(r'<title>([^<]*)</title>')


def is_excluded(rel_path):
    return any(rel_path.startswith(p) for p in EXCLUDE_PREFIXES)


def esc(s):
    return html.escape(s, quote=True)


def collect_pages():
    """Walk apps/portal/ the same way generate-sitemaps.py does."""
    pages = []
    for dirpath, dirs, files in os.walk(PORTAL_DIR):
        rel_dir = os.path.relpath(dirpath, PORTAL_DIR)
        rel_dir = "" if rel_dir == "." else rel_dir.replace(os.sep, "/")
        check_path = rel_dir + "/" if rel_dir else ""
        if is_excluded(check_path):
            dirs[:] = []
            continue
        if "index.html" not in files:
            continue
        fs_path = os.path.join(dirpath, "index.html")
        try:
            head = open(fs_path, encoding="utf-8", errors="ignore").read(4000)
        except Exception:
            continue
        if NOINDEX_RE.search(head):
            continue
        url_path = "/" + rel_dir + ("/" if rel_dir else "")
        pages.append((BASE_URL + url_path, fs_path))
    return pages


def images_for_page(fs_path):
    try:
        c = open(fs_path, encoding="utf-8", errors="ignore").read()
    except Exception:
        return []
    found = []
    for m in IMAGE_TAG_RE.finditer(c):
        found.append((m.group(1), m.group(2)))
    for m in GALLERY_IMG_RE.finditer(c):
        found.append((m.group(1), m.group(2)))
    if not found:
        m = OG_IMAGE_RE.search(c)
        if m:
            title_m = TITLE_RE.search(c)
            title = title_m.group(1) if title_m else "GNK ASG"
            found.append((m.group(1), title))

    resolved = []
    seen = set()
    for src, alt in found:
        if src in seen:
            continue
        seen.add(src)
        if src.startswith("http"):
            img_url = src
            clean = src[len(BASE_URL):] if src.startswith(BASE_URL) else None
        elif src.startswith("/"):
            img_url = BASE_URL + src
            clean = src
        else:
            continue
        if clean:
            fs_img = os.path.join(PORTAL_DIR, clean.split("?")[0].lstrip("/"))
            if not os.path.isfile(fs_img):
                continue
        resolved.append((img_url, alt or "GNK ASG"))
    return resolved


def main():
    pages = collect_pages()
    page_images = defaultdict(list)
    for url, fs_path in pages:
        imgs = images_for_page(fs_path)
        if imgs:
            page_images[url] = imgs

    total_images = sum(len(v) for v in page_images.values())
    print(f"Pages with images: {len(page_images)}, total image entries: {total_images}")

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ]
    for url in sorted(page_images.keys()):
        lines.append("  <url>")
        lines.append(f"    <loc>{esc(url)}</loc>")
        for img_url, title in page_images[url]:
            lines.append("    <image:image>")
            lines.append(f"      <image:loc>{esc(img_url)}</image:loc>")
            lines.append(f"      <image:title>{esc(title)}</image:title>")
            lines.append("    </image:image>")
        lines.append("  </url>")
    lines.append("</urlset>")

    out_path = os.path.join(PORTAL_DIR, "image-sitemap.xml")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
