(() => {
  if (window.__GNK_ASG_ADMIN_UNIVERSAL_SHELL__) return;
  window.__GNK_ASG_ADMIN_UNIVERSAL_SHELL__ = true;

  const path = location.pathname.toLowerCase();
  const adminPattern = /\/(operator-dashboard|operator-mobile|mail-center|mail-studio|mail-studio-pro|command-center|social-share|document-studio|media-kit-admin|admin)\//;
  const privatePattern = /\/(operator-dashboard|operator-mobile|mail-center|mail-studio|mail-studio-pro|command-center|social-share|document-studio|media-kit-admin|admin)\//;
  const isAdmin = adminPattern.test(path);

  const items = [
    ['Pregled','/operator-dashboard/'],
    ['Mobilni admin','/operator-mobile/'],
    ['Mail Studio','/mail-studio-pro/'],
    ['Inbox','/mail-studio-pro/#inbox'],
    ['Social Share','/social-share/'],
    ['Objave','/operator-mobile/#publish'],
    ['Fotografije','/operator-mobile/#media'],
    ['Command Center','/command-center/'],
    ['Status','/backend-status'],
    ['Media Kit','/media-kit/'],
    ['Document Studio','/document-studio/']
  ];

  function current(href) {
    try {
      const url = new URL(href,location.origin);
      return path === url.pathname.toLowerCase() || path.startsWith(url.pathname.toLowerCase());
    } catch { return false; }
  }

  function removePrivatePublicLinks() {
    if (isAdmin) return;
    document.querySelectorAll('#gnk-asg-premium-menu a,#gnk-asg-drawer-menu a').forEach(link => {
      const href = String(link.getAttribute('href') || '').toLowerCase();
      if (privatePattern.test(href)) link.remove();
    });
  }

  function styleLink(link,active) {
    Object.assign(link.style,{
      flex:'none',display:'inline-flex',alignItems:'center',minHeight:'34px',padding:'8px 11px',
      border:`1px solid ${active?'var(--asg-line)':'transparent'}`,borderRadius:'999px',
      background:active?'rgba(212,175,55,.12)':'transparent',color:active?'var(--asg-gold-2)':'var(--asg-text)',
      textDecoration:'none',font:'800 10px/1 Arial,sans-serif',letterSpacing:'.04em',textTransform:'uppercase'
    });
    link.addEventListener('mouseenter',()=>{link.style.borderColor='var(--asg-line)';link.style.background='rgba(212,175,55,.12)'});
    link.addEventListener('mouseleave',()=>{if(!active){link.style.borderColor='transparent';link.style.background='transparent'}});
  }

  function addAdminMenu() {
    if (!isAdmin || document.getElementById('gnk-asg-admin-universal-menu')) return;

    const nav = document.createElement('nav');
    nav.id = 'gnk-asg-admin-universal-menu';
    nav.setAttribute('aria-label','GNK ASG admin navigacija');
    Object.assign(nav.style,{
      position:'fixed',top:'76px',left:'0',right:'0',zIndex:'2147482950',
      borderBottom:'1px solid var(--asg-line)',background:'rgba(4,12,25,.94)',
      backdropFilter:'blur(16px) saturate(140%)',boxShadow:'0 10px 30px rgba(0,0,0,.16)'
    });

    const inner = document.createElement('div');
    inner.className = 'gnk-asg-admin-universal-inner';
    Object.assign(inner.style,{
      width:'min(1380px,calc(100% - 24px))',height:'54px',margin:'auto',display:'flex',
      alignItems:'center',gap:'7px',overflowX:'auto'
    });

    const brand = document.createElement('strong');
    brand.textContent = 'GNK ASG ADMIN';
    Object.assign(brand.style,{flex:'none',marginRight:'4px',color:'var(--asg-gold)',font:'900 10px/1 Arial,sans-serif',letterSpacing:'.12em'});
    inner.appendChild(brand);

    items.forEach(([label,href]) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = label;
      const active = current(href);
      if (active) link.setAttribute('aria-current','page');
      styleLink(link,active);
      inner.appendChild(link);
    });

    nav.appendChild(inner);
    const header = document.getElementById('gnk-asg-premium-header');
    if (header?.nextSibling) header.parentNode.insertBefore(nav,header.nextSibling);
    else document.body.prepend(nav);
    document.body.style.paddingTop = '130px';
  }

  function syncTheme() {
    const nav = document.getElementById('gnk-asg-admin-universal-menu');
    if (!nav) return;
    nav.style.background = document.documentElement.dataset.gnkTheme === 'light' ? 'rgba(255,255,255,.96)' : 'rgba(4,12,25,.94)';
  }

  function init() {
    let count = 0;
    const timer = setInterval(() => {
      removePrivatePublicLinks();
      addAdminMenu();
      syncTheme();
      count += 1;
      if (count >= 20) clearInterval(timer);
    },200);
    document.addEventListener('click',event=>{
      if (event.target?.id === 'gnk-asg-theme-toggle') setTimeout(syncTheme,40);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
