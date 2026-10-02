#!/usr/bin/env python3
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PORTAL=ROOT/"apps"/"portal"
WORKFLOW=(ROOT/".github/workflows/refresh-index-live-data.yml").read_text(encoding="utf-8")
GUARD=json.loads((ROOT/"ops/digital-assets-single-writer-guard-v1.json").read_text(encoding="utf-8"))

FILES=[
 "market.json","market_indices.json","fast_market_status.json",
 "stablecoins.json","btc_chart.json","exchange_compare.json",
 "stock_exchanges.json","asg_gold_asset.json","reference_assets_status.json",
]
for name in FILES:
    payload=json.loads((PORTAL/"data"/name).read_text(encoding="utf-8"))
    if name in {"stablecoins.json","btc_chart.json","exchange_compare.json","stock_exchanges.json","asg_gold_asset.json","reference_assets_status.json"}:
        assert payload.get("checked_at") or payload.get("updated_at"), (name,"missing freshness evidence")

for required in [
 "apps/portal/scripts/refresh_market_satellites.py",
 "apps/portal/scripts/update_reference_assets.py",
]:
    assert required in WORKFLOW, required

writes=set(GUARD["canonicalWriter"]["writes"])
for name in FILES:
    assert f"apps/portal/data/{name}" in writes, name

assert "apps/portal/data/news.json" not in writes
assert "apps/portal/data/news_archive.json" not in writes
assert GUARD["canonicalWriter"]["workflow"]==".github/workflows/refresh-index-live-data.yml"
assert GUARD["canonicalWriter"]["targetCadence"]=="2x daily"
assert any(x.get("path")=="apps/portal/.github/workflows/fast-market-update.yml" and x.get("status")=="legacy-hold" for x in GUARD.get("legacyPaths",[]))
assert "git rebase" not in WORKFLOW
print(json.dumps({"ok":True,"writer":GUARD["canonicalWriter"]["workflow"],"files":FILES},indent=2))
