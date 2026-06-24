import app from './index-mail-repair-v1.js';

const COOKIE='gnk_asg_admin_session';
const MAX_AGE=43200;
const enc=new TextEncoder();
const UI=['/mail-studio','/mail-studio-pro','/admin-center','/operator-dashboard','/operator-mobile','/auto-editor'];
const API=new Set(['/api/admin-mail-send','/api/operator-send-mail','/api/operator-mailbox-config','/api/operator-signature-load','/api/operator-signature-save','/api/operator-mail-log']);

const clean=v=>String(v||'').trim();
const pathOf=r=>new URL(r.url).pathname.replace(/\/+$/,'')||'/';
const isUi=p=>UI.some(x=>p===x||p.startsWith(x+'/'));
const hashOfEnv=e=>clean(e.OPERATOR_TOKEN_SHA256).toLowerCase();

function tokenOf(r){
  const a=r.headers.get('authorization')||'';
  const m=a.match(/^Bearer\s+(.+)$/i);
  return clean((m&&m[1])||r.headers.get('x-operator-token')||r.headers.get('x-admin-token'));
}
function eq(a,b){a=String(a||'');b=String(b||'');let x=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)x|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return x===0;}
async function sha(v){const d=await crypto.subtle.digest('SHA-256',enc.encode(String(v||'')));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function b64(bytes){let s='';for(const x of new Uint8Array(bytes))s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');}
async function mac(secret,value){const k=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(await crypto.subtle.sign('HMAC',k,enc.encode(value)));}
function cookie(r){for(const part of (r.headers.get('cookie')||'').split(';')){const i=part.indexOf('=');if(i>0&&part.slice(0,i).trim()===COOKIE){try{return decodeURIComponent(part.slice(i+1).trim());}catch{return'';}}}return'';}
async function rawOk(r,e){const t=tokenOf(r),h=hashOfEnv(e);return Boolean(t&&h.length===64&&eq(await sha(t),h));}
async function sessionOk(r,e){const h=hashOfEnv(e),v=cookie(r),i=v.indexOf('.');if(h.length!==64||i<1)return false;const exp=Number(v.slice(0,i)),sig=v.slice(i+1);if(!Number.isFinite(exp)||exp<=Math.floor(Date.now()/1000))return false;return eq(sig,await mac(h,`gnk-asg-admin:${exp}`));}
async function access(r,e){if(await rawOk(r,e))return{ok:true,secret:tokenOf(r),mode:'token'};if(await sessionOk(r,e))return{ok:true,secret:hashOfEnv(e),mode:'session'};return{ok:false,secret:'',mode:null};}
function patch(e,secret){return new Proxy(e,{get(t,p,r){if(p==='GNK_ASG_OPERATOR_TOKEN')return secret;return Reflect.get(t,p,r);}});}
function safe(v,f='/mail-studio/'){try{const s=clean(v||f);if(!s.startsWith('/')||s.startsWith('//'))return f;const u=new URL(s,'https://gnk-asg.hr');return isUi(u.pathname.replace(/\/+$/,'')||'/')?u.pathname+u.search:f;}catch{return f;}}
function esc(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);}
function page(next,msg='',status=401){const n=safe(next),err=msg?`<p style="color:#ffb4b4">${esc(msg)}</p>`:'';return new Response(`<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>GNK ASG — Zaštićeni pristup</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 20% 0%,#14213f,#020812 52%);color:#fff;font-family:Arial}.c{width:min(440px,90%);padding:28px;border:1px solid #d7aa3c;border-radius:20px;background:#07172a;box-shadow:0 28px 80px rgba(0,0,0,.5)}h1{margin-top:0;color:#ffe08a}p{color:#cbd5e1;line-height:1.5}input,button,a{width:100%;box-sizing:border-box;padding:14px;margin-top:10px;border-radius:10px}input{border:1px solid rgba(215,170,60,.5);background:#020812;color:#fff}button{border:0;background:#e6bd57;font-weight:900;cursor:pointer}.back{display:block;text-align:center;color:#fff;text-decoration:none;border:1px solid rgba(215,170,60,.35)}</style></head><body><main class="c"><h1>Sigurna administratorska prijava</h1><p>Ručno unesite svoj operatorski token. Token se ne zapisuje u GitHub ni u javni kod. Sigurna sesija traje 12 sati.</p>${err}<form method="post" action="${esc(n)}"><input type="hidden" name="next" value="${esc(n)}"><input name="token" type="password" required autofocus autocomplete="current-password" placeholder="Operatorski token"><button>PRIJAVA</button></form><a class="back" href="/">Povratak na portal</a></main></body></html>`,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});}
async function login(r,e,p){let f;try{f=await r.formData();}catch{return page(p,'Neispravan zahtjev.',400);}const t=clean(f.get('token')),h=hashOfEnv(e),next=safe(f.get('next'),p+'/');if(h.length!==64)return page(next,'Sigurnosni otisak nije konfiguriran.',503);if(!t||!eq(await sha(t),h))return page(next,'Token nije valjan.',401);const exp=Math.floor(Date.now()/1000)+MAX_AGE,sig=await mac(h,`gnk-asg-admin:${exp}`);return new Response(null,{status:303,headers:{location:next,'cache-control':'no-store','set-cookie':`${COOKIE}=${encodeURIComponent(`${exp}.${sig}`)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`}});}
function logout(next='/'){return new Response(null,{status:303,headers:{location:safe(next,'/'),'cache-control':'no-store','set-cookie':`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`}});}
function json(d,s=200){return new Response(JSON.stringify(d,null,2),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}

async function addAdminShell(response){
  if(!response||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  let html=await response.text();
  const assets=`<link rel="stylesheet" href="/assets/backend-ui-shell.css?v=20260624-backend-6"><style id="gnk-sensitive-menu-cleanup">#gnk-asg-premium-header,#gnk-asg-overlay,#gnk-asg-drawer,#gnk-asg-admin-launcher,.gnk-asg-final-menu-wrap{display:none!important}</style><script src="/assets/backend-ui-shell.js?v=20260624-backend-6"></script>`;
  if(!html.includes('/assets/backend-ui-shell.js?v=20260624-backend-6'))html=html.includes('</body>')?html.replace('</body>',assets+'</body>'):html+assets;
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{async fetch(r,e,c){
  const p=pathOf(r),u=new URL(r.url);
  if(p==='/operator/session/logout')return logout(u.searchParams.get('next')||'/');
  if(p==='/api/operator-auth-check'){const a=await access(r,e);return json({ok:a.ok,authenticated:a.ok,mode:a.mode,worker:'gnk-asg-direct-operator'},a.ok?200:401);}
  if(isUi(p)){
    if(r.method==='POST'&&(r.headers.get('content-type')||'').includes('application/x-www-form-urlencoded'))return login(r,e,p);
    const a=await access(r,e);
    if(!a.ok)return page(u.pathname+u.search);
    return addAdminShell(await app.fetch(r,patch(e,a.secret),c));
  }
  if(API.has(p)){const a=await access(r,e);if(!a.ok)return json({ok:false,error:'unauthorized',message:'Unesite valjani operatorski token.'},401);return app.fetch(r,patch(e,a.secret),c);}
  return app.fetch(r,e,c);
},scheduled:(ev,e,c)=>app.scheduled?.(ev,e,c),email:(m,e,c)=>app.email?.(m,e,c)};