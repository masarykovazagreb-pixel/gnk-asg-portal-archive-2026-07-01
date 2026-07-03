import * as base from './email-status-tracking-v4.js';

export const VERSION=`GNK_ASG_EMAIL_STATUS_TRACKING_V5_20260703_FILTERED_DASHBOARD_${base.VERSION}`;
export const DASHBOARD_PATH=base.DASHBOARD_PATH;
export const API_PREFIX=base.API_PREFIX;
export const isEmailStatusPath=base.isEmailStatusPath;
export const withEmailStatusTracking=base.withEmailStatusTracking;
export const syncCloudflareEmailStatuses=base.syncCloudflareEmailStatuses;

const clean=value=>String(value??'').trim();
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-email-status':VERSION}});

function dashboardEnhancement(){return `<script id="gnk-email-status-dashboard-filter-v1">(()=>{const params=new URLSearchParams(location.search),allowed=new Set(['all','mail-studio','campaign-mailer','media-center','auto-reply']),requested=params.get('source')||'all',source=allowed.has(requested)?requested:'all',candidate=params.get('from')||'',from=candidate.startsWith('/')&&!candidate.startsWith('//')?candidate:'',labels={'mail-studio':'Mail Studio','campaign-mailer':'Campaign Mailer','media-center':'Media Center','auto-reply':'Automatski odgovori',all:'svi sustavi'};const apply=()=>{const select=document.querySelector('#source'),load=document.querySelector('#load'),title=document.querySelector('h1'),top=document.querySelector('.top');if(select){select.value=source;if(title)title.textContent=source==='all'?'Status svih email poruka':'Status poruka — '+labels[source];document.title=(title?.textContent||'Status email poruka')+' | GNK ASG';load?.click()}if(from&&top&&!top.querySelector('[data-email-status-back]')){const back=document.createElement('a');back.href=from;back.dataset.emailStatusBack='1';back.textContent='← Natrag u aplikaciju';back.style.cssText='display:inline-flex;align-items:center;padding:10px 13px;border-radius:10px;text-decoration:none;font-weight:800;background:#fff;color:#111827;border:1px solid #cbd5e1';top.appendChild(back)}};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply()})();</script>`;}

async function enhanceDashboard(response){
 const type=String(response.headers.get('content-type')||'').toLowerCase();if(!type.includes('text/html'))return response;
 let html=await response.text();if(!html.includes('gnk-email-status-dashboard-filter-v1'))html=/<\/body>/i.test(html)?html.replace(/<\/body>/i,`${dashboardEnhancement()}</body>`):html+dashboardEnhancement();
 const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('cache-control','no-store');headers.set('x-gnk-asg-email-status',VERSION);
 return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

async function enhanceRecords(request,response){
 const source=clean(new URL(request.url).searchParams.get('source')).toLowerCase();if(!response.ok||!source||source==='all')return response;
 const payload=await response.json().catch(()=>null);if(!payload)return response;
 const summary={};for(const item of payload.items||[]){const status=clean(item.current_status)||'UNKNOWN';summary[status]=(summary[status]||0)+1;}
 return json({...payload,summary,filteredSource:source,version:VERSION},response.status);
}

export async function handleEmailStatusRequest(request,env){
 const response=await base.handleEmailStatusRequest(request,env);if(!response)return response;
 const path=pathOf(request);
 if((path===DASHBOARD_PATH||path===`${DASHBOARD_PATH}/`)&&request.method==='GET')return enhanceDashboard(response);
 if(path===`${API_PREFIX}/records`&&request.method==='GET')return enhanceRecords(request,response);
 return response;
}
