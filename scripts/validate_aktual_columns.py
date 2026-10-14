#!/usr/bin/env python3
"""Validate published AKTUAL MEDIA column routes against the canonical registry."""
from __future__ import annotations

import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
PORTAL = ROOT / "apps" / "portal"
SITE = "https://gnk-asg.hr"
REGISTRY = PORTAL / "data" / "editorial-registry.json"
IMAGE_MANIFEST = PORTAL / "data" / "editorial-image-manifest.json"
LEGACY_FEED = PORTAL / "data" / "kolumne.json"
INDEXES = {
    "hr": PORTAL / "gnk-aktual" / "kolumne" / "index.html",
    "en": PORTAL / "en" / "gnk-aktual" / "columns" / "index.html",
}
ARTICLE_TYPES = {"Article", "NewsArticle", "OpinionNewsArticle", "BlogPosting"}


class Document(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.meta: dict[str, str] = {}
        self.links: list[dict[str, str]] = []
        self.images: list[dict[str, str]] = []
        self.anchors: list[str] = []
        self.h1_count = 0
        self._in_h1 = False
        self.h1_text = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key.lower(): value or "" for key, value in attrs}
        if tag == "meta":
            key = values.get("property") or values.get("name")
            if key:
                self.meta[key.lower()] = values.get("content", "")
        elif tag == "link":
            self.links.append(values)
        elif tag == "img":
            self.images.append(values)
        elif tag == "a":
            self.anchors.append(values.get("href", ""))
        elif tag == "h1":
            self.h1_count += 1
            self._in_h1 = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "h1":
            self._in_h1 = False

    def handle_data(self, data: str) -> None:
        if self._in_h1:
            self.h1_text += data


def article_schemas(source: str) -> list[dict]:
    schemas: list[dict] = []
    for raw in re.findall(
        r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>',
        source,
        re.IGNORECASE,
    ):
        try:
            value = json.loads(raw)
        except json.JSONDecodeError:
            continue
        nodes = value if isinstance(value, list) else [value]
        for node in nodes:
            if isinstance(node, dict) and node.get("@type") in ARTICLE_TYPES:
                schemas.append(node)
    return schemas


def fail(errors: list[str], route: str, detail: str) -> None:
    errors.append(f"{route}: {detail}")


def main() -> None:
    for source in (REGISTRY, IMAGE_MANIFEST, LEGACY_FEED):
        if not source.is_file():
            raise SystemExit(f"Missing validation input: {source.relative_to(ROOT)}")

    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    manifest = json.loads(IMAGE_MANIFEST.read_text(encoding="utf-8"))
    feed = json.loads(LEGACY_FEED.read_text(encoding="utf-8"))
    image_by_path = {item.get("path"): item for item in manifest.get("items", [])}
    columns = [
        item
        for item in registry.get("items", [])
        if item.get("type") == "kolumna"
        and item.get("status") == "published"
        and item.get("language") in INDEXES
    ]
    errors: list[str] = []
    index_docs: dict[str, tuple[str, Document]] = {}

    for language, index_path in INDEXES.items():
        if not index_path.is_file():
            fail(errors, str(index_path.relative_to(ROOT)), "static archive index is missing")
            continue
        source = index_path.read_text(encoding="utf-8")
        document = Document()
        document.feed(source)
        index_docs[language] = (source, document)

    for item in columns:
        route = item["path"]
        page_path = PORTAL / route.strip("/") / "index.html"
        manifest_item = image_by_path.get(route)
        if not page_path.is_file():
            fail(errors, route, "published column page is missing")
            continue
        if not manifest_item:
            fail(errors, route, "editorial cover manifest entry is missing")
            continue

        source = page_path.read_text(encoding="utf-8")
        document = Document()
        document.feed(source)
        language = item["language"]
        expected_canonical = f"{SITE}{route}"
        expected_image_path = manifest_item.get("image", "")
        expected_image_url = f"{SITE}{expected_image_path}"
        canonical_links = [
            link.get("href", "")
            for link in document.links
            if "canonical" in link.get("rel", "").lower().split()
        ]
        covers = [
            image
            for image in document.images
            if "article-cover" in image.get("class", "").split()
        ]
        schemas = article_schemas(source)

        if canonical_links != [expected_canonical]:
            fail(errors, route, "canonical URL is missing, duplicated or incorrect")
        if document.h1_count != 1 or not document.h1_text.strip():
            fail(errors, route, "expected exactly one non-empty H1 heading")
        if document.meta.get("og:image") != expected_image_url:
            fail(errors, route, "Open Graph cover differs from the editorial manifest")
        if document.meta.get("twitter:image") != expected_image_url:
            fail(errors, route, "Twitter cover differs from the editorial manifest")
        if len(covers) != 1 or covers[0].get("src") != expected_image_path:
            fail(errors, route, "visible article-cover differs from the editorial manifest")
        local_image = PORTAL / expected_image_path.lstrip("/")
        if not expected_image_path.startswith("/assets/") or not local_image.is_file():
            fail(errors, route, "thematic editorial cover must be a present local asset")
        if len(schemas) != 1:
            fail(errors, route, "expected exactly one Article-family JSON-LD node")
        else:
            schema = schemas[0]
            main_entity = schema.get("mainEntityOfPage", {})
            if isinstance(main_entity, dict):
                schema_canonical = main_entity.get("@id") or main_entity.get("url", "")
            else:
                schema_canonical = str(main_entity)
            if schema_canonical != expected_canonical:
                fail(errors, route, "Article JSON-LD canonical differs from the page")
            images = schema.get("image", [])
            if isinstance(images, dict):
                images = [images.get("url", "")]
            elif isinstance(images, str):
                images = [images]
            else:
                images = [image.get("url", "") if isinstance(image, dict) else image for image in images]
            if expected_image_url not in images:
                fail(errors, route, "Article JSON-LD image differs from the editorial manifest")
            if item.get("authorSchemaVerified"):
                author = schema.get("author", {})
                if not isinstance(author, dict) or author.get("@type") != "Person" or author.get("name") != "Nermin Sefić" or author.get("url") != f"{SITE}/nermin-sefic/":
                    fail(errors, route, "verified Nermin authorship needs the linked Person schema")

        index = index_docs.get(language)
        if index:
            index_source, index_doc = index
            if route not in index_doc.anchors or route not in index_source:
                fail(errors, route, f"static {language} columns archive does not link this route")

    # This legacy JSON powers a client-side AKTUAL editorial-links widget. Keep
    # each target live, but do not treat every feed item as a column page.
    feed_items = feed if isinstance(feed, list) else feed.get("items", [])
    for item in feed_items:
        url = item.get("url", "")
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.netloc != "gnk-asg.hr" or not parsed.path.startswith("/"):
            fail(errors, item.get("slug", "kolumne.json"), "editorial feed URL must be a canonical first-party HTTPS route")
            continue
        target = PORTAL / parsed.path.strip("/") / "index.html"
        if not target.is_file():
            fail(errors, item.get("slug", "kolumne.json"), f"editorial feed target is not published: {parsed.path}")

    if errors:
        raise SystemExit("AKTUAL column publication validation failed:\n- " + "\n- ".join(errors))
    counts = {language: sum(item["language"] == language for item in columns) for language in INDEXES}
    print(json.dumps({"version": "AKTUAL_COLUMNS_PUBLICATION_VALIDATION_V2", "publishedColumnPages": len(columns), "languageCounts": counts, "staticArchives": len(index_docs), "editorialFeedTargets": len(feed_items), "errors": []}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
