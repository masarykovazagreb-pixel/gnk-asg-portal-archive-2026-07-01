export const VERSION='GNK_ASG_OPERATOR_GITHUB_STATUS_V1_20260719';
export const PATH='/api/operator-github-status';
const REPO='beckuphome-gnk/gnk-asg-portal';
const DEPLOY_WORKFLOW='deploy-admin-auth-v6.yml';
const CACHE_KEY='operator:github-status:cache',CACHE_TTL_SECONDS=45;

const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-operator-github-status':VERSION}});
const store=env=>env?.GNK_ASG_CONFIG_KV||env?.GNK_ASG_KV||null;
const ageSeconds=value=>{const t=Date.parse(String(value||''));return Number.isFinite(t)?Math.max(0,Math.floor((Date.now()-t)/1000)):null};

async function authorised(request,env,ctx,app){
 const url=new URL('/api/operator-auth-check',request.url),headers=new Headers(request.headers);
 headers.delete('content-length');headers.delete('content-type');
 let response;
 try{response=await app.fetch(new Request(url.toString(),{method:'GET',headers,redirect:'manual'}),env,ctx)}catch{return false}
 if(!response.ok)return false;
 let payload;
 try{payload=await response.json()}catch{return false}
 return payload?.authenticated===true;
}

async function ghFetch(env,path){
 const token=env?.GITHUB_STATUS_TOKEN;
 if(!token)throw new Error('GITHUB_STATUS_TOKEN not configured');
 const response=await fetch(`https://api.github.com${path}`,{headers:{authorization:`token ${token}`,accept:'application/vnd.github+json','user-agent':'GNK-ASG-Operator-Dashboard/1.0'}});
 if(!response.ok)throw new Error(`GitHub ${response.status} on ${path}`);
 return response.json();
}

async function fetchLive(env){
 const [prs,runs]=await Promise.all([
  ghFetch(env,`/repos/${REPO}/pulls?state=all&sort=updated&direction=desc&per_page=8`),
  ghFetch(env,`/repos/${REPO}/actions/workflows/${DEPLOY_WORKFLOW}/runs?per_page=8`)
 ]);
 return{
  updated_at:new Date().toISOString(),
  status:'ok',
  pull_requests:(prs||[]).map(pr=>({number:pr.number,title:pr.title,state:pr.merged_at?'merged':pr.state,merged_at:pr.merged_at,updated_at:pr.updated_at,url:pr.html_url})),
  deploys:(runs?.workflow_runs||[]).map(run=>({id:run.id,status:run.status,conclusion:run.conclusion,sha:(run.head_sha||'').slice(0,10),created_at:run.created_at,url:run.html_url}))
 };
}

async function cachedLive(env){
 const kv=store(env);
 if(kv){
  try{
   const raw=await kv.get(CACHE_KEY);
   if(raw){const entry=JSON.parse(raw),age=ageSeconds(entry?.cachedAt);if(age!=null&&age<=CACHE_TTL_SECONDS&&entry?.data)return entry.data;}
  }catch{}
 }
 const data=await fetchLive(env);
 if(kv){try{await kv.put(CACHE_KEY,JSON.stringify({cachedAt:new Date().toISOString(),data}),{expirationTtl:CACHE_TTL_SECONDS+120})}catch{}}
 return data;
}

export async function serveOperatorGithubStatus(request,env,ctx,app){
 if(pathOf(request)!==PATH||request.method!=='GET')return null;
 if(!(await authorised(request,env,ctx,app)))return json({ok:false,error:'unauthorized'},401);
 try{
  const data=await cachedLive(env);
  return json({ok:true,...data});
 }catch(error){
  return json({ok:false,error:'upstream_failed',message:String(error?.message||error).slice(0,200)},502);
 }
}
