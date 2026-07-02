#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
SITE_HOST = "www.gnk-asg.hr"
INTERNAL_ROUTES = {
    "/control/",
    "/automation-status/",
    "/admin/",
    "/operator-dashboard/",
    "/operator-mobile/",
    "/mail-studio/",
    "/webmail/",
    "/campaign-mailer/",
}
ROBOTS_DIRECTIVES = (
    "Disallow: /control/",
    "Disallow: /automation-status/",
    "Disallow: /admin/",
    "Disallow: /operator-dashboard/",
    "Disallow: /operator-mobile/",
    "Disallow: /mail-studio/",
    "Disallow: /webmail/",
    "Disallow: /campaign-mailer/",
)
NOINDEX = '<meta name="robots" content="noindex,nofollow,noarchive">'
NOINDEX_GOOGLE = '<meta name="googlebot" content="noindex,nofollow,noarchive">'


def normalise_route(value: str) -> str:
    route = value or "/"
    if not route.startswith("/"):
        route = "/" + route
    if "." not in route.rsplit("/", 1)[-1] and not route.endswith("/"):
        route += "/"
    return route


def route_from_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.netloc and parsed.netloc != SITE_HOST:
        return ""
    return normalise_route(parsed.path)


def route_file(route: str) -> Path:
    route = normalise_route(route)
    if route == "/":
        return ROOT / "index.html"
    return ROOT / route.strip("/") / "index.html"


def apply_noindex(path: Path) -> bool:
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8-sig", errors="replace")
    if "</head>" not in text.lower():
        return False
    text = re.sub(
        r"\s*<meta\b[^>]*name=[\"'](?:robots|googlebot)[\"'][^>]*>",
        "",
        text,
        flags=re.I,
    )
    text = text.replace("</head>", f"\n{NOINDEX}\n{NOINDEX_GOOGLE}\n</head>", 1)
    path.write_text(text, encoding="utf-8")
    return True


def harden_sitemap(filename: str) -> int:
    path = ROOT / filename
    if not path.exists():
        return 0
    ET.register_namespace("", "http://www.sitemaps.org/schemas/sitemap/0.9")
    if filename == "image-sitemap.xml":
        ET.register_namespace("image", "http://www.google.com/schemas/sitemap-image/1.1")
    tree = ET.parse(path)
    root = tree.getroot()
    namespace = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
    removed = 0
    for item in list(root.findall(f"{namespace}url")):
        loc = item.find(f"{namespace}loc")
        if loc is not None and route_from_url(loc.text or "") in INTERNAL_ROUTES:
            root.remove(item)
            removed += 1
    tree.write(path, encoding="utf-8", xml_declaration=True)
    return removed


def harden_report() -> int:
    path = ROOT / "data" / "seo-report.json"
    if not path.exists():
        return 0
    payload = json.loads(path.read_text(encoding="utf-8"))
    public_pages = payload.get("publicPages") or []
    kept = [page for page in public_pages if normalise_route(str(page.get("route") or "")) not in INTERNAL_ROUTES]
    removed_pages = [page for page in public_pages if page not in kept]
    payload["publicPages"] = kept
    payload["publicPageCount"] = len(kept)
    excluded = payload.setdefault("excludedTechnicalPages", [])
    existing = {normalise_route(str(item.get("route") or "")) for item in excluded}
    for page in removed_pages:
        route = normalise_route(str(page.get("route") or ""))
        if route not in existing:
            excluded.append({"route": route, "file": page.get("file"), "reason": "internal-route"})
    payload["excludedTechnicalPageCount"] = len(excluded)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return len(removed_pages)


def harden_llms() -> int:
    path = ROOT / "llms.txt"
    if not path.exists():
        return 0
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    kept = [line for line in lines if not any(f"https://{SITE_HOST}{route}" in line for route in INTERNAL_ROUTES)]
    path.write_text("\n".join(kept).rstrip() + "\n", encoding="utf-8")
    return len(lines) - len(kept)


def harden_robots() -> int:
    path = ROOT / "robots.txt"
    text = path.read_text(encoding="utf-8", errors="replace") if path.exists() else "User-agent: *\nAllow: /\n"
    added = 0
    insertion = []
    for directive in ROBOTS_DIRECTIVES:
        if directive not in text:
            insertion.append(directive)
            added += 1
    if insertion:
        marker = "\nSitemap:"
        block = "\n" + "\n".join(insertion) + "\n"
        text = text.replace(marker, block + marker, 1) if marker in text else text.rstrip() + block
    path.write_text(text.rstrip() + "\n", encoding="utf-8")
    return added


def main() -> None:
    hardened = sum(1 for route in INTERNAL_ROUTES if apply_noindex(route_file(route)))
    removed_sitemap = harden_sitemap("sitemap.xml")
    removed_images = harden_sitemap("image-sitemap.xml")
    removed_report = harden_report()
    removed_llms = harden_llms()
    robots_added = harden_robots()
    print(
        "Internal-route hardening complete: "
        f"html={hardened}, sitemap={removed_sitemap}, image_sitemap={removed_images}, "
        f"report={removed_report}, llms={removed_llms}, robots={robots_added}"
    )


if __name__ == "__main__":
    main()
