#!/usr/bin/env python3
"""Generate a safe daily GNK ASG English insight, image, SEO metadata and social drafts.

This first version is deterministic and does not require external AI credentials.
It publishes only safe informational topics defined in data/publishing_topics.json
and constrained by data/publishing_policy.json.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import html
import json
import os
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
INSIGHTS_ROOT = ROOT / "en" / "insights"
IMAGE_ROOT = ROOT / "assets" / "insights"
SITE = "https://gnk-asg.hr"
NOW = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
TODAY = NOW.date().isoformat()


def read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def save_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def slugify(value: str) -> str:
    value = value.lower().replace("ć", "c").replace("č", "c").replace("š", "s").replace("ž", "z").replace("đ", "d")
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:90].strip("-") or "gnk-asg-insight"


def font(size: int, bold: bool = False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for item in candidates:
        if Path(item).exists():
            return ImageFont.truetype(item, size)
    return ImageFont.load_default()


def choose_topic(topics: dict, publications: dict) -> dict:
    published_ids = {item.get("topic_id") for item in publications.get("publications", []) if isinstance(item, dict)}
    safe = [t for t in topics.get("topics", []) if t.get("safe_autonomous")]
    safe.sort(key=lambda row: int(row.get("priority", 0)), reverse=True)
    for topic in safe:
        if topic.get("id") not in published_ids:
            return topic
    index = int(hashlib.sha256(TODAY.encode()).hexdigest(), 16) % max(1, len(safe))
    return safe[index]


def category_disclosure(policy: dict, category: str) -> str:
    disclosures = policy.get("automatic_disclosures", {})
    if category == "markets":
        return disclosures.get("markets") or disclosures.get("standard", "")
    if category == "press":
        return disclosures.get("press") or disclosures.get("standard", "")
    return disclosures.get("standard", "")


def build_article(topic: dict, policy: dict) -> tuple[str, str, list[str]]:
    title = topic.get("title_seed", "GNK ASG Insight")
    category = topic.get("category", "insight")
    keywords = topic.get("keywords", [])
    summary = topic.get("summary_seed", "A public GNK ASG Intelligence Desk insight.")
    disclosure = category_disclosure(policy, category)
    paragraphs = [
        f"{summary} The purpose of this publication is to help third-party readers understand the public information framework around GNK ASG d.o.o., GNK DINAMO Ltd. and the public corporate profile connected with Nermin Sefic.",
        "A modern corporate portal is no longer only a static presentation page. It is a structured public information system that combines documentation, market context, technology, official announcements, visual identity and clear navigation. When these elements are connected, visitors can understand the business context without relying on private explanations or fragmented messages across different platforms.",
        "For GNK ASG, artificial intelligence and structured data should be used as tools for clarity. A visitor should be able to ask what a document means, why a market indicator is displayed, which public source supports a statement and how a publication relates to the wider GNK DINAMO Ltd. framework. This does not replace official documents; it helps users find and understand them more efficiently.",
        "The role of Nermin Sefic in this public content framework is best presented through consistent, verifiable and professionally written material. That means using the same identity signals across publications, images, author pages, metadata and internal links. Search visibility improves over time when a name is connected with useful pages, original images, structured data and relevant subject matter rather than repetitive keyword text.",
        "Official press releases and corporate insights should therefore follow the same discipline: a clear headline, a concise explanation, a defined source, a stable URL, metadata for search engines and a visual card that is recognisable across LinkedIn, Facebook, X, Google Images and the portal itself. This makes the portal easier to understand for media, partners, investors and general visitors.",
        disclosure,
    ]
    body = "\n\n".join(paragraphs)
    if len(body.split()) < int(policy.get("minimum_words", 300)):
        body += "\n\n" + "This additional editorial note confirms that the publication is part of a structured autonomous publishing system designed to improve clarity, search visibility and public understanding while avoiding legal, tax, financial and investment advice."
    return title, body, keywords


def make_image(title: str, category: str, slug: str) -> Path:
    IMAGE_ROOT.mkdir(parents=True, exist_ok=True)
    target = IMAGE_ROOT / f"{slug}.png"
    img = Image.new("RGB", (1200, 630), "#07162d")
    draw = ImageDraw.Draw(img, "RGBA")
    for y in range(630):
        ratio = y / 630
        draw.line((0, y, 1200, y), fill=(7 + int(10 * ratio), 22 + int(24 * ratio), 45 + int(38 * ratio), 255))
    draw.ellipse((815, -120, 1260, 325), fill=(212, 175, 55, 38))
    draw.ellipse((890, 30, 1140, 280), fill=(34, 104, 178, 46))
    gold = "#d4af37"
    draw.rounded_rectangle((70, 56, 300, 116), radius=30, outline=gold, width=2, fill=(212, 175, 55, 24))
    draw.text((96, 76), "GNK ASG INSIGHT", font=font(18, True), fill=gold)
    draw.text((72, 168), category.upper(), font=font(20, True), fill=gold)
    y = 220
    words = title.split()
    lines = []
    current = ""
    for word in words:
        test = (current + " " + word).strip()
        if len(test) > 34 and current:
            lines.append(current)
            current = word
        else:
            current = test
    if current:
        lines.append(current)
    for line in lines[:3]:
        draw.text((72, y), line, font=font(42, True), fill="#ffffff")
        y += 56
    draw.line((72, 500, 670, 500), fill=gold, width=2)
    draw.text((72, 530), "Nermin Sefic · GNK ASG d.o.o. · GNK DINAMO Ltd.", font=font(19), fill="#c6d3e3")
    draw.text((920, 530), "gnk-asg.hr", font=font(20, True), fill=gold)
    img.save(target, format="PNG", optimize=True)
    return target


def html_page(title: str, body: str, keywords: list[str], slug: str, category: str, image_url: str, canonical: str) -> str:
    description = html.escape((body.split("\n\n")[0])[:156], quote=True)
    escaped_title = html.escape(title, quote=True)
    paragraphs = "\n".join(f"<p>{html.escape(p)}</p>" for p in body.split("\n\n"))
    keyword_text = html.escape(", ".join(keywords), quote=True)
    schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": body.split("\n\n")[0][:220],
        "datePublished": NOW.isoformat(),
        "dateModified": NOW.isoformat(),
        "author": {"@type": "Organization", "name": "GNK ASG Intelligence Desk"},
        "publisher": {"@type": "Organization", "name": "GNK ASG d.o.o.", "url": SITE},
        "about": [{"@type": "Person", "name": "Nermin Sefic"}, {"@type": "Organization", "name": "GNK DINAMO Ltd."}],
        "image": image_url,
        "mainEntityOfPage": canonical,
        "keywords": keywords,
    }
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>{escaped_title} | GNK ASG Insights</title>
  <meta name="description" content="{description}">
  <meta name="keywords" content="{keyword_text}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <link rel="canonical" href="{canonical}">
  <link rel="stylesheet" href="/assets/style.css">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <meta property="og:type" content="article">
  <meta property="og:title" content="{escaped_title}">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="{image_url}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{escaped_title}">
  <meta name="twitter:description" content="{description}">
  <meta name="twitter:image" content="{image_url}">
  <script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
  <style>
    body{{background:#f6f8fc;color:#10243c}}.insight-wrap{{max-width:980px;margin:0 auto;padding:28px 20px 56px}}.insight-hero{{background:#07162d;color:#fff;border-radius:28px;padding:34px;margin:18px 0 24px;overflow:hidden}}.insight-hero img{{width:100%;border-radius:20px;margin-top:22px}}.meta{{color:#d4af37;font-size:.73rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}}.article{{background:#fff;border:1px solid #dce5ef;border-radius:22px;padding:clamp(22px,4vw,42px)}}.article p{{font-size:1.02rem;line-height:1.78;color:#40566f}}.sharebar{{display:flex;gap:9px;flex-wrap:wrap;margin-top:26px}}.sharebar a,.sharebar button{{border:1px solid #d7e1ec;border-radius:999px;padding:10px 14px;background:#fff;color:#07162d;text-decoration:none;font-weight:850;font-size:.76rem}}.tags{{display:flex;flex-wrap:wrap;gap:7px;margin-top:24px}}.tags span{{background:#edf3fb;color:#143b6d;border-radius:999px;padding:7px 10px;font-size:.68rem;font-weight:900}}
  </style>
</head>
<body>
<header class="site-header"><div class="container nav"><a class="brand" href="/"><img src="/assets/logo-gnk-asg.svg" alt="GNK ASG d.o.o."></a><nav class="nav-links"><a href="/en/">Home</a><a href="/en/insights/">Insights</a><a href="/en/nermin-sefic/">Nermin Sefic</a><a href="/en/intelligence-desk/">Intelligence Desk</a></nav></div></header>
<main class="insight-wrap">
  <a href="/en/insights/">← GNK ASG Insights</a>
  <section class="insight-hero"><p class="meta">{html.escape(category.upper())} · {NOW.date().isoformat()} · GNK ASG Intelligence Desk</p><h1>{escaped_title}</h1><img src="{image_url}" alt="{escaped_title}"></section>
  <article class="article">{paragraphs}<div class="tags">{''.join('<span>'+html.escape(k)+'</span>' for k in keywords)}</div><div class="sharebar"><a target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url={canonical}">Share on LinkedIn</a><a target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u={canonical}">Share on Facebook</a><a target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?url={canonical}&text={urllib_quote(title)}">Share on X</a><button onclick="navigator.clipboard&&navigator.clipboard.writeText('{canonical}')">Copy link</button></div></article>
</main>
</body>
</html>"""


