import editorial from './index-editorial-center-v1.js';
import maintenance from './index-news-quality-v2.js';

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

export default{
  fetch:(request,env,ctx)=>editorial.fetch(request,env,ctx),
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
