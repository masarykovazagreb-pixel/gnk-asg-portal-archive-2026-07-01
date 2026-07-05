(()=>{
'use strict';
if(window.__GNK_PUBLIC_EXECUTIVE_ACCESS_V1__)return;
window.__GNK_PUBLIC_EXECUTIVE_ACCESS_V1__=true;
const privatePath=['/admin-center','/mail-studio','/operator-dashboard','/enterprise','/mission-control'].some(prefix=>location.pathname===prefix||location.pathname.startsWith(`${prefix}/`));
if(privatePath)return;
function install(){
  if(document.getElementById('gnkExecutiveAccess'))return;
  const nav=document.createElement('aside');
  nav.id='gnkExecutiveAccess';
  nav.className='gnk-executive-access';
  nav.setAttribute('aria-label','Secure Executive Access');
  nav.innerHTML='<div class="gnk-executive-access__label">Secure Executive Access</div><a href="/admin-center/"><span data-short="ADMIN">Admin Center</span><span aria-hidden="true">↗</span></a><a href="/mail-studio/"><span data-short="MAIL">Mail Studio</span><span aria-hidden="true">↗</span></a>';
  document.body.appendChild(nav);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();