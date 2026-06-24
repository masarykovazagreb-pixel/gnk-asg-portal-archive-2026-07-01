import app from './index-editorial-final-v1.js';
import editorialPage from '../../../apps/portal/auto-editor/index.html';

const ADMIN_ASSETS='<link rel="stylesheet" href="/assets/private-admin-menu-v1.css?v=20260624-editorial-3"><link rel="stylesheet" href="/assets/admin-auth-controls-v1.css?v=20260624-editorial-3"><script defer src="/assets/private-admin-menu-v1.js?v=20260624-editorial-3"></script><script defer src="/assets/admin-auth-controls-v1.js?v=20260624-editorial-3"></script>';

function pathOf(request){
  return new URL(request.url).pathname.replace(/\/+$/,'')||'/';
}

function loopsToSamePath(response,path){
  if(![301,302,303,307,308].includes(response.status))return false;
  const location=response.headers.get('location')||'';
  try{
    const target=new URL(location,'https://gnk-asg.hr').pathname.replace(/\/+$/,'')||'/';
    return target===path;
  }catch{return false;}
}

function serveEmbeddedEditor(){
  let html=String(editorialPage||'');
  if(!html.includes('private-admin-menu-v1.js'))html=html.replace('</head>',ADMIN_ASSETS+'</head>');
  return new Response(html,{
    status:200,
    headers:{
      'content-type':'text/html; charset=utf-8',
      'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
      'x-robots-tag':'noindex, nofollow, noarchive',
      'x-gnk-asg-editorial-page':'embedded-v1'
    }
  });
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    const response=await app.fetch(request,env,ctx);
    if(path!=='/auto-editor'||request.method!=='GET'||!loopsToSamePath(response,path))return response;
    return serveEmbeddedEditor();
  },
  scheduled:(event,env,ctx)=>app.scheduled?.(event,env,ctx),
  email:(message,env,ctx)=>app.email?.(message,env,ctx)
};
