(() => {
  if (window.__GNK_ASG_NAV_AUGMENT__) return;
  window.__GNK_ASG_NAV_AUGMENT__ = true;
  const path=location.pathname.toLowerCase();
  const isHome=['/','/index.html','/en/','/en/index.html'].includes(path);
  const isEn=path.startsWith('/en/');
  const isAdmin=/\/(operator-dashboard|operator-mobile|mail-studio|mail-center|command-center|admin)\//.test(path);
  const label=isEn?'Admin access':'Admin pristup';
  const note=isEn?'Protected access. The token is entered only after opening the admin page.':'Zaštićeni pristup. Token se unosi tek nakon otvaranja admin stranice.';
  function secureMenu(){
    if(isAdmin)return;
    document.querySelectorAll('#gnk-asg-premium-menu a,#gnk-asg-drawer-menu a').forEach(link=>{
      const href=(link.getAttribute('href')||'').toLowerCase();
      if(/\/(mail-center|mail-studio|command-center|operator-dashboard)\//.test(href))link.remove();
    });
  }
  function adminAccess(){
    if(!isHome||document.getElementById('gnk-asg-home-admin-access'))return;
    const hub=document.querySelector('#gnk-asg-portal-hub .gnk-asg-hub-grid')||document.querySelector('#gnk-asg-portal-hub');
    if(!hub)return;
    const a=document.createElement('a');
    a.id='gnk-asg-home-admin-access';
    a.className='gnk-asg-hub-card gnk-asg-admin-access-card';
    a.href='/operator-mobile/';
    a.innerHTML=`<span>08 · Admin</span><strong>${label}</strong><p>${note}</p>`;
    hub.appendChild(a);
  }
  function init(){let n=0;const timer=setInterval(()=>{n+=1;secureMenu();adminAccess();if(n>=12)clearInterval(timer)},250)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
