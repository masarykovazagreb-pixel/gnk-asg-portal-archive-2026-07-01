import app,{VERSION as BASE_VERSION} from './index-unified-auth-v15.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V31_20260710_WORKER_OPS_ENTRY_GUARD_LOGIN_RETURN_${BASE_VERSION}`;

const WORKER_OPS_PATH='/worker-ops/';
const WORKER_OPS_LOGIN_NEXT='/operator-dashboard/?workerOpsReturn=1';

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}
function isWorkerOpsPath(path){return path==='/worker-ops'||path.startsWith('/worker-ops/');}

function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-active-entrypoint','src/index-unified-auth-v16.js');
  headers.set('x-gnk-worker-ops-entry-guard',VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function isAuthenticated(request,env,ctx){
  const target=new URL('/api/operator-auth-check',request.url);
  const check=new Request(target.toString(),{method:'GET',headers:request.headers,redirect:'manual'});
  const response=await app.fetch(check,env,ctx);
  return response.status>=200&&response.status<300;
}

async function loginResponse(request,env,ctx){
  const target=new URL('/admin-login/',request.url);
  target.searchParams.set('next',WORKER_OPS_LOGIN_NEXT);
  const loginRequest=new Request(target.toString(),{method:'GET',headers:request.headers,redirect:'manual'});
  return app.fetch(loginRequest,env,ctx);
}

function patchWorkerOpsLoginRedirect(request,response){
  if(response.status<300||response.status>=400)return response;
  const location=response.headers.get('location');
  if(!location)return response;
  try{
    const target=new URL(location,request.url);
    const path=target.pathname.replace(/\/+$/,'')||'/';
    if(path!=='/operator-dashboard'||target.searchParams.get('workerOpsReturn')!=='1')return response;
    const headers=new Headers(response.headers);
    headers.set('location',WORKER_OPS_PATH);
    headers.set('cache-control','no-store');
    headers.set('x-gnk-worker-ops-login-return','redirected');
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

async function patchVersionResponse(request,response){
  if(pathOf(request)!=='/data/portal-version.json'||response.status!==200)return response;
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(!type.includes('application/json'))return response;
  try{
    const payload=await response.clone().json();
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type','application/json; charset=utf-8');
    headers.set('cache-control','no-store');
    return new Response(JSON.stringify({
      ...payload,
      deployedEntryPoint:'src/index-unified-auth-v16.js',
      wrapperEntryPoint:'src/index-unified-auth-v16.js',
      workerOpsEntryGuard:VERSION,
      workerOpsDirectAssetGuard:'operator-auth-required',
      workerOpsLoginReturn:'isolated-wrapper-redirect'
    },null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if((request.method==='GET'||request.method==='HEAD')&&isWorkerOpsPath(path)&&!await isAuthenticated(request,env,ctx)){
      const response=await loginResponse(request,env,ctx);
      const patched=patchWorkerOpsLoginRedirect(request,response);
      return stamp(request.method==='HEAD'?new Response(null,{status:patched.status,statusText:patched.statusText,headers:patched.headers}):patched);
    }
    const response=patchWorkerOpsLoginRedirect(request,await app.fetch(request,env,ctx));
    return stamp(await patchVersionResponse(request,response));
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};