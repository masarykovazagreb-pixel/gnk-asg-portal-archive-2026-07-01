#!/usr/bin/env python3
"""
SPT — izrada Windows instalacije (SPT-Setup-<verzija>.exe)      produced by GNK ASG

  python spt/windows/build_installer.py            # izradi i provjeri
  python spt/windows/build_installer.py --check    # samo provjeri postojeći .exe

Potrebno (radi na Linuxu, macOS-u i Windowsu):
  pip install ziglang pillow        (pefile — neobavezno, za dodatnu provjeru PE-a)

Rezultat: spt/windows/release/SPT-Setup-<verzija>.exe  (+ .sha256)

Kako radi
  1. Ikona spt.ico i static/img/icon-512.png (favicon/ikona prozora; spt/static/img/*.png je
     u .gitignore pa nastaje pri izradi) iz apps/portal/spt/img/spt-icon.webp
  2. zig cc (MinGW-w64, x86_64) prevodi stub/setup_stub.c dvaput:
       - SPT-Setup stub (raspakira paket i pokreće setup\\install.ps1)
       - SPT-Uninstall.exe (-DSPT_UNINSTALLER, pokreće uninstall.ps1)
     kao GUI program (--subsystem windows: bez konzolnog prozora), s ikonom, manifestom (asInvoker, Windows 10/11, DPI) i VERSIONINFO podacima.
  3. ZIP paket (determinističan: sortirano, fiksni datumi):
       app\\    server.py + moduli, README.md, static\\, spt_launcher.pyw, spt_prepare.py
       setup\\  install.ps1, uninstall.ps1 (UTF-8 s BOM-om), spt.ico, SPT-Uninstall.exe
  4. SPT-Setup.exe = stub + ZIP + b"SPTPKG01" + duljina ZIP-a (uint64 LE)
  5. Provjera: završni zapis, CRC svih datoteka u ZIP-u, PE zaglavlje i resursi.
"""
import argparse
import hashlib
import io
import re
import struct
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent          # spt/windows
SPT = HERE.parent                               # spt
REPO = SPT.parent
ICON_SRC = REPO / "apps" / "portal" / "spt" / "img" / "spt-icon.webp"
ICO = HERE / "assets" / "spt.ico"
PWA_ICON = SPT / "static" / "img" / "icon-512.png"
RELEASE = HERE / "release"
MAGIC = b"SPTPKG01"
ZIP_DATE = (2026, 10, 12, 12, 0, 0)
BOM = b"\xef\xbb\xbf"

REQUIRED = [
    "app/server.py", "app/seed.py", "app/i18n.py", "app/static/index.html", "app/static/js/app.js",
    "app/static/img/icon-512.png", "app/spt_launcher.pyw", "app/spt_prepare.py",
    "setup/install.ps1", "setup/uninstall.ps1", "setup/spt.ico", "setup/SPT-Uninstall.exe",
]

RC_TEMPLATE = """#pragma code_page(65001)
1 ICON "spt.ico"
1 24 "spt-setup.manifest"
1 VERSIONINFO
FILEVERSION {v1},{v2},{v3},0
PRODUCTVERSION {v1},{v2},{v3},0
FILEFLAGSMASK 0x3F
FILEFLAGS 0x0
FILEOS 0x40004
FILETYPE 0x1
FILESUBTYPE 0x0
BEGIN
  BLOCK "StringFileInfo"
  BEGIN
    BLOCK "041A04B0"
    BEGIN
      VALUE "CompanyName", "GNK ASG"
      VALUE "FileDescription", "{desc}"
      VALUE "FileVersion", "{version}"
      VALUE "InternalName", "{internal}"
      VALUE "LegalCopyright", "© 2026 GNK ASG"
      VALUE "OriginalFilename", "{filename}"
      VALUE "ProductName", "SPT — Sports Performance Tracking"
      VALUE "ProductVersion", "{version}"
      VALUE "Comments", "produced by GNK ASG · https://gnk-asg.hr/spt/"
    END
  END
  BLOCK "VarFileInfo"
  BEGIN
    VALUE "Translation", 0x041A, 1200
  END
END
"""


