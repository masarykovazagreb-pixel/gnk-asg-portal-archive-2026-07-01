#!/usr/bin/env python3
"""Validate that internal and administrative routes remain protected.

This compatibility entrypoint performs static fail-closed checks against the
active Cloudflare Worker source and public assets. It does not mutate routes,
DNS, secrets or bindings.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WORKER_DIR = ROOT / "workers" / "gnk-asg-direct-operator" / "src"
PORTAL_DIR = ROOT / "apps" / "portal"

REQUIRED_WORKER_FILES = (
    WORKER_DIR / "index-digital-workforce-v1.js",
    WORKER_DIR / "digital-workforce-api-v1.js",
    WORKER_DIR / "index-unified-auth-v23.js",
)

PUBLIC_HTML = (
    PORTAL_DIR / "index.html",
    PORTAL_DIR / "en" / "index.html",
    PORTAL_DIR / "digital-workforce" / "index.html",
    PORTAL_DIR / "editor-desk" / "index.html",
)

FORBIDDEN_PUBLIC_MARKERS = (
    "ADMIN_TOKEN",
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_ACCOUNT_ID",
    "api_token",
    "bearer ",
    "private_key",
)


def read(path: Path) -> str:
    if not path.is_file():
        raise SystemExit(f"Internal-route hardening failed: missing required file {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8", errors="replace")


def main() -> int:
    errors: list[str] = []

    sources = {path: read(path) for path in REQUIRED_WORKER_FILES}
    api = sources[WORKER_DIR / "digital-workforce-api-v1.js"]
    wrapper = sources[WORKER_DIR / "index-digital-workforce-v1.js"]

    if "/api/admin/editor-desk" not in api:
        errors.append("digital-workforce API is missing the protected admin route")
    if "unauthorized" not in api or "401" not in api:
        errors.append("admin Editor Desk route does not contain an explicit 401 unauthorized response")
    if "/api/operator-auth-check" not in api:
        errors.append("admin Editor Desk route does not delegate to the existing operator auth-check endpoint")
    if "headers:request.headers" not in api.replace(" ", ""):
        errors.append("operator auth-check request does not preserve the incoming session headers")
    if "response.ok" not in api:
        errors.append("operator auth-check result is not evaluated fail-closed")

    if "handleDigitalWorkforce" not in wrapper:
        errors.append("active wrapper does not invoke the Digital Workforce route handler")
    if "app.fetch" not in wrapper:
        errors.append("active wrapper does not preserve the existing authenticated worker runtime")
    if "./index-unified-auth-v23.js" not in wrapper:
        errors.append("active wrapper does not import the approved unified-auth v23/V38 runtime")

    # Reject accidental public exposure of common internal route prefixes.
    public_route_literals = re.findall(r"['\"](/(?:api/)?(?:admin|internal|operator)[^'\"]*)['\"]", api)
    for route in public_route_literals:
        if route.startswith("/api/admin/") and route != "/api/admin/editor-desk":
            errors.append(f"unexpected additional admin route in Digital Workforce module: {route}")
        if route.startswith("/api/internal/") or route.startswith("/internal/"):
            errors.append(f"internal route is exposed by Digital Workforce module: {route}")

    for html_path in PUBLIC_HTML:
        text = read(html_path)
        lower = text.lower()
        for marker in FORBIDDEN_PUBLIC_MARKERS:
            if marker.lower() in lower:
                errors.append(f"{html_path.relative_to(ROOT)} contains forbidden public marker {marker}")
        if "/api/admin/editor-desk" in text:
            errors.append(f"{html_path.relative_to(ROOT)} directly references the protected admin API")

    if errors:
        formatted = "\n".join(f" - {item}" for item in errors)
        raise SystemExit(f"Internal-route hardening failed:\n{formatted}")

    print("Internal-route hardening validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
