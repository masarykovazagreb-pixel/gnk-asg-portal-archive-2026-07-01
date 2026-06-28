import {adminAccess} from './admin-session-auth-v1.js';

export async function mediaAccessPreflight(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path!=='/api/media-access/admin/issue'||request.method!=='POST')return null;
  const body=await request.clone().json().catch(()=>null);
  if(body?.live!==true)return null;
  const auth=await adminAccess(request,env);
  if(auth.ok)return null;
  return new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}
