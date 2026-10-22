"""Decode NENO Local Vault v0.2 source on the isolated Windows builder."""
from pathlib import Path
import base64
import hashlib
import zipfile

HERE = Path(__file__).resolve().parent
EXPECTED_SHA256 = "65b0f741dbbc64461abe9f5228e64c94fb57091faa227eb0569edb2eee94f4a5"
data = (HERE / "source-v0.2.0.md").read_text(encoding="utf-8")
payload = data.split("BASE85-BEGIN", 1)[1].split("BASE85-END", 1)[0]
content = base64.b85decode("".join(payload.split()))
if hashlib.sha256(content).hexdigest() != EXPECTED_SHA256:
    raise ValueError("Source ZIP hash mismatch: deployment stopped")
with zipfile.ZipFile(__import__("io").BytesIO(content)) as archive:
    root = HERE.resolve()
    for item in archive.infolist():
        dest = (root / item.filename).resolve()
        if not dest.is_relative_to(root):
            raise ValueError("Archive contains path traversal")
    archive.extractall(root)
print("NENO source validated and extracted. SHA256:", EXPECTED_SHA256)
