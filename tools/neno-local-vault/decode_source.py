"""Decode embedded Base85 ZIP to source folder, preserving local paths."""
from pathlib import Path
import base64
import zipfile

HERE = Path(__file__).resolve().parent
data = (HERE / "source-v0.1.0.md").read_text(encoding="utf-8")
payload = data.split("BASE85-BEGIN", 1)[1].split("BASE85-END", 1)[0]
zip_path = HERE / "source-unpacked.zip"
zip_path.write_bytes(base64.b85decode("".join(payload.split())))
with zipfile.ZipFile(zip_path) as archive:
    root = HERE.resolve()
    for item in archive.infolist():
        dest = (root / item.filename).resolve()
        if not dest.is_relative_to(root):
            raise ValueError("Archive contains path traversal")
    archive.extractall(root)
zip_path.unlink()
print("Source extracted to", root)
