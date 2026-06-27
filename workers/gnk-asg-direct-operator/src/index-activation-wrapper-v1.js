export const VERSION='GNK_ASG_PUBLIC_INDEX_V7_HR_EN_20260627';
const BASE_STYLE='<link rel="stylesheet" href="/assets/index-white-static-v3.css?v=3">';
const WOW_STYLE='<link rel="stylesheet" href="/assets/index-wow-v4.css?v=4">';
const CODE_STYLE='<link rel="stylesheet" href="/assets/index-code-editorial-v5.css?v=5">';
const FRAME_STYLE='<link rel="stylesheet" href="/assets/index-unified-1180-v5.css?v=5">';
const PUBLIC_STYLE='<link rel="stylesheet" href="/assets/index-public-v7.css?v=7">';
const WOW_JS='<script src="/assets/index-wow-v4.js?v=5" defer></script>';
const PUBLIC_JS='<script src="/assets/index-public-v7.js?v=7" defer></script>';
function clean(path){return String(path||'/').replace(/\/+$/,'')||'/';}
async function page(request,env,english){
  const file=english?'/en/index-white-static-preview-v2.html':'/index-white-static-preview-v2.html';
  const response=await env.ASSETS.fetch(new Request(new URL(file,request.url)));
  if(!response.ok)throw new Error('INDEX_ASSET_'+response.status);
  let html=await response.text();
  html=html.split('src="/the-code/"').join('src="/the-code/?embed=1"');
  for(const asset of [BASE_STYLE,WOW_STYLE,CODE_STYLE,FRAME_STYLE,PUBLIC_STYLE])if(!html.includes(asset.match(/href="([^"]+)/)?.[1].split('?')[0]))html=html.replace('</head>',asset+'</head>');
  if(!html.includes('index-wow-v4.js'))html=html.replace('</body>',WOW_JS+'</body>');
  if(!html.includes('index-public-v7.js'))html=html.replace('</body>',PUBLIC_JS+'</body>');
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-index-template',VERSION);
  headers.set('x-gnk-asg-index-style','V7_IDENTICAL_HR_EN');
  headers.set('x-gnk-asg-page-width','1180');
  headers.set('x-gnk-asg-the-code-mode','EXTERNAL_ONLY_390X844_V7');
  return new Response(html,{status:200,headers});
}
export async function patchIndexActivation(response,path,request,env){
  path=clean(path);
  if(request.method!=='GET'||!['/','/en'].includes(path))return response;
  try{return await page(request,env,path==='/en');}
  catch(error){const headers=new Headers(response.headers);headers.set('x-gnk-asg-index-template-error',String(error?.message||error).slice(0,120));return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}
}
