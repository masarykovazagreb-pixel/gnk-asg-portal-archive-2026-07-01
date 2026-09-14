import json
from pathlib import Path

ROOT = Path.cwd()
manifest_path = ROOT / 'ops' / 'high-throughput-capability-gaps-v1.json'
required_evidence = {
    'heartbeat','taskOwnership','queueState','latencyMs','successCount','failureCount',
    'evaluatorVerdict','fallbackCoverage','rollbackCapability','telemetryRef'
}
failures = []

manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
if manifest.get('authorityScope') != 'R0_R1_ONLY':
    failures.append('authorityScope must remain R0_R1_ONLY')
if manifest.get('healthyRequiresRuntimeEvidence') is not True:
    failures.append('healthyRequiresRuntimeEvidence must be true')
if set(manifest.get('requiredRuntimeEvidence', [])) != required_evidence:
    failures.append('requiredRuntimeEvidence does not match canonical minimum')

seen_classes = set()
seen_primary = set()
for cap in manifest.get('capabilities', []):
    task_class = cap.get('taskClass')
    primary = cap.get('primaryCapability')
    fallbacks = cap.get('fallbackPool') or []
    contract = cap.get('staticContract')
    status = cap.get('runtimeStatus')
    if not task_class or task_class in seen_classes:
        failures.append(f'duplicate/missing taskClass: {task_class}')
    seen_classes.add(task_class)
    if not primary:
        failures.append(f'{task_class}: missing primaryCapability')
    if primary in seen_primary:
        failures.append(f'{task_class}: primaryCapability reused across new gap closures: {primary}')
    seen_primary.add(primary)
    if len(set(fallbacks)) < 2:
        failures.append(f'{task_class}: requires at least two distinct fallbacks')
    if primary in fallbacks:
        failures.append(f'{task_class}: primary cannot self-fallback')
    if not contract or not (ROOT / contract).exists():
        failures.append(f'{task_class}: staticContract missing on disk: {contract}')
    if status not in {'UNVERIFIED','CANDIDATE','SANDBOX','SHADOW','PROBATION','HEALTHY'}:
        failures.append(f'{task_class}: invalid runtimeStatus {status}')
    if status == 'HEALTHY':
        failures.append(f'{task_class}: static manifest may not declare HEALTHY without runtime evidence ledger')

report = {
    'version': 'GNK_ASG_HIGH_THROUGHPUT_CAPABILITY_GAP_VALIDATION_V1',
    'ok': not failures,
    'capabilityCount': len(manifest.get('capabilities', [])),
    'runtimeHealthyCount': 0,
    'note': 'Static topology closes capability gaps but does not count as runtime healthy coverage.',
    'failures': failures,
}
out = ROOT / 'artifacts' / 'high-throughput-capability-gaps'
out.mkdir(parents=True, exist_ok=True)
(out / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2))
raise SystemExit(1 if failures else 0)
