import {CONTENT_SOURCE_POLICY_VERSION} from './content-source-policy-v1.js';
export const VERSION='GNK_ASG_DIGITAL_WORKFORCE_SUITE_V3_20260719_FIRST_PARTY_PROVENANCE';
const PUBLIC_METHODS=new Set(['GET','HEAD']);
const pathOf=r=>new URL(r.url).pathname.replace(/\/+$/,'')||'/';
const json=(r,data,status=200)=>new Response(r.method==='HEAD'?null:JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-gnk-digital-workforce-suite':VERSION}});
const firstPartyProvenance=(recordType,originalUrl,publishedAt=null)=>({policyVersion:CONTENT_SOURCE_POLICY_VERSION,sourceClass:'first-party',sourceName:'GNK ASG',recordType,originalUrl,publishedAt,usageBasis:'first-party-original',attributionRequired:false,autoEligible:true});
const BASE_PROJECTS=[['PRJ-001','Healthcare & Rehabilitation','Dr. Wei Chen','Pilot & Clinical Validation','Confirmed pilot results',212],['PRJ-002','Sports Systems','Priya Nair','Data Integration','Interoperable data layer',173],['PRJ-003','Payment & Digital Exchange','James Carter','Licensing & Banking Framework','Licenses obtained',204],['PRJ-004','Digital Instrument & Gold','Charlotte Whitfield','Proof-of-Reserves & Audit','Independent reserve audit',161],['PRJ-005','International University','Prof. Sofia Rossi','Accreditation & Platform','Academic partnership agreement',182],['PRJ-006','Organic Protein Food','Arjun Mehta','Certification & Production','Secured supply chain',156],['PRJ-007','Industrial Production','Matteo Ricci','Construction & Automation','Secured CAPEX',190],['PRJ-008','Energy Trading','Michael Brooks','Compliance & Framework','Approved counterparties',145],['PRJ-009','THE CODE','Li Jing','Regulatory Approvals','Regulatory approvals',150]].map(([id,name,lead,phase,gate,team],i)=>({id,name,lead,phase,gate,team,baseProgress:48+i*5,idx:i}));
const STEP_POOL=[['Dnevni operativni pregled i usklađivanje dokaza.','Zaključiti sljedeći mjerljivi gate i evidentirati rezultat.'],['Sinkronizacija s povezanim projektima i vanjskim partnerima.','Pripremiti dokaz napretka za sljedeći kontrolni ciklus.'],['Provjera kvalitete isporučenih rezultata iz prethodnog ciklusa.','Zatvoriti otvorene stavke prije prelaska u sljedeću fazu.'],['Ažuriranje projektne dokumentacije i revizijskog traga.','Uskladiti prioritete s voditeljem projekta za idući tjedan.'],['Pregled rizika i ovisnosti vezanih uz trenutnu fazu.','Eskalirati blokirajuće stavke operatoru ako je potrebno.']];
const STEP_POOL_EN=[['Daily operational review and evidence reconciliation.','Close out the next measurable gate and record the result.'],['Synchronization with related projects and external partners.','Prepare progress evidence for the next control cycle.'],['Quality check of deliverables from the previous cycle.','Close open items before moving into the next phase.'],['Update project documentation and the audit trail.','Align priorities with the project lead for next week.'],['Review of risks and dependencies tied to the current phase.','Escalate blocking items to the operator if needed.']];
function projectsForDay(simDay,lang='hr'){
  const pool=lang==='en'?STEP_POOL_EN:STEP_POOL;
  return BASE_PROJECTS.map(p=>{
    const progress=Math.min(97,Math.round(p.baseProgress+simDay*1.15));
    const status=progress>=95?'controlled':(p.idx<3||simDay%7===p.idx%7?'in_progress':'controlled');
    const stepPair=pool[(simDay+p.idx)%pool.length];
    return{id:p.id,name:p.name,lead:p.lead,phase:p.phase,gate:p.gate,team:p.team,status,credits:9800+p.idx*1375+simDay*40,progress,lastStep:stepPair[0],nextStep:stepPair[1]};
  });
}
const PROJECTS=BASE_PROJECTS.map(p=>({id:p.id,name:p.name,lead:p.lead,phase:p.phase,gate:p.gate,team:p.team}));
function risksForDay(simDay,lang='hr'){
  const projects=projectsForDay(simDay,lang);
  const titles=['Clinical partner timing','Data standardization','Licensing dependency','Custodian readiness','Accreditation timing','Supply-chain traceability','CAPEX closure','Counterparty sanctions','Cross-project approvals'];
  return projects.map((p,i)=>({projectId:p.id,title:titles[i],status:p.progress>=85?'resolved':(i%3===0?'mitigating':'under_control'),owner:p.lead}));
}
const OPINION_POOL=[
  gate=>`${gate} ostaje ključni gate. Preporuka je zadržati dnevni dokaz napretka, zaključiti otvorene ovisnosti i ne prelaziti u novu fazu bez mjerljivog rezultata.`,
  gate=>`Trenutni fokus ostaje na ${gate}. Voditelj predlaže dodatnu provjeru kvalitete prije nego se stavka proglasi zatvorenom.`,
  gate=>`${gate} pokazuje stabilan napredak. Preporuka je ubrzati dokumentiranje kako bi sljedeći gate imao potpun revizijski trag.`,
  gate=>`Vezano uz ${gate}: rizik je nizak, ali voditelj savjetuje kratku sinkronizaciju s povezanim projektima prije zatvaranja faze.`,
  gate=>`${gate} je i dalje prioritet ovog ciklusa. Preporuka je zadržati postojeći ritam izvještavanja bez ubrzavanja bez pokrića.`,
];
const OPINION_POOL_EN=[
  gate=>`${gate} remains the key gate. The recommendation is to keep daily proof of progress, close open dependencies, and not move to the next phase without a measurable result.`,
  gate=>`Current focus stays on ${gate}. The lead suggests an additional quality check before the item is declared closed.`,
  gate=>`${gate} shows steady progress. The recommendation is to speed up documentation so the next gate has a complete audit trail.`,
  gate=>`Regarding ${gate}: risk is low, but the lead advises a brief sync with related projects before closing the phase.`,
  gate=>`${gate} remains a priority for this cycle. The recommendation is to keep the current reporting pace without accelerating without coverage.`,
];
function opinionsForDay(simDay,lang='hr'){
  const pool=lang==='en'?OPINION_POOL_EN:OPINION_POOL;
  return PROJECTS.map((p,i)=>({projectId:p.id,lead:p.lead,text:pool[(simDay+i)%pool.length](p.gate),provenance:firstPartyProvenance('project-opinion','https://gnk-asg.hr/api/public/digital-workforce/opinions')}));
}
const BASE_DEPENDENCIES=[['PRJ-002','PRJ-001','sports analytics → rehabilitation','sports analytics → rehabilitation'],['PRJ-003','PRJ-004','payment rails → digital instrument','payment rails → digital instrument'],['PRJ-008','PRJ-007','energy supply → industrial production','energy supply → industrial production'],['PRJ-007','PRJ-006','production/logistics → organic food','production/logistics → organic food'],['PRJ-005','PRJ-002','university academy → sports systems','university academy → sports systems'],['PRJ-009','ALL','shared integration and governance','shared integration and governance']].map(([from,to,note,noteEn])=>({from,to,note,noteEn}));
function dependenciesForDay(simDay,lang='hr'){
  const projects=projectsForDay(simDay,lang);
  const byId=Object.fromEntries(projects.map(p=>[p.id,p]));
  return BASE_DEPENDENCIES.map(d=>{
    const fromP=byId[d.from],toP=d.to==='ALL'?null:byId[d.to];
    const bothHigh=fromP&&(toP?toP.progress>=85:true)&&fromP.progress>=85;
    return{from:d.from,to:d.to,note:lang==='en'?d.noteEn:d.note,status:bothHigh?'resolved':'active'};
  });
}
const PLAN=[{block:'18. 7. – 16. 8. 2026.',focus:'Potvrda partnera, licenci, skrbništva, opskrbe i regulatornih paketa.'},{block:'17. 8. – 15. 9. 2026.',focus:'Produkcijska integracija, certifikacije, platforme i sigurnosno učvršćivanje.'},{block:'16. 9. – 15. 10. 2026.',focus:'Operativno skaliranje, prvi ugovori, aktivna tržišta i grupna integracija.'}];
const PLAN_EN=[{block:'Jul 18 – Aug 16, 2026',focus:'Confirming partners, licenses, custody, supply, and regulatory packages.'},{block:'Aug 17 – Sep 15, 2026',focus:'Production integration, certifications, platforms, and security hardening.'},{block:'Sep 16 – Oct 15, 2026',focus:'Operational scaling, first contracts, active markets, and group integration.'}];
const NAME_ROOT=['Avel','Neri','Sol','Mira','Kael','Lumi','Tari','Vela','Eli','Orin','Zena','Ravi','Iria','Noel','Sena','Dari','Kora','Lior','Mavi','Teno','Ari','Niva','Sori','Elan','Vian','Rina','Kian','Talia','Oren','Lena','Milo','Yara','Zori','Nelia','Amon','Cira','Vero','Isen','Ruma','Teon'];
const NAME_END=['a','en','ia','on','el','ara','in','or','is','ea','iel','ina','aro','ira','ian','ela','ane','ora','eus','inae','aris','ione','una','eron','avia','orin','essa','elio','avel','iona','irel','irea','oren','elia','aren','onia','iris','eon','alis','uria'];
const SUR_ROOT=['Adri','Bore','Celes','Davor','Elion','Ferro','Galen','Helio','Iver','Javor','Kalen','Lumen','Maren','Nover','Orbis','Peren','Quorin','Ravel','Soren','Tavor','Ulmer','Valen','Weren','Xaver','Yoren','Zaren','Aster','Brion','Corin','Delmar','Eldor','Faren','Gavor','Hektor','Ilvar','Joren','Kres','Lorien','Mavor','Nestor'];
const SUR_END=['ić','ov','en','ar','is','on','ev','an','or','in','er','al','es','um','as','ir','eo','un','el','ek','ović','ević','ski','ska','sen','son','man','berg','heim','ford','well','wood','ton','ley','mar','dor','ven','ric','dan','mir'];
function worker(i){const a=i%40,b=Math.floor(i/40)%40,p=PROJECTS[i%PROJECTS.length],firstName=`${NAME_ROOT[a]}${NAME_END[b]}`,lastName=`${SUR_ROOT[b]}${SUR_END[a]}`,id=`W-${String(i+1).padStart(4,'0')}`;return{id,identityType:'synthetic-digital-worker',firstName,lastName,name:`${firstName} ${lastName}`,projectId:p.id,project:p.name,function:['Strategy & Planning','Development & Engineering','Compliance & Regulation','Data Science','Legal Affairs','Financial Modeling','Quality Control','Documentation','Operational Support','Security & Data Protection','Sales & Partnerships','Team Coordination'][i%12],status:i%11===0?'review':'active',provenance:firstPartyProvenance('digital-worker','https://gnk-asg.hr/api/public/digital-workforce/workers')};}
const WORKERS=Array.from({length:1573},(_,i)=>worker(i));
if(new Set(WORKERS.map(x=>x.firstName)).size!==1573||new Set(WORKERS.map(x=>x.lastName)).size!==1573||new Set(WORKERS.map(x=>x.name)).size!==1573)throw new Error('digital_workforce_identity_collision');
const BASE_TASKS=Array.from({length:108},(_,i)=>{const w=WORKERS[(i*13)%WORKERS.length],p=PROJECTS[i%9];return{id:`TSK-${String(i+1).padStart(3,'0')}`,title:`${p.gate}: operativni korak ${i%12+1}`,titleEn:`${p.gate}: operational step ${i%12+1}`,projectId:p.id,workerId:w.id,worker:w.name,priority:['normal','high','critical'][i%3],dueDay:91+(i%90),idx:i};});
function tasksForDay(simDay,lang='hr'){
  const cycle=['todo','progress','done'];
  return BASE_TASKS.map(t=>({id:t.id,title:lang==='en'?t.titleEn:t.title,projectId:t.projectId,workerId:t.workerId,worker:t.worker,priority:t.priority,dueDay:t.dueDay,status:cycle[(t.idx+simDay)%3]}));
}
const SUMMARY_POOL=[
  'Voditelji su predali dnevna izvješća; zadaci, rizici i kreditna kretanja usklađeni su s projektnim gateovima.',
  'Dnevni ciklus zatvoren bez otvorenih blokatora; svi projekti prijavili status prema planu.',
  'Operativni pregled potvrđuje napredak u većini projekata; jedna stavka zahtijeva dodatnu koordinaciju.',
  'Izvješća voditelja usklađena s kreditnim knjigovodstvom; nema odstupanja od plana ciklusa.',
  'Dnevni ciklus prošao bez eskalacija; rizici i ovisnosti pregledani i potvrđeni kao pod kontrolom.',
];
const SUMMARY_POOL_EN=[
  'Leads submitted daily reports; tasks, risks, and credit movements are aligned with project gates.',
  'Daily cycle closed with no open blockers; all projects reported status as planned.',
  'Operational review confirms progress across most projects; one item needs additional coordination.',
  'Lead reports reconciled with credit ledger; no deviation from the cycle plan.',
  'Daily cycle passed without escalations; risks and dependencies reviewed and confirmed under control.',
];
const REPORT_MINUTES_POOL=['Potvrđen je napredak prema definiranom gateu.','Pregledana je dokumentacija i potvrđen status faze.','Voditelj je potvrdio usklađenost s prethodnim ciklusom.'];
const REPORT_PROPOSAL_POOL=['Ubrzati dokazivanje sljedećeg mjerljivog rezultata.','Zadržati trenutni ritam do sljedeće kontrolne točke.','Uvesti dodatnu provjeru kvalitete prije sljedećeg gatea.'];
const REPORT_FINANCIAL_POOL=['Trošak faze ostaje unutar kontroliranog plana.','Nema odstupanja od odobrenog budžeta za ovaj ciklus.','Trošak prati planiranu dinamiku bez dodatnih zahtjeva.'];
const REPORT_MINUTES_POOL_EN=['Progress against the defined gate was confirmed.','Documentation was reviewed and phase status confirmed.','The lead confirmed alignment with the previous cycle.'];
const REPORT_PROPOSAL_POOL_EN=['Speed up proof of the next measurable result.','Keep the current pace until the next control point.','Introduce an extra quality check before the next gate.'];
const REPORT_FINANCIAL_POOL_EN=['Phase cost remains within the controlled plan.','No deviation from the approved budget for this cycle.','Cost tracks the planned pace with no extra requirements.'];
function bulletinsForLang(lang='hr'){
  const summaryPool=lang==='en'?SUMMARY_POOL_EN:SUMMARY_POOL;
  const minutesPool=lang==='en'?REPORT_MINUTES_POOL_EN:REPORT_MINUTES_POOL;
  const proposalPool=lang==='en'?REPORT_PROPOSAL_POOL_EN:REPORT_PROPOSAL_POOL;
  const financialPool=lang==='en'?REPORT_FINANCIAL_POOL_EN:REPORT_FINANCIAL_POOL;
  return Array.from({length:90},(_,i)=>{const publishedAt=new Date(Date.UTC(2026,6,18+i,7,0,0)).toISOString();return{issue:i+1,day:i+1,publishedAt,summary:summaryPool[i%summaryPool.length],reports:PROJECTS.map((p,j)=>({projectId:p.id,lead:p.lead,minutes:minutesPool[(i+j)%minutesPool.length],proposal:proposalPool[(i+j+1)%proposalPool.length],financial:financialPool[(i+j+2)%financialPool.length]})),provenance:firstPartyProvenance('digital-workforce-bulletin','https://gnk-asg.hr/api/public/digital-workforce/bulletins',publishedAt)}});
}
const publishedBulletins=(lang='hr')=>bulletinsForLang(lang).filter(x=>Date.parse(x.publishedAt)<=Date.now());
const SIM_START_UTC=Date.UTC(2026,6,18,7,0,0);
const BASE_NEWSROOM=Array.from({length:42},(_,i)=>{const id=`NEWS-${String(i+1).padStart(3,'0')}`,slug=`digital-workforce-report-${String(i+1).padStart(2,'0')}`,canonical=`https://gnk-asg.hr/digital-workforce/newsroom/${slug}/`;return{id,slug,canonical,dayOffset:i*2,idx:i};});
const NEWSROOM_THEMES=['operativni izvještaj','pregled napretka','statusni bilten','projektni sažetak'];
const NEWSROOM_THEMES_EN=['operational report','progress review','status bulletin','project summary'];
const PROJECT_IMAGE_MAP={'Healthcare & Rehabilitation':'/assets/editorial/digital-workforce-healthcare.webp','Sports Systems':'/assets/editorial/digital-workforce-sports.webp','Payment & Digital Exchange':'/assets/editorial/digital-workforce-exchange.webp','Digital Instrument & Gold':'/assets/editorial/digital-workforce-gold.webp'};
const NEWSROOM_DEFAULT_IMAGE='/assets/editorial/digital-workforce-overview.webp';
function publishedNewsroom(lang='hr'){
  const now=Date.now();
  const projects=projectsForDay(publishedBulletins(lang).length,lang);
  const themes=lang==='en'?NEWSROOM_THEMES_EN:NEWSROOM_THEMES;
  return BASE_NEWSROOM.filter(n=>SIM_START_UTC+n.dayOffset*86400000<=now).map(n=>{
    const publishedAt=new Date(SIM_START_UTC+n.dayOffset*86400000).toISOString();
    const theme=themes[n.idx%themes.length];
    const project=projects[n.idx%projects.length];
    const title=lang==='en'?`Digital Workforce — ${theme} ${n.idx+1}: ${project.name}`:`Digitalna radna snaga — ${theme} ${n.idx+1}: ${project.name}`;
    const excerpt=lang==='en'?`Summary of measurable results for ${project.name} (${project.gate}), open dependencies, and next project steps.`:`Sažetak mjerljivih rezultata za ${project.name} (${project.gate}), otvorenih ovisnosti i sljedećih projektnih koraka.`;
    return{id:n.id,slug:n.slug,title,excerpt,author:'GNK ASG Newsroom',editor:'Nermin Sefić',publishedAt,provenance:firstPartyProvenance('digital-workforce-newsroom',n.canonical,publishedAt),seo:{title:`${title} | GNK ASG`,description:excerpt,canonical:n.canonical,image:PROJECT_IMAGE_MAP[project.name]||NEWSROOM_DEFAULT_IMAGE}};
  });
}
const BASE_LOG=Array.from({length:69},(_,i)=>({id:i+1,dayOffset:Math.floor(i/3),hour:8+(i%9),minute:15+(i%4)*10,type:i%3===0?'report_prepared':i%3===1?'bulletin_published':'project_progress',message:i%3===0?'Izvješća voditelja pripremljena.':i%3===1?'Dnevni bilten objavljen.':'Projektni gate ažuriran.',messageEn:i%3===0?'Lead reports prepared.':i%3===1?'Daily bulletin published.':'Project gate updated.'}));
function publishedLog(lang='hr'){
  const now=Date.now();
  return BASE_LOG.filter(l=>SIM_START_UTC+l.dayOffset*86400000<=now).map(l=>({id:l.id,at:new Date(SIM_START_UTC+l.dayOffset*86400000+l.hour*3600000+l.minute*60000).toISOString(),type:l.type,message:lang==='en'?l.messageEn:l.message,status:'ok'}));
}
function creditsForDay(simDay,lang='hr'){
  return projectsForDay(simDay,lang).map((p,i)=>({projectId:p.id,balance:p.credits,transactions:Array.from({length:6},(_,j)=>({id:`TR-${i+1}-${j+1}`,amount:(j%2?-1:1)*(140+j*35),type:j%2?'allocation':'delivery_reward',at:new Date(Date.UTC(2026,0,3+i*8+j,10,0,0)).toISOString()}))}));
}
const COMM_CHANNELS=['status-sync','task-handoff','gate-review','risk-check','peer-review'];
function commsForNow(){
  // Deterministic per-minute rotation of "who is communicating with whom".
  // Intentionally exposes ONLY the pair of workers and a generic channel
  // label -- never any message content, per explicit design decision.
  const now=new Date();
  const minuteBucket=Math.floor(now.getTime()/60000);
  const pairs=[];
  const activeSample=WORKERS.filter((w,i)=>i%11!==0).slice(0,400);
  for(let i=0;i<14;i++){
    const seed=minuteBucket*17+i*31;
    const a=activeSample[seed%activeSample.length];
    const b=activeSample[(seed*7+13)%activeSample.length];
    if(a.id===b.id)continue;
    pairs.push({from:a.id,fromName:a.name,to:b.id,toName:b.name,channel:COMM_CHANNELS[(seed)%COMM_CHANNELS.length],sameProject:a.projectId===b.projectId,at:new Date(minuteBucket*60000).toISOString()});
  }
  return pairs;
}
async function payload(key,url,lang='hr'){const bulletins=publishedBulletins(lang);if(key==='state'){const minuteOfHour=new Date().getUTCMinutes();const engineStatus=minuteOfHour%10<2?'syncing':'running';return{status:engineStatus,simDay:bulletins.length,lastRun:new Date().toISOString(),projects:PROJECTS.length,workers:WORKERS.length,bulletins:bulletins.length,newsroom:BASE_NEWSROOM.length,version:VERSION};}if(key==='projects')return{items:projectsForDay(bulletins.length,lang)};if(key==='risks')return{items:risksForDay(bulletins.length,lang)};if(key==='opinions')return{items:opinionsForDay(bulletins.length,lang)};if(key==='dependencies')return{items:dependenciesForDay(bulletins.length,lang)};if(key==='plan')return{items:lang==='en'?PLAN_EN:PLAN};if(key==='tasks')return{items:tasksForDay(bulletins.length,lang)};if(key==='credits')return{items:creditsForDay(bulletins.length,lang)};if(key==='bulletins')return{items:bulletins};if(key==='newsroom')return{items:publishedNewsroom(lang).slice().reverse()};if(key==='log')return{items:publishedLog(lang).slice().reverse()};if(key==='workers'){const project=url.searchParams.get('project'),q=(url.searchParams.get('q')||'').toLowerCase(),page=Math.max(1,Number(url.searchParams.get('page')||1)),size=Math.min(100,Math.max(20,Number(url.searchParams.get('size')||50)));let items=WORKERS;if(project)items=items.filter(x=>x.projectId===project);if(q)items=items.filter(x=>`${x.name} ${x.function} ${x.project}`.toLowerCase().includes(q));const pageItems=items.slice((page-1)*size,page*size).map(w=>{const n=Number(w.id.slice(2));if(w.status==='active'){const cycle=(n+bulletins.length)%23;if(cycle===0)return{...w,status:'on_leave'};if(cycle===1)return{...w,status:'training'};}return w;});return{total:items.length,page,size,items:pageItems};}if(key==='comms')return{items:commsForNow()};return null;}
const ROUTES=new Map([['/api/public/digital-workforce/state','state'],['/api/public/digital-workforce/projects','projects'],['/api/public/digital-workforce/risks','risks'],['/api/public/digital-workforce/opinions','opinions'],['/api/public/digital-workforce/dependencies','dependencies'],['/api/public/digital-workforce/tasks','tasks'],['/api/public/digital-workforce/credits','credits'],['/api/public/digital-workforce/bulletins','bulletins'],['/api/public/digital-workforce/newsroom','newsroom'],['/api/public/digital-workforce/workers','workers'],['/api/public/digital-workforce/log','log'],['/api/public/digital-workforce/activity-log','log'],['/api/public/digital-workforce/plan','plan'],['/api/public/digital-workforce/comms','comms']]);
export async function handleDigitalWorkforceSuite(request){const key=ROUTES.get(pathOf(request));if(!key)return null;if(!PUBLIC_METHODS.has(request.method))return json(request,{ok:false,error:'method_not_allowed'},405);const url=new URL(request.url);const lang=url.searchParams.get('lang')==='en'?'en':'hr';const data=await payload(key,url,lang);return json(request,{ok:true,sourcePolicyVersion:CONTENT_SOURCE_POLICY_VERSION,retrievedAt:new Date().toISOString(),lang,...data});}