def log(msg):
    print(f"[build] {msg}", flush=True)


def spt_version():
    text = (SPT / "server.py").read_text(encoding="utf-8")
    m = re.search(r'^VERSION = "([0-9]+\.[0-9]+\.[0-9]+)"', text, re.M)
    if not m:
        sys.exit("VERSION nije pronađen u spt/server.py")
    return m.group(1)


def ensure_icons(refresh=False):
    if not refresh and ICO.exists() and PWA_ICON.exists():
        return
    from PIL import Image  # pip install pillow
    src = Image.open(ICON_SRC)
    if refresh or not ICO.exists():
        ICO.parent.mkdir(parents=True, exist_ok=True)
        sizes = [(16, 16), (20, 20), (24, 24), (32, 32), (40, 40), (48, 48), (64, 64), (96, 96), (128, 128), (256, 256)]
        src.convert("RGBA").save(ICO, sizes=sizes)
        log(f"ikona: {ICO.relative_to(REPO)}")
    if refresh or not PWA_ICON.exists():
        PWA_ICON.parent.mkdir(parents=True, exist_ok=True)
        src.convert("RGB").save(PWA_ICON, optimize=True)
        log(f"PWA ikona: {PWA_ICON.relative_to(REPO)}")


def compile_stub(build, version, uninstaller):
    v1, v2, v3 = version.split(".")
    if uninstaller:
        desc, internal, filename = f"SPT {v1}.{v2} — deinstalacija", "SPT-Uninstall", "SPT-Uninstall.exe"
    else:
        desc, internal, filename = f"SPT {v1}.{v2} — instalacija", "SPT-Setup", f"SPT-Setup-{version}.exe"
    rc = build / f"{internal}.rc"
    rc.write_text(RC_TEMPLATE.format(v1=v1, v2=v2, v3=v3, version=version, desc=desc,
                                     internal=internal, filename=filename), encoding="utf-8")
    out = build / f"{internal}-stub.exe"
    cmd = [sys.executable, "-m", "ziglang", "cc", "-target", "x86_64-windows-gnu", "-Os", "-s",
           "-municode", "-Wl,--subsystem,windows", "-Wall", "-Wextra", f'-DSPT_VERSION="{version}"']
    if uninstaller:
        cmd.append("-DSPT_UNINSTALLER")
    cmd += [str(HERE / "stub" / "setup_stub.c"), rc.name, "-o", str(out), "-lshell32", "-luser32"]
    log("zig cc → " + out.name)
    res = subprocess.run(cmd, cwd=build, capture_output=True, text=True)
    if res.returncode != 0 or not out.exists():
        sys.exit(f"prevođenje nije uspjelo:\n{res.stdout}\n{res.stderr}")
    warnings = [l for l in (res.stderr or "").splitlines() if "warning" in l]
    if warnings:
        log("UPOZORENJA prevoditelja:\n  " + "\n  ".join(warnings))
    return out.read_bytes()


def with_bom(data):
    return data if data.startswith(BOM) else BOM + data


def payload_entries(uninstaller_exe):
    entries = []
    for p in sorted(SPT.glob("*.py")):
        entries.append((f"app/{p.name}", p.read_bytes()))
    entries.append(("app/README.md", (SPT / "README.md").read_bytes()))
    for p in sorted((SPT / "static").rglob("*")):
        if p.is_file() and "__pycache__" not in p.parts:
            entries.append(("app/" + p.relative_to(SPT).as_posix(), p.read_bytes()))
    for name in ("spt_launcher.pyw", "spt_prepare.py"):
        entries.append((f"app/{name}", (HERE / "launcher" / name).read_bytes()))
    for name in ("install.ps1", "uninstall.ps1"):
        entries.append((f"setup/{name}", with_bom((HERE / "installer" / name).read_bytes())))
    entries.append(("setup/spt.ico", ICO.read_bytes()))
    entries.append(("setup/SPT-Uninstall.exe", uninstaller_exe))
    return entries


