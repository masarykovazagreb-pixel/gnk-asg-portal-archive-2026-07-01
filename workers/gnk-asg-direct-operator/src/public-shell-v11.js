export function isPrivatePath(path){
  path=path.toLowerCase();
  return ['/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center','/news-admin','/pdf-publisher','/social-share','/wa-center','/review','/auto-editor','/operator','/api'].some(p=>path===p||path.startsWith(`${p}/`));
}

function removeLegacyPublicShell(html){
  return html
    .replace(/<!--\s*GNK_ASG_FIXED_MENU_PATCH_START\s*-->/gi,'')
    .replace(/<!--\s*GNK_ASG_FIXED_MENU_PATCH_END\s*-->/gi,'')
    .replace(/<style[^>]+id=["']gnk-asg-fixed-menu-patch-style["'][^>]*>[\s\S]*?<\/style>/gi,'')
    .replace(/<script[^>]+id=["']gnk-asg-fixed-menu-patch-script["'][^>]*>[\s\S]*?<\/script>/gi,'')
    .replace(/<style[^>]+id=["']gnk-asg-single-ai-button-style["'][^>]*>[\s\S]*?<\/style>/gi,'')
    .replace(/<script[^>]+id=["']gnk-asg-single-ai-button-script["'][^>]*>[\s\S]*?<\/script>/gi,'')
    .replace(/<[^>]+class=["'][^"']*gnk-asg-fixed-menu-spacer[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi,'')
    .replace(/<script[^>]+src=["'][^"']*\/assets\/public-menu-final-v9\.js[^"']*["'][^>]*><\/script>/gi,'')
    .replace(/<script[^>]+src=["'][^"']*\/assets\/public-menu-v13\.js[^"']*["'][^>]*><\/script>/gi,'')
    .replace(/<script[^>]+src=["'][^"']*\/assets\/public-floating-home-v16\.js[^"']*["'][^>]*><\/script>/gi,'')
    .replace(/<script[^>]+src=["'][^"']*\/assets\/public-ai-badge-guard-v17\.js[^"']*["'][^>]*><\/script>/gi,'')
    .replace(/<script[^>]+src=["'][^"']*\/assets\/brand\/gnk-asg-global-layer\.js[^"']*["'][^>]*><\/script>/gi,'')
    .replace(/<link[^>]+href=["'][^"']*\/assets\/brand\/gnk-asg-global-layer\.css[^"']*["'][^>]*>/gi,'')
    .replace(/<link[^>]+href=["'][^"']*\/assets\/public-menu-unified-v12\.css[^"']*["'][^>]*>/gi,'')
    .replace(/<link[^>]+href=["'][^"']*\/assets\/public-visual-v13\.css[^"']*["'][^>]*>/gi,'')
    .replace(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon|apple-touch-icon-precomposed)["'][^>]*>/gi,'')
    .replace(/<link[^>]+rel=["']manifest["'][^>]*>/gi,'')
    .replace(/<style[^>]+id=["']gnk-public-v13-reset["'][^>]*>[\s\S]*?<\/style>/gi,'');
}

const stableFavicon='\n<link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any">\n<link rel="shortcut icon" href="/favicon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="/favicon.svg">\n<link rel="manifest" href="/site.webmanifest">\n<meta name="theme-color" content="#020812">';

export function patchPublicHtml(html,path){
  html=removeLegacyPublicShell(html);
  const ux='<link rel="stylesheet" href="/assets/public-ux-v11.css?v=20260625-v12">';
  const visual='<link rel="stylesheet" href="/assets/public-visual-v13.css?v=20260625-v15">';
  const reset='<style id="gnk-public-v13-reset">html,body{max-width:100%!important;overflow-x:hidden!important}body{padding-top:0!important}#gnk-asg-premium-header,#gnk-asg-premium-header *{box-sizing:border-box!important}#gnk-asg-premium-header.gnk-v13-header{display:block!important;position:sticky!important;top:6px!important;left:auto!important;right:auto!important;bottom:auto!important;transform:none!important;height:auto!important;min-height:0!important;max-height:none!important;margin-left:auto!important;margin-right:auto!important}#gnk-asg-premium-header .gnk-v13-brand-row{display:grid!important;position:relative!important;inset:auto!important;transform:none!important;width:100%!important;margin:0!important}#gnk-asg-premium-menu.gnk-v13-menu{display:flex!important;position:relative!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important;inset:auto!important;transform:none!important;clear:both!important;float:none!important;width:100%!important;max-width:none!important;height:auto!important;min-height:31px!important;max-height:none!important;margin:6px auto 0!important;padding:6px 0 0!important}body>header:not(#gnk-asg-premium-header),body>.site-header,.site-header,.header-inner>.main-nav,.menu-toggle,.shell>.brand-head,.shell>.top-nav,.gnk-asg-full-menu-v2,.gnk-asg-rescue-menu,.gnk-asg-final-menu-wrap,.gnk-asg-inner-nav,.gnk-asg-floating-actions,.floating-home,.floating-ai,.gnk-global-float-home,.gnk-global-float-ai,main>nav:first-child,.news-actions,#gnk-asg-global-layer-root,#gnk-asg-single-ai-button-anchor,#gnk-asg-float-home,#gnk-asg-float-ai,#gnk-asg-ai-panel,#gnk-asg-review-modal,.gnk-asg-fixed-menu-spacer{display:none!important}body.gnk-route-contact main .card>a[href="/"],body.gnk-route-contact main .card>a[href="/en/"]{display:none!important}body.gnk-route-contact main,body.gnk-route-contact main *,body.gnk-route-publications main,body.gnk-route-publications main *{min-width:0!important;max-width:100%!important;box-sizing:border-box!important;overflow-wrap:anywhere!important}body.gnk-route-contact pre,body.gnk-route-publications pre{overflow:auto!important}body.gnk-route-contact input[type="file"]{width:100%!important}</style>';
  const menu='<script src="/assets/public-menu-v13.js?v=20260625-v16" defer></script>';
  const floatingHome='<script src="/assets/public-floating-home-v16.js?v=20260625-v17" defer></script>';
  const aiGuard='<script src="/assets/public-ai-badge-guard-v17.js?v=20260625-v17" defer></script>';
  html=html.replace('</head>',`${stableFavicon}\n</head>`);
  if(!html.includes('/assets/public-ux-v11.css'))html=html.replace('</head>',`${ux}</head>`);
  html=html.replace('</head>',`${visual}${reset}</head>`);
  if(['/','/en','/en/'].includes(path)&&!html.includes('/assets/index-clock-v2.js'))html=html.replace('</body>','<script src="/assets/index-clock-v2.js?v=20260625-v2" defer></script></body>');
  return html.replace('</body>',`${menu}${floatingHome}${aiGuard}</body>`);
}

export function patchAdminHtml(html,path=''){
  html=html
    .replace(/<!--\s*GNK_ASG_MAIL_STUDIO_EMBED_DASHBOARD_START\s*-->[\s\S]*?<!--\s*GNK_ASG_MAIL_STUDIO_EMBED_DASHBOARD_END\s*-->/gi,'')
    .replace(/<script[^>]+src=["'][^"']*\/assets\/brand\/gnk-asg-global-layer\.js[^"']*["'][^>]*><\/script>/gi,'')
    .replace(/<link[^>]+href=["'][^"']*\/assets\/brand\/gnk-asg-global-layer\.css[^"']*["'][^>]*>/gi,'')
    .replace(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon|apple-touch-icon-precomposed)["'][^>]*>/gi,'')
    .replace(/<link[^>]+rel=["']manifest["'][^>]*>/gi,'');
  const css='<link rel="stylesheet" href="/assets/backend-ui-shell.css?v=20260625-admin-v7"><link rel="stylesheet" href="/assets/admin-unified-shell-v7.css?v=20260625-admin-v7">';
  const shell='<script src="/assets/backend-ui-shell.js?v=20260625-admin-v7" defer></script><script src="/assets/admin-unified-shell-v7.js?v=20260625-admin-v8" defer></script>';
  html=html.replace('</head>',`${stableFavicon}</head>`);
  if(!html.includes('/assets/admin-unified-shell-v7.css'))html=html.replace('</head>',`${css}</head>`);
  if(path==='/operator-dashboard'&&!html.includes('/assets/admin-portal-experience-v10.js'))html=html.replace('</head>','<script src="/assets/admin-portal-experience-v10.js?v=20260625-v10" defer></script></head>');
  if(!html.includes('/assets/admin-unified-shell-v7.js'))html=html.replace('</body>',`${shell}</body>`);
  return html;
}

export async function transformHtml(response,fn){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-public-visual','GNK_ASG_PUBLIC_VISUAL_V17_20260625');
  return new Response(fn(await response.text()),{status:response.status,statusText:response.statusText,headers});
}
