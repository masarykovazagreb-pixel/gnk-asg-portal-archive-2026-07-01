const PRIVATE_PATHS=[
  '/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center',
  '/media-command-center','/media-application','/media-registration-admin','/campaign-mailer',
  '/news-admin','/pdf-publisher','/social-share','/wa-center','/review','/auto-editor','/operator','/api'
];

const normalizePath=path=>String(path||'').toLowerCase().replace(/\/+$/,'')||'/';

export function isPrivatePath(path){
  const normalized=normalizePath(path);
  return PRIVATE_PATHS.some(prefix=>normalized===prefix||normalized.startsWith(`${prefix}/`));
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
    .replace(/<script[^>]+src=["'][^"']*\/assets\/(?:public-menu-final-v9|public-menu-v13|public-menu-v18|public-floating-home-v16|public-ai-badge-guard-v17|index-news-rotation-v1|index-content-resilience-v1|index-live-market-chart-v[1-4]|index-group-network-v2|index-group-network-en-bridge-v1|index-runtime-lock-v31)\.js[^"']*["'][^>]*><\/script>/gi,'')
    .replace(/<script[^>]+src=["'][^"']*\/assets\/brand\/gnk-asg-global-layer\.js[^"']*["'][^>]*><\/script>/gi,'')
    .replace(/<link[^>]+href=["'][^"']*\/assets\/brand\/gnk-asg-global-layer\.css[^"']*["'][^>]*>/gi,'')
    .replace(/<link[^>]+href=["'][^"']*\/assets\/public-menu-unified-v12\.css[^"']*["'][^>]*>/gi,'')
    .replace(/<link[^>]+href=["'][^"']*\/assets\/public-visual-v13\.css[^"']*["'][^>]*>/gi,'')
    .replace(/<link[^>]+href=["'][^"']*\/assets\/public-redesign-v1\.css[^"']*["'][^>]*>/gi,'')
    .replace(/<link[^>]+href=["'][^"']*\/assets\/(?:index-polish-v1|index-critical-v31|index-stable-polish-v30)\.css[^"']*["'][^>]*>/gi,'')
    .replace(/<link[^>]+href=["'][^"']*\/assets\/index-group-network-v2\.css[^"']*["'][^>]*>/gi,'')
    .replace(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon|apple-touch-icon-precomposed)["'][^>]*>/gi,'')
    .replace(/<link[^>]+rel=["']manifest["'][^>]*>/gi,'')
    .replace(/<style[^>]+id=["'](?:gnk-public-v13-reset|gnk-index-v31-reset)["'][^>]*>[\s\S]*?<\/style>/gi,'')
    .replace(/<script[^>]+id=["']gnk-public-single-menu["'][^>]*>[\s\S]*?<\/script>/gi,'');
}

const stableFavicon='\n<link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any">\n<link rel="shortcut icon" href="/favicon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="/favicon.svg">\n<link rel="manifest" href="/site.webmanifest">\n<meta name="theme-color" content="#05080f">';

export function patchPublicHtml(html,path){
  const normalized=normalizePath(path);
  // Functional and protected applications retain their own HTML, CSS, JavaScript,
  // forms, cookies, API contracts and controls. The public redesign never mutates them.
  if(isPrivatePath(normalized))return html;

  html=removeLegacyPublicShell(html);
  const indexPath=['/','/en','/en/'].includes(normalized);
  if(indexPath){
    html=html.replace(/<script[^>]+src=["'][^"']*\/assets\/(?:gallery-bootstrap|gallery-brand-safety)\.js[^"']*["'][^>]*><\/script>/gi,'');
  }
  const ux='<link rel="stylesheet" href="/assets/public-ux-v11.css?v=20260625-v12">';
  const visual='<link rel="stylesheet" href="/assets/public-visual-v13.css?v=20260626-stable-v28">';
  const redesign='<link rel="stylesheet" href="/assets/public-redesign-v1.css?v=20260701-r2">';
  const reset='<style id="gnk-public-v13-reset">html,body{max-width:100%!important;overflow-x:hidden!important}body{padding-top:0!important}.brand-head,.top-nav,body>header:not(#gnk-public-header-v18),body>.site-header,.site-header,.header-inner>.main-nav,.menu-toggle,.shell>.brand-head,.shell>.top-nav,.gnk-asg-full-menu-v2,.gnk-asg-rescue-menu,.gnk-asg-final-menu-wrap,.gnk-asg-inner-nav,.gnk-asg-floating-actions,.floating-home,.floating-ai,.gnk-global-float-home,.gnk-global-float-ai,main>nav:first-child,.news-actions,#gnk-asg-global-layer-root,#gnk-asg-single-ai-button-anchor,#gnk-asg-float-home,#gnk-asg-float-ai,#gnk-asg-ai-panel,#gnk-asg-review-modal,.gnk-asg-fixed-menu-spacer{display:none!important}body.gnk-route-contact main .card>a[href="/"],body.gnk-route-contact main .card>a[href="/en/"]{display:none!important}body.gnk-route-contact main,body.gnk-route-contact main *,body.gnk-route-publications main,body.gnk-route-publications main *{min-width:0!important;max-width:100%!important;box-sizing:border-box!important;overflow-wrap:anywhere!important}body.gnk-route-contact pre,body.gnk-route-publications pre{overflow:auto!important}body.gnk-route-contact input[type="file"]{width:100%!important}</style>';
  const menu='<script src="/assets/public-menu-v18.js?v=20260701-r2" defer></script>';
  const indexHead='<link rel="stylesheet" href="/assets/index-group-network-v2.css?v=20260626-data-v28">';
  const indexScripts='<script src="/assets/index-group-network-en-bridge-v1.js?v=20260626-data-v28" defer></script><script src="/assets/index-group-network-v2.js?v=20260626-data-v28" defer></script><script src="/assets/index-news-rotation-v1.js?v=20260626-data-v28" defer></script><script src="/assets/index-content-resilience-v1.js?v=20260626-data-v28" defer></script><script src="/assets/index-live-market-chart-v4.js?v=20260626-data-v28" defer></script>';
  html=html.replace('</head>',`${stableFavicon}\n</head>`);
  if(!html.includes('/assets/public-ux-v11.css'))html=html.replace('</head>',`${ux}</head>`);
  html=html.replace('</head>',`${visual}${reset}${redesign}</head>`);
  if(indexPath&&!html.includes('/assets/index-group-network-v2.css'))html=html.replace('</head>',`${indexHead}</head>`);
  if(indexPath&&!html.includes('/assets/index-clock-v2.js'))html=html.replace('</body>','<script src="/assets/index-clock-v2.js?v=20260625-v2" defer></script></body>');
  if(indexPath&&!html.includes('/assets/index-content-resilience-v1.js'))html=html.replace('</body>',`${indexScripts}</body>`);
  return html.replace('</body>',`${menu}</body>`);
}

export function patchAdminHtml(html,path=''){
  html=html
    .replace(/<!--\s*GNK_ASG_MAIL_STUDIO_EMBED_DASHBOARD_START\s*-->[\s\S]*?<!--\s*GNK_ASG_MAIL_STUDIO_EMBED_DASHBOARD_END\s*-->/gi,'')
    .replace(/<script[^>]+src=["'][^"']*\/assets\/brand\/gnk-asg-global-layer\.js[^"']*["'][^>]*><\/script>/gi,'')
    .replace(/<link[^>]+href=["'][^"']*\/assets\/brand\/gnk-asg-global-layer\.css[^"']*["'][^>]*>/gi,'')
    .replace(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon|apple-touch-icon-precomposed)["'][^>]*>/gi,'')
    .replace(/<link[^>]+rel=["']manifest["'][^>]*>/gi,'');
  const css='<link rel="stylesheet" href="/assets/backend-ui-shell.css?v=20260625-admin-v7"><link rel="stylesheet" href="/assets/admin-unified-shell-v7.css?v=20260626-auth-v9">';
  const shell='<script src="/assets/backend-ui-shell.js?v=20260625-admin-v7" defer></script><script src="/assets/admin-unified-shell-v7.js?v=20260626-auth-v9" defer></script>';
  const mediaCampaign='<script src="/assets/admin-media-campaign-button-v1.js?v=20260701-v1" defer></script>';
  html=html.replace('</head>',`${stableFavicon}</head>`);
  if(!html.includes('/assets/admin-unified-shell-v7.css'))html=html.replace('</head>',`${css}</head>`);
  if(path==='/operator-dashboard'&&!html.includes('/assets/admin-portal-experience-v10.js'))html=html.replace('</head>','<script src="/assets/admin-portal-experience-v10.js?v=20260625-v10" defer></script></head>');
  if(!html.includes('/assets/admin-unified-shell-v7.js'))html=html.replace('</body>',`${shell}</body>`);
  if(path==='/admin-center'&&!html.includes('/assets/admin-media-campaign-button-v1.js'))html=html.replace('</body>',`${mediaCampaign}</body>`);
  return html;
}

export async function transformHtml(response,fn){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-public-visual','GNK_ASG_PUBLIC_REDESIGN_V1_20260701_R2');
  headers.set('x-gnk-asg-index-layout-lock','REDESIGN_V1_CANONICAL_MENU');
  return new Response(fn(await response.text()),{status:response.status,statusText:response.statusText,headers});
}
