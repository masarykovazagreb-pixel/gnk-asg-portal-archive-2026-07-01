#!/usr/bin/env python3
import json
from pathlib import Path

ROOT=Path.cwd(); src=ROOT/'ops'/'high-throughput-capability-extension-v4.json'; out=ROOT/'artifacts'/'high-throughput-capability-extension-v4'; out.mkdir(parents=True,exist_ok=True)
errors=[]
try: data=json.loads(src.read_text())
except Exception as e: data={}; errors.append(f'cannot parse capability extension v4: {e}')
required={'taskClass','primaryCapability','fallbackPool','staticContract','runtimeStatus'}
seen=set()
for i,c in enumerate(data.get('capabilities',[])):
    missing=required-set(c)
    if missing: errors.append(f'capability[{i}] missing {sorted(missing)}'); continue
    if c['taskClass'] in seen: errors.append(f'duplicate taskClass {c["taskClass"]}')
    seen.add(c['taskClass'])
    if len(c['fallbackPool'])<2: errors.append(f'{c["taskClass"]}: requires at least two fallbacks')
    if c['runtimeStatus']!='UNVERIFIED': errors.append(f'{c["taskClass"]}: static topology must remain UNVERIFIED without runtime evidence')
    if not (ROOT/c['staticContract']).is_file(): errors.append(f'{c["taskClass"]}: missing static contract {c["staticContract"]}')
if data.get('healthyRequiresRuntimeEvidence') is not True: errors.append('healthyRequiresRuntimeEvidence must be true')
if data.get('authorityScope')!='R0_R1_ONLY': errors.append('authorityScope must be R0_R1_ONLY')
report={'version':'GNK_ASG_HIGH_THROUGHPUT_CAPABILITY_EXTENSION_V4_VALIDATION','ok':not errors,'capabilityCount':len(data.get('capabilities',[])),'errors':errors}
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n'); print(json.dumps(report,indent=2))
raise SystemExit(1 if errors else 0)
