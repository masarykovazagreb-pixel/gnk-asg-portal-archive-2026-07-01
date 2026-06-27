export const VERSION='GNK_ASG_WHITE_STATIC_INDEX_WOW_V4_20260627';
const PDF_STATE='<script src="/assets/index-white-static-pdf-state-v2.js?v=20260627-v2" defer></script>';
const UNIFIED_STYLE='<link rel="stylesheet" href="/assets/index-white-static-v3.css?v=20260627-v3">';
const WOW_STYLE='<link rel="stylesheet" href="/assets/index-wow-v4.css?v=20260627-v4">';
const WOW_RUNTIME='<script src="/assets/index-wow-v4.js?v=20260627-v4" defer></script>';

function normalize(path){return String(path||'/').replace(/\/+$/,'')||'/';}

async function loadStaticIndex(request,env,english){
  if(!env.ASSETS?.fetch)throw new Error('ASSETS_BINDING_MISSING');
  const assetPath=english?'/en/index-white-static-preview-v2.html':'/index-white-static-preview-v2.html';
  const assetUrl=new URL(assetPath,request.url);
  const assetResponse=await env.ASSETS.fetch(new Request(assetUrl));
  if(!assetResponse.ok)throw new Error(`STATIC_INDEX_${assetResponse.status}`);
  let body=await assetResponse.text();
  if(!body.includes('index-white-static-v3.css'))body=body.replace('</head>',`${UNIFIED_STYLE}</head>`);
  if(!body.includes('index-wow-v4.css'))body=body.replace('</head>',`${WOW_STYLE}</head>`);
  if(!body.includes('index-white-static-pdf-state-v2.js'))body=body.replace('</body>',`${PDF_STATE}</body>`);
  if(!body.includes('index-wow-v4.js'))body=body.replace('</body>',`${WOW_RUNTIME}</body>`);
  const headers=new Headers(assetResponse.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-index-template',VERSION);
  headers.set('x-gnk-asg-index-style','GNK_ASG_INDEX_WOW_V4_20260627');
  return new Response(body,{status:200,headers});
}

export async function patchIndexActivation(response,path,request,env){
  path=normalize(path);
  if(request.method!=='GET'||!['/','/en'].includes(path))return response;
  try{return await loadStaticIndex(request,env,path==='/en');}
  catch(error){
    const headers=new Headers(response.headers);
    headers.set('x-gnk-asg-index-template-error',String(error?.message||error).slice(0,120));
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }
}
