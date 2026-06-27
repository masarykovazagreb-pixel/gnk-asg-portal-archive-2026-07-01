export const VERSION='GNK_ASG_INDEX_ACTIVATION_WRAPPER_V1_20260627';

const STYLE='<link rel="stylesheet" href="/assets/index-activation-v1.css?v=20260627-v2"><link rel="stylesheet" href="/assets/index-activation-lang-v1.css?v=20260627-v1">';
const SCRIPT='<script src="/assets/gallery-bootstrap.js?v=20260627-activation-v3" defer></script>';

function normalize(path){return path.replace(/\/+$/,'')||'/';}

async function loadFragment(request,env,english){
  if(!env.ASSETS?.fetch)throw new Error('ASSETS_BINDING_MISSING');
  const assetPath=english?'/index-activation-en.html':'/index-activation-fragment-hr.html';
  const response=await env.ASSETS.fetch(new Request(new URL(assetPath,request.url)));
  if(!response.ok)throw new Error(`ACTIVATION_FRAGMENT_${response.status}`);
  const fragment=await response.text();
  if(!fragment.includes('data-gnk-activation='))throw new Error('ACTIVATION_FRAGMENT_INVALID');
  return fragment;
}

export async function patchIndexActivation(response,path,request,env){
  path=normalize(path);
  if(request.method!=='GET'||!['/','/en'].includes(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;

  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-index-activation',VERSION);

  let body=await response.text();
  body=body.replace(/<script[^>]+src=["'][^"']*\/assets\/(?:gallery-bootstrap|index-activation-v1)\.js[^"']*["'][^>]*><\/script>/gi,'');
  body=body.replace(/<section[^>]+(?:id=["']the-code-index["']|class=["'][^"']*(?:gnk-code-slot|gnk-activation)[^"']*["'])[^>]*>[\s\S]*?<\/section>/gi,'');

  try{
    const fragment=await loadFragment(request,env,path==='/en');
    if(!body.includes('index-activation-v1.css'))body=body.replace('</head>',`${STYLE}</head>`);
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
