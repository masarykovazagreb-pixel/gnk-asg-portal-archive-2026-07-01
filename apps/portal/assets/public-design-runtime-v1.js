(()=>{
'use strict';
if(window.__GNK_PUBLIC_DESIGN_RUNTIME_V1__)return;
window.__GNK_PUBLIC_DESIGN_RUNTIME_V1__=true;
const protectedPrefixes=['/admin','/admin-center','/mail-studio','/campaign-mailer','/email-status','/operator-dashboard','/worker-ops','/digital-headquarters','/media-registration-admin','/webmail'];
const path=location.pathname.replace(/\/+$/,'')||'/';
if(protectedPrefixes.some(prefix=>path===prefix||path.startsWith(prefix+'/')))return;
if(!document.querySelector('link[href*="public-design-tokens-v1.css"]')){
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='/assets/public-design-tokens-v1.css?v=20260713-v1';
  document.head.appendChild(link);
}
document.documentElement.classList.add('gnk-public-design-v1');
document.body?.classList.add('gnk-public-shell-v1');
const main=document.querySelector('main');
if(main&&!main.classList.contains('gnk-public-main'))main.classList.add('gnk-public-main');
document.querySelectorAll('a[target="_blank"]').forEach(link=>{
  const rel=new Set(String(link.rel||'').split(/\s+/).filter(Boolean));
  rel.add('noopener');rel.add('noreferrer');
  link.rel=[...rel].join(' ');
});
document.querySelectorAll('img:not([loading])').forEach((img,index)=>{if(index>1)img.loading='lazy'});
document.documentElement.dataset.gnkPublicDesign='v1';
})();
