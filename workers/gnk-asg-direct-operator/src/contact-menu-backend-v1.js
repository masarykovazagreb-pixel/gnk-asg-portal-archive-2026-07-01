export const VERSION='GNK_ASG_PUBLIC_ACTIONS_BACKEND_V2_20260701_MEDIA_APPLICATION';

const PRIVATE_PREFIXES=[
  '/admin-center','/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro',
  '/media-command-center','/media-application','/media-registration-admin','/campaign-mailer',
  '/news-admin','/pdf-publisher','/social-share','/wa-center','/review','/auto-editor','/operator','/api'
];

const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isPrivate=path=>PRIVATE_PREFIXES.some(prefix=>path===prefix||path.startsWith(`${prefix}/`));

const CONTACT_SCRIPT=`<script id="gnk-contact-menu-backend-v1">(()=>{const install=()=>{const header=document.getElementById('gnk-public-header-v18');if(!header)return false;const actions=header.querySelector('.gnk18-actions');if(!actions)return false;const en=(document.documentElement.lang||'').toLowerCase().startsWith('en')||location.pathname==='/en'||location.pathname.startsWith('/en/');if(!actions.querySelector('[data-gnk-contact-link]')){const contact=document.createElement('a');contact.className='gnk18-admin';contact.href=en?'/en/contact/':'/contact/';contact.dataset.gnkContactLink='1';contact.textContent=en?'Contact':'Kontakt';if(location.pathname===contact.pathname||location.pathname.startsWith(contact.pathname))contact.setAttribute('aria-current','page');const admin=actions.querySelector('.gnk18-admin:not([data-gnk-contact-link])');actions.insertBefore(contact,admin||actions.querySelector('.gnk18-mobile-toggle')||null)}const index=['/','/index.html','/en','/en/'].includes(location.pathname);if(index&&!actions.querySelector('[data-gnk-media-application]')){const media=document.createElement('a');media.className='gnk18-admin';media.href='/media-application/?lang=en';media.dataset.gnkMediaApplication='1';media.textContent='MEDIA APPLICATION';const firstAction=actions.querySelector('.gnk18-admin');actions.insertBefore(media,firstAction||actions.querySelector('.gnk18-mobile-toggle')||null)}if(index){const mobile=header.querySelector('.gnk18-mobile-drawer .gnk18-mobile-group:last-child');if(mobile&&!mobile.querySelector('[data-gnk-media-application]')){const mediaMobile=document.createElement('a');mediaMobile.href='/media-application/?lang=en';mediaMobile.dataset.gnkMediaApplication='1';mediaMobile.innerHTML='<span>MEDIA APPLICATION</span><span aria-hidden="true">›</span>';mobile.prepend(mediaMobile)}}return true};if(!install()){const observer=new MutationObserver(()=>{if(install())observer.disconnect()});observer.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',install,{once:true});setTimeout(()=>observer.disconnect(),10000)}})();</script>`;

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
  headers.set('x-gnk-asg-public-actions',VERSION);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
