// The GitHub single writer owns this status. Never fall back to retired KV telemetry.
const STATUS_PATH='/data/news-automation-status.json';
export async function handleCurrentNewsStatus(request,env){
  if(new URL(request.url).pathname!==STATUS_PATH)return null;
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{allow:'GET, HEAD'}});
  let asset;
  try{
    if(!env?.ASSETS?.fetch)throw new Error('missing-assets-binding');
    asset=await env.ASSETS.fetch(new Request(request.url,{method:'GET'}));
    const data=await asset.clone().json();
    if(!asset.ok||!Number.isFinite(Date.parse(data.updated_at)))throw new Error('invalid-current-status');
  }catch{
    return new Response(request.method==='HEAD'?null:JSON.stringify({ok:false,status:'unavailable',source:'github-single-writer-asset',message:'Current news telemetry is unavailable; retired runtime data is not a fallback.'}),{status:503,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }
  const headers=new Headers(asset.headers);
  headers.set('cache-control','no-store');
  headers.set('content-type','application/json; charset=utf-8');
  headers.set('x-gnk-news-status-source','github-single-writer-asset');
  return new Response(request.method==='HEAD'?null:asset.body,{status:200,headers});
}