def build_zip(entries):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for arc, data in sorted(entries):
            zi = zipfile.ZipInfo(arc, date_time=ZIP_DATE)
            zi.compress_type = zipfile.ZIP_DEFLATED
            zi.external_attr = 0o644 << 16
            z.writestr(zi, data)
    return buf.getvalue()


def verify(exe_path):
    data = exe_path.read_bytes()
    assert data[:2] == b"MZ", "nije PE datoteka"
    assert data[-16:-8] == MAGIC, "nema završnog zapisa SPTPKG01"
    zlen = struct.unpack("<Q", data[-8:])[0]
    payload = data[-16 - zlen:-16]
    stub_len = len(data) - 16 - zlen
    with zipfile.ZipFile(io.BytesIO(payload)) as z:
        bad = z.testzip()
        assert bad is None, f"neispravan CRC: {bad}"
        names = set(z.namelist())
        missing = [n for n in REQUIRED if n not in names]
        assert not missing, f"nedostaje u paketu: {missing}"
        for ps in ("setup/install.ps1", "setup/uninstall.ps1"):
            assert z.read(ps).startswith(BOM), f"{ps} nema UTF-8 BOM"
        uninst = z.read("setup/SPT-Uninstall.exe")
        n_files = len(names)
    report = [f"stub {stub_len:,} B + paket {zlen:,} B ({n_files} datoteka) = {len(data):,} B"]
    try:
        import pefile
        for label, blob in (("SPT-Setup", data[:stub_len]), ("SPT-Uninstall", uninst)):
            pe = pefile.PE(data=blob)
            assert pe.FILE_HEADER.Machine == 0x8664, "nije x64"
            assert pe.OPTIONAL_HEADER.Subsystem == 2, "nije GUI (Windows) podsustav"
            types = {e.id for e in pe.DIRECTORY_ENTRY_RESOURCE.entries}
            assert {3, 14, 16, 24} <= types, f"nedostaju resursi (ikona/verzija/manifest): {types}"
            imports = {imp.name.decode() for d in pe.DIRECTORY_ENTRY_IMPORT for imp in d.imports if imp.name}
            assert {"CreateProcessW", "MessageBoxW", "CommandLineToArgvW"} <= imports
            info = {}
            for fi in getattr(pe, "FileInfo", []) or []:
                for entry in fi:
                    for st in getattr(entry, "StringTable", []):
                        info.update({k.decode(): v.decode() for k, v in st.entries.items()})
            report.append(f"{label}: x64 GUI, resursi ikona+manifest+verzija, "
                          f"'{info.get('FileDescription', '?')}' {info.get('FileVersion', '?')}, {info.get('Comments', '')}")
    except ImportError:
        report.append("(pefile nije instaliran — preskačem provjeru PE resursa)")
    return report


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="samo provjeri postojeći .exe")
    ap.add_argument("--refresh-icons", action="store_true", help="ponovno izradi spt.ico i icon-512.png")
    args = ap.parse_args()

    version = spt_version()
    exe_path = RELEASE / f"SPT-Setup-{version}.exe"
    if not args.check:
        ensure_icons(args.refresh_icons)
        with tempfile.TemporaryDirectory(prefix="spt-build-") as tmp:
            build = Path(tmp)
            (build / "spt.ico").write_bytes(ICO.read_bytes())
            (build / "spt-setup.manifest").write_bytes((HERE / "stub" / "spt-setup.manifest").read_bytes())
            uninstaller = compile_stub(build, version, uninstaller=True)
            setup_stub = compile_stub(build, version, uninstaller=False)
        payload = build_zip(payload_entries(uninstaller))
        exe = setup_stub + payload + MAGIC + struct.pack("<Q", len(payload))
        RELEASE.mkdir(parents=True, exist_ok=True)
        exe_path.write_bytes(exe)
        digest = hashlib.sha256(exe).hexdigest()
        (RELEASE / (exe_path.name + ".sha256")).write_text(f"{digest}  {exe_path.name}\n", encoding="ascii")
        log(f"zapisano: {exe_path.relative_to(REPO)}")
    for line in verify(exe_path):
        log("provjera: " + line)
    log("SHA-256: " + hashlib.sha256(exe_path.read_bytes()).hexdigest())


if __name__ == "__main__":
    main()
