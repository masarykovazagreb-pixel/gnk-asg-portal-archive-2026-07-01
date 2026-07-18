import app,{VERSION as BASE_VERSION} from './index-unified-auth-v22.js';
import {servePublicEditorialAsset,VERSION as EDITORIAL_ASSET_VERSION} from './public-editorial-asset-router-v1.js';
import {servePublicMarketData,VERSION as MARKET_DATA_VERSION} from './public-market-data-v1.js';
import {handleDigitalWorkforceSuite,VERSION as DIGITAL_WORKFORCE_SUITE_VERSION} from './digital-workforce-suite-v1.js';
import {handleResilientContact,VERSION as CONTACT_RESILIENCE_VERSION} from './contact-submit-resilient-v1.js';

export const PREVIOUS_PUBLIC_EDITORIAL_VERSION='GNK_ASG_UNIFIED_AUTH_V37_NEWS_SOURCE_LINKS';
export const ENTRYPOINT='src/index-unified-auth-v23.js';
export const VERSION=`GNK_ASG_UNIFIED_AUTH_V38_RELEASE_PROOF_NEWS_SOURCE_LINKS_MARKET_ORIGIN_HOTFIX_CONTACT_MAIL_${CONTACT_RESILIENCE_VERSION}_${DIGITAL_WORKFORCE_SUITE_VERSION}_${MARKET_DATA_VERSION}_${EDITORIAL_ASSET_VERSION}_${BASE_VERSION}`;
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const SHARE_ROUTE=/^\/podijeli\/vijest\/([a-z0-9]{8,64})$/i;

function stampRelease(response,env){
 const headers=new Headers(response.headers);
 headers.set('x-gnk-active-entrypoint',ENTRYPOINT);
 headers.set('x-gnk-active-release',VERSION);
 const revision=String(env?.DEPLOY_REVISION||'').trim();
 if(revision)headers.set('x-gnk-deploy-revision',revision);
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function fetchCurrentNews(env,method='GET'){
 if(!env.ASSETS?.fetch)return null;
 const response=await env.ASSETS.fetch(new Request(new URL('/data/news.json','https://assets.local'),{
  method,
  headers:{accept:'application/json'},
  redirect:'follow'
 }));
 return response.status===200?response:null;
}

async function serveCurrentNewsAsset(request,env){
 if(!['GET','HEAD'].includes(request.method)||pathOf(request)!=='/data/news.json')return null;
 try{
  const response=await fetchCurrentNews(env,request.method);
  if(!response)return null;
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','location','etag','last-modified'])headers.delete(name);
  headers.set('content-type','application/json; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-content-type-options','nosniff');
  headers.set('x-gnk-news-source','current-static-asset-20260715');
  headers.set('x-gnk-route-owner',VERSION);
  return new Response(request.method==='HEAD'?null:await response.text(),{status:200,headers});
 }catch{return null}
}

async function serveNewsShareRedirect(request,env){
 if(!['GET','HEAD'].includes(request.method))return null;
 const match=pathOf(request).match(SHARE_ROUTE);
 if(!match)return null;
 try{
  const response=await fetchCurrentNews(env,'GET');
  if(!response)return null;
  const data=await response.json();
  const items=Array.isArray(data)?data:(data.items||data.posts||data.news||[]);
  const item=items.find(entry=>String(entry?.id||'')===match[1]);
  const target=String(item?.sourceUrl||item?.url||item?.href||'').trim();
  if(!/^https?:\/\//i.test(target))return new Response(request.method==='HEAD'?null:'Vijest nije pronađena.',{status:404,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','x-gnk-news-share':'not-found','x-gnk-route-owner':VERSION}});
  return new Response(null,{status:302,headers:{location:target,'cache-control':'no-store, max-age=0','referrer-policy':'no-referrer','x-gnk-news-share':'source-redirect','x-gnk-news-id':match[1],'x-gnk-route-owner':VERSION}});
 }catch{return null}
}

export default{
 async fetch(request,env,ctx){
  const workforce=await handleDigitalWorkforceSuite(request,env);
  if(workforce)return stampRelease(workforce,env);
  const contact=await handleResilientContact(request,env,ctx,app);
  if(contact)return stampRelease(contact,env);
  const market=await servePublicMarketData(request,env);
  if(market)return stampRelease(market,env);
  const newsShare=await serveNewsShareRedirect(request,env);
  if(newsShare)return stampRelease(newsShare,env);
  const currentNews=await serveCurrentNewsAsset(request,env);
  if(currentNews)return stampRelease(currentNews,env);
  const editorial=await servePublicEditorialAsset(request,env,VERSION);
  if(editorial)return stampRelease(editorial,env);
  return stampRelease(await app.fetch(request,env,ctx),env);
 },
 scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
 email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
