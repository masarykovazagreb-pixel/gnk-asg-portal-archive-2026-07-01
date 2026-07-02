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
SEO_BEGIN = "<!-- SITEWIDE-SEO:BEGIN -->"
SEO_END = "<!-- SITEWIDE-SEO:END -->"
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


def publication_meta(path: Path) -> dict | None:
    if not path.exists() or path.suffix.lower() != ".html":
        return None
    text = path.read_text(encoding="utf-8-sig", errors="replace")
    match = re.search(
        r'<script\b[^>]*id=["\']publication-meta["\'][^>]*>(.*?)</script>',
        text,
        flags=re.I | re.S,
    )
    if not match:
        return None
    try:
        data = json.loads(html.unescape(match.group(1)).strip())
    except (TypeError, ValueError, json.JSONDecodeError):
        return None
    required = ("title", "description", "canonical", "image", "datePublished", "author", "publisher", "rightsHolder")
    if not all(str(data.get(key) or "").strip() for key in required):
        return None
    data["canonical"] = normalize_url(data["canonical"])
    data["image"] = normalize_url(data["image"])
    data["alternate"] = normalize_url(data.get("alternate"))
    data["sources"] = [
        {
            "name": str(item.get("name") or item.get("title") or "Source").strip(),
            "title": str(item.get("title") or "").strip(),
            "url": normalize_url(item.get("url")),
        }
        for item in (data.get("sources") or [])
        if str(item.get("url") or "").startswith(("http://", "https://"))
    ]
    return data


def publication_schema(meta: dict) -> dict:
    canonical = meta["canonical"]
    image = meta["image"]
    language = meta.get("language") or "hr"
    collection = SITE + ("publications/" if language == "en" else "objave/")
    author_url = SITE + "nermin-sefic/"
    source_urls = [source["url"] for source in meta.get("sources", [])]
    graph = [
        {
            "@type": "NewsArticle",
            "@id": canonical + "#article",
            "headline": meta["title"],
            "description": meta["description"],
            "image": {"@id": image + "#primaryimage"},
            "thumbnailUrl": image,
            "datePublished": meta["datePublished"],
            "dateModified": meta.get("dateModified") or meta["datePublished"],
            "inLanguage": language,
            "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
            "author": {
                "@type": "Person",
                "@id": author_url + "#person",
                "name": meta["author"],
                "url": author_url,
            },
            "publisher": {
                "@type": "Organization",
                "@id": SITE + "#organization",
                "name": meta["publisher"],
                "url": SITE,
                "logo": {
                    "@type": "ImageObject",
                    "url": SITE + "assets/logo-gnk-asg.svg",
                },
            },
            "copyrightHolder": {
                "@type": "Organization",
                "@id": SITE + "#rights-holder",
                "name": meta["rightsHolder"],
                "url": "https://gnkdinamo.eu/",
            },
            "copyrightYear": int(str(meta["datePublished"])[:4]),
            "articleSection": meta.get("category") or "Business and Technology",
            "keywords": meta.get("keywords") or [],
            "wordCount": int(meta.get("wordCount") or 0) or None,
            "isBasedOn": source_urls,
        },
        {
            "@type": "ImageObject",
            "@id": image + "#primaryimage",
            "url": image,
            "contentUrl": image,
            "caption": meta.get("imageAlt") or meta["title"],
            "creditText": meta.get("imageCredit") or "GNK ASG Visual Index",
            "creator": {"@type": "Organization", "name": meta["publisher"]},
            "copyrightHolder": {"@type": "Organization", "name": meta["rightsHolder"]},
            "representativeOfPage": True,
        },
        {
            "@type": "BreadcrumbList",
            "@id": canonical + "#breadcrumb",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "GNK ASG", "item": SITE},
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Publications" if language == "en" else "Objave",
                    "item": collection,
                },
                {"@type": "ListItem", "position": 3, "name": meta["title"], "item": canonical},
            ],
        },
    ]
    return {"@context": "https://schema.org", "@graph": graph}


