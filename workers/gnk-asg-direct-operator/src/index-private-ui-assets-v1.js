import app from './index-mail-session-final-v1.js';

const paths=['/admin-center','/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/news-admin','/pdf-publisher','/social-share','/wa-center','/review'];
const isPrivate=path=>paths.some(prefix=>path===prefix||path.startsWith(prefix+'/'));
const assets='<link rel="stylesheet" href="/assets/private-admin-menu-v1.css?v=20260624-2"><link rel="stylesheet" href="/assets/admin-auth-controls-v1.css?v=20260624-2"><script defer src="/assets/private-admin-menu-v1.js?v=20260624-2"></script><script defer src="/assets/admin-auth-controls-v1.js?v=20260624-2"></script>';

export default{
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
    const response=await app.fetch(request,env,ctx);
    const type=response.headers.get('content-type')||'';
    if(request.method!=='GET'||!isPrivate(path)||!response.ok||!type.includes('text/html'))return response;
    let html=await response.text();
    if(!html.includes('private-admin-menu-v1.js'))html=html.replace('</head>',assets+'</head>');
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  },
  scheduled:(event,env,ctx)=>app.scheduled?.(event,env,ctx),
  email:(message,env,ctx)=>app.email?.(message,env,ctx)
};