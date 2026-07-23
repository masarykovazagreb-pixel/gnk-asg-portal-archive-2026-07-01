import app from './index-unified-auth-v23.js';

export const VERSION='GNK_DINAMO_WORKFORCE_STAGING_GATE_V21';
const encoder=new TextEncoder();
const COOKIE='__Host-gnk_workforce_staging';
const COOKIE_HEADER_MAX_LENGTH=4096;
const COOKIE_VALUE_MAX_LENGTH=512;
const LOGIN_BODY_MAX_LENGTH=4096;
const TOKEN_MAX_LENGTH=512;
const SESSION_MAX_AGE_SECONDS=28800;
const SESSION_CLOCK_SKEW_SECONDS=300;
const CSP="default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'";

function harden(headers){
  headers.set('cache-control','no-store, private');
  headers.set('x-robots-tag','noindex, nofollow, noarchive, nosnippet');
  headers.set('x-content-type-options','nosniff');
  headers.set('x-frame-options','DENY');
  headers.set('referrer-policy','no-referrer');
  headers.set('permissions-policy','camera=(), microphone=(), geolocation=()');
  headers.set('content-security-policy',CSP);
  headers.set('x-gnk-environment','private-workforce-staging');
  headers.set('x-gnk-staging-gate',VERSION);
  return headers;
}

function page(message='',status=200){
  const note=message?`<p class="error" role="alert">${String(message).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}</p>`:'';
  const headers=harden(new Headers({'content-type':'text/html; charset=utf-8'}));
  return new Response(`<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Privatni staging | GNK DINAMO Ltd grupa</title><style>html{color-scheme:dark;background:#000}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;background:#000;font-family:Inter,Arial,sans-serif;color:#fff}.card{position:relative;width:min(92vw,460px);padding:34px;border:1px solid rgba(215,181,91,.34);border-radius:24px;background:rgba(8,8,8,.88);box-shadow:0 30px 80px rgba(0,0,0,.72),inset 0 1px 0 rgba(255,255,255,.04);backdrop-filter:blur(18px)}.card:before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(135deg,rgba(215,181,91,.07),transparent 42%)}.tag{position:relative;display:inline-block;padding:7px 11px;border:1px solid rgba(215,181,91,.38);border-radius:999px;background:rgba(215,181,91,.1);color:#f2d27d;font-size:12px;font-weight:800;letter-spacing:.1em}h1{position:relative;margin:18px 0 10px;font-size:30px;line-height:1.15}p{position:relative;color:#c7c7c7;line-height:1.55}.error{padding:10px 12px;border:1px solid rgba(248,113,113,.42);border-radius:10px;background:rgba(127,29,29,.2);color:#fecaca}form{position:relative}label{display:block;margin:22px 0 8px;font-weight:700;color:#f5f5f5}input{width:100%;min-height:48px;padding:14px 15px;border-radius:12px;border:1px solid rgba(215,181,91,.34);background:#050505;color:#fff;font-size:16px}input:focus-visible,button:focus-visible{outline:3px solid #f2d27d;outline-offset:3px}button{width:100%;min-height:48px;margin-top:14px;padding:14px;border:1px solid #d7b55b;border-radius:12px;background:#d7b55b;color:#090909;font-weight:900;cursor:pointer}button:hover{background:#f2d27d}small{position:relative;display:block;margin-top:18px;color:#999;line-height:1.5}@media(max-width:520px){.card{padding:26px 22px;border-radius:18px}h1{font-size:26px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}</style></head><body><main class="card"><span class="tag">PRIVATNI STAGING</span><h1>GNK DINAMO Ltd grupa</h1><p>Digitalna radna snaga · zatvoreno testno okruženje</p>${note}<form method="post" action="/_staging/login"><label for="token">Operatorski token</label><input id="token" name="token" type="password" autocomplete="current-password" required autofocus><input type="hidden" name="next" value="/digital-workforce/"><button type="submit">OTVORI STAGING</button></form><small>Koristi se isti token kao za postojeći operator/admin pristup. Token se ne sprema u URL ni u sesijski cookie.</small></main></body></html>`,{status,headers});
}

function unauthorizedApi(){
  const headers=harden(new Headers({
    'content-type':'application/json; charset=utf-8',
    'www-authenticate':'Bearer realm="GNK DINAMO Workforce staging"'
  }));
  return new Response(JSON.stringify({ok:false,error:'STAGING_AUTH_REQUIRED'}),{status:401,headers});
}

async function sha256(value){
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(value));
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

function expectedHash(env){
  const expected=String(env.STAGING_TOKEN_SHA256||'').trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(expected)?expected:'';
}

function cookieValue(request){
  const source=String(request.headers.get('cookie')||'');
  if(!source||source.length>COOKIE_HEADER_MAX_LENGTH)return '';
  const matches=source.split(';').map(v=>v.trim()).filter(v=>v.startsWith(`${COOKIE}=`));
  if(matches.length!==1)return '';
  const raw=matches[0].slice(COOKIE.length+1);
  if(!raw||raw.length>COOKIE_VALUE_MAX_LENGTH)return '';
  try{
    return decodeURIComponent(raw);
  }catch{
    return '';
  }
}

