import json
from pathlib import Path
ROOT=Path.cwd();SRC=ROOT/'ops'/'high-throughput-capability-extension-v12.json';OUT=ROOT/'artifacts'/'high-throughput-capability-extension-v12';errors=[]
data=json.loads(SRC.read_text(encoding='utf-8'));required={'heartbeat','taskOwnership','queueState','latencyMs','successCount','failureCount','evaluatorVerdict','fallbackCoverage','rollbackCapability','telemetryRef'}
if data.get('authorityScope')!='R0_R1_ONLY': errors.append('authorityScope must remain R0_R1_ONLY')
if data.get('healthyRequiresRuntimeEvidence') is not True: errors.append('healthyRequiresRuntimeEvidence must be true')
if set(data.get('requiredRuntimeEvidence',[]))!=required: errors.append('requiredRuntimeEvidence set mismatch')
seen=set()
for cap in data.get('capabilities',[]):
 tc=cap.get('taskClass')
 if not tc or tc in seen: errors.append(f'duplicate or missing taskClass: {tc}')
 seen.add(tc)
 if cap.get('runtimeStatus')!='UNVERIFIED': errors.append(f'{tc}: runtimeStatus must remain UNVERIFIED without runtime evidence')
 fallbacks=cap.get('fallbackPool') or []
 if len(fallbacks)<2 or len(set(fallbacks))!=len(fallbacks): errors.append(f'{tc}: requires two distinct fallbacks')
 contract=cap.get('staticContract')
 if not contract or not (ROOT/contract).exists(): errors.append(f'{tc}: static contract missing: {contract}')
report={'version':'GNK_ASG_HIGH_THROUGHPUT_CAPABILITY_EXTENSION_V12_VALIDATION','ok':not errors,'capabilityCount':len(seen),'errors':errors};OUT.mkdir(parents=True,exist_ok=True);(OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,indent=2));raise SystemExit(1 if errors else 0)
