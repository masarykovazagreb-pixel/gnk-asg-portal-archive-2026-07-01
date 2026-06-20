const INDEX_KEY='preview:pdf-publications:index:v1';

function response(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization,x-operator-token'}})}
function token(request){const bearer=String(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();return String(request.headers.get('x-operator-token')||bearer).trim()}
function allowed(request,env){const expected=String(env.OPERATOR_TOKEN||'').trim();return Boolean(expected&&token(request)===expected)}
async function index(env){const raw=await env.GNK_ASG_KV?.get(INDEX_KEY);if(!raw)return[];try{const data=JSON.parse(raw);return Array.isArray(data)?data:[]}catch{return[]}}

export default {
  async fetch(request,env){
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization,x-operator-token'}});
    const url=new URL(request.url);
    if(url.pathname==='/api/pdf-publications/status')return response({ok:true,service:'GNK ASG PDF Publisher',mode:'preview',productionRouteConfigured:false,kv:Boolean(env.GNK_ASG_KV),r2:Boolean(env.GNK_ASG_MEDIA_ASSETS)});
    if(request.method==='GET'&&url.pathname==='/api/pdf-publications'){const items=await index(env);return response({ok:true,source:'preview',items:items.filter(item=>item.status==='published')})}
    if(!allowed(request,env))return response({ok:false,error:'unauthorized'},401);
    if(request.method==='GET'&&url.pathname==='/api/pdf-publications/admin')return response({ok:true,items:await index(env)});
    return response({ok:false,error:'not_found',path:url.pathname},404);
  }
};
