import json
from pathlib import Path

ROOT = Path.cwd()
SOURCE = ROOT / 'ops' / 'workforce-critical-task-classes-v1.json'
OUT = ROOT / 'artifacts' / 'workforce-promotion-lifecycle'
EXPECTED = ['candidate', 'sandbox', 'shadow', 'evaluator', 'probation', 'healthy']
REQUIRED = {'heartbeat','taskOwnership','queueState','latencyMs','successCount','failureCount','evaluatorVerdict','fallbackCoverage','rollbackCapability','telemetryRef'}

failures = []
if not SOURCE.exists():
    raise SystemExit(f'missing {SOURCE}')

data = json.loads(SOURCE.read_text())
policy = data.get('policy', {})
if policy.get('promotionLifecycle') != EXPECTED:
    failures.append(f"promotionLifecycle must equal {EXPECTED}")
if policy.get('healthyRequiresRuntimeEvidence') is not True:
    failures.append('healthyRequiresRuntimeEvidence must be true')
if policy.get('unknownFailsClosed') is not True:
    failures.append('unknownFailsClosed must be true')
if policy.get('authorityScope') != 'R0_R1_ONLY':
    failures.append('authorityScope must remain R0_R1_ONLY')

seen = set()
for task in data.get('taskClasses', []):
    tid = task.get('id')
    if not tid:
        failures.append('task class missing id')
        continue
    if tid in seen:
        failures.append(f'duplicate task class id: {tid}')
    seen.add(tid)
    if task.get('critical') is True:
        evidence = set(task.get('requiredEvidence') or [])
        missing = sorted(REQUIRED - evidence)
        if missing:
            failures.append(f'{tid}: critical task class missing runtime evidence fields: {missing}')
        primary = task.get('primaryCapability')
        fallbacks = task.get('fallbackPool') or []
        if not primary:
            failures.append(f'{tid}: missing primaryCapability')
        if len(set(fallbacks)) < 2:
            failures.append(f'{tid}: needs at least two distinct fallback capabilities')
        if primary in fallbacks:
            failures.append(f'{tid}: primary capability cannot self-fallback')

report = {
    'version': 'GNK_ASG_WORKFORCE_PROMOTION_LIFECYCLE_V1',
    'evidenceSemantics': 'STATIC_POLICY_CONTRACT_ONLY; does not promote any worker to healthy',
    'expectedLifecycle': EXPECTED,
    'criticalTaskClasses': sum(1 for x in data.get('taskClasses', []) if x.get('critical') is True),
    'ok': not failures,
    'failures': failures,
}
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
raise SystemExit(1 if failures else 0)
