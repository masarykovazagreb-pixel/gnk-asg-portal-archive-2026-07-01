import app from './index-unified-auth-v14.js';
import {isEnterpriseProjectApi,handleEnterpriseProjectApi,runEnterpriseProjectCycle} from './enterprise-project-operations-v1.js';
import {isNewsMarketIntelligenceApi,handleNewsMarketIntelligenceApi,runNewsMarketIntelligence} from './news-market-intelligence-v1.js';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
export default{
 async fetch(request,env,ctx){const path=pathOf(request);if(isEnterpriseProjectApi(path))return handleEnterpriseProjectApi(request,env);if(isNewsMarketIntelligenceApi(path))return handleNewsMarketIntelligenceApi(request,env);return app.fetch(request,env,ctx);},
 scheduled(event,env,ctx){const task=Promise.allSettled([runEnterpriseProjectCycle(env),runNewsMarketIntelligence(env),typeof app.scheduled==='function'?app.scheduled(event,env,ctx):Promise.resolve(null)]);if(ctx?.waitUntil){ctx.waitUntil(task);return;}return task;},
 email(message,env,ctx){return typeof app.email==='function'?app.email(message,env,ctx):undefined;}
};