import app,{VERSION as BASE_VERSION} from './index-media-command-center-v20.js';
import {handleMediaProjects,VERSION as PROJECTS_VERSION} from './media-projects-v1.js';
import {handleMediaDelivery,processDeliveryQueue,VERSION as DELIVERY_VERSION,INTERNAL_TEST_PATH} from './media-outreach-delivery-v5.js';
import {maybeSendOutreachReport,VERSION as REPORTING_VERSION} from './media-outreach-reporting-v1.js';
import {withRequiredEmailSignature,VERSION as SIGNATURE_VERSION} from './email-signature-contract-v1.js';
import {handleFreshMediaAdmin,withFreshMediaPersonalization,VERSION as FRESH_VERSION} from './media-fresh-admin-v1.js';
import {handleMediaBootstrapEmail,withBootstrapPersonalization,VERSION as BOOTSTRAP_VERSION} from './media-bootstrap-email-v1.js';
import {handleMediaBootstrapHtmlForwardEmail,VERSION as BOOTSTRAP_HTML_VERSION} from './media-bootstrap-html-forward-v1.js';
export const VERSION=`GNK_ASG_FINAL_MEDIA_REPORTING_V1_TO_${BASE_VERSION}`;
const API='/api/media-command-center';
const PUBLIC_MEMORANDUM='/api/media-registration/memorandum.pdf';
const CAMPAIGN_KEY='media-command-center:campaign:v1';
const memoClean=value=>String(value??'').trim();
const PROJECT_ENDPOINTS=new Set([`${API}/projects`,`${API}/project`,`${API}/project-contacts`,`${API}/project-html`,`${API}/project-pdf`,`${API}/project-html-preview`,`${API}/project-pdf-preview`,`${API}/project-settings`,`${API}/project-preview`,`${API}/project-export`]);
const DELIVERY_ENDPOINTS=new Set([`${API}/campaign-html`,`${API}/campaign-html/preview`,`${API}/campaign-pdf`,`${API}/delivery-plan`,`${API}/delivery-status`,`${API}/test-email`,`${API}/queue-approved`,`${API}/dispatch-queue`]);
const FRESH_ENDPOINTS=new Set([`${API}/fresh-status`,`${API}/fresh-reset`,`${API}/fresh-import`,`${API}/fresh-pdf-preview`,`${API}/fresh-message-preview`]);
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
function activeEnv(env){return withBootstrapPersonalization(withRequiredEmailSignature(withFreshMediaPersonalization(env)));}
async function publicMemorandum(request,env){
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD','cache-control':'no-store'}});
  const kv=env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV;
  const bucket=env.GNK_ASG_MEDIA_ASSETS;
  if(!kv?.get||!bucket?.get)return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
  let cfg={};
  try{const raw=await kv.get(CAMPAIGN_KEY);cfg=raw?JSON.parse(raw):{};}catch{}
  const key=memoClean(cfg.pdfR2Key||env.MEDIA_OUTREACH_PDF_KEY);
  if(!key)return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
  const object=await bucket.get(key);
  if(!object)return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
  const filename=memoClean(object.customMetadata?.filename||cfg.pdfFilename||'GNK_DINAMO_Ltd_Group_THE_CODE_EN_MEMORANDUM.pdf').replace(/["\r\n]/g,'');
  const headers=new Headers();
  headers.set('content-type',object.httpMetadata?.contentType||'application/pdf');
  headers.set('content-disposition',`inline; filename="${filename}"`);
  headers.set('content-length',String(object.size||0));
  headers.set('cache-control','public, max-age=300');
  headers.set('x-content-type-options','nosniff');
  headers.set('x-gnk-asg-public-memorandum',VERSION);
  return new Response(request.method==='HEAD'?null:object.body,{status:200,headers});
}
function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-final-media-fresh',VERSION);
  headers.set('x-gnk-asg-media-projects',PROJECTS_VERSION);
  headers.set('x-gnk-asg-media-delivery',DELIVERY_VERSION);
  headers.set('x-gnk-asg-media-reporting',REPORTING_VERSION);
  headers.set('x-gnk-asg-media-fresh',FRESH_VERSION);
  headers.set('x-gnk-asg-media-bootstrap',BOOTSTRAP_VERSION);
  headers.set('x-gnk-asg-media-bootstrap-html',BOOTSTRAP_HTML_VERSION);
  headers.set('x-gnk-asg-email-signature-contract',SIGNATURE_VERSION);
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
async function protectedEndpoint(request,env,ctx,handler){
  const probe=await app.fetch(request.clone(),env,ctx);
  if(probe.status===401||probe.status===403)return stamp(probe);
  const response=await handler(request,env,ctx);
  return stamp(response||probe);
}
export default{
  async fetch(request,env,ctx){
    const signed=activeEnv(env),path=pathOf(request);
    if(path===PUBLIC_MEMORANDUM)return publicMemorandum(request,signed);
    if(path===INTERNAL_TEST_PATH)return stamp(await handleMediaDelivery(request,signed));
    if(FRESH_ENDPOINTS.has(path))return protectedEndpoint(request,signed,ctx,handleFreshMediaAdmin);
    if(DELIVERY_ENDPOINTS.has(path))return protectedEndpoint(request,signed,ctx,handleMediaDelivery);
    if(PROJECT_ENDPOINTS.has(path))return protectedEndpoint(request,signed,ctx,handleMediaProjects);
    let response=await app.fetch(request,signed,ctx);
    if(path==='/data/portal-version.json'&&response.ok&&String(response.headers.get('content-type')||'').includes('application/json')){
      try{
        const payload=await response.clone().json(),headers=new Headers(response.headers);
        response=new Response(JSON.stringify({...payload,finalMediaFresh:VERSION,mediaFresh:FRESH_VERSION,mediaDelivery:DELIVERY_VERSION,mediaReporting:REPORTING_VERSION,mediaProjects:PROJECTS_VERSION,mediaBootstrap:BOOTSTRAP_VERSION,mediaBootstrapHtml:BOOTSTRAP_HTML_VERSION,mediaOutreachBuildLock:false},null,2),{status:response.status,headers});
      }catch{}
    }
    return stamp(response);
  },
  async scheduled(event,env,ctx){
    const signed=activeEnv(env);
    const task=(async()=>{
      const upstream=typeof app.scheduled==='function'?await app.scheduled(event,signed,ctx):null;
      const delivery=await processDeliveryQueue(signed).catch(error=>({ok:false,error:String(error?.message||error)}));
      const reporting=await maybeSendOutreachReport(signed).catch(error=>({ok:false,error:String(error?.message||error)}));
      return{upstream,delivery,reporting};
    })();
    if(ctx?.waitUntil){ctx.waitUntil(task);return;}
    return task;
  },
  async email(message,env,ctx){
    const signed=activeEnv(env);
    const htmlBootstrap=await handleMediaBootstrapHtmlForwardEmail(message,signed,ctx);
    if(htmlBootstrap?.handled)return htmlBootstrap;
    const bootstrap=await handleMediaBootstrapEmail(message,signed,ctx);
    if(bootstrap?.handled)return bootstrap;
    if(typeof app.email==='function')return app.email(message,signed,ctx);
  }
};
