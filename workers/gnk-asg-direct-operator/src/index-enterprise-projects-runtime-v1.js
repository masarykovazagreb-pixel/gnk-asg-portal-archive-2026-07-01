import app from './index-unified-auth-v14.js';
import {isEnterpriseProjectApi,handleEnterpriseProjectApi,runEnterpriseProjectCycle} from './enterprise-project-operations-v1.js';
import {isNewsMarketIntelligenceApi,handleNewsMarketIntelligenceApi,runNewsMarketIntelligence} from './news-market-intelligence-v1.js';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const protectedNoindex=path=>path==='/editorial-operations'||path.startsWith('/editorial-operations/');
function noindex(response){const headers=new Headers(response.headers);headers.set('x-robots-tag','noindex, nofollow, noarchive');headers.set('cache-control','no-store');return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}
export default{
 async fetch(request,env,ctx){const path=pathOf(request);if(isEnterpriseProjectApi(path))return handleEnterpriseProjectApi(request,env);if(isNewsMarketIntelligenceApi(path))return handleNewsMarketIntelligenceApi(request,env);const response=await app.fetch(request,env,ctx);return protectedNoindex(path)?noindex(response):response;},
 scheduled(event,env,ctx){const task=Promise.allSettled([runEnterpriseProjectCycle(env),runNewsMarketIntelligence(env),typeof app.scheduled==='function'?app.scheduled(event,env,ctx):Promise.resolve(null)]);if(ctx?.waitUntil){ctx.waitUntil(task);return;}return task;},
 email(message,env,ctx){return typeof app.email==='function'?app.email(message,env,ctx):undefined;}
};