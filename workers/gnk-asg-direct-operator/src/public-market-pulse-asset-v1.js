export const VERSION='GNK_ASG_PUBLIC_MARKET_PULSE_ASSET_V1_20260922';
export const MARKET_PULSE_PATH='/data/market-pulse.json';

const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';

export async function serveMarketPulseAsset(request,env){
  if(!['GET','HEAD'].includes(request.method)||pathOf(request)!==MARKET_PULSE_PATH)return null;
  if(!env?.ASSETS?.fetch)return null;
  try{
    const assetRequest=new Request(new URL(MARKET_PULSE_PATH,'https://assets.local'),{
      method:request.method,
      headers:{accept:'application/json'},
      redirect:'follow'
    });
    const response=await env.ASSETS.fetch(assetRequest);
    if(response.status!==200)return null;
    const headers=new Headers(response.headers);
    for(const name of ['content-length','content-encoding','location','etag','last-modified'])headers.delete(name);
    headers.set('content-type','application/json; charset=utf-8');
    headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
    headers.set('x-content-type-options','nosniff');
    headers.set('x-gnk-market-pulse-source','current-static-asset-20260922');
    headers.set('x-gnk-route-owner',VERSION);
    return new Response(request.method==='HEAD'?null:await response.text(),{status:200,headers});
  }catch{
    return null;
  }
}
