import app from './index-admin-hub-v28-core.js';

export const VERSION='GNK_ASG_ADMIN_HUB_V29_PDF_CENTRE_ADMIN_CHOOSER_20260628';
const INDEX_PATHS=new Set(['/','/en']);
const DOWNLOAD_PATHS=new Set(['/downloads','/en/downloads']);
const CONTACT_PATHS=new Set(['/contact','/en/contact']);
const ADMIN_PATH='/admin-center';

function pathOf(request){
  return new URL(request.url).pathname.replace(/\/+$/,'')||'/';
}

function htmlHeaders(response,extra={}){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.delete('last-modified');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('cdn-cache-control','no-store');
  headers.set('cloudflare-cdn-cache-control','no-store');
  headers.set('x-gnk-asg-active-entrypoint','src/index-admin-hub-v29-pdf-centre.js');
  headers.set('x-gnk-asg-pdf-centre-version',VERSION);
  for(const [key,value] of Object.entries(extra))headers.set(key,value);
  return headers;
}

function indexMenu(english){
  return english
    ? '<nav class="menu"><a href="#the-code">THE CODE</a><a href="#financials">Financials</a><a href="#network">Network</a><a href="/en/downloads/">PDF CENTRE</a><a href="/admin-center/">ADMIN</a><a href="/en/contact/">Contact</a><a class="lang" href="/">HR</a></nav>'
    : '<nav class="menu"><a href="#the-code">THE CODE</a><a href="#financije">Financije</a><a href="#mreza">Mreža</a><a href="/downloads/">PDF CENTAR</a><a href="/admin-center/">ADMIN</a><a href="/contact/">Kontakt</a><a class="lang" href="/en/">EN</a></nav>';
}

