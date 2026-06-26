export const FAVICON_VERSION='GNK_ASG_FAVICON_CONTRACT_V2_20260626';
const REVISION='20260626-3';
const ICON_PATHS=new Set(['/favicon.ico','/favicon.svg','/apple-touch-icon.png','/site.webmanifest']);
const ICON_HEAD=`
<link rel="icon" href="/favicon.ico?v=${REVISION}" sizes="any">
<link rel="icon" href="/favicon.svg?v=${REVISION}" type="image/svg+xml" sizes="any">
<link rel="shortcut icon" href="/favicon.ico?v=${REVISION}">
<link rel="apple-touch-icon" href="/favicon.svg?v=${REVISION}">
<link rel="manifest" href="/site.webmanifest?v=${REVISION}">
<meta name="theme-color" content="#020812">
`;

function headers(contentType,cache='public, max-age=604800, stale-while-revalidate=2592000'){
  return{
    'content-type':contentType,
    'cache-control':cache,
    'x-content-type-options':'nosniff',
    'x-robots-tag':'all',
    'x-gnk-asg-favicon-contract':FAVICON_VERSION
  };
}

function redirect(request,target){
  return new Response(null,{status:308,headers:{
    location:new URL(`${target}?v=${REVISION}`,request.url).toString(),
    'cache-control':'public, max-age=86400',
    'x-gnk-asg-favicon-contract':FAVICON_VERSION
  }});
}

async function svg(request,env){
  if(!env.ASSETS?.fetch)return null;
  const target=new URL('/favicon.svg',request.url);
  const source=await env.ASSETS.fetch(new Request(target,{method:request.method,headers:request.headers}));
  if(!source.ok)return null;
  const out=new Headers(source.headers);
  for(const [key,value] of Object.entries(headers('image/svg+xml; charset=utf-8')))out.set(key,value);
  return new Response(request.method==='HEAD'?null:source.body,{status:source.status,statusText:source.statusText,headers:out});
}

function manifest(request){
  const value={
    name:'GNK ASG d.o.o. | GNK DINAMO Ltd.',
    short_name:'GNK ASG',
    start_url:'/',
    scope:'/',
    display:'standalone',
    background_color:'#020812',
    theme_color:'#020812',
    icons:[
      {src:`/favicon.svg?v=${REVISION}`,sizes:'any',type:'image/svg+xml',purpose:'any maskable'}
    ]
  };
  return new Response(request.method==='HEAD'?null:JSON.stringify(value,null,2),{
    status:200,headers:headers('application/manifest+json; charset=utf-8')
  });
}

export async function handleFaviconAsset(request,env,path){
  if(!['GET','HEAD'].includes(request.method)||!ICON_PATHS.has(path))return null;
  if(path==='/favicon.ico'||path==='/apple-touch-icon.png')return redirect(request,'/favicon.svg');
  if(path==='/site.webmanifest')return manifest(request);
  return svg(request,env);
}

function clean(html){
  return html
    .replace(/<link\b(?=[^>]*\brel\s*=\s*["'][^"']*(?:icon|apple-touch-icon)[^"']*["'])[^>]*>\s*/gi,'')
    .replace(/<link\b(?=[^>]*\brel\s*=\s*["'][^"']*manifest[^"']*["'])[^>]*>\s*/gi,'')
    .replace(/<meta\b(?=[^>]*\bname\s*=\s*["']theme-color["'])[^>]*>\s*/gi,'');
}

export async function applyFaviconContract(request,response){
  const out=new Headers(response.headers);
  out.set('x-gnk-asg-favicon-contract',FAVICON_VERSION);
  const type=String(out.get('content-type')||'').toLowerCase();
  if(request.method==='HEAD'||!type.includes('text/html')){
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers:out});
  }
  out.delete('content-length');
  out.delete('content-encoding');
  let html=clean(await response.text());
  if(/<\/head>/i.test(html))html=html.replace(/<\/head>/i,`${ICON_HEAD}</head>`);
  else if(/<head\b[^>]*>/i.test(html))html=html.replace(/<head\b[^>]*>/i,match=>`${match}${ICON_HEAD}`);
  else html=`${ICON_HEAD}${html}`;
  return new Response(html,{status:response.status,statusText:response.statusText,headers:out});
}
