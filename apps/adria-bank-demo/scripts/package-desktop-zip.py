#!/usr/bin/env python3
"""Build a reproducible source bundle for the Windows desktop-demo launcher."""
from __future__ import annotations

from hashlib import sha256
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "Adria-Bank-Demo-Desktop-2026-10-11.zip"
ARCHIVE_ROOT = "Adria-Bank-Demo-Desktop"
SKIP_DIRS = {
    ".git", ".cache", ".next", ".npm", ".pytest_cache", ".venv", "build",
    "coverage", "dist", "node_modules", "out", "release", "target", "__pycache__",
}
SKIP_FILES = {".env", ".env.local", ".env.production", ".npmrc", ".pypirc"}
REQUIRED_FILES = {
    "START-HERE.txt",
    "START-ADRIA-BANK-DEMO.bat",
    "Install-Windows.ps1",
    "RUN-ADRIA-BANK-DEMO.vbs",
    "package.json",
    "package-lock.json",
    "README.md",
    "COMPLIANCE-OVERVIEW.md",
    "PRODUCT-AND-COMPETITOR-REVIEW-2026-10-11.md",
    "welcome.html",
    "index.html",
    "client.html",
    "exchange.html",
}


def source_files() -> list[Path]:
    result: list[Path] = []
    for path in ROOT.rglob("*"):
        relative = path.relative_to(ROOT)
        if not path.is_file() or path.is_symlink():
            continue
        if any(part in SKIP_DIRS for part in relative.parts):
            continue
        if path.name in SKIP_FILES or path.suffix.lower() in {".zip", ".pyc", ".log"}:
            continue
        if path.name.startswith(".DS_Store") or path.name == "Thumbs.db":
            continue
        result.append(path)
    return sorted(result, key=lambda item: item.relative_to(ROOT).as_posix())


def main() -> None:
    files = source_files()
    included = {path.relative_to(ROOT).as_posix() for path in files}
    missing = sorted(REQUIRED_FILES - included)
    if missing:
        raise SystemExit(f"Refusing to create an incomplete bundle; missing: {', '.join(missing)}")

    with ZipFile(ARCHIVE, "w", compression=ZIP_DEFLATED, compresslevel=8) as bundle:
        for path in files:
            relative = path.relative_to(ROOT).as_posix()
            bundle.write(path, f"{ARCHIVE_ROOT}/{relative}")

    with ZipFile(ARCHIVE) as bundle:
        corrupt = bundle.testzip()
        names = set(bundle.namelist())
        missing_in_archive = sorted(f"{ARCHIVE_ROOT}/{name}" for name in REQUIRED_FILES if f"{ARCHIVE_ROOT}/{name}" not in names)
        if corrupt or missing_in_archive:
            ARCHIVE.unlink(missing_ok=True)
            raise SystemExit(f"ZIP validation failed: corrupt={corrupt!r}; missing={missing_in_archive!r}")
        if any("/node_modules/" in name or "/.git/" in name for name in names):
            ARCHIVE.unlink(missing_ok=True)
            raise SystemExit("ZIP validation failed: dependency or Git data must not be bundled")

    digest = sha256(ARCHIVE.read_bytes()).hexdigest()
    print(f"Created and CRC-tested {ARCHIVE.name}")
    print(f"Files: {len(files)} | Size: {ARCHIVE.stat().st_size:,} bytes | SHA-256: {digest}")
    print("This is a source bundle; Electron for Windows is downloaded by the first-run installer.")


if __name__ == "__main__":
    main()
