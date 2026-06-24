import core from './index-hash-auth-v1.js';

const COOKIE='gnk_asg_admin_session';
const enc=new TextEncoder();
const PATHS=new Set(['/api/admin-mail-send','/api/operator-send-mail','/api/operator-mailbox-config','/api/operator-signature-load','/api/operator-signature-save','/api/operator-mail-log']);
const hash=e=>String(e.OPERATOR_TOKEN_SHA256||'').trim().toLowerCase();

function eq(a,b){a=String(a||'');b=String(b||'');let x=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)x|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return x===0;}
function b64(bytes){let s='';for(const x of new Uint8Array(bytes))s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');}
async function mac(secret,value){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(await crypto.subtle.sign('HMAC',key,enc.encode(value)));}
function cookie(r){for(const part of(r.headers.get('cookie')||'').split(';')){const i=part.indexOf('=');if(i>0&&part.slice(0,i).trim()===COOKIE){try{return decodeURIComponent(part.slice(i+1).trim());}catch{return'';}}}return'';}
async function sessionOk(r,e){const h=hash(e),v=cookie(r),i=v.indexOf('.');if(h.length!==64||i<1)return false;const exp=Number(v.slice(0,i)),sig=v.slice(i+1);if(!Number.isFinite(exp)||exp<=Math.floor(Date.now()/1000))return false;return eq(sig,await mac(h,`gnk-asg-admin:${exp}`));}
function patch(e,secret){return new Proxy(e,{get(t,p,r){if(p==='GNK_ASG_OPERATOR_TOKEN')return secret;return Reflect.get(t,p,r);}});}
function requestWithToken(r,secret){const headers=new Headers(r.headers);headers.set('authorization',`Bearer ${secret}`);headers.set('x-operator-token',secret);return new Request(r,{headers});}

export default{
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
    if(PATHS.has(path)&&await sessionOk(request,env)){
      const secret=hash(env);
      return core.fetch(requestWithToken(request,secret),patch(env,secret),ctx);
    }
    if(path==='/api/operator-auth-check'&&await sessionOk(request,env)){
      return new Response(JSON.stringify({ok:true,authenticated:true,mode:'session',worker:'gnk-asg-contact-api'},null,2),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
    }
    return core.fetch(request,env,ctx);
  }
};