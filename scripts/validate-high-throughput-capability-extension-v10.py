import json
from pathlib import Path

root = Path.cwd()
source = root / 'ops' / 'high-throughput-capability-extension-v10.json'
data = json.loads(source.read_text(encoding='utf-8'))
failures = []
required_runtime = {'heartbeat','taskOwnership','queueState','latencyMs','successCount','failureCount','evaluatorVerdict','fallbackCoverage','rollbackCapability','telemetryRef'}

if data.get('authorityScope') != 'R0_R1_ONLY': failures.append('authorityScope must remain R0_R1_ONLY')
if data.get('healthyRequiresRuntimeEvidence') is not True: failures.append('healthyRequiresRuntimeEvidence must be true')
if set(data.get('requiredRuntimeEvidence', [])) != required_runtime: failures.append('requiredRuntimeEvidence mismatch')
for item in data.get('capabilities', []):
    if item.get('runtimeStatus') != 'UNVERIFIED': failures.append(f"{item.get('taskClass')}: static topology cannot claim runtime health")
    if len(item.get('fallbackPool', [])) < 2: failures.append(f"{item.get('taskClass')}: at least two fallbacks required")
    contract = root / str(item.get('staticContract',''))
    if not contract.exists(): failures.append(f"{item.get('taskClass')}: missing static contract {contract}")

report = {'version':'GNK_ASG_HIGH_THROUGHPUT_CAPABILITY_EXTENSION_V10_VALIDATION','ok':not failures,'capabilityCount':len(data.get('capabilities', [])),'failures':failures}
out = root / 'artifacts' / 'high-throughput-capability-extension-v10'
out.mkdir(parents=True, exist_ok=True)
(out / 'report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
print(json.dumps(report, indent=2))
raise SystemExit(1 if failures else 0)