def publication_seo(meta: dict) -> str:
    title = html.escape(meta["seoTitle"] or meta["title"], quote=True)
    description = html.escape(meta["description"], quote=True)
    canonical = html.escape(meta["canonical"], quote=True)
    image = html.escape(meta["image"], quote=True)
    image_alt = html.escape(meta.get("imageAlt") or meta["title"], quote=True)
    language = meta.get("language") or "hr"
    locale = "en_US" if language == "en" else "hr_HR"
    alternate_locale = "hr_HR" if language == "en" else "en_US"
    keywords = html.escape(", ".join(meta.get("keywords") or []), quote=True)
    author = html.escape(meta["author"], quote=True)
    publisher = html.escape(meta["publisher"], quote=True)
    rights_holder = html.escape(meta["rightsHolder"], quote=True)
    alternate = html.escape(meta.get("alternate") or "", quote=True)
    hr_url = alternate if language == "en" else canonical
    en_url = canonical if language == "en" else alternate
    x_default = hr_url
    schema = json.dumps(publication_schema(meta), ensure_ascii=False, separators=(",", ":"))
    source_links = ",".join(source["url"] for source in meta.get("sources", []))
    return "\n".join(
        [
            SEO_BEGIN,
            f'  <meta name="description" content="{description}">',
            f'  <meta name="keywords" content="{keywords}">',
            f'  <meta name="author" content="{author}">',
            f'  <meta name="publisher" content="{publisher}">',
            f'  <meta name="copyright" content="© {str(meta["datePublished"])[:4]} {rights_holder}. All rights reserved.">',
            '  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">',
            '  <meta name="googlebot" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">',
            f'  <link rel="canonical" href="{canonical}">',
            f'  <link rel="alternate" hreflang="hr" href="{hr_url}">',
            f'  <link rel="alternate" hreflang="en" href="{en_url}">',
            f'  <link rel="alternate" hreflang="x-default" href="{x_default}">',
            '  <meta property="og:type" content="article">',
            f'  <meta property="og:title" content="{title}">',
            f'  <meta property="og:description" content="{description}">',
            f'  <meta property="og:url" content="{canonical}">',
            '  <meta property="og:site_name" content="GNK ASG Intelligence Desk">',
            f'  <meta property="og:locale" content="{locale}">',
            f'  <meta property="og:locale:alternate" content="{alternate_locale}">',
            f'  <meta property="og:image" content="{image}">',
            f'  <meta property="og:image:secure_url" content="{image}">',
            f'  <meta property="og:image:alt" content="{image_alt}">',
            f'  <meta property="article:published_time" content="{html.escape(meta["datePublished"], quote=True)}">',
            f'  <meta property="article:modified_time" content="{html.escape(meta.get("dateModified") or meta["datePublished"], quote=True)}">',
            f'  <meta property="article:author" content="{author}">',
            f'  <meta property="article:section" content="{html.escape(meta.get("category") or "", quote=True)}">',
            '  <meta name="twitter:card" content="summary_large_image">',
            f'  <meta name="twitter:title" content="{title}">',
            f'  <meta name="twitter:description" content="{description}">',
            f'  <meta name="twitter:image" content="{image}">',
            f'  <meta name="twitter:image:alt" content="{image_alt}">',
            f'  <meta name="citation_author" content="{author}">',
            f'  <meta name="citation_publication_date" content="{html.escape(str(meta["datePublished"])[:10], quote=True)}">',
            f'  <meta name="citation_title" content="{title}">',
            f'  <meta name="citation_journal_title" content="{publisher}">',
            f'  <meta name="citation_reference" content="{html.escape(source_links, quote=True)}">',
            f'  <script type="application/ld+json">{schema}</script>',
            SEO_END,
        ]
    )


def apply_publication_seo(path: Path, meta: dict) -> None:
    text = path.read_text(encoding="utf-8-sig", errors="replace")
    text = re.sub(
        r"\s*<!-- SITEWIDE-SEO:BEGIN -->.*?<!-- SITEWIDE-SEO:END -->\s*",
        "\n",
        text,
        flags=re.S,
    )
    text = re.sub(
        r"<title\b[^>]*>.*?</title>",
        f"<title>{html.escape(meta['seoTitle'] or meta['title'])}</title>",
        text,
        count=1,
        flags=re.I | re.S,
    )
    text = text.replace("</head>", "\n" + publication_seo(meta) + "\n</head>", 1)
    path.write_text(text, encoding="utf-8")


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

    article_pages: list[dict] = []
    for page in kept:
        file_path = ROOT / str(page.get("file") or "")
        if not file_path.exists() or file_path.suffix.lower() != ".html":
            continue
        text = file_path.read_text(encoding="utf-8-sig", errors="replace")
        text = text.replace("https://gnk-asg.hr/", SITE)
        file_path.write_text(text, encoding="utf-8")
        meta = publication_meta(file_path)
        if not meta:
            continue
        apply_publication_seo(file_path, meta)
        page["title"] = meta["seoTitle"] or meta["title"]
        page["description"] = meta["description"]
        page["image"] = meta["image"]
        page["images"] = sorted(set([meta["image"], *(page.get("images") or [])]))
        page["changefreq"] = "weekly"
        page["priority"] = ".85"
        article_pages.append(
            {
                "route": page.get("route"),
                "file": page.get("file"),
                "title": meta["title"],
                "language": meta.get("language"),
                "author": meta["author"],
                "publisher": meta["publisher"],
                "rightsHolder": meta["rightsHolder"],
                "sourceCount": len(meta.get("sources", [])),
            }
        )

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
    payload["articlePageCount"] = len(article_pages)
    payload["articlePages"] = article_pages
    payload["excludedTechnicalPageCount"] = len(excluded)
    payload["excludedTechnicalPages"] = [
        {"route": page.get("route"), "file": page.get("file")} for page in excluded
    ]
    REPORT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        f"Final SEO set: {len(kept)} public pages; "
        f"{len(article_pages)} article pages with NewsArticle metadata; "
        f"{len(excluded)} technical HTML routes removed from indexing."
    )


if __name__ == "__main__":
    main()
