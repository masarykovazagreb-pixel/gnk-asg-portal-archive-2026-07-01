export function isPrivatePath(path){
  path=path.toLowerCase();
  return ['/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center','/news-admin','/pdf-publisher','/social-share','/wa-center','/review','/auto-editor','/operator','/api'].some(p=>path===p||path.startsWith(`${p}/`));
}

function removeLegacyPublicShell(html){
  return html
    .replace(/<script[^>]+src=["'][^"']*\/assets\/public-menu-final-v9\.js[^"']*["'][^>]*><\/script>/gi,'')
    .replace(/<script[^>]+src=["'][^"']*\/assets\/public-menu-v13\.js[^"']*["'][^>]*><\/script>/gi,'')
    .replace(/<script[^>]+src=["'][^"']*\/assets\/brand\/gnk-asg-global-layer\.js[^"']*["'][^>]*><\/script>/gi,'')
    .replace(/<link[^>]+href=["'][^"']*\/assets\/brand\/gnk-asg-global-layer\.css[^"']*["'][^>]*>/gi,'')
    .replace(/<link[^>]+href=["'][^"']*\/assets\/public-menu-unified-v12\.css[^"']*["'][^>]*>/gi,'')
    .replace(/<link[^>]+href=["'][^"']*\/assets\/public-visual-v13\.css[^"']*["'][^>]*>/gi,'')
    .replace(/<style[^>]+id=["']gnk-public-v13-reset["'][^>]*>[\s\S]*?<\/style>/gi,'');
}

export function patchPublicHtml(html,path){
  html=removeLegacyPublicShell(html);
  const favicon='\n<link rel="icon" type="image/svg+xml" href="/assets/gnk-asg-favicon.svg?v=20260625-v1">\n<link rel="shortcut icon" href="/favicon.ico?v=20260625-v1">\n<meta name="theme-color" content="#020812">';
  const preload='<link rel="preload" as="style" href="/assets/public-ux-v11.css?v=20260625-v12">';
  const visual='<link rel="stylesheet" href="/assets/public-visual-v13.css?v=20260625-v13">';
  const reset='<style id="gnk-public-v13-reset">html,body{max-width:100%!important;overflow-x:hidden!important}body{padding-top:0!important}#gnk-asg-premium-header,#gnk-asg-premium-header *{box-sizing:border-box!important}body>header:not(#gnk-asg-premium-header),body>.site-header,.shell>.brand-head,.shell>.top-nav,.gnk-asg-full-menu-v2,.gnk-asg-rescue-menu,.gnk-asg-final-menu-wrap,.gnk-asg-inner-nav,.gnk-asg-floating-actions,.floating-home,.floating-ai,.gnk-global-float-home,.gnk-global-float-ai,main>nav:first-child,.news-actions,#gnk-asg-global-layer-root,#gnk-asg-single-ai-button-anchor,#gnk-asg-float-home,#gnk-asg-float-ai,#gnk-asg-ai-panel,#gnk-asg-review-modal{display:none!important}body.gnk-route-contact main .card>a[href="/"],body.gnk-route-contact main .card>a[href="/en/"]{display:none!important}body.gnk-route-contact main,body.gnk-route-contact main *,body.gnk-route-publications main,body.gnk-route-publications main *{min-width:0!important;max-width:100%!important;box-sizing:border-box!important;overflow-wrap:anywhere!important}body.gnk-route-contact pre,body.gnk-route-publications pre{overflow:auto!important}body.gnk-route-contact input[type="file"]{width:100%!important}</style>';
  const menu='<script src="/assets/public-menu-v13.js?v=20260625-v13" defer></script>';
  if(!html.includes('/assets/gnk-asg-favicon.svg'))html=html.replace('</head>',`${favicon}\n</head>`);
  if(!html.includes('/assets/public-ux-v11.css'))html=html.replace('</head>',`${preload}</head>`);
  html=html.replace('</head>',`${visual}${reset}</head>`);
  if(['/','/en','/en/'].includes(path)&&!html.includes('/assets/index-clock-v2.js'))html=html.replace('</body>','<script src="/assets/index-clock-v2.js?v=20260625-v2" defer></script></body>');
  return html.replace('</body>',`${menu}</body>`);
}

export function patchAdminHtml(html){
  return html.includes('/assets/admin-portal-experience-v10.js')?html:html.replace('</head>','<script src="/assets/admin-portal-experience-v10.js?v=20260625-v10" defer></script></head>');
}

export async function transformHtml(response,fn){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-public-visual','GNK_ASG_PUBLIC_VISUAL_V13_20260625');
  return new Response(fn(await response.text()),{status:response.status,statusText:response.statusText,headers});
}
