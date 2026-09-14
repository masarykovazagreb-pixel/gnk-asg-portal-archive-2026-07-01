import json
from pathlib import Path

ROOT = Path.cwd()
TASKS = ROOT / 'ops' / 'workforce-critical-task-classes-v1.json'
failures = []
rows = []

if not TASKS.exists():
    raise SystemExit(f'missing task-class registry: {TASKS}')

data = json.loads(TASKS.read_text(encoding='utf-8'))
classes = data.get('taskClasses') or []
seen_ids = set()
for item in classes:
    task_id = str(item.get('id') or '').strip()
    primary = str(item.get('primaryCapability') or '').strip()
    fallback = [str(x).strip() for x in (item.get('fallbackPool') or []) if str(x).strip()]
    critical = item.get('critical') is True
    if not task_id:
        failures.append('task class missing id')
        continue
    if task_id in seen_ids:
        failures.append(f'{task_id}: duplicate task-class id')
    seen_ids.add(task_id)
    if critical and not primary:
        failures.append(f'{task_id}: critical task class missing primaryCapability')
    if critical and len(fallback) < 2:
        failures.append(f'{task_id}: critical task class requires at least two fallback capabilities')
    if primary and primary in fallback:
        failures.append(f'{task_id}: primary capability cannot also be its own fallback')
    if len(fallback) != len(set(fallback)):
        failures.append(f'{task_id}: fallbackPool contains duplicates')
    rows.append({'id': task_id, 'critical': critical, 'primary': primary, 'fallbackPool': fallback, 'fallbackCount': len(fallback)})

critical_rows = [x for x in rows if x['critical']]
report = {
    'version': 'GNK_ASG_WORKFORCE_FALLBACK_COVERAGE_V1',
    'semantics': {
        'coverage': 'Static capability topology only. This does not prove runtime health.',
        'healthy': 'HEALTHY still requires heartbeat, ownership, queue, latency, success/failure, evaluator, fallback execution evidence, rollback and telemetry.'
    },
    'ok': not failures,
    'stats': {
        'taskClasses': len(rows),
        'criticalTaskClasses': len(critical_rows),
        'criticalWithTwoOrMoreFallbacks': sum(1 for x in critical_rows if x['fallbackCount'] >= 2),
        'staticFallbackCoveragePct': round((sum(1 for x in critical_rows if x['fallbackCount'] >= 2) / len(critical_rows) * 100), 2) if critical_rows else 0
    },
    'failures': failures,
    'rows': rows
}
out = ROOT / 'artifacts' / 'workforce-fallback-coverage'
out.mkdir(parents=True, exist_ok=True)
(out / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2, ensure_ascii=False))
if failures:
    raise SystemExit(1)
