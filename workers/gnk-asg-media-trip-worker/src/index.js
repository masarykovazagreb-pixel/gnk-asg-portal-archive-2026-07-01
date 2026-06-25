import { handleMediaTripRequest } from '../../gnk-asg-mail-agent-worker/src/media-trip-service.js';

const PUBLIC_PREFIX = '/api/media-trip/public/';
const OPERATOR_PREFIX = '/api/media-trip/operator/';

export default {
  async fetch(request,env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:corsHeaders()});

    if (path.startsWith(PUBLIC_PREFIX)) {
      const rewritten = rewriteRequest(request,path.replace(PUBLIC_PREFIX,'/api/mail-agent/public/media-trip/'));
      const response = await handleMediaTripRequest(rewritten,env,{operator:false});
      return response || json({ok:false,error:'not_found',path},404);
    }

    if (path.startsWith(OPERATOR_PREFIX)) {
      if (!(await authorized(request,env))) return json({ok:false,error:'unauthorized',message:'Operator sesija nije potvrđena.'},401);
      const rewritten = rewriteRequest(request,path.replace(OPERATOR_PREFIX,'/api/mail-agent/media-trip/'));
      const response = await handleMediaTripRequest(rewritten,env,{operator:true});
      return response || json({ok:false,error:'not_found',path},404);
    }

    if (path === '/api/media-trip/health') {
      return json({
        ok:true,
        service:'GNK ASG Media Travel',
        version:'GNK_ASG_MEDIA_TRIP_V1_20260626',
        mode:'separate-worker',
        bindings:{kv:Boolean(env.GNK_ASG_KV),r2:Boolean(env.GNK_ASG_MEDIA_ASSETS),email:Boolean(env.EMAIL)},
        updatedAt:new Date().toISOString()
      });
    }

    return json({ok:false,error:'not_found',path},404);
  }
};

function rewriteRequest(request,newPath) {
  const url = new URL(request.url);
  url.pathname = newPath;
  return new Request(url.toString(),request);
}

async function authorized(request,env) {
  const candidate=suppliedToken(request);
  if(!candidate)return false;
  const secrets=[env.GNK_ASG_OPERATOR_TOKEN,env.OPERATOR_TOKEN,env.GNK_ASG_ADMIN_TOKEN,env.ADMIN_TOKEN].map(v=>String(v||'').trim()).filter(Boolean);
  if(secrets.some(secret=>safeEqual(candidate,secret)))return true;
  try{
    const response=await fetch('https://operator.gnk-asg.hr/operator/status',{method:'GET',headers:request.headers,redirect:'manual'});
    return response.status===200;
  }catch{return false;}
}

function suppliedToken(request) {
  const authorization=request.headers.get('authorization')||'';
  const bearer=authorization.match(/^Bearer\s+(.+)$/i);
  return String(request.headers.get('x-operator-token')||(bearer&&bearer[1])||'').trim();
}

function safeEqual(left,right) {
  const a=String(left||''),b=String(right||'');
  let difference=a.length^b.length;
  for(let index=0;index<Math.max(a.length,b.length);index+=1)difference|=(a.charCodeAt(index)||0)^(b.charCodeAt(index)||0);
  return difference===0;
}

function corsHeaders(){return{'access-control-allow-origin':'https://gnk-asg.hr','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization,x-operator-token,x-application-access','vary':'Origin'};}
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...corsHeaders()}});}
