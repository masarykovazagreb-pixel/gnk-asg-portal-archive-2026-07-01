export const VERSION='GNK_ENTERPRISE_COMPANY_OPERATIONS_V1_20260705';
export const API_PREFIX='/api/company-operations';
const ASSIGNMENTS_KEY='enterprise-projects:assignments:v1';
const PROJECTS_KEY='enterprise-projects:registry:v1';
const DEPARTMENT_NAMES={MCO:'Mission Control',MED:'Media Operations',PUB:'Publishing Operations',SEO:'SEO Operations',REG:'Registry Operations',LEG:'Legal Affairs',CMP:'Compliance',FIN:'Finance Operations',TRE:'Treasury',ACC:'Accounting',INV:'Investor Relations',AIR:'AI Research',DAT:'Data Engineering',ANA:'Analytics',TRN:'Translation Center',CRM:'CRM Operations',CUS:'Customer Operations',SEC:'Cyber Security',INF:'Infrastructure',CLD:'Cloud Operations',DEV:'DevOps',DPL:'Deployment Operations',RCV:'Recovery Operations',QAA:'Quality Assurance',COD:'THE CODE Operations',REGN:'Regional Operations',ADM:'Administration'};
const TIMEZONES={slovenia:'Europe/Ljubljana',hungary:'Europe/Budapest',serbia1:'Europe/Belgrade',serbia2:'Europe/Belgrade',serbia3:'Europe/Belgrade',serbia4:'Europe/Belgrade',vancouver:'America/Vancouver',toronto:'America/Toronto',mexicocity:'America/Mexico_City',panama:'America/Panama',bogota:'America/Bogota',lima:'America/Lima',santiago:'America/Santiago',saopaulo:'America/Sao_Paulo',buenosaires:'America/Argentina/Buenos_Aires',dubai:'Asia/Dubai',mumbai:'Asia/Kolkata',singapore:'Asia/Singapore',jakarta:'Asia/Jakarta',beijing:'Asia/Shanghai',seoul:'Asia/Seoul',tokyo:'Asia/Tokyo',kualalumpur:'Asia/Kuala_Lumpur',hongkong:'Asia/Hong_Kong',casablanca:'Africa/Casablanca',lagos:'Africa/Lagos',nairobi:'Africa/Nairobi',johannesburg:'Africa/Johannesburg',capetown:'Africa/Johannesburg',sydney:'Australia/Sydney',auckland:'Pacific/Auckland',sanjose:'America/Costa_Rica',quito:'America/Guayaquil',montevideo:'America/Montevideo',doha:'Asia/Qatar',bangkok:'Asia/Bangkok',manila:'Asia/Manila',hochiminh:'Asia/Ho_Chi_Minh',accra:'Africa/Accra',kigali:'Africa/Kigali',portlouis:'Indian/Mauritius',daressalaam:'Africa/Dar_es_Salaam',perth:'Australia/Perth'};
const kvOf=env=>env?.GNK_ASG_KV||env?.GNK_ASG_CONFIG_KV||null;
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-company-operations':VERSION,'x-content-type-options':'nosniff'}});
async function read(kv,key,fallback){if(!kv?.get)return fallback;try{const raw=await kv.get(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
async function assetJson(env,path){if(!env?.ASSETS?.fetch)return null;try{const response=await env.ASSETS.fetch(new Request(`https://assets.local${path}`));return response.ok?response.json():null}catch{return null}}
function slotOf(workerId){return String(workerId||'').split('-')[1]||''}
function departmentOf(workerId){return String(workerId||'').split('-')[0]||'ADM'}
function localState(timezone,date=new Date(),active=false){
 try{
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:timezone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(item=>item.type!=='literal').map(item=>[item.type,item.value]));
  const hour=Number(parts.hour),weekend=['Sat','Sun'].includes(parts.weekday);
  let availability='offline';
  if(!weekend&&hour>=8&&hour<18)availability='available';
  else if(!weekend&&((hour>=7&&hour<8)||(hour>=18&&hour<20)))availability='limited';
  else if(active)availability='on-call';
  return{localTime:`${parts.weekday} ${parts.hour}:${parts.minute}`,availability,nextAvailability:['available','limited'].includes(availability)?'now':weekend?'next business day 08:00':'08:00 local'};
 }catch{return{localTime:'unavailable',availability:active?'on-call':'offline',nextAvailability:'not-set'}}
}
function companyName(node){if(node.id==='singapore')return'GNK 3047 Singapore';const city=node.name_en||node.name_hr||node.id;return`GNK [CODE NOT SET] ${city}`}
function projectView(project){return{id:project.id,name:project.name,stage:project.stage,publicLabel:project.publicLabel,territory:project.territory}}
function aggregateCompany(node,index,assignments,projectMap,date){
 const slot=`GNK${String(index+1).padStart(2,'0')}`;
 const rows=assignments.filter(item=>slotOf(item.workerId)===slot);
 const projectIds=[...new Set(rows.flatMap(item=>[item.primaryProjectId,item.supportProjectId]).filter(Boolean))];
 const functions=[...new Set(rows.map(item=>DEPARTMENT_NAMES[departmentOf(item.workerId)]||departmentOf(item.workerId)))].sort();
 const counts={total:rows.length,inProgress:0,scheduled:0,standby:0,reviewRequired:0,publicationProfiles:0};
 for(const item of rows){if(item.workState==='in-progress')counts.inProgress++;else if(item.workState==='scheduled')counts.scheduled++;else if(item.workState==='standby')counts.standby++;else if(item.workState==='review-required')counts.reviewRequired++;if(['MED','PUB','COD'].includes(departmentOf(item.workerId)))counts.publicationProfiles++;}
 const timezone=TIMEZONES[node.id]||'UTC';
 const state=localState(timezone,date,counts.inProgress>0);
 return{slot,publicName:companyName(node),verifiedCompanyCode:node.id==='singapore'?'3047':null,codeStatus:node.id==='singapore'?'verified':'not-set',city:node.name_en||node.name_hr||node.id,country:node.place_en||node.place_hr||'',region:node.region||'',operatingStatus:node.status||'active',timezone,...state,profiles:counts,functions,projects:projectIds.map(id=>projectMap.get(id)).filter(Boolean).map(projectView),capabilities:{prepareProposals:true,delegatedOperationalDecisions:true,prepareCompanyPublications:true,publicationMode:'company-name-with-review'},queues:{activeWorkPackages:counts.inProgress,decisionReviewPackages:counts.reviewRequired,publicationCapacityProfiles:counts.publicationProfiles},privacy:{counterparties:'hidden',collaborators:'hidden',privateAssignments:'hidden',messages:'hidden'}};
}
export function buildCompanyOperations(network,assignments,projects,date=new Date()){
 const projectMap=new Map((Array.isArray(projects)?projects:[]).map(item=>[item.id,item]));
 const nodes=(Array.isArray(network?.nodes)?network.nodes:[]).filter(node=>node.id!=='croatia').slice(0,43);
 const companies=nodes.map((node,index)=>aggregateCompany(node,index,Array.isArray(assignments)?assignments:[],projectMap,date));
 const totals=companies.reduce((out,item)=>{out.profiles+=item.profiles.total;out.inProgress+=item.profiles.inProgress;out.reviewRequired+=item.profiles.reviewRequired;out.projects+=item.projects.length;return out},{profiles:0,inProgress:0,reviewRequired:0,projects:0});
 const group={slot:'GROUP',publicName:'GNK DINAMO Ltd. Group',city:network?.center?.place||'Boulder, Colorado, USA',country:'United States',type:'group',timezone:'America/Denver',...localState('America/Denver',date,totals.inProgress>0),networkTotals:totals,capabilities:{prepareProposals:true,delegatedOperationalDecisions:true,prepareCompanyPublications:true},privacy:{counterparties:'hidden',collaborators:'hidden',privateAssignments:'hidden'}};
 const asg={slot:'GNK-ASG',publicName:'GNK ASG d.o.o.',city:'Zagreb',country:'Croatia',type:'named-operating-company',timezone:'Europe/Zagreb',...localState('Europe/Zagreb',date,true),allocationStatus:'separate profile allocation not yet baselined',capabilities:{prepareProposals:true,delegatedOperationalDecisions:true,prepareCompanyPublications:true},privacy:{counterparties:'hidden',collaborators:'hidden',privateAssignments:'hidden'}};
 return{version:VERSION,generatedAt:date.toISOString(),companyCount:45,codedCompanyCount:43,group,gnkAsg:asg,companies,disclosure:'Company-level operational aggregates only. No counterpart, collaborator, message, contact or private assignment data is exposed.'};
}
export const isCompanyOperationsApi=path=>path===API_PREFIX||path.startsWith(`${API_PREFIX}/`);
export async function handleCompanyOperationsApi(request,env){
 const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
 if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
 const kv=kvOf(env);
 const [network,assignments,projects]=await Promise.all([assetJson(env,'/data/group_network.json'),read(kv,ASSIGNMENTS_KEY,[]),read(kv,PROJECTS_KEY,[])]);
 if(!network)return json({ok:false,error:'group_network_unavailable'},503);
 const model=buildCompanyOperations(network,assignments,projects,new Date());
 if(path===API_PREFIX||path===`${API_PREFIX}/status`)return json({ok:true,version:VERSION,companyCount:model.companyCount,codedCompanyCount:model.codedCompanyCount,profileCount:model.group.networkTotals.profiles,inProgress:model.group.networkTotals.inProgress,decisionReviewQueue:model.group.networkTotals.reviewRequired,privacy:model.disclosure});
 if(path===`${API_PREFIX}/companies`)return json({ok:true,...model});
 if(path===`${API_PREFIX}/company`){const slot=new URL(request.url).searchParams.get('slot');const item=[model.group,model.gnkAsg,...model.companies].find(entry=>entry.slot===slot);return item?json({ok:true,item}):json({ok:false,error:'company_not_found'},404);}
 return json({ok:false,error:'not_found'},404);
}
export const __test={buildCompanyOperations,localState,slotOf,departmentOf};
