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

  function addAdminMenu() {
    if (!isAdmin || document.getElementById('gnk-asg-admin-universal-menu')) return;
    const nav = document.createElement('nav');
    nav.id = 'gnk-asg-admin-universal-menu';
    nav.setAttribute('aria-label','GNK ASG admin navigacija');
    nav.innerHTML = `<div class="gnk-asg-admin-universal-inner"><strong>GNK ASG ADMIN</strong>${items.map(([label,href]) => `<a href="${href}"${current(href)?' aria-current="page"':''}>${label}</a>`).join('')}</div>`;
    const header = document.getElementById('gnk-asg-premium-header');
    if (header?.nextSibling) header.parentNode.insertBefore(nav,header.nextSibling);
    else document.body.prepend(nav);
    document.body.classList.add('gnk-asg-has-admin-universal-menu');
  }

  function init() {
    let count = 0;
    const timer = setInterval(() => {
      removePrivatePublicLinks();
      addAdminMenu();
      count += 1;
      if (count >= 16) clearInterval(timer);
    },200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
