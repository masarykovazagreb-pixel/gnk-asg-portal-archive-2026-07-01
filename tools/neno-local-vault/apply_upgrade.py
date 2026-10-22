"""Apply SHA-256 verified NENO v0.3.0 upgrade over legacy v0.2 baseline."""
from pathlib import Path
import base64, hashlib, io, zipfile

HERE = Path(__file__).resolve().parent
EXPECTED = "89dbc33fe3859d0bfdae0b83da514f00eb411b9a9ea9039c85ccb69e933a4204"
text = (HERE / "upgrade-v0.3.0.md").read_text(encoding="utf-8")
payload = text.split("BASE85-BEGIN", 1)[1].split("BASE85-END", 1)[0]
data = base64.b85decode("".join(payload.split()))
if hashlib.sha256(data).hexdigest() != EXPECTED:
    raise ValueError("NENO v0.3 upgrade hash mismatch; Windows build stopped.")
with zipfile.ZipFile(io.BytesIO(data)) as archive:
    root = HERE.resolve()
    for item in archive.infolist():
        target = (root / item.filename).resolve()
        if not target.is_relative_to(root):
            raise ValueError("Unsafe archive path")
        if item.is_dir():
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(archive.read(item))
print("Applied NENO v0.3.0 upgrade. SHA256:", EXPECTED)
