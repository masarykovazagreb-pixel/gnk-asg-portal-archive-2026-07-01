import authApp from './index-unified-auth-v14.js';

export const VERSION='GNK_ASG_UNIFIED_AUTH_V15_FINAL_INDEX_PDF_MAIL_MEDIA_20260628';
const INDEX_PATHS=new Set(['/','/en']);
const ADMIN_PATH='/admin-center';
const OLD_ADMIN_PATHS=new Set(['/operator-dashboard','/operator-mobile']);
const MEDIA_PATH='/media-command-center';

const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isHtml=response=>String(response.headers.get('content-type')||'').toLowerCase().includes('text/html');

function finalHeaders(response,flow){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.delete('last-modified');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('cdn-cache-control','no-store');
  headers.set('cloudflare-cdn-cache-control','no-store');
  headers.set('x-gnk-asg-production-entry',VERSION);
  if(flow)headers.set('x-gnk-asg-production-flow',flow);
  return headers;
}

function menu(english){
  return english
    ? '<nav class="menu"><a href="#the-code">THE CODE</a><a href="#financials">Financials</a><a href="#network">Network</a><a href="/en/downloads/">PDF CENTRE</a><a href="/admin-center/" rel="nofollow">ADMIN</a><a href="/en/contact/">Contact</a><a class="lang" href="/">HR</a></nav>'
    : '<nav class="menu"><a href="#the-code">THE CODE</a><a href="#financije">Financije</a><a href="#mreza">Mreža</a><a href="/downloads/">PDF CENTAR</a><a href="/admin-center/" rel="nofollow">ADMIN</a><a href="/contact/">Kontakt</a><a class="lang" href="/en/">EN</a></nav>';
}

function patchIndex(body,english){
  body=body.replace(/<nav class=["']menu["']>[\s\S]*?<\/nav>/i,menu(english));
  body=body.replace(/<a[^>]+href=["']\/(?:markets|trzista)\/?["'][^>]*>[\s\S]*?<\/a>/gi,'');
  body=body.replace(/href=["']\/(?:mail-studio|operator-dashboard|operator-mobile)\/?["']([^>]*)>\s*(?:Admin|ADMIN|Mail Studio)\s*</gi,'href="/admin-center/" rel="nofollow"$1>ADMIN<');
  const lock=`<script id="gnk-final-index-lock-v15">(()=>{'use strict';const fix=()=>{const nav=document.querySelector('.index-nav .menu,nav.menu');if(!nav)return;nav.querySelectorAll('a').forEach(a=>{const text=(a.textContent||'').trim().toLowerCase();const href=(a.getAttribute('href')||'').toLowerCase();if(text==='markets'||text==='tržišta'||text==='trzista'||href.startsWith('/markets')||href.startsWith('/trzista')){a.remove();return}if(text==='admin'||text==='mail studio'||href.startsWith('/mail-studio')||href.startsWith('/operator-dashboard')||href.startsWith('/operator-mobile')){a.setAttribute('href','/admin-center/');a.setAttribute('rel','nofollow');a.textContent='ADMIN'}})};fix();document.addEventListener('DOMContentLoaded',fix,{once:true});new MutationObserver(fix).observe(document.documentElement,{childList:true,subtree:true});[50,150,400,900,1800,3500,7000,12000].forEach(ms=>setTimeout(fix,ms))})();<\/script>`;
  if(!body.includes('gnk-final-index-lock-v15'))body=body.replace('</body>',lock+'</body>');
  return body;
}

function chooser(){
  return `<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Cache-Control" content="no-store"><title>GNK ASG — ADMIN</title><style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;font-family:Arial,sans-serif;color:#fff;background:radial-gradient(circle at 18% 0%,#173257,#020812 58%)}main{width:min(900px,100%)}h1{text-align:center;margin:0 0 30px;font-size:clamp(34px,6vw,62px);color:#ffe08a}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}.choice{min-height:270px;display:grid;place-items:center;text-align:center;padding:30px;border:1px solid #d7aa3c;border-radius:24px;background:linear-gradient(145deg,#0d233d,#040f1c);color:#fff;text-decoration:none;font-size:clamp(28px,4vw,44px);font-weight:900;letter-spacing:.03em;box-shadow:0 26px 75px rgba(0,0,0,.45);transition:.18s}.choice:hover,.choice:focus{transform:translateY(-5px);border-color:#ffe08a;outline:none}.logout{display:block;width:max-content;margin:24px auto 0;color:#cbd5e1;text-decoration:none;font-size:13px}@media(max-width:680px){.grid{grid-template-columns:1fr}.choice{min-height:190px}}</style></head><body><main><h1>ODABERITE</h1><section class="grid"><a class="choice" href="/mail-studio/">MAIL STUDIO</a><a class="choice" href="/media-command-center/">MEDIA CENTAR</a></section><a class="logout" href="/operator/session/logout?next=/">ODJAVA</a></main></body></html>`;
}

async function sessionAuthorized(request,env,ctx){
  const url=new URL('/api/operator-auth-check',request.url);
  const checkRequest=new Request(url,{method:'GET',headers:request.headers});
  const response=await authApp.fetch(checkRequest,env,ctx);
  return response.ok;
}

function redirect(location){
  return new Response(null,{status:303,headers:{location,'cache-control':'no-store','x-gnk-asg-production-entry':VERSION}});
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);

    if(request.method==='GET'&&OLD_ADMIN_PATHS.has(path))return redirect('/admin-center/');

    if(path===MEDIA_PATH||path.startsWith(MEDIA_PATH+'/')){
      if(!(await sessionAuthorized(request,env,ctx)))return redirect('/admin-center/?next=/media-command-center/');
    }

    const response=await authApp.fetch(request,env,ctx);

    if(request.method==='GET'&&INDEX_PATHS.has(path)&&response.ok&&isHtml(response)){
      const body=patchIndex(await response.text(),path==='/en');
      return new Response(body,{status:response.status,statusText:response.statusText,headers:finalHeaders(response,'INDEX_PDF_ADMIN')});
    }

    if(request.method==='GET'&&path===ADMIN_PATH&&response.ok&&isHtml(response)){
      return new Response(chooser(),{status:200,headers:finalHeaders(response,'TOKEN_TO_MAIL_OR_MEDIA')});
    }

    const headers=finalHeaders(response,path===MEDIA_PATH?'MEDIA_SESSION_PROTECTED':'AUTH_V15');
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(typeof authApp.scheduled==='function')return authApp.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof authApp.email==='function')return authApp.email(message,env,ctx)}
};
