#!/usr/bin/env python3
"""Validate and safely import the supplied AKTUAL WORLD 201 ZIP into this repository.

Usage:
    python3 scripts/import-aktual-world-package-v1.py /path/to/MASTER_ASG_AKTUAL_WORLD_201_FINAL.zip
    python3 scripts/import-aktual-world-package-v1.py /path/to/package.zip --apply

Dry-run is default. No existing files will be replaced; this is intentional.
Review and resolve any conflicts in a separate PR before using the package.
"""
import argparse
import json
import pathlib
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
REGISTRY = "apps/portal/data/world-countries-v1.json"
ALLOWED = (
    ".github/workflows/aktual-world-source-refresh-v1.yml",
    "README-AKTUAL-WORLD-201.md",
    REGISTRY,
    "scripts/build-aktual-world-v1.mjs",
    "scripts/generate-world-countries-v1.mjs",
    "scripts/refresh-aktual-world-headlines-v1.mjs",
    "tests/test-aktual-world-v1.mjs",
)
SITE_PREFIXES = (
    "apps/portal/gnk-aktual/media/",
    "apps/portal/gnk-aktual/grad/",
)

def verify(archive):
    names = archive.namelist()
    if len(names) != len(set(names)):
        raise ValueError("ZIP contains duplicate file paths")
    if len(names) != 430:
        raise ValueError(f"Expected 430 files; found {len(names)}")
    for info in archive.infolist():
        path = pathlib.PurePosixPath(info.filename)
        if (
            info.is_dir() or path.is_absolute() or ".." in path.parts
            or chr(92) in info.filename
            or not (info.filename in ALLOWED or info.filename.startswith(SITE_PREFIXES))
        ):
            raise ValueError(f"Unsafe or unexpected path: {info.filename}")
        if info.file_size > 2_000_000:
            raise ValueError(f"Oversized file: {info.filename}")
        if (info.external_attr >> 16) & 0o170000 == 0o120000:
            raise ValueError(f"Symlink not permitted: {info.filename}")
    for path in ALLOWED:
        if path not in names:
            raise ValueError(f"Missing required source: {path}")
    record = json.loads(archive.read(REGISTRY))
    countries = record.get("countries", [])
    cities = record.get("cities", [])
    if len(countries) != 201 or len(cities) != 10:
        raise ValueError(f"Unexpected registry sizes: {len(countries)} / {len(cities)}")
    slugs = [x["slug"] for x in countries]
    city_slugs = [x["slug"] for x in cities]
    if len(set(slugs)) != 201 or len(set(city_slugs)) != 10:
        raise ValueError("Duplicate country or city slugs")
    if "hrvatska" not in slugs:
        raise ValueError("Missing Croatia")
    xml_feeds = [
        f"apps/portal/gnk-aktual/media/{x}/feed.xml" for x in slugs
    ] + [
        f"apps/portal/gnk-aktual/grad/{x}/feed.xml" for x in city_slugs
    ]
    html_pages = [
        f"apps/portal/gnk-aktual/media/{x}/index.html" for x in slugs
    ] + [
        f"apps/portal/gnk-aktual/grad/{x}/index.html" for x in city_slugs
    ]
    for filename in html_pages + xml_feeds + ["apps/portal/gnk-aktual/media/sitemap.xml"]:
        if filename not in names:
            raise ValueError(f"Missing generated page or feed: {filename}")
    for filename in xml_feeds + ["apps/portal/gnk-aktual/media/sitemap.xml"]:
        ET.fromstring(archive.read(filename))
    sitemap = archive.read("apps/portal/gnk-aktual/media/sitemap.xml").decode("utf-8")
    urls = re.findall(r"<loc>(.*?)</loc>", sitemap)
    if len(urls) != 211 or len(urls) != len(set(urls)):
        raise ValueError(f"Expected 211 unique sitemap entries; found {len(urls)}")
    expected = {
        "https://gnk-asg.hr/gnk-aktual/media/" + slug + "/"
        for slug in slugs
    } | {
        "https://gnk-asg.hr/gnk-aktual/grad/" + slug + "/"
        for slug in city_slugs
    }
    if set(urls) != expected:
        raise ValueError("Sitemap URLs do not match generated route set")
    return names

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("zip_path", type=pathlib.Path)
    parser.add_argument("--apply", action="store_true", help="Write files only after all checks pass")
    args = parser.parse_args()
    with zipfile.ZipFile(args.zip_path) as archive:
        names = verify(archive)
        conflicts = [name for name in names if (ROOT / name).exists()]
        if conflicts:
            raise ValueError("Existing files cannot be overwritten: " + ", ".join(conflicts[:20]))
        print(json.dumps({"verified": len(names), "countries": 201, "cities": 10, "feeds": 211,
                          "sitemapUrls": 211, "apply": args.apply}, ensure_ascii=False))
        if args.apply:
            for name in names:
                target = ROOT / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(archive.read(name))
            print("Imported verified files. Run repository CI and review diff before PR/merge.")

if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, ET.ParseError, zipfile.BadZipFile) as e:
        print(f"AKTUAL WORLD import rejected: {e}", file=sys.stderr)
        sys.exit(1)
