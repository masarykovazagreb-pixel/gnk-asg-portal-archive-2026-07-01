export const WORLD_INTEL_VERSION='MASTER_ASG_WORLD_INTEL_V1_20260820';
export const WORLD_INTEL_STATUS_PATH='/api/world-intel/status';
export const WORLD_INTEL_INCIDENTS_PATH='/api/world-intel/incidents';
export const WORLD_INTEL_SERVICES_PATH='/api/world-intel/services';

const NO_STORE={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store, max-age=0','x-content-type-options':'nosniff'};
const WORLD_MONITOR_BOOTSTRAP='https://api.worldmonitor.app/api/bootstrap';
const USGS_ALL_HOUR='https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson';

const SERVICES=[
 {country:'United States',service:'CIA',status:'NOT_AUTHORIZED',type:'foreign_intelligence'},
 {country:'United States',service:'FBI',status:'NOT_AUTHORIZED',type:'federal_law_enforcement_intelligence'},
 {country:'United States',service:'NSA',status:'NOT_AUTHORIZED',type:'signals_intelligence'},
 {country:'United States',service:'DIA',status:'NOT_AUTHORIZED',type:'defense_intelligence'},
 {country:'Germany',service:'BND',status:'NOT_AUTHORIZED',type:'foreign_intelligence'},
 {country:'Russia',service:'FSB',status:'NOT_AUTHORIZED',type:'security_intelligence'},
 {country:'Russia',service:'SVR',status:'NOT_AUTHORIZED',type:'foreign_intelligence'},
 {country:'Serbia',service:'BIA',status:'NOT_AUTHORIZED',type:'security_intelligence'},
 {country:'United Kingdom',service:'SIS/MI6',status:'NOT_AUTHORIZED',type:'foreign_intelligence'}
];

const SOURCE_CATALOG=[
 {id:'worldmonitor',name:'World Monitor',statusWhenConfigured:'CONNECTED',statusWithoutSecret:'READY_FOR_AUTH',secret:'WORLD_MONITOR_API_KEY',capabilities:['conflicts','military','military_flights','aviation','maritime','unrest','sanctions','cyber','outages','weather','natural_disasters','economic','infrastructure']},
 {id:'usgs',name:'USGS Earthquake GeoJSON',statusWhenConfigured:'PUBLIC_OSINT',statusWithoutSecret:'PUBLIC_OSINT',secret:null,capabilities:['earthquakes','natural_disasters']},
 {id:'nasa_firms',name:'NASA FIRMS',statusWhenConfigured:'CONNECTED',statusWithoutSecret:'READY_FOR_AUTH',secret:'NASA_FIRMS_MAP_KEY',capabilities:['fires','thermal_anomalies']}
];

const json=(data,status=200,extra={})=>new Response(JSON.stringify(data,null,2),{status,headers:{...NO_STORE,...extra}});
const now=()=>new Date().toISOString();
const pathOf=req=>new URL(req.url).pathname.replace(/\/+$/,'')||'/';

async function existingAdminAuthorised(request,env,ctx,app){
 const target=new URL('/api/operator-auth-check',request.url);
 const headers=new Headers(request.headers);headers.delete('content-length');headers.delete('content-type');
 try{const r=await app.fetch(new Request(target.toString(),{method:'GET',headers,redirect:'manual'}),env,ctx);if(!r.ok)return false;const d=await r.json();return d?.authenticated===true;}catch{return false;}
}

function sensitiveCodeAuthorised(request,env){
 const expected=String(env?.WORLD_INTEL_ACCESS_CODE||'');
 if(!expected)return false;
 const supplied=String(request.headers.get('x-world-intel-access-code')||'');
 return supplied.length>0&&supplied===expected;
}

function sourceState(env,s){
 if(!s.secret)return s.statusWithoutSecret;
 return String(env?.[s.secret]||'').trim()?s.statusWhenConfigured:s.statusWithoutSecret;
}

async function fetchJson(url,init={},timeoutMs=7000){
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),timeoutMs);
 try{const r=await fetch(url,{...init,signal:ctrl.signal});const text=await r.text();let data=null;try{data=JSON.parse(text);}catch{}return {ok:r.ok,status:r.status,data};}
 catch(error){return {ok:false,status:0,error:String(error?.name||error)};}
 finally{clearTimeout(timer);}
}

