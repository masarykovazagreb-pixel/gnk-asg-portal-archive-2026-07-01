import app from './index-unified-auth-v14.js';

const VERSION='GNK_ASG_MAIL_STUDIO_BRIDGE_V15_20260626';
const SCRIPT='<script defer src="/assets/mail-studio-auth-bridge-v15.js?v=20260626-1"></script>';

const cleanPath=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isMailStudio=path=>path==='/mail-studio'||path.startsWith('/mail-studio/')||path==='/mail-studio-pro'||path.startsWith('/mail-studio-pro/');

async function inject(response){
  const type=String(response.headers.get('content-type')||'');
  if(!type.includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-mail-studio-bridge',VERSION);
  let html=await response.text();
  if(!html.includes('mail-studio-auth-bridge-v15.js'))html=html.includes('</head>')?html.replace('</head>',`${SCRIPT}</head>`):SCRIPT+html;
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

async function version(request,env,ctx){
  const response=await app.fetch(request,env,ctx);
  try{
    const payload=await response.clone().json();
    return new Response(JSON.stringify({...payload,mailStudioBridge:VERSION,deployedEntryPoint:'src/index-mail-studio-bridge-v15.js'},null,2),{
      status:response.status,
      headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-mail-studio-bridge':VERSION}
    });
  }catch{return response;}
}

export default{
  async fetch(request,env,ctx){
    const path=cleanPath(request);
    if(request.method==='GET'&&path==='/data/portal-version.json')return version(request,env,ctx);
    const response=await app.fetch(request,env,ctx);
    if(isMailStudio(path)&&['GET','HEAD'].includes(request.method))return inject(response);
    return response;
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
