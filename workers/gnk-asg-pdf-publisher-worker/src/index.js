import { uploadPdf } from './upload.js';
import { readPdf } from './storage.js';

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
    if(request.method==='GET'&&url.pathname.startsWith('/files/')){const id=url.pathname.replace('/files/','').replace(/\.pdf$/i,'');const record=(await index(env)).find(item=>item.id===id);if(!record)return response({ok:false,error:'not_found'},404);const object=await readPdf(env,record.r2Key);if(!object)return response({ok:false,error:'file_not_found'},404);const headers=new Headers();object.writeHttpMetadata(headers);headers.set('etag',object.httpEtag);headers.set('cache-control','public,max-age=300');return new Response(object.body,{headers})}
    if(!allowed(request,env))return response({ok:false,error:'unauthorized'},401);
    if(request.method==='GET'&&url.pathname==='/api/pdf-publications/admin')return response({ok:true,items:await index(env)});
    if(request.method==='POST'&&url.pathname==='/api/pdf-publications/upload'){try{const result=await uploadPdf(request,env);return response({ok:true,preview:true,...result},201)}catch(error){return response({ok:false,error:String(error?.message||error)},400)}}
    return response({ok:false,error:'not_found',path:url.pathname},404);
  }
};
