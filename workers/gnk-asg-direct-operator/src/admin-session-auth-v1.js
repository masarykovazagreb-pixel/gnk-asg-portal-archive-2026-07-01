export const VERSION='GNK_ASG_ADMIN_SESSION_AUTH_V1_20260628';
const COOKIE='gnk_asg_admin_session';
const TOKEN_NAMES=['OPERATOR_TOKEN','GNK_ASG_OPERATOR_TOKEN','ADMIN_TOKEN','GNK_ASG_ADMIN_TOKEN','NEWS_PUBLISH_TOKEN','SECRET_TOKEN'];
const enc=new TextEncoder();
const clean=value=>String(value||'').trim();

function equal(a,b){
  const left=String(a||''),right=String(b||'');
  let diff=left.length^right.length;
  const length=Math.max(left.length,right.length);
  for(let i=0;i<length;i++)diff|=(left.charCodeAt(i)||0)^(right.charCodeAt(i)||0);
  return diff===0;
}
async function sha(value){
  const digest=await crypto.subtle.digest('SHA-256',enc.encode(String(value||'')));
  return[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function base64url(bytes){
  let value='';
  for(const item of new Uint8Array(bytes))value+=String.fromCharCode(item);
  return btoa(value).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
}
async function mac(secret,value){
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return base64url(await crypto.subtle.sign('HMAC',key,enc.encode(value)));
}
function rawSecrets(env){return TOKEN_NAMES.map(name=>clean(env[name])).filter(Boolean)}
async function material(env){
  const configuredHash=clean(env.OPERATOR_TOKEN_SHA256).toLowerCase();
  if(/^[a-f0-9]{64}$/.test(configuredHash))return{configured:true,hash:configuredHash,raw:rawSecrets(env)[0]||''};
  const raw=rawSecrets(env)[0]||'';
  return raw?{configured:true,hash:await sha(raw),raw}:{configured:false,hash:'',raw:''};
}
function requestToken(request){
  const authorization=request.headers.get('authorization')||'';
  const match=authorization.match(/^Bearer\s+(.+)$/i);
  return clean((match&&match[1])||request.headers.get('x-operator-token')||request.headers.get('x-admin-token')||request.headers.get('x-gnk-asg-token'));
}
function cookieValue(request){
  for(const part of (request.headers.get('cookie')||'').split(';')){
    const index=part.indexOf('=');
    if(index>0&&part.slice(0,index).trim()===COOKIE){
      try{return decodeURIComponent(part.slice(index+1).trim())}catch{return''}
    }
  }
  return'';
}

export async function adminAccess(request,env){
  const auth=await material(env);
  if(!auth.configured)return{ok:false,mode:null,configured:false};
  const token=requestToken(request);
  if(token){
    const valid=auth.raw?equal(token,auth.raw):equal(await sha(token),auth.hash);
    if(valid)return{ok:true,mode:'token',configured:true};
  }
  const value=cookieValue(request),dot=value.indexOf('.');
  if(dot<1)return{ok:false,mode:null,configured:true};
  const expires=Number(value.slice(0,dot)),signature=value.slice(dot+1);
  if(!Number.isFinite(expires)||expires<=Math.floor(Date.now()/1000))return{ok:false,mode:'expired_session',configured:true};
  const valid=equal(signature,await mac(auth.hash,`gnk-asg-admin:${expires}`));
  return{ok:valid,mode:valid?'session':'invalid_session',configured:true};
}

export async function adminAuthorized(request,env){return Boolean((await adminAccess(request,env)).ok)}
