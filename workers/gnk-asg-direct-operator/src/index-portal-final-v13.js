import core from './index-portal-final-v12.js';

const VERSION='GNK_ASG_PORTAL_FINAL_V13_20260625';
const NEWS_ROTATION='GNK_ASG_INDEX_NEWS_ROTATION_V1';
const NEWS_SCHEDULE=['09:00','15:00','21:00'];

const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{
  status,
  headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
    'x-gnk-asg-portal-final':VERSION,
    'x-gnk-asg-news-rotation':NEWS_ROTATION
  }
});

const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
async function readJson(env,key,fallback=null){
  const kv=store(env);
  if(!kv)return fallback;
  try{
    const raw=await kv.get(key);
    return raw?JSON.parse(raw):fallback;
  }catch{
    return fallback;
  }
}

function withHeaders(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-portal-final',VERSION);
  headers.set('x-gnk-asg-news-rotation',NEWS_ROTATION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function injectIndexRotation(response){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-portal-final',VERSION);
  headers.set('x-gnk-asg-news-rotation',NEWS_ROTATION);
  let body=await response.text();
  if(!body.includes('/assets/index-news-rotation-v1.js')){
    body=body.replace('</body>','<script src="/assets/index-news-rotation-v1.js?v=20260625-v1" defer></script></body>');
  }
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

async function fetchHandler(request,env,ctx){
  const url=new URL(request.url);
  const path=url.pathname.replace(/\/+$/,'')||'/';

  if(request.method==='GET'&&path==='/data/news-automation-status.json'){
    return json({
      ok:true,
      version:VERSION,
      timeZone:'Europe/Zagreb',
      newsSchedule:NEWS_SCHEDULE,
      newsRefreshesPerDay:3,
      indexNewsPool:30,
      indexRotationSeconds:10,
      indexDataRefreshMinutes:15,
      autoEditorSchedule:'every 2 hours',
      lastNewsRefresh:await readJson(env,'automation:news-refresh:last',null),
      lastAutoEditor:await readJson(env,'auto-editor:last',null),
      lastScheduledRun:await readJson(env,'automation:v11:last',null)
    });
  }

  const response=await core.fetch(request,env,ctx);
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(request.method==='GET'&&type.includes('text/html')&&['/','/en'].includes(path)){
    return injectIndexRotation(response);
  }
  return withHeaders(response);
}

export default{
  fetch:fetchHandler,
  async scheduled(event,env,ctx){
    if(typeof core.scheduled==='function')return core.scheduled(event,env,ctx);
  },
  async email(message,env,ctx){
    if(typeof core.email==='function')return core.email(message,env,ctx);
  }
};
