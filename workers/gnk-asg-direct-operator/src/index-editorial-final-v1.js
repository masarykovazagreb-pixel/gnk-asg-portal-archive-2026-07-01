import editorial from './index-editorial-center-v1.js';
import maintenance from './index-news-quality-v2.js';

const VERSION='GNK_ASG_EDITORIAL_CENTER_V1_20260624';

function zagrebHour(){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zagreb',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  return Number(parts.find(part=>part.type==='hour')?.value||-1);
}

function noAutomaticPublication(env){
  return new Proxy(env,{get(target,property,receiver){
    if(property==='AI')return undefined;
    return Reflect.get(target,property,receiver);
  }});
}

function publicHealth(){
  return new Response(JSON.stringify({
    ok:true,
    version:VERSION,
    service:'GNK ASG Editorial Center',
    publicationMode:'draft-review-manual-publish',
    sourceRefresh:'09:00 and 16:00 Europe/Zagreb',
    publicationMonitor:'every 2 hours',
    automaticPublicPublication:false,
    checkedAt:new Date().toISOString()
  },null,2),{
    status:200,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
      'x-gnk-asg-editorial':VERSION
    }
  });
}

export default{
  fetch(request,env,ctx){
    const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
    if(path==='/api/editorial-public-health')return publicHealth();
    return editorial.fetch(request,env,ctx);
  },
  async scheduled(event,env,ctx){
    const tasks=[];
    if(typeof editorial.scheduled==='function')tasks.push(editorial.scheduled(event,env,{}));
    const hour=zagrebHour();
    if((hour===9||hour===16)&&typeof maintenance.scheduled==='function'){
      tasks.push(maintenance.scheduled(event,noAutomaticPublication(env),{}));
    }
    const work=Promise.allSettled(tasks);
    if(ctx?.waitUntil){ctx.waitUntil(work);return;}
    return work;
  },
  email:(message,env,ctx)=>editorial.email?.(message,env,ctx)
};
