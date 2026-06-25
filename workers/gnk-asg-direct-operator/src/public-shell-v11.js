export function isPrivatePath(path){
  path=path.toLowerCase();
  return ['/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center','/news-admin','/pdf-publisher','/social-share','/wa-center','/review','/auto-editor','/operator','/api'].some(p=>path===p||path.startsWith(`${p}/`));
}

function addBodyClass(html){
  if(/<body[^>]*class=["'][^"']*gnk-public-v12/i.test(html))return html;
  if(/<body[^>]*class=["']/i.test(html))return html.replace(/<body([^>]*class=["'])([^"']*)(["'][^>]*)>/i,'<body$1$2 gnk-public-v12$3>');
  return html.replace(/<body([^>]*)>/i,'<body$1 class="gnk-public-v12">');
}

export function patchPublicHtml(html,path){
  const favicon='\n<link rel="icon" type="image/svg+xml" href="/assets/gnk-asg-favicon.svg?v=20260625-v1">\n<link rel="shortcut icon" href="/favicon.ico?v=20260625-v1">\n<meta name="theme-color" content="#020812">';
  const css='<link rel="stylesheet" href="/assets/public-ux-v11.css?v=20260625-v12">';
  const menu='<script src="/assets/public-menu-final-v9.js?v=20260625-v12" defer></script>';
  html=addBodyClass(html);
  if(!html.includes('/assets/gnk-asg-favicon.svg'))html=html.replace('</head>',`${favicon}\n</head>`);
  if(!html.includes('/assets/public-ux-v11.css?v=20260625-v12'))html=html.replace('</head>',`${css}</head>`);
  if(!html.includes('/assets/public-menu-final-v9.js?v=20260625-v12'))html=html.replace('</body>',`${menu}</body>`);
  if(['/','/en','/en/'].includes(path)&&!html.includes('/assets/index-clock-v2.js'))html=html.replace('</body>','<script src="/assets/index-clock-v2.js?v=20260625-v2" defer></script></body>');
  return html;
}

export function patchAdminHtml(html){
  return html.includes('/assets/admin-portal-experience-v10.js')?html:html.replace('</head>','<script src="/assets/admin-portal-experience-v10.js?v=20260625-v10" defer></script></head>');
}

export async function transformHtml(response,fn){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control','no-store');
  return new Response(fn(await response.text()),{status:response.status,statusText:response.statusText,headers});
}
