export const VERSION='GNK_ASG_CONTACT_MENU_BACKEND_V1_20260701';

const PRIVATE_PREFIXES=[
  '/admin-center','/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro',
  '/media-command-center','/media-application','/media-registration-admin','/campaign-mailer',
  '/news-admin','/pdf-publisher','/social-share','/wa-center','/review','/auto-editor','/operator','/api'
];

const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isPrivate=path=>PRIVATE_PREFIXES.some(prefix=>path===prefix||path.startsWith(`${prefix}/`));

const CONTACT_SCRIPT=`<script id="gnk-contact-menu-backend-v1">(()=>{const install=()=>{const header=document.getElementById('gnk-public-header-v18');if(!header)return false;const actions=header.querySelector('.gnk18-actions');if(!actions)return false;if(actions.querySelector('[data-gnk-contact-link]'))return true;const en=(document.documentElement.lang||'').toLowerCase().startsWith('en')||location.pathname==='/en'||location.pathname.startsWith('/en/');const link=document.createElement('a');link.className='gnk18-admin';link.href=en?'/en/contact/':'/contact/';link.dataset.gnkContactLink='1';link.textContent=en?'Contact':'Kontakt';if(location.pathname===link.pathname||location.pathname.startsWith(link.pathname))link.setAttribute('aria-current','page');const admin=actions.querySelector('.gnk18-admin:not([data-gnk-contact-link])');actions.insertBefore(link,admin||actions.querySelector('.gnk18-mobile-toggle')||null);return true};if(!install()){const observer=new MutationObserver(()=>{if(install())observer.disconnect()});observer.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',install,{once:true});setTimeout(()=>observer.disconnect(),10000)}})();</script>`;

export async function addBackendContactMenuLink(request,response){
  const path=pathOf(request);
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(isPrivate(path)||!type.includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('gnk-contact-menu-backend-v1'))html=html.includes('</body>')?html.replace('</body>',`${CONTACT_SCRIPT}</body>`):html+CONTACT_SCRIPT;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-contact-menu',VERSION);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