def urllib_quote(value: str) -> str:
    from urllib.parse import quote
    return quote(value)


def update_index(publications: dict) -> None:
    INSIGHTS_ROOT.mkdir(parents=True, exist_ok=True)
    items = publications.get("publications", [])
    cards = "\n".join(
        f"<article class='card'><small>{html.escape(item.get('category','insight')).upper()} · {html.escape(item.get('date',''))}</small><h2><a href='{html.escape(item.get('url',''))}'>{html.escape(item.get('title',''))}</a></h2><p>{html.escape(item.get('description',''))}</p></article>"
        for item in items[:30]
    ) or "<p>No publications yet. The autonomous publishing system is initialized.</p>"
    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GNK ASG Insights | Nermin Sefic, AI, Markets and Corporate Transparency</title><meta name="description" content="English GNK ASG Insights about Nermin Sefic, GNK ASG, GNK DINAMO Ltd., artificial intelligence, market intelligence and corporate transparency."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{SITE}/en/insights/"><link rel="stylesheet" href="/assets/style.css"><style>.wrap{{max-width:1040px;margin:0 auto;padding:34px 20px 60px}}.hero{{background:#07162d;color:#fff;border-radius:28px;padding:38px;margin-bottom:24px}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}}.card{{background:#fff;border:1px solid #dce5ef;border-radius:20px;padding:22px}}.card small{{color:#ad7d20;font-weight:900}}.card a{{color:#07162d}}</style></head><body><header class="site-header"><div class="container nav"><a class="brand" href="/"><img src="/assets/logo-gnk-asg.svg" alt="GNK ASG"></a><nav class="nav-links"><a href="/en/">Home</a><a href="/en/nermin-sefic/">Nermin Sefic</a><a href="/en/intelligence-desk/">Intelligence Desk</a></nav></div></header><main class="wrap"><section class="hero"><p class="eyebrow">GNK ASG INSIGHTS</p><h1>Publications on AI, corporate transparency, market intelligence and Nermin Sefic</h1><p>English public-information insights prepared within the GNK ASG and GNK DINAMO Ltd. content framework.</p></section><section class="grid">{cards}</section></main></body></html>"""
    (INSIGHTS_ROOT / "index.html").write_text(page, encoding="utf-8")


