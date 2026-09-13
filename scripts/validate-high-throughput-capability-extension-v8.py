#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path.cwd(); src=ROOT/'ops'/'high-throughput-capability-extension-v8.json'; out=ROOT/'artifacts'/'high-throughput-capability-extension-v8'; out.mkdir(parents=True,exist_ok=True)
errors=[]
try:data=json.loads(src.read_text())
except Exception as e:data={};errors.append(f'cannot parse capability extension v8: {e}')
required={'taskClass','primaryCapability','fallbackPool','staticContract','runtimeStatus'}; caps=data.get('capabilities',[]) if isinstance(data,dict) else []
if data.get('healthyRequiresRuntimeEvidence') is not True: errors.append('healthyRequiresRuntimeEvidence must be true')
if data.get('authorityScope')!='R0_R1_ONLY': errors.append('authorityScope must be R0_R1_ONLY')
if len(caps)!=3: errors.append(f'exactly 3 capabilities required, found {len(caps)}')
primaries=set(); tasks=set()
for i,c in enumerate(caps):
    missing=required-set(c)
    if missing: errors.append(f'capability[{i}] missing {sorted(missing)}'); continue
    if c['runtimeStatus']!='UNVERIFIED': errors.append(f"{c['taskClass']}: runtimeStatus must remain UNVERIFIED without runtime evidence")
    fallbacks=c.get('fallbackPool',[])
    if len(fallbacks)<2 or len(set(fallbacks))<2: errors.append(f"{c['taskClass']}: at least two distinct fallbacks required")
    if c['primaryCapability'] in primaries: errors.append(f"duplicate primaryCapability {c['primaryCapability']}")
    if c['taskClass'] in tasks: errors.append(f"duplicate taskClass {c['taskClass']}")
    primaries.add(c['primaryCapability']); tasks.add(c['taskClass'])
    if not (ROOT/c['staticContract']).exists(): errors.append(f"{c['taskClass']}: staticContract missing {c['staticContract']}")
expected={'heartbeat','taskOwnership','queueState','latencyMs','successCount','failureCount','evaluatorVerdict','fallbackCoverage','rollbackCapability','telemetryRef'}
if not expected.issubset(set(data.get('requiredRuntimeEvidence',[]))): errors.append('requiredRuntimeEvidence incomplete')
report={'version':'GNK_ASG_HIGH_THROUGHPUT_CAPABILITY_EXTENSION_V8_VALIDATION','ok':not errors,'capabilityCount':len(caps),'errors':errors}
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n'); print(json.dumps(report,indent=2)); raise SystemExit(1 if errors else 0)
