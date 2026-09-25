import json
from pathlib import Path

ROOT = Path.cwd()
TASKS = ROOT / 'ops' / 'workforce-critical-task-classes-v1.json'
SLO = ROOT / 'ops' / 'workforce-runtime-slo-v1.json'
OUT = ROOT / 'artifacts' / 'workforce-runtime-slo'
OUT.mkdir(parents=True, exist_ok=True)
failures = []

if not TASKS.exists(): failures.append(f'missing {TASKS}')
if not SLO.exists(): failures.append(f'missing {SLO}')

tasks = json.loads(TASKS.read_text()) if TASKS.exists() else {}
slo = json.loads(SLO.read_text()) if SLO.exists() else {}
thresholds = slo.get('thresholds', {})
required = {
    'maxHeartbeatAgeSeconds': (int, lambda x: 0 < x <= 3600),
    'maxQueueAgeSeconds': (int, lambda x: 0 < x <= 86400),
    'maxLatencyMs': (int, lambda x: 0 < x <= 300000),
    'minObservedTasks': (int, lambda x: x >= 1),
    'minSuccessRate': ((int, float), lambda x: 0 < x <= 1),
    'maxConsecutiveFailures': (int, lambda x: x >= 0),
}
for key, (typ, predicate) in required.items():
    value = thresholds.get(key)
    if not isinstance(value, typ) or not predicate(value): failures.append(f'invalid SLO threshold {key}={value!r}')
for key in ['fallbackRuntimeEvidenceRequired','rollbackEvidenceRequired','evaluatorPassRequired','telemetryReferenceRequired']:
    if thresholds.get(key) is not True: failures.append(f'{key} must be true')
if slo.get('authorityScope') != 'R0_R1_ONLY': failures.append('authorityScope must remain R0_R1_ONLY')
if slo.get('appliesTo') != 'ALL_CRITICAL_TASK_CLASSES': failures.append('SLO must apply to ALL_CRITICAL_TASK_CLASSES')
if slo.get('unknownState') != 'FAIL_CLOSED': failures.append('unknownState must FAIL_CLOSED')
if slo.get('promotionBlockedWithoutEvidence') is not True: failures.append('promotion must be blocked without evidence')
critical = [x.get('id') for x in tasks.get('taskClasses', []) if x.get('critical')]
if not critical: failures.append('no critical task classes declared')

report = {
    'version':'GNK_ASG_WORKFORCE_RUNTIME_SLO_AUDIT_V1',
    'ok': not failures,
    'criticalTaskClassesCovered': len(critical),
    'runtimeHealthyInferred': False,
    'note':'Static SLO coverage is policy evidence only; HEALTHY still requires runtime evidence per task class.',
    'failures': failures,
    'thresholds': thresholds
}
(OUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
raise SystemExit(1 if failures else 0)
