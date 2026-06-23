#!/usr/bin/env python3
from pathlib import Path
import base64, hashlib, json, zlib

ROOT = Path(__file__).resolve().parents[1]
PAYLOAD = ROOT / 'scripts' / 'public-pdf-payload'
OUT = ROOT / 'apps' / 'portal' / 'downloads'
OUT.mkdir(parents=True,exist_ok=True)
manifest = json.loads((PAYLOAD / 'manifest.json').read_text(encoding='utf-8'))

for item in manifest:
    encoded = ''.join((PAYLOAD / part).read_text(encoding='ascii').strip() for part in item['parts'])
    raw = zlib.decompress(base64.b85decode(encoded.encode('ascii')))
    digest = hashlib.sha256(raw).hexdigest()
    if digest != item['sha256']:
        raise SystemExit(f"SHA-256 mismatch for {item['filename']}: {digest}")
    if len(raw) != item['size']:
        raise SystemExit(f"Size mismatch for {item['filename']}: {len(raw)}")
    target = OUT / item['filename']
    target.write_bytes(raw)
    print(f"RESTORED {target} ({len(raw)} bytes)")
