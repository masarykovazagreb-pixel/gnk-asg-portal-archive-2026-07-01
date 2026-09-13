import json
from pathlib import Path
p=Path('ops/high-throughput-capability-extension-v21.json')
d=json.loads(p.read_text())
errors=[]
expected=['candidate','sandbox','shadow','evaluator','probation','healthy']
if d.get('authorityScope')!='R0_R1_ONLY': errors.append('bad authority scope')
if d.get('healthyRequiresRuntimeEvidence') is not True: errors.append('runtime evidence must be required')
if d.get('promotionLifecycle')!=expected: errors.append('promotion lifecycle mismatch')
required={'heartbeat','taskOwnership','queueState','latencyMs','successCount','failureCount','evaluatorVerdict','fallbackCoverage','rollbackCapability','telemetryRef'}
if not required.issubset(set(d.get('requiredRuntimeEvidence',[]))): errors.append('runtime evidence incomplete')
seen=set()
for c in d.get('capabilities',[]):
    tc=c.get('taskClass')
    if not tc or tc in seen: errors.append('invalid or duplicate taskClass')
    seen.add(tc)
    if c.get('runtimeStatus')!='UNVERIFIED': errors.append(f'{tc}: status must be UNVERIFIED')
    if not c.get('primaryCapability'): errors.append(f'{tc}: missing primary')
    fb=c.get('fallbackPool',[])
    if len(fb)<2 or len(set(fb))!=len(fb): errors.append(f'{tc}: fallback coverage insufficient')
    sc=c.get('staticContract','')
    if not sc or not Path(sc).is_file(): errors.append(f'{tc}: static contract missing')
out=Path('artifacts/high-throughput-capability-extension-v21')
out.mkdir(parents=True,exist_ok=True)
report={'version':'GNK_ASG_HIGH_THROUGHPUT_CAPABILITY_EXTENSION_V21_VALIDATION','ok':not errors,'taskClasses':sorted(seen),'errors':errors}
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
if errors: raise SystemExit(1)