def main() -> None:
    policy = read_json(DATA / "publishing_policy.json", {})
    topics = read_json(DATA / "publishing_topics.json", {"topics": []})
    publications = read_json(DATA / "publications.json", {"version": "2026-05-30-01", "publications": []})
    topic = choose_topic(topics, publications)
    title, body, keywords = build_article(topic, policy)
    slug = f"{TODAY}-{slugify(title)}"
    category = topic.get("category", "insight")
    path = INSIGHTS_ROOT / TODAY[:4] / TODAY[5:7] / slug / "index.html"
    image = make_image(title, category, slug)
    url_path = f"/en/insights/{TODAY[:4]}/{TODAY[5:7]}/{slug}/"
    canonical = SITE + url_path
    image_url = SITE + "/assets/insights/" + image.name
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(html_page(title, body, keywords, slug, category, image_url, canonical), encoding="utf-8")
        item = {
            "id": slug,
            "topic_id": topic.get("id"),
            "title": title,
            "description": body.split("\n\n")[0][:220],
            "category": category,
            "date": TODAY,
            "url": url_path,
            "canonical": canonical,
            "image": "/assets/insights/" + image.name,
            "image_url": image_url,
            "byline": policy.get("safe_default_byline", "GNK ASG Intelligence Desk"),
            "editorial_responsibility": policy.get("editorial_responsibility", "Nermin Sefic"),
            "keywords": keywords,
            "social_drafts": {
                "linkedin": f"{title}\n\nA new GNK ASG Insight on {category}, public information and business understanding.\n\nRead the full publication: {canonical}",
                "facebook": f"New GNK ASG Insight: {title}. Read the full publication at {canonical}",
                "x": f"New GNK ASG Insight: {title} {canonical}"
            }
        }
        publications.setdefault("publications", []).insert(0, item)
    publications["updated_at"] = NOW.isoformat()
    save_json(DATA / "publications.json", publications)
    save_json(DATA / "publication_status.json", {"status": "ok", "updated_at": NOW.isoformat(), "last_publication": publications["publications"][0] if publications.get("publications") else None, "external_distribution": {"linkedin": "not_connected", "facebook": "not_connected", "x": "not_connected", "youtube": "not_connected"}})
    update_index(publications)
    print(json.dumps({"status": "ok", "publication": publications["publications"][0]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
