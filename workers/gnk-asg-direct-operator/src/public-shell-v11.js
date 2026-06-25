export function isPrivatePath(path){path=path.toLowerCase();return ['/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center','/news-admin','/pdf-publisher','/social-share','/wa-center','/review','/auto-editor','/operator','/api'].some(p=>path===p||path.startsWith(`${p}/`))}

function removeLegacyPublicShell(html){
  return html
    .replace(/<script[^>]+src=["'][^"']*\/assets\/public-menu-final-v9\.js[^"']*["'][^>]*><\/script>/gi,'')
    .replace(/<script[^>]+src=["'][^"']*\/assets\/public-menu-v13\.js[^"']*["'][^>]*><\/script>/gi,'')
    .replace(/<link[^>]+href=["'][^"']*\/assets\/public-visual-v13\.css[^"']*["'][^>]*>/gi,'');
}

export function patchPublicHtml(html,path){
  html=removeLegacyPublicShell(html);
  const legacyCss='<link rel="preload" as="style" href="/assets/public-ux-v11.css?v=20260625-v11">';
  const visualCss='<link rel="stylesheet" href="/assets/public-visual-v13.css?v=20260625-v13">';
  const menu='<script src="/assets/public-menu-v13.js?v=20260625-v13" defer></script>';
  if(!html.includes('/assets/public-ux-v11.css'))html=html.replace('</head>',`${legacyCss}</head>`);
  html=html.replace('</head>',`${visualCss}</head>`);
  if(['/','/en','/en/'].includes(path)&&!html.includes('/assets/index-clock-v2.js'))html=html.replace('</body>','<script src="/assets/index-clock-v2.js?v=20260625-v2" defer></script></body>');
  return html.replace('</body>',`${menu}</body>`);
}

export function patchAdminHtml(html){return html.includes('/assets/admin-portal-experience-v10.js')?html:html.replace('</head>','<script src="/assets/admin-portal-experience-v10.js?v=20260625-v10" defer></script></head>')}

export async function transformHtml(response,fn){const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');headers.set('x-gnk-asg-public-visual','GNK_ASG_PUBLIC_VISUAL_V13_20260625');return new Response(fn(await response.text()),{status:response.status,statusText:response.statusText,headers})}
