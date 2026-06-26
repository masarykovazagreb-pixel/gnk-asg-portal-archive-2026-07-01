import app,{INDEX_LOCK_VERSION} from './index-lock-v1.js';
import {handleFaviconAsset,applyFaviconContract,FAVICON_VERSION} from './favicon-contract-v2.js';

const VERSION='GNK_ASG_ADMIN_HUB_V21_20260626_R7_MEDIA_V21';
const MODULES=new Map([
  ['/operator-dashboard','operator'],
  ['/operator-mobile','mobile'],
  ['/mail-studio','mail'],
  ['/mail-studio-pro','mail'],
  ['/auto-editor','editor'],
  ['/news-admin','news'],
  ['/pdf-publisher','pdf'],
  ['/social-share','social'],
  ['/wa-center','whatsapp'],
  ['/review','overview'],
  ['/media-command-center','media']
]);

function baseHeaders(extra={}){
  return{
    'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
    'x-content-type-options':'nosniff',
    'x-gnk-asg-admin-hub':VERSION,
    'x-gnk-asg-favicon-contract':FAVICON_VERSION,
    'x-gnk-asg-index-lock':INDEX_LOCK_VERSION,
    ...extra
  };
}

function redirect(location){return new Response(null,{status:303,headers:baseHeaders({location})});}

function deploymentStatus(){
  return new Response(JSON.stringify({
    ok:true,
    service:'gnk-asg-direct-operator',
    entryPoint:'src/index-admin-hub-v21.js',
    adminHub:VERSION,
    indexLock:INDEX_LOCK_VERSION,
    favicon:FAVICON_VERSION,
    publicPortal:'src/index-portal-final-v13.js',
    mediaCommand:'src/index-media-command-center-v21.js',
    mediaCommandCore:'GNK_ASG_MEDIA_COMMAND_CENTER_V2_20260626_R2',
    mediaReadiness:'GNK_ASG_MEDIA_READINESS_V2_20260626',
    contactImport:'CONTROLLED_V2',
    productionSending:'LOCKED',
    checkedAt:new Date().toISOString()
  },null,2),{status:200,headers:baseHeaders({'content-type':'application/json; charset=utf-8'})});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const path=url.pathname.replace(/\/+$/,'')||'/';
    const faviconResponse=await handleFaviconAsset(request,env,path);
    if(faviconResponse)return faviconResponse;
    if(path==='/data/deployment-status.json'&&['GET','HEAD'].includes(request.method)){
      const response=deploymentStatus();
      return request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response;
    }
    const embedded=url.searchParams.get('embedded')==='1'||url.searchParams.get('standalone')==='1';
    if((path==='/admin'||path==='/operator/session/login')&&['GET','HEAD','POST'].includes(request.method))return redirect('/admin-center/');
    if(MODULES.has(path)&&['GET','HEAD'].includes(request.method)&&!embedded)return redirect(`/admin-center/?module=${encodeURIComponent(MODULES.get(path))}`);
    const response=await applyFaviconContract(request,await app.fetch(request,env,ctx));
    const headers=new Headers(response.headers);
    for(const [name,value] of Object.entries(baseHeaders()))headers.set(name,value);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
