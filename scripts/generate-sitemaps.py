#!/usr/bin/env python3
"""
Regenerates sitemap.xml, editorial-sitemap.xml, visual-sitemap.xml and
sitemap-index.xml from the actual apps/portal/ file tree, so the
sitemaps never drift out of sync with what's really published.

Run from the repo root:
    python3 scripts/generate-sitemaps.py

What it does:
  1. Walks apps/portal/, skipping admin/operational/internal paths
     (kept in sync with robots.txt's Disallow list) and any page whose
     own <head> contains <meta name="robots" content="noindex...">.
  2. For every remaining index.html, records its URL and last-modified
     date (from git history, falling back to today's date).
  3. Buckets each URL into one of three sitemaps to match the existing
     robots.txt convention:
       - visual-sitemap.xml   -> /visual-index/ and /en/visual-index/
       - editorial-sitemap.xml -> /objave/, /komentari/, /analize/,
         /analyses/, /publications/, /commentary/, /autorske-objave/
       - sitemap.xml          -> everything else
  4. Writes all four XML files into apps/portal/.

Re-run this after adding/removing/renaming any public page (new
objava, new gallery translation, new section, etc.) and commit the
resulting XML diffs alongside your content change.
"""
import os
import re
import subprocess
from datetime import date
from collections import defaultdict, Counter

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORTAL_DIR = os.path.join(REPO_ROOT, "apps", "portal")
BASE_URL = "https://gnk-asg.hr"

# Kept in sync with apps/portal/robots.txt's Disallow list, plus a few
# non-page directories (assets, data, scripts, tests, docs, etc.).
# apps/portal/digital-workforce/ was excluded here from 2026-07-25
# through 2026-07-26 per the D1 decision (noindex + preview-gate,
# "pending production approval"). Owner explicitly confirmed public
# launch on 2026-07-26 -- noindex and the preview gate were removed
# from all 12 pages in the same commit that removed this exclusion.
EXCLUDE_PREFIXES = [
    "admin/", "admin-center/", "admin-login/", "control/", "kontrola-azuriranja/",
    "automation-status/", "webmail/", "mail-studio/", "campaign-mailer/",
    "email-status/", "worker-ops/", "operator-dashboard/", "digital-headquarters/",
    "media-registration-admin/", "podijeli/", "dijeli/", "api/",
    "assets/", "data/", "docs/", "documents/", "downloads/", "scripts/",
    "tests/", "__preview/", ".github/", "artifacts/",
]

NOINDEX_RE = re.compile(
    r'<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*noindex', re.IGNORECASE
)


def is_excluded(rel_path):
    return any(rel_path.startswith(p) for p in EXCLUDE_PREFIXES)


def git_lastmod(fs_path):
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%ad", "--date=short", "--", fs_path],
            capture_output=True, text=True, cwd=REPO_ROOT, check=True,
        ).stdout.strip()
        return out if out else date.today().isoformat()
    except Exception:
        return date.today().isoformat()


def classify(url_path):
    if "/visual-index/" in url_path or url_path.rstrip("/").endswith("visual-index"):
        return "visual"
    editorial_segments = [
        "/objave/", "/komentari/", "/analize/", "/analyses/",
        "/publications/", "/commentary/", "/autorske-objave/",
    ]
    if any(seg in url_path for seg in editorial_segments):
        return "editorial"
    return "main"


def collect_entries():
    entries = []
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
            head = ""
        if NOINDEX_RE.search(head):
            continue
        url_path = "/" + rel_dir + ("/" if rel_dir else "")
        url = BASE_URL + url_path
        lastmod = git_lastmod(fs_path)
        entries.append((url, lastmod, classify(url_path)))
    return entries


def priority_and_freq(url, cat):
    path = url.replace(BASE_URL, "")
    index_paths = (
        "", "/en", "/objave", "/en/publications", "/komentari", "/en/commentary",
        "/analize", "/en/analyses", "/visual-index", "/en/visual-index",
        "/autorske-objave", "/en/autorske-objave",
    )
    if path in ("/", "/en"):
        return "1.0", "daily"
    if path.rstrip("/") in index_paths:
        return "0.8", "weekly"
    if cat == "editorial":
        return "0.65", "monthly"
    if cat == "visual":
        return "0.55", "monthly"
    return "0.7", "monthly"


def jezicni_par(url):
    """Vraca (hr_url, en_url) ako stranica postoji na oba jezika, inace None.

    Trazilice trebaju eksplicitnu vezu izmedju jezicnih inacica; bez nje
    hrvatska i engleska stranica natjecu se jedna s drugom za isti upit.
    """
    put = url.replace(BASE_URL, "")
    if put.startswith("/en/") or put == "/en":
        hr = "/" + put[len("/en/"):] if put != "/en" else "/"
        en = put
    else:
        hr = put
        en = "/en" + put if put != "/" else "/en/"
    return BASE_URL + hr, BASE_URL + en


def render_urlset(items):
    sve_adrese = {u for u, _, _ in items}
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
        ' xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ]
    for url, lastmod, cat in sorted(items):
        pr, freq = priority_and_freq(url, cat)
        hr_url, en_url = jezicni_par(url)
        veze = ""
        if hr_url in sve_adrese and en_url in sve_adrese:
            veze = (
                f'<xhtml:link rel="alternate" hreflang="hr" href="{hr_url}"/>'
                f'<xhtml:link rel="alternate" hreflang="en" href="{en_url}"/>'
                f'<xhtml:link rel="alternate" hreflang="x-default" href="{hr_url}"/>'
            )
        lines.append(
            f"  <url><loc>{url}</loc><lastmod>{lastmod}</lastmod>"
            f"<changefreq>{freq}</changefreq><priority>{pr}</priority>{veze}</url>"
        )
    lines.append("</urlset>")
    return "\n".join(lines)


def main():
    entries = collect_entries()
    by_cat = defaultdict(list)
    for url, lastmod, cat in entries:
        by_cat[cat].append((url, lastmod, cat))

    print("Pages found:", len(entries), dict(Counter(e[2] for e in entries)))

    files = {
        "sitemap.xml": by_cat["main"],
        "editorial-sitemap.xml": by_cat["editorial"],
        "visual-sitemap.xml": by_cat["visual"],
    }
    for filename, items in files.items():
        out_path = os.path.join(PORTAL_DIR, filename)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(render_urlset(items))
        print(f"wrote {filename}: {len(items)} URLs")

    today = date.today().isoformat()
    index_xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>{BASE_URL}/sitemap.xml</loc>
    <lastmod>{today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>{BASE_URL}/editorial-sitemap.xml</loc>
    <lastmod>{today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>{BASE_URL}/visual-sitemap.xml</loc>
    <lastmod>{today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>{BASE_URL}/image-sitemap.xml</loc>
    <lastmod>{today}</lastmod>
  </sitemap>
</sitemapindex>'''
    with open(os.path.join(PORTAL_DIR, "sitemap-index.xml"), "w", encoding="utf-8") as f:
        f.write(index_xml)
    print("wrote sitemap-index.xml")


if __name__ == "__main__":
    main()
