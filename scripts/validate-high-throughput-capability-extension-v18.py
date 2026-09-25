import json
from pathlib import Path
p=Path('ops/high-throughput-capability-extension-v18.json')
d=json.loads(p.read_text())
errors=[]
if d.get('authorityScope')!='R0_R1_ONLY': errors.append('authorityScope must be R0_R1_ONLY')
if d.get('healthyRequiresRuntimeEvidence') is not True: errors.append('healthyRequiresRuntimeEvidence must be true')
if d.get('promotionLifecycle')!=['candidate','sandbox','shadow','evaluator','probation','healthy']: errors.append('promotionLifecycle mismatch')
req={'heartbeat','taskOwnership','queueState','latencyMs','successCount','failureCount','evaluatorVerdict','fallbackCoverage','rollbackCapability','telemetryRef'}
if not req.issubset(set(d.get('requiredRuntimeEvidence',[]))): errors.append('runtime evidence set incomplete')
seen=set()
for c in d.get('capabilities',[]):
    tc=c.get('taskClass')
    if not tc or tc in seen: errors.append(f'invalid/duplicate taskClass: {tc}')
    seen.add(tc)
    if c.get('runtimeStatus')!='UNVERIFIED': errors.append(f'{tc}: runtimeStatus must remain UNVERIFIED')
    if not c.get('primaryCapability'): errors.append(f'{tc}: missing primaryCapability')
    fb=c.get('fallbackPool',[])
    if len(fb)<2 or len(set(fb))!=len(fb): errors.append(f'{tc}: need >=2 unique fallbacks')
    sc=c.get('staticContract','')
    if not sc or not Path(sc).is_file(): errors.append(f'{tc}: staticContract missing: {sc}')
out=Path('artifacts/high-throughput-capability-extension-v18');out.mkdir(parents=True,exist_ok=True)
report={'version':'GNK_ASG_HIGH_THROUGHPUT_CAPABILITY_EXTENSION_V18_VALIDATION','ok':not errors,'taskClasses':sorted(seen),'errors':errors}
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
raise SystemExit(1 if errors else 0)