function normalizeUsgs(feature){
 const p=feature?.properties||{};const c=feature?.geometry?.coordinates||[];
 return {id:'usgs:'+String(feature?.id||''),class:'natural_disaster',subtype:'earthquake',title:String(p.title||p.place||'Earthquake'),severity:typeof p.mag==='number'?p.mag:null,occurredAt:p.time?new Date(p.time).toISOString():null,updatedAt:p.updated?new Date(p.updated).toISOString():null,lat:c[1]??null,lon:c[0]??null,depthKm:c[2]??null,source:'USGS',sourceUrl:String(p.url||''),confidence:'authoritative_source'};
}

async function collectPublicIncidents(env){
 const incidents=[];const sourceHealth=[];
 const usgs=await fetchJson(USGS_ALL_HOUR,{},5000);
 if(usgs.ok&&Array.isArray(usgs.data?.features)){incidents.push(...usgs.data.features.slice(0,100).map(normalizeUsgs));sourceHealth.push({id:'usgs',status:'PUBLIC_OSINT',ok:true,count:usgs.data.features.length});}
 else sourceHealth.push({id:'usgs',status:'OFFLINE',ok:false,httpStatus:usgs.status||0});

 const wmKey=String(env?.WORLD_MONITOR_API_KEY||'').trim();
 if(wmKey){
  const wm=await fetchJson(WORLD_MONITOR_BOOTSTRAP,{headers:{'X-WorldMonitor-Key':wmKey,'accept':'application/json'}},9000);
  sourceHealth.push({id:'worldmonitor',status:wm.ok?'CONNECTED':'OFFLINE',ok:wm.ok,httpStatus:wm.status||0,note:wm.ok?'Bootstrap reachable; provider payload retained server-side until per-service normalizers are verified.':'World Monitor request failed.'});
 }else sourceHealth.push({id:'worldmonitor',status:'READY_FOR_AUTH',ok:false,note:'Set WORLD_MONITOR_API_KEY server-side to enable live World Monitor REST access.'});

 sourceHealth.push({id:'nasa_firms',status:String(env?.NASA_FIRMS_MAP_KEY||'').trim()?'CONNECTED':'READY_FOR_AUTH',ok:!!String(env?.NASA_FIRMS_MAP_KEY||'').trim(),note:'FIRMS fetcher requires MAP_KEY and is intentionally not called until configured.'});
 return {incidents,sourceHealth};
}

export async function handleWorldIntelligenceHub(request,env,ctx,app){
 const path=pathOf(request);
 if(![WORLD_INTEL_STATUS_PATH,WORLD_INTEL_INCIDENTS_PATH,WORLD_INTEL_SERVICES_PATH].includes(path))return null;
 if(!['GET','HEAD'].includes(request.method))return json({ok:false,error:'method_not_allowed'},405);
 if(!await existingAdminAuthorised(request,env,ctx,app))return json({ok:false,error:'unauthorized_admin_session'},401);

 const sourceStates=SOURCE_CATALOG.map(s=>({id:s.id,name:s.name,status:sourceState(env,s),capabilities:s.capabilities}));
 if(path===WORLD_INTEL_STATUS_PATH)return json({ok:true,version:WORLD_INTEL_VERSION,mode:'OSINT_ONLY',generatedAt:now(),sources:sourceStates,policy:{noFalseAgencyConnectivity:true,serverSideSecretsOnly:true,serviceStatuses:['CONNECTED','PUBLIC_OSINT','READY_FOR_AUTH','NOT_AUTHORIZED','OFFLINE']}});

 if(!sensitiveCodeAuthorised(request,env))return json({ok:false,error:'world_intel_secondary_gate_required',requiredSecret:'WORLD_INTEL_ACCESS_CODE'},403);
 if(path===WORLD_INTEL_SERVICES_PATH)return json({ok:true,generatedAt:now(),services:SERVICES,note:'No intelligence-service connector is represented as connected unless a separately verified authorized integration exists.'});

 const data=await collectPublicIncidents(env);
 return json({ok:true,version:WORLD_INTEL_VERSION,generatedAt:now(),mode:'OSINT_ONLY',incidents:data.incidents,sourceHealth:data.sourceHealth,availableClasses:['armed_conflict','attack','military_operation','military_flight','naval_activity','protest_or_unrest','sanctions','critical_infrastructure_outage','cyber_incident','nuclear_or_radiological','natural_disaster','economic_disruption'],limitations:['Military/conflict/aviation classes require a configured authorized World Monitor provider or another approved public source.','No claim of direct CIA/FBI/NSA/DIA/BND/FSB/SVR/BIA/MI6 access is made.']});
}
