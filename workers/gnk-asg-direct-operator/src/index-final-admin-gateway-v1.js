import app from './index-unified-auth-v14.js';
import legacyIndex from './index-admin-hub-v29-index-visual-fix.js';

export const VERSION='GNK_ASG_INDEX_V29_RESTORE_WITH_CURRENT_ADMIN_V5_20260628';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';

function headersOf(response,marker){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-final-admin-gateway',VERSION);
  if(marker)headers.set('x-gnk-asg-flow',marker);
  return headers;
}

function chooser(){
  return `<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>GNK ASG — ADMIN</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 18% 0%,#173257,#020812 58%);font-family:Arial,sans-serif;color:#fff}main{width:min(900px,100%)}h1{text-align:center;margin:0 0 30px;color:#ffe08a;font-size:clamp(34px,6vw,62px)}section{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}a.choice{min-height:270px;display:grid;place-items:center;text-align:center;padding:30px;border:1px solid #d7aa3c;border-radius:24px;background:linear-gradient(145deg,#0d233d,#040f1c);color:#fff;text-decoration:none;font-size:clamp(28px,4vw,44px);font-weight:900;box-shadow:0 26px 75px rgba(0,0,0,.45)}a.choice:hover,a.choice:focus{transform:translateY(-5px);border-color:#ffe08a;outline:none}.logout{display:block;width:max-content;margin:24px auto 0;color:#cbd5e1;text-decoration:none;font-size:13px}@media(max-width:680px){section{grid-template-columns:1fr}.choice{min-height:190px}}</style></head><body><main><h1>ODABERITE</h1><section><a class="choice" href="/mail-studio/">MAIL STUDIO</a><a class="choice" href="/media-command-center/">MEDIA CENTAR</a></section><a class="logout" href="/operator/session/logout?next=/">ODJAVA</a></main></body></html>`;
}

function patchLegacyIndex(html,english){
  html=html.replace(/<a\b([^>]*?)href=["']\/(?:en\/)?downloads\/?["']([^>]*)>[\s\S]*?<\/a>/i,`<a$1href="/downloads/"$2>${english?'Download Centre':'Download centar'}</a>`);
  html=html.replace(/<a\b[^>]*href=["']\/(?:trzista|markets)\/?["'][^>]*>[\s\S]*?<\/a>/gi,'');
  html=html.replace(/<a\b([^>]*?)href=["']\/(?:operator-dashboard|admin-center|mail-studio)\/?["']([^>]*)>[\s\S]*?<\/a>/i,'<a$1href="/admin-center/"$2>ADMIN</a>');
  const lock=`<script id="gnk-v29-index-lock">(()=>{const en=${english?'true':'false'};const f=()=>document.querySelectorAll('nav.menu a,.index-nav .menu a').forEach(a=>{const t=(a.textContent||'').trim().toLowerCase(),h=(a.getAttribute('href')||'').toLowerCase();if(h==='/downloads/'||h==='/en/downloads/'){a.href='/downloads/';a.textContent=en?'Download Centre':'Download centar'}if(t==='admin'||h==='/mail-studio/'||h==='/operator-dashboard/'||h==='/admin-center/'){a.href='/admin-center/';a.textContent='ADMIN';a.rel='nofollow'}if(t==='markets'||t==='tržišta'||t==='trzista'||h==='/markets/'||h==='/trzista/')a.remove()});f();[50,150,400,900,1800,3500,7000,12000,17000].forEach(x=>setTimeout(f,x))})();<\/script>`;
  return html.includes('gnk-v29-index-lock')?html:html.replace('</body>',lock+'</body>');
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    const isIndex=request.method==='GET'&&(path==='/'||path==='/en');
    const response=await (isIndex?legacyIndex:app).fetch(request,env,ctx);
    const html=String(response.headers.get('content-type')||'').includes('text/html');
    if(request.method==='GET'&&path==='/admin-center'&&response.ok&&html)return new Response(chooser(),{status:200,headers:headersOf(response,'ADMIN_TOKEN_TO_MAIL_OR_MEDIA')});
    if(isIndex&&response.ok&&html)return new Response(patchLegacyIndex(await response.text(),path==='/en'),{status:200,headers:headersOf(response,'INDEX_V29_RESTORED_CURRENT_ADMIN')});
    return response;
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
