import {handleMediaAccess as handleV1,MEDIA_ACCESS_VERSION as CORE_VERSION} from './media-access-service-v1.js';

export const MEDIA_ACCESS_VERSION='GNK_ASG_MEDIA_ACCESS_SERVICE_V4_DELIVERY_LOCK_20260628';
const ISSUE_PATH='/api/media-access/admin/issue';

function json(data,status=200){
  return new Response(JSON.stringify(data,null,2),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
    'x-content-type-options':'nosniff',
    'x-gnk-asg-media-access':MEDIA_ACCESS_VERSION,
    'x-gnk-asg-media-access-core':CORE_VERSION
  }});
}

export async function handleMediaAccess(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path===ISSUE_PATH&&request.method==='POST'){
    let body={};
    try{body=await request.clone().json()}catch{return json({ok:false,error:'invalid_json'},400)}
    if(body.live===true){
      return json({
        ok:false,
        error:'live_access_issue_locked',
        reason:'Access codes may become active only after an explicitly approved media invitation receives a successful delivery result.',
        dryRunAvailable:true
      },423);
    }
  }
  const response=await handleV1(request,env);
  if(!response)return null;
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-media-access',MEDIA_ACCESS_VERSION);
  headers.set('x-gnk-asg-media-access-core',CORE_VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
