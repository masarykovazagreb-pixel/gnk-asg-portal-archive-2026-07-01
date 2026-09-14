import json, pathlib, sys
ROOT=pathlib.Path.cwd()
p=ROOT/'ops'/'high-throughput-capability-extension-v9.json'
errors=[]
try:
    data=json.loads(p.read_text(encoding='utf-8'))
except Exception as e:
    print(f'cannot read capability file: {e}', file=sys.stderr); sys.exit(1)
if data.get('authorityScope')!='R0_R1_ONLY': errors.append('authorityScope must be R0_R1_ONLY')
if data.get('healthyRequiresRuntimeEvidence') is not True: errors.append('healthyRequiresRuntimeEvidence must be true')
required={'heartbeat','taskOwnership','queueState','latencyMs','successCount','failureCount','evaluatorVerdict','fallbackCoverage','rollbackCapability','telemetryRef'}
if not required.issubset(set(data.get('requiredRuntimeEvidence',[]))): errors.append('requiredRuntimeEvidence incomplete')
seen=set()
for c in data.get('capabilities',[]):
    tc=c.get('taskClass')
    if not tc or tc in seen: errors.append(f'duplicate/missing taskClass: {tc}')
    seen.add(tc)
    if c.get('runtimeStatus')!='UNVERIFIED': errors.append(f'{tc}: static topology cannot declare runtime healthy')
    fb=c.get('fallbackPool',[])
    if len(fb)<2 or len(set(fb))<2: errors.append(f'{tc}: requires two distinct fallbacks')
    contract=c.get('staticContract','')
    if not contract or not (ROOT/contract).is_file(): errors.append(f'{tc}: missing staticContract {contract}')
if len(seen)!=3: errors.append(f'expected 3 capability classes, found {len(seen)}')
out=ROOT/'artifacts'/'high-throughput-capability-extension-v9'; out.mkdir(parents=True,exist_ok=True)
report={'version':data.get('version'),'ok':not errors,'capabilityCount':len(seen),'runtimeHealthyClaimed':False,'errors':errors}
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2))
if errors: sys.exit(1)
