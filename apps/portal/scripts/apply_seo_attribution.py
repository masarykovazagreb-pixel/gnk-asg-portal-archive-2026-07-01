#!/usr/bin/env python3
from __future__ import annotations

import html
import json
import re
from pathlib import Path
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://www.gnk-asg.hr/"
POLICY = json.loads((ROOT / "data/seo-attribution-policy-v1.json").read_text(encoding="utf-8"))
BEGIN = "<!-- SEO-ATTRIBUTION:BEGIN -->"
END = "<!-- SEO-ATTRIBUTION:END -->"
PRIVATE = {"admin-center", "operator-dashboard", "operator-mobile", "mail-studio", "webmail", "campaign-mailer", "media-command-center", "enterprise", "mission-control", "review", "api"}


def route_for(path: Path) -> str | None:
    rel = path.relative_to(ROOT)
    if set(part.lower() for part in rel.parts) & PRIVATE or path.name.lower() != "index.html":
        return None
    folder = rel.parent.as_posix().strip(".")
    return "/" if not folder else f"/{folder.strip('/')}/"


def canonical(text: str, route: str) -> str:
    match = re.search(r'<link\b[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)', text, re.I)
    return urljoin(SITE, match.group(1)) if match else urljoin(SITE, route.lstrip("/"))


def title(text: str) -> str:
    match = re.search(r"<title\b[^>]*>(.*?)</title>", text, re.I | re.S)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", match.group(1) if match else "GNK ASG"))).strip()


def rule_for(route: str) -> tuple[str, dict]:
    if route in {"/nermin-sefic/", "/en/nermin-sefic/"}:
        return "ProfilePage", POLICY["rules"]["profile"]
    if route in {"/the-code/", "/en/the-code/"}:
        return "CreativeWork", POLICY["rules"]["theCode"]
    if route.startswith("/objave/") or route.startswith("/publications/"):
        if route not in {"/objave/", "/publications/"}:
            return "Article", POLICY["rules"]["publications"]
    if route.startswith("/vijesti/") or route.startswith("/news/"):
        if route not in {"/vijesti/", "/news/"}:
            return "NewsArticle", POLICY["rules"]["news"]
    if route in {"/objave/", "/publications/", "/vijesti/", "/news/"}:
        return "CollectionPage", POLICY["rules"]["news"]
    return "WebPage", POLICY["rules"]["corporate"]


def block(route: str, text: str) -> str:
    kind, rule = rule_for(route)
    url = canonical(text, route)
    page_id = url + ("#article" if kind in {"Article", "NewsArticle"} else "#webpage")
    person_id = SITE + "nermin-sefic/#person"
    org_id = SITE + "#organization"
    person = {"@type": "Person", "@id": person_id, "name": POLICY["person"]["name"], "alternateName": POLICY["person"]["alternateNames"], "url": POLICY["person"]["url"], "jobTitle": POLICY["person"]["verifiedRoles"], "worksFor": {"@id": org_id}}
    org = {"@type": "Organization", "@id": org_id, "name": POLICY["publisher"]["name"], "url": POLICY["publisher"]["url"], "logo": SITE + "assets/logo-gnk-asg.svg"}
    author = {"@id": person_id} if rule["author"] == POLICY["person"]["name"] else {"@type": "Organization", "name": rule["author"]}
    editor = {"@id": person_id} if rule["editor"] == POLICY["person"]["name"] else {"@type": "Organization", "name": rule["editor"]}
    page = {"@type": kind, "@id": page_id, "url": url, "name": title(text), "headline": title(text), "author": author, "editor": editor, "publisher": {"@id": org_id}, "accountablePerson": {"@id": person_id}}
    if kind in {"Article", "NewsArticle"}:
        page["mainEntityOfPage"] = {"@id": url + "#webpage"}
    if kind == "ProfilePage":
        page["mainEntity"] = {"@id": person_id}
    schema = json.dumps({"@context": "https://schema.org", "@graph": [org, person, page]}, ensure_ascii=False, separators=(",", ":"))
    return "\n".join([
        BEGIN,
        f'  <meta name="author" content="{html.escape(rule["author"], quote=True)}">',
        f'  <meta name="editor" content="{html.escape(rule["editor"], quote=True)}">',
        f'  <meta name="publisher" content="{html.escape(POLICY["publisher"]["name"], quote=True)}">',
        f'  <meta name="executive-role" content="{html.escape(rule["role"], quote=True)}">',
        f'  <script type="application/ld+json">{schema}</script>',
        END,
    ])


def main() -> None:
    changed = []
    for path in sorted(ROOT.rglob("index.html")):
        route = route_for(path)
        if not route:
            continue
        text = path.read_text(encoding="utf-8-sig", errors="replace")
        if "</head>" not in text.lower():
            continue
        text = re.sub(r"\s*<!-- SEO-ATTRIBUTION:BEGIN -->.*?<!-- SEO-ATTRIBUTION:END -->\s*", "\n", text, flags=re.S)
        text = re.sub(r"\s*<meta\b[^>]*name=[\"'](?:editor|publisher|executive-role)[\"'][^>]*>", "", text, flags=re.I)
        text = text.replace("</head>", "\n" + block(route, text) + "\n</head>", 1)
        path.write_text(text, encoding="utf-8")
        changed.append(route)
    (ROOT / "data/seo-attribution-report.json").write_text(json.dumps({"version": POLICY["version"], "pageCount": len(changed), "routes": changed}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"SEO attribution applied to {len(changed)} public pages")


if __name__ == "__main__":
    main()
