import app from './index-publication-seo-v3.js';

export const VERSION='GNK_ASG_PUBLIC_R2_V1_20260626';
const PUBLIC_PREFIXES=['generated-articles/'];

function normalizeKey(pathname){
  let key='';
  try{key=decodeURIComponent(pathname.slice('/r2/'.length));}catch{return null;}
  key=key.replace(/^\/+/, '');
  if(!key||key.length>500||key.includes('\0')||key.includes('\\')||key.split('/').includes('..'))return null;
  if(!PUBLIC_PREFIXES.some(prefix=>key.startsWith(prefix)))return null;
  return key;
}

function notFound(){
  return new Response('Not found',{status:404,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-gnk-asg-public-r2':VERSION}});
}

async function publicObject(request,env,key){
  if(!env.GNK_ASG_MEDIA_ASSETS?.get)return new Response('Storage unavailable',{status:503,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','x-gnk-asg-public-r2':VERSION}});
  const object=await env.GNK_ASG_MEDIA_ASSETS.get(key);
  if(!object)return notFound();
  const headers=new Headers();
  object.writeHttpMetadata?.(headers);
  headers.set('content-type',headers.get('content-type')||'application/octet-stream');
  headers.set('cache-control','public, max-age=86400, stale-while-revalidate=604800');
  headers.set('x-content-type-options','nosniff');
  headers.set('cross-origin-resource-policy','same-origin');
  headers.set('content-security-policy',"default-src 'none'; sandbox");
  headers.set('x-gnk-asg-public-r2',VERSION);
  if(object.httpEtag)headers.set('etag',object.httpEtag);
  return new Response(request.method==='HEAD'?null:object.body,{status:200,headers});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(['GET','HEAD'].includes(request.method)&&url.pathname.startsWith('/r2/')){
      const key=normalizeKey(url.pathname);
      if(!key)return notFound();
      return publicObject(request,env,key);
    }
    const response=await app.fetch(request,env,ctx);
    const headers=new Headers(response.headers);
    headers.set('x-gnk-asg-public-r2',VERSION);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
