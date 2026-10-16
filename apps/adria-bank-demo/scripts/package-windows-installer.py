#!/usr/bin/env python3
"""Package the Windows NSIS installer and concise end-user instructions into a ZIP."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
VERSION = PACKAGE["version"]
DEFAULT_INSTALLER = ROOT / "release" / f"Adria-Banka-Demo-Setup-{VERSION}-x64.exe"
DEFAULT_OUTPUT = ROOT / "release" / f"Adria-Bank-Demo-Windows-Setup-{VERSION}-x64.zip"
INSTRUCTIONS = ROOT / "INSTALL-WINDOWS-11-HR.txt"
ARCHIVE_ROOT = "Adria-Bank-Demo-Windows-Setup"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def assert_windows_executable(path: Path) -> None:
    if not path.is_file() or path.stat().st_size < 1024 * 1024:
        raise SystemExit(f"Installer is missing or unexpectedly small: {path}")
    with path.open("rb") as source:
        dos_header = source.read(64)
        if len(dos_header) < 64 or dos_header[:2] != b"MZ":
            raise SystemExit(f"Installer is not a Windows executable (missing MZ header): {path}")
        pe_offset = int.from_bytes(dos_header[0x3C:0x40], "little")
        if pe_offset < 64 or pe_offset > 1024 * 1024:
            raise SystemExit(f"Installer has an invalid PE header offset: {path}")
        source.seek(pe_offset)
        if source.read(4) != b"PE\0\0":
            raise SystemExit(f"Installer is not a valid Windows PE executable: {path}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--installer", type=Path, default=DEFAULT_INSTALLER)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    installer = args.installer.resolve()
    output = args.output.resolve()
    instructions = INSTRUCTIONS.resolve()
    if not instructions.is_file():
        raise SystemExit(f"Windows installation instructions are missing: {instructions}")
    assert_windows_executable(installer)

    installer_digest = sha256(installer)
    checksum_text = f"{installer_digest}  {installer.name}\n"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.unlink(missing_ok=True)
    with ZipFile(output, "w", compression=ZIP_DEFLATED, compresslevel=6) as bundle:
        bundle.write(installer, f"{ARCHIVE_ROOT}/{installer.name}")
        bundle.write(instructions, f"{ARCHIVE_ROOT}/{instructions.name}")
        bundle.writestr(f"{ARCHIVE_ROOT}/SHA256SUMS.txt", checksum_text)

    with ZipFile(output) as bundle:
        corrupt = bundle.testzip()
        expected = {
            f"{ARCHIVE_ROOT}/{installer.name}",
            f"{ARCHIVE_ROOT}/{instructions.name}",
            f"{ARCHIVE_ROOT}/SHA256SUMS.txt",
        }
        missing = sorted(expected - set(bundle.namelist()))
        if corrupt or missing:
            output.unlink(missing_ok=True)
            raise SystemExit(f"Installer ZIP verification failed: corrupt={corrupt!r}; missing={missing!r}")
        archived_digest = hashlib.sha256()
        with bundle.open(f"{ARCHIVE_ROOT}/{installer.name}") as archived_installer:
            for chunk in iter(lambda: archived_installer.read(1024 * 1024), b""):
                archived_digest.update(chunk)
        if archived_digest.hexdigest() != installer_digest:
            output.unlink(missing_ok=True)
            raise SystemExit("Installer ZIP verification failed: embedded installer checksum differs")

    print(f"Created and CRC-tested {output}")
    print(f"Installer: {installer.name} | {installer.stat().st_size:,} bytes | SHA-256: {installer_digest}")
    print(f"ZIP: {output.stat().st_size:,} bytes | SHA-256: {sha256(output)}")
    print("The NSIS installer embeds the Electron runtime; end users do not need Node.js or npm.")


if __name__ == "__main__":
    main()
