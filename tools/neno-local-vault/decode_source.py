"""Decode NENO Local Vault v0.2 source on the isolated Windows builder."""
from pathlib import Path
import base64
import hashlib
import zipfile

HERE = Path(__file__).resolve().parent
EXPECTED_SHA256 = "53674049e59127522f30d13e0619a58ebab57b203504e793cba4aebcc47770d4"
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
