(()=>{
'use strict';
if(window.__GNK_PROTECTED_OPERATIONS_V2__)return;window.__GNK_PROTECTED_OPERATIONS_V2__=true;
const VERSION='GNK_ASG_PROTECTED_OPERATIONS_V2_20260717_FAIL_CLOSED_SESSION';
const text=(el,value)=>{if(el)el.textContent=value};
const badge=(el,state,label)=>{if(!el)return;el.className=`ops-badge ${state}`;el.textContent=label};
const gate=document.createElement('style');
gate.id='gnk-protected-operations-session-gate';
gate.textContent='html[data-gnk-protected-operations="checking"] .ops-grid,html[data-gnk-protected-operations="checking"] .ops-panel,html[data-gnk-protected-operations="checking"] .ops-actions,html[data-gnk-protected-operations="checking"] .ops-note{visibility:hidden!important}';
document.head.append(gate);
document.documentElement.dataset.gnkProtectedOperations='checking';

async function check(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'},signal:controller.signal});
  let body=null;try{body=await response.clone().json()}catch{}
  return{ok:response.ok,status:response.status,body};
 }catch(error){return{ok:false,status:0,error:String(error?.message||error)}}finally{clearTimeout(timer)}
}

async function session(){
 const host=document.querySelector('[data-ops-session]');
 if(!host)return false;
 const label=host.querySelector('[data-ops-session-label]');
 const link=host.querySelector('[data-ops-login-link]');
 const next=encodeURIComponent(location.pathname+location.search);
 if(link)link.href=`/admin-login/?next=${next}`;
 const result=await check('/api/operator-auth-check');
 if(result.ok&&result.body?.authenticated===true){
  host.dataset.state='ok';
  text(label,'Aktivna admin/operator sesija');
  document.documentElement.dataset.gnkProtectedOperations='v2-authorized';
  return true;
 }
 host.dataset.state='bad';
 text(label,result.status===401||result.status===403?'Sesija nije aktivna':'Provjera sesije nije dostupna');
 location.replace(link?.href||`/admin-login/?next=${next}`);
 return false;
}

async function healthRow(row){
 const url=row.dataset.healthUrl;if(!url)return;
 const status=row.querySelector('[data-health-status]'),detail=row.querySelector('[data-health-detail]');
 badge(status,'warn','PROVJERA');
 const result=await check(url);
 if(result.ok){
  badge(status,'ok','DOSTUPNO');
  text(detail,result.body?.version||result.body?.status||result.body?.message||`HTTP ${result.status}`);
 }else{
  badge(status,result.status===401||result.status===403?'warn':'bad',result.status===401||result.status===403?'ZAŠTIĆENO':'NEDOSTUPNO');
  text(detail,result.status?`HTTP ${result.status}`:'Nema odgovora');
 }
}

async function run(){
 if(!await session())return;
 for(const row of document.querySelectorAll('[data-health-url]'))await healthRow(row);
 document.documentElement.dataset.gnkProtectedOperations='v2-authorized';
 document.documentElement.dataset.gnkProtectedOperationsVersion=VERSION;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();