function patchIndex(html,path){
  html=html.replace(/<nav class=["']menu["']>[\s\S]*?<\/nav>/i,indexMenu(path==='/en'));
  html=html.replace(/\['Markets','\/markets\/'\]/g,"['PDF CENTRE','/en/downloads/']");
  html=html.replace(/\['Tržišta','\/trzista\/'\]/g,"['PDF CENTAR','/downloads/']");
  html=html.replace(/\['Admin','\/(?:operator-dashboard|mail-studio|admin-center)\/'\]/gi,"['ADMIN','/admin-center/']");
  return html;
}

function adminChooser(){
  return `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>GNK ASG — ADMIN</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:Arial,sans-serif;color:#fff;background:radial-gradient(circle at 18% 0%,#173257,#020812 56%);display:grid;place-items:center;padding:24px}.shell{width:min(980px,100%)}.top{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:22px}.eyebrow{color:#e6bd57;font-size:12px;font-weight:900;letter-spacing:.18em}.top h1{margin:7px 0 8px;font-size:clamp(34px,6vw,66px);line-height:.95}.top p{margin:0;color:#cbd5e1;max-width:650px;line-height:1.55}.logout{color:#fff;text-decoration:none;border:1px solid rgba(230,189,87,.45);border-radius:12px;padding:11px 14px;white-space:nowrap}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.module{display:flex;min-height:260px;flex-direction:column;text-decoration:none;color:#fff;padding:28px;border:1px solid rgba(230,189,87,.52);border-radius:22px;background:linear-gradient(145deg,rgba(13,35,61,.98),rgba(4,15,28,.98));box-shadow:0 24px 70px rgba(0,0,0,.4);transition:transform .18s ease,border-color .18s ease}.module:hover,.module:focus{transform:translateY(-4px);border-color:#ffe08a;outline:none}.badge{display:inline-flex;align-self:flex-start;padding:7px 10px;border-radius:999px;background:rgba(230,189,87,.13);color:#ffe08a;font-size:11px;font-weight:900;letter-spacing:.11em}.module h2{margin:30px 0 10px;font-size:32px}.module p{margin:0;color:#cbd5e1;line-height:1.55}.open{margin-top:auto;padding-top:28px;color:#ffe08a;font-weight:900}.status{margin-top:20px;padding:14px 16px;border:1px solid rgba(148,163,184,.22);border-radius:14px;color:#cbd5e1;background:rgba(2,8,18,.55);font-size:13px}.status strong{color:#fff}@media(max-width:700px){.top{display:block}.logout{display:inline-block;margin-top:16px}.grid{grid-template-columns:1fr}.module{min-height:220px}}
</style>
</head>
<body>
<main class="shell">
  <header class="top">
    <div><div class="eyebrow">GNK ASG ZAŠTIĆENI ADMIN</div><h1>Odaberite modul</h1><p>Token je prihvaćen. Ista sigurna sesija vrijedi za oba modula sljedećih 12 sati.</p></div>
    <a class="logout" href="/operator/session/logout?next=/">ODJAVA</a>
  </header>
  <section class="grid" aria-label="Admin moduli">
    <a class="module" href="/mail-studio/">
      <span class="badge">ZAŠTIĆENO · AKTIVNO</span>
      <h2>MAIL STUDIO</h2>
      <p>Otvorite modul za pripremu, testiranje i slanje pojedinačnih ili ručnih e-mail poruka.</p>
      <span class="open">OTVORI MAIL STUDIO →</span>
    </a>
    <a class="module" href="/media-command-center/">
      <span class="badge">ZAŠTIĆENO · TESTNI REŽIM</span>
      <h2>MEDIA CENTAR</h2>
      <p>Otvorite bazu medija, kampanje, kontakte, pripremu poruka i kontrolirani test slanja.</p>
      <span class="open">OTVORI MEDIA CENTAR →</span>
    </a>
  </section>
  <div class="status"><strong>Pristup:</strong> INDEX → ADMIN → unos tokena → izbor Mail Studio ili Media Centar.</div>
</main>
</body>
</html>`;
}

function patchDownloads(html){
  html=html.replace(/<style id=["']gnk-reduced-public-menu-v1-style["']>[\s\S]*?<\/style>/gi,'');
  html=html.replace(/<script id=["']gnk-reduced-public-menu-v1-script["']>[\s\S]*?<\/script>/gi,'');
  html=html.replace(/<link[^>]+gnk-asg-global-layer[^>]*>/gi,'');
  html=html.replace(/<script[^>]+gnk-asg-global-layer[^>]*><\/script>/gi,'');
  const cleanStyle='<style id="gnk-pdf-centre-clean-v29">html,body{padding-top:0!important}body>header,body>nav,#gnkReducedPublicNav,#gnk-asg-premium-header,#gnk-asg-overlay,#gnk-asg-drawer,#gnk-asg-float-home,#gnk-asg-float-ai,#gnk-asg-ai-panel,#gnk-asg-global-layer-root,#gnk-asg-ai-help-float,#gnk-asg-single-ai-button-anchor,.gnk-global-float-home,.gnk-global-float-ai,.public-float,.public-float--home,.public-float--ai,.gnk-asg-floating-actions,[class*="float-home"],[class*="float-ai"],[id*="float-home"],[id*="float-ai"],body>a[href="/assistant/"],body>a[href="/en/assistant/"],body>a[href="#top"],body>a[href="/"]{display:none!important;visibility:hidden!important;pointer-events:none!important}</style>';
  const cleanScript='<script id="gnk-pdf-centre-remove-floating-v30">(()=>{const bad=e=>{if(!(e instanceof HTMLElement))return false;const s=getComputedStyle(e);if(s.position!=="fixed"&&s.position!=="sticky")return false;const t=((e.textContent||"")+" "+(e.getAttribute("aria-label")||"")+" "+(e.id||"")+" "+(e.className||"")+" "+(e.getAttribute("href")||"")).toLowerCase();return /(^|[^a-z])(ai|home|početna|pocetna|pomoć|pomoc)([^a-z]|$)/i.test(t)};const clean=()=>document.querySelectorAll("body *").forEach(e=>{if(bad(e))e.remove()});const o=new MutationObserver(clean);o.observe(document.documentElement,{childList:true,subtree:true});clean();[100,300,700,1500,3000,6000,12000].forEach(x=>setTimeout(clean,x));})();<\/script>';
  if(!html.includes('gnk-pdf-centre-clean-v29'))html=html.replace('</head>',cleanStyle+'</head>');
  if(!html.includes('gnk-pdf-centre-remove-floating-v30'))html=html.replace('</body>',cleanScript+'</body>');
  return html;
}

function patchContact(html){
  html=html.replace(/\['Markets','\/markets\/'\]/g,"['PDF CENTRE','/en/downloads/']");
  html=html.replace(/\['Tržišta','\/trzista\/'\]/g,"['PDF CENTAR','/downloads/']");
  return html;
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    const response=await app.fetch(request,env,ctx);
    const isHtml=String(response.headers.get('content-type')||'').includes('text/html');
    if(request.method==='GET'&&path===ADMIN_PATH&&response.ok&&isHtml){
      return new Response(adminChooser(),{status:200,headers:htmlHeaders(response,{'x-gnk-asg-admin-hub':'MAIL_AND_MEDIA_CHOOSER'})});
    }
    if(request.method!=='GET'||!response.ok||!isHtml)return response;
    let html=await response.text();
    let extra={};
    if(INDEX_PATHS.has(path)){
      html=patchIndex(html,path);
      extra={'x-gnk-asg-index-menu':'PDF_CENTRE_ADMIN_CENTER_NO_MARKETS'};
    }else if(DOWNLOAD_PATHS.has(path)){
      html=patchDownloads(html);
      extra={'x-gnk-asg-downloads-ui':'CLEAN_NO_MENU_NO_FLOATS_V30'};
    }else if(CONTACT_PATHS.has(path)){
      html=patchContact(html);
      extra={'x-gnk-asg-contact-menu':'PDF_CENTRE'};
    }else return response;
    return new Response(html,{status:response.status,statusText:response.statusText,headers:htmlHeaders(response,extra)});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
