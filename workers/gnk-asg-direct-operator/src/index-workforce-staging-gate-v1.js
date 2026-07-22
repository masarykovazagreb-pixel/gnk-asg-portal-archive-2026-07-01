import app from './index-unified-auth-v23.js';

export const VERSION='GNK_DINAMO_WORKFORCE_STAGING_GATE_V2';
const encoder=new TextEncoder();
const COOKIE='gnk_workforce_staging';

function page(message=''){
  const note=message?`<p class="error">${String(message).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}</p>`:'';
  return new Response(`<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Privatni staging | GNK DINAMO Ltd grupa</title><style>html{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 20% 20%,#0b3344 0,#07111f 34%,#030712 72%);font-family:Inter,Arial,sans-serif;color:#eef7ff}.card{width:min(92vw,460px);padding:34px;border:1px solid rgba(34,211,238,.25);border-radius:24px;background:rgba(8,17,32,.82);box-shadow:0 30px 80px rgba(0,0,0,.5);backdrop-filter:blur(18px)}.tag{display:inline-block;padding:7px 11px;border-radius:999px;background:rgba(34,211,238,.12);color:#67e8f9;font-size:12px;font-weight:800;letter-spacing:.1em}h1{margin:18px 0 10px;font-size:30px}p{color:#a9b8cb;line-height:1.55}.error{color:#fca5a5}label{display:block;margin:22px 0 8px;font-weight:700}input{width:100%;padding:14px 15px;border-radius:12px;border:1px solid #28445b;background:#07101d;color:#fff;font-size:16px}button{width:100%;margin-top:14px;padding:14px;border:0;border-radius:12px;background:linear-gradient(90deg,#06b6d4,#8b5cf6);color:#fff;font-weight:900;cursor:pointer}small{display:block;margin-top:18px;color:#6f8297}</style></head><body><main class="card"><span class="tag">PRIVATNI STAGING</span><h1>GNK DINAMO Ltd grupa</h1><p>Digitalna radna snaga · zatvoreno testno okruženje</p>${note}<form method="post" action="/_staging/login"><label for="token">Operatorski token</label><input id="token" name="token" type="password" autocomplete="current-password" required autofocus><input type="hidden" name="next" value="/digital-workforce/"><button type="submit">OTVORI STAGING</button></form><small>Koristi se isti token kao za postojeći operator/admin pristup. Token se ne sprema u URL.</small></main></body></html>`,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, private','x-robots-tag':'noindex, nofollow, noarchive, nosnippet'}});
}

async function sha256(value){
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(value));
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

function cookieValue(request){
  const source=String(request.headers.get('cookie')||'');
  const hit=source.split(';').map(v=>v.trim()).find(v=>v.startsWith(`${COOKIE}=`));
  return hit?decodeURIComponent(hit.slice(COOKIE.length+1)):'';
}

async function tokenValid(value,env){
  const expected=String(env.STAGING_TOKEN_SHA256||'').trim().toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(expected)||!value)return false;
  return (await sha256(String(value).trim()))===expected;
}

async function authorized(request,env){
  const header=String(request.headers.get('authorization')||'');
  const match=header.match(/^Bearer\s+(.+)$/i);
  if(match&&await tokenValid(match[1],env))return true;
  return tokenValid(cookieValue(request),env);
}

function secure(response){
  const headers=new Headers(response.headers);
  headers.set('cache-control','no-store, private');
  headers.set('x-robots-tag','noindex, nofollow, noarchive, nosnippet');
  headers.set('x-gnk-environment','private-workforce-staging');
  headers.set('x-gnk-staging-gate',VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function login(request,env){
  const form=await request.formData();
  const token=String(form.get('token')||'').trim();
  if(!(await tokenValid(token,env)))return page('Token nije ispravan.');
  const next=String(form.get('next')||'/digital-workforce/');
  const location=next.startsWith('/')&&!next.startsWith('//')?next:'/digital-workforce/';
  return new Response(null,{status:303,headers:{location,'set-cookie':`${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`,'cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/_staging/login'&&request.method==='POST')return login(request,env);
    if(url.pathname==='/_staging/logout')return new Response(null,{status:303,headers:{location:'/_staging/login','set-cookie':`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`}});
    if(!(await authorized(request,env)))return page();
    if(!['GET','HEAD','OPTIONS'].includes(request.method)){
      return secure(new Response(JSON.stringify({ok:false,error:'STAGING_WRITE_BLOCKED',mode:'SHADOW_READ_ONLY'}),{status:405,headers:{'content-type':'application/json; charset=utf-8','allow':'GET, HEAD, OPTIONS'}}));
    }
    return secure(await app.fetch(request,env,ctx));
  }
};