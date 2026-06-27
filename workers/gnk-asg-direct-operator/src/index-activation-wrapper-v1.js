import {applyIndexSeo} from './index-seo-v9.js';

export const VERSION='GNK_ASG_PUBLIC_INDEX_V9_HR_EN_20260627';
const BASE_STYLE='<link rel="stylesheet" href="/assets/index-white-static-v3.css?v=20260627-v3">';
const WOW_STYLE='<link rel="stylesheet" href="/assets/index-wow-v4.css?v=20260627-v4">';
const CODE_EDITORIAL_STYLE='<link rel="stylesheet" href="/assets/index-code-editorial-v5.css?v=20260627-v5">';
const PAGE_FRAME_STYLE='<link rel="stylesheet" href="/assets/index-unified-1180-v5.css?v=20260627-v5">';
const PUBLIC_STYLE='<link rel="stylesheet" href="/assets/index-public-v7.css?v=20260627-v8">';
const FINANCE_STYLE='<link rel="stylesheet" href="/assets/index-finance-v9.css?v=20260627-v9">';
const WOW_RUNTIME='<script src="/assets/index-wow-v4.js?v=20260627-v5" defer></script>';
const PUBLIC_RUNTIME='<script src="/assets/index-public-v7.js?v=20260627-v8" defer></script>';
const CODE_CLEANUP_RUNTIME='<script src="/assets/index-code-cleanup-v8.js?v=20260627-v8" defer></script>';

function normalize(path){return String(path||'/').replace(/\/+$/,'')||'/';}

async function loadStaticIndex(request,env,english){
  if(!env.ASSETS?.fetch)throw new Error('ASSETS_BINDING_MISSING');
  const assetPath=english?'/en/index-white-static-preview-v2.html':'/index-white-static-preview-v2.html';
  const assetResponse=await env.ASSETS.fetch(new Request(new URL(assetPath,request.url)));
  if(!assetResponse.ok)throw new Error(`STATIC_INDEX_${assetResponse.status}`);
  let body=await assetResponse.text();
  body=body.replace(/src=["']\/the-code\/?["']/gi,'src="/the-code/?embed=1&v=8"');
  body=applyIndexSeo(body,english);
  if(!body.includes('index-white-static-v3.css'))body=body.replace('</head>',`${BASE_STYLE}</head>`);
  if(!body.includes('index-wow-v4.css'))body=body.replace('</head>',`${WOW_STYLE}</head>`);
  if(!body.includes('index-code-editorial-v5.css'))body=body.replace('</head>',`${CODE_EDITORIAL_STYLE}</head>`);
  if(!body.includes('index-unified-1180-v5.css'))body=body.replace('</head>',`${PAGE_FRAME_STYLE}</head>`);
  if(!body.includes('index-public-v7.css'))body=body.replace('</head>',`${PUBLIC_STYLE}</head>`);
  if(!body.includes('index-finance-v9.css'))body=body.replace('</head>',`${FINANCE_STYLE}</head>`);
  if(!body.includes('index-wow-v4.js'))body=body.replace('</body>',`${WOW_RUNTIME}</body>`);
  if(!body.includes('index-public-v7.js'))body=body.replace('</body>',`${PUBLIC_RUNTIME}</body>`);
  if(!body.includes('index-code-cleanup-v8.js'))body=body.replace('</body>',`${CODE_CLEANUP_RUNTIME}</body>`);
  const headers=new Headers(assetResponse.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-index-template',VERSION);
  headers.set('x-gnk-asg-index-style','GNK_ASG_PUBLIC_INDEX_V9_FINANCE_SEO');
  headers.set('x-gnk-asg-page-width','1180');
  headers.set('x-gnk-asg-the-code-mode','CLEAN_HTML_EXTERNAL_BUTTON_ONLY_V8');
  headers.set('x-gnk-asg-seo','BILINGUAL_META_FAVICON_V9');
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
