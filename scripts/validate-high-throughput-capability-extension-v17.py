import json
from pathlib import Path

ROOT = Path.cwd()
SRC = ROOT / 'ops' / 'high-throughput-capability-extension-v17.json'
OUT = ROOT / 'artifacts' / 'high-throughput-capability-extension-v17' / 'report.json'
failures = []

data = json.loads(SRC.read_text(encoding='utf-8'))
if data.get('version') != 'GNK_ASG_HIGH_THROUGHPUT_CAPABILITY_EXTENSION_V17': failures.append('unexpected version')
if data.get('healthyRequiresRuntimeEvidence') is not True: failures.append('healthyRequiresRuntimeEvidence must be true')
required = set(data.get('requiredRuntimeEvidence') or [])
for key in ['heartbeat','taskOwnership','queueState','latencyMs','successCount','failureCount','evaluatorVerdict','fallbackCoverage','rollbackCapability','telemetryRef']:
    if key not in required: failures.append(f'missing runtime evidence requirement: {key}')
seen = set()
for cap in data.get('capabilities') or []:
    task = cap.get('taskClass')
    if not task or task in seen: failures.append(f'invalid or duplicate taskClass: {task}')
    seen.add(task)
    if not cap.get('primaryCapability'): failures.append(f'{task}: missing primaryCapability')
    pool = cap.get('fallbackPool') or []
    if len(pool) < 2 or len(set(pool)) != len(pool): failures.append(f'{task}: need two distinct fallbacks')
    contract = cap.get('staticContract')
    if not contract or not (ROOT / contract).exists(): failures.append(f'{task}: staticContract missing: {contract}')
    if cap.get('runtimeStatus') != 'UNVERIFIED': failures.append(f'{task}: static topology cannot declare runtime healthy status')
if len(seen) != 3: failures.append(f'expected 3 task classes, got {len(seen)}')
report = {'version': data.get('version'), 'ok': not failures, 'taskClasses': sorted(seen), 'failures': failures}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2))
raise SystemExit(1 if failures else 0)