async function tokenValid(value,env){
  const expected=expectedHash(env);
  if(!expected||!value)return false;
  return (await sha256(String(value).trim()))===expected;
}

async function hmacKey(secret){
  return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}

function bytesToHex(bytes){
  return [...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

function hexToBytes(value){
  if(!/^[a-f0-9]{64}$/.test(value))return null;
  const bytes=new Uint8Array(32);
  for(let i=0;i<32;i++)bytes[i]=Number.parseInt(value.slice(i*2,i*2+2),16);
  return bytes;
}

function randomNonce(){
  const bytes=new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function createSession(env){
  const secret=expectedHash(env);
  if(!secret)throw new Error('Invalid staging token hash');
  const issuedAt=Math.floor(Date.now()/1000);
  const nonce=randomNonce();
  const payload=`${issuedAt}.${nonce}`;
  const signature=await crypto.subtle.sign('HMAC',await hmacKey(secret),encoder.encode(payload));
  return `${payload}.${bytesToHex(signature)}`;
}

async function sessionValid(value,env){
  const secret=expectedHash(env);
  const match=String(value||'').match(/^(\d{10})\.([a-f0-9]{32})\.([a-f0-9]{64})$/);
  if(!secret||!match)return false;
  const issuedAt=Number(match[1]);
  const now=Math.floor(Date.now()/1000);
  if(!Number.isSafeInteger(issuedAt)||issuedAt>now+SESSION_CLOCK_SKEW_SECONDS||now-issuedAt>SESSION_MAX_AGE_SECONDS)return false;
  const signature=hexToBytes(match[3]);
  if(!signature)return false;
  return crypto.subtle.verify('HMAC',await hmacKey(secret),signature,encoder.encode(`${match[1]}.${match[2]}`));
}

async function authorized(request,env){
  const header=String(request.headers.get('authorization')||'');
  if(header){
    const match=header.match(/^Bearer\s+(.+)$/i);
    return Boolean(match&&await tokenValid(match[1],env));
  }
  return sessionValid(cookieValue(request),env);
}

function secure(response){
  const headers=harden(new Headers(response.headers));
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

function safeNext(value){
  const next=String(value||'');
  if(!next.startsWith('/')||next.startsWith('//')||next.includes('\\')||/[\u0000-\u001f\u007f]/.test(next))return '/digital-workforce/';
  return next;
}

async function login(request,env){
  const contentType=String(request.headers.get('content-type')||'').toLowerCase();
  if(!contentType.startsWith('application/x-www-form-urlencoded'))return page('Zahtjev za prijavu nije valjan.',400);
  const lengthHeader=String(request.headers.get('content-length')||'').trim();
  if(lengthHeader&&(!/^\d+$/.test(lengthHeader)||Number(lengthHeader)>LOGIN_BODY_MAX_LENGTH))return page('Zahtjev za prijavu je prevelik.',413);
  let body;
  try{
    body=await request.text();
  }catch{
    return page('Zahtjev za prijavu nije valjan.',400);
  }
  if(body.length>LOGIN_BODY_MAX_LENGTH)return page('Zahtjev za prijavu je prevelik.',413);
  const form=new URLSearchParams(body);
  const tokens=form.getAll('token');
  const nextValues=form.getAll('next');
  if(tokens.length!==1||nextValues.length>1)return page('Zahtjev za prijavu nije valjan.',400);
  const token=String(tokens[0]||'').trim();
  if(!token||token.length>TOKEN_MAX_LENGTH||!(await tokenValid(token,env)))return page('Token nije ispravan.',401);
  const location=safeNext(nextValues[0]);
  const session=await createSession(env);
  const headers=harden(new Headers({location,'set-cookie':`${COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE_SECONDS}`}));
  return new Response(null,{status:303,headers});
}

async function serveRead(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/'))return app.fetch(request,env,ctx);
  if(env.ASSETS&&typeof env.ASSETS.fetch==='function'){
    const assetResponse=await env.ASSETS.fetch(request);
    if(assetResponse.status!==404)return assetResponse;
  }
  return app.fetch(request,env,ctx);
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/_staging/login'&&request.method==='POST')return login(request,env);
    if(url.pathname==='/_staging/logout'){
      const headers=harden(new Headers({location:'/_staging/login','set-cookie':`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`}));
      return new Response(null,{status:303,headers});
    }
    if(!(await authorized(request,env))){
      if(url.pathname.startsWith('/api/'))return unauthorizedApi();
      return page('',request.headers.has('authorization')?401:200);
    }
    if(!['GET','HEAD','OPTIONS'].includes(request.method)){
      return secure(new Response(JSON.stringify({ok:false,error:'STAGING_WRITE_BLOCKED',mode:'SHADOW_READ_ONLY'}),{status:405,headers:{'content-type':'application/json; charset=utf-8','allow':'GET, HEAD, OPTIONS'}}));
    }
    return secure(await serveRead(request,env,ctx));
  }
};