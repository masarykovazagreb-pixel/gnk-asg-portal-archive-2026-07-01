export const VERSION='GNK_ASG_INDEX_ACTIVATION_WRAPPER_V2_20260627';

const STYLE='<link rel="stylesheet" href="/assets/index-activation-v1.css?v=20260627-v2">';
const SCRIPT='<script src="/assets/gallery-bootstrap.js?v=20260627-activation-v4" defer></script>';

function normalize(path){return path.replace(/\/+$/,'')||'/';}

async function loadFragment(request,env,english){
  if(!env.ASSETS?.fetch)throw new Error('ASSETS_BINDING_MISSING');
  const assetPath=english?'/index-activation-en.html':'/index-activation-fragment-hr.html';
  const response=await env.ASSETS.fetch(new Request(new URL(assetPath,request.url)));
  if(!response.ok)throw new Error(`ACTIVATION_FRAGMENT_${response.status}`);
  let fragment=await response.text();
  if(!fragment.includes('data-gnk-activation='))throw new Error('ACTIVATION_FRAGMENT_INVALID');

  const switcher=english
    ?'<nav class="gnk-activation__lang" aria-label="Language"><a href="/" hreflang="hr">HR</a><a class="is-active" href="/en/" hreflang="en" aria-current="page">EN</a></nav>'
    :'<nav class="gnk-activation__lang" aria-label="Odabir jezika"><a class="is-active" href="/" hreflang="hr" aria-current="page">HR</a><a href="/en/" hreflang="en">EN</a></nav>';

  fragment=fragment.replace('<p class="gnk-activation__eyebrow">',`${switcher}<p class="gnk-activation__eyebrow">`);
  fragment=fragment.replace('Odbrojavanje do aktivacije','AKTIVACIJA KODA');
  fragment=fragment.replace('Countdown to activation','CODE ACTIVATION');
  fragment=fragment.replace('SUSTAV SPREMAN · AKTIVACIJA ZAKAZANA','SUSTAV SPREMAN · AKTIVACIJA KODA ZAKAZANA');
  return fragment;
}

function removePreviousShowcases(body){
  return body
    .replace(/<link[^>]+href=["'][^"']*index-existing-media-slots-v2\.css[^"']*["'][^>]*>/gi,'')
    .replace(/<div id=["']gnk-existing-visual-stage["'][\s\S]*?<\/div><\/div>/gi,'')
    .replace(/<div id=["']gnk-existing-code-stage["'][\s\S]*?<\/div><\/div>/gi,'')
    .replace(/<script[^>]+src=["'][^"']*\/assets\/(?:gallery-bootstrap|index-activation-v1)\.js[^"']*["'][^>]*><\/script>/gi,'')
    .replace(/<section[^>]+(?:id=["']the-code-index["']|class=["'][^"']*(?:gnk-code-slot|gnk-activation)[^"']*["'])[^>]*>[\s\S]*?<\/section>/gi,'');
}

function addLanguageStyles(body){
  if(body.includes('gnk-activation-lang-style'))return body;
  const css='<style id="gnk-activation-lang-style">.gnk-activation__lang{display:inline-flex;gap:4px;margin:0 0 18px;padding:4px;border:1px solid rgba(214,173,79,.28);border-radius:999px;background:rgba(0,0,0,.32)}.gnk-activation__lang a{display:inline-flex;align-items:center;justify-content:center;min-width:42px;height:30px;padding:0 12px;border-radius:999px;color:#9da8ba;font:800 10px/1 monospace;letter-spacing:.14em;text-decoration:none}.gnk-activation__lang a.is-active{color:#06101d;background:#e7c66b}.gnk-activation__lang a:hover{color:#fff;background:rgba(255,255,255,.08)}</style>';
  return body.replace('</head>',`${css}</head>`);
}

export async function patchIndexActivation(response,path,request,env){
  path=normalize(path);
  if(request.method!=='GET'||!['/','/en'].includes(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;

  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-index-activation',VERSION);

  let body=removePreviousShowcases(await response.text());

  try{
    const fragment=await loadFragment(request,env,path==='/en');
    if(!body.includes('index-activation-v1.css'))body=body.replace('</head>',`${STYLE}</head>`);
    body=addLanguageStyles(body);
    if(!body.includes('data-gnk-activation=')){
      body=/<main\b[^>]*id=["']main["'][^>]*>/i.test(body)
        ?body.replace(/(<main\b[^>]*id=["']main["'][^>]*>)/i,`$1${fragment}`)
        :body.replace(/(<main\b[^>]*>)/i,`$1${fragment}`);
    }
    if(!body.includes('/assets/gallery-bootstrap.js'))body=body.replace('</body>',`${SCRIPT}</body>`);
  }catch(error){
    headers.set('x-gnk-asg-index-activation-error',String(error?.message||error).slice(0,120));
  }

  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}
