import json
from pathlib import Path
p=Path('ops/high-throughput-capability-extension-v24.json')
data=json.loads(p.read_text())
errors=[]
if data.get('runtimeStatus')!='UNVERIFIED': errors.append('runtimeStatus must remain UNVERIFIED without runtime evidence')
classes=data.get('taskClasses') or []
if len(classes)!=3: errors.append(f'expected 3 taskClasses, found {len(classes)}')
required={'heartbeat','ownership','queue','latency','success_failure','evaluator','fallback','rollback','telemetry'}
seen=set()
for c in classes:
    cid=c.get('id')
    if not cid or cid in seen: errors.append(f'invalid or duplicate task class id: {cid!r}')
    seen.add(cid)
    if not c.get('primary'): errors.append(f'{cid}: missing primary capability')
    fallbacks=c.get('fallbacks') or []
    if len(set(fallbacks))<2: errors.append(f'{cid}: requires at least two independent fallbacks')
    ev=set(c.get('requiredEvidence') or [])
    missing=sorted(required-ev)
    if missing: errors.append(f'{cid}: missing evidence fields: {missing}')
report={'version':'GNK_ASG_HIGH_THROUGHPUT_CAPABILITY_EXTENSION_V24_VALIDATION','ok':not errors,'taskClasses':len(classes),'errors':errors}
out=Path('artifacts/high-throughput-capability-extension-v24');out.mkdir(parents=True,exist_ok=True);(out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
if errors: raise SystemExit(1)
