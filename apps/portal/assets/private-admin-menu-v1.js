(() => {
  'use strict';
  if (window.__GNK_PRIVATE_ADMIN_MENU_V1__) return;
  window.__GNK_PRIVATE_ADMIN_MENU_V1__ = true;

  const allowed = ['/admin-center','/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/news-admin','/pdf-publisher','/social-share','/wa-center','/review'];
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (!allowed.some(prefix => path === prefix || path.startsWith(prefix + '/'))) return;

  const links = [
    ['Portal','/'],['Auto Editor','/auto-editor/'],['Mail Studio','/mail-studio/'],['Admin','/admin-center/'],['Mobilni Admin','/operator-mobile/'],['Objave','/objave/'],['Vijesti','/vijesti/'],['PDF / Media','/downloads/'],['Visual Index','/visual-index/'],['Kontakt','/contact/'],['Aplikacija','/app/']
  ];

  const mount = () => {
    if (document.getElementById('gnk-private-admin-menu')) return;
    document.getElementById('gnk-backend-shell')?.remove();
    const header = document.createElement('header');
    header.id = 'gnk-private-admin-menu';
    const items = links.map(([label, href]) => {
      const target = href.replace(/\/+$/, '') || '/';
      const active = path === target || (target !== '/' && path.startsWith(target + '/'));
      return `<a href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a>`;
    }).join('');
    header.innerHTML = `<div class="gnk-private-menu-top"><strong>GNK ASG · PRIVATNI ADMIN</strong><span>Sustav aktivan</span></div><nav class="gnk-private-menu-desktop" aria-label="Privatni administrativni izbornik">${items}</nav><details class="gnk-private-menu-mobile"><summary>IZBORNIK</summary><div>${items}</div></details>`;
    document.body.insertBefore(header, document.body.firstChild);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once:true });
  else mount();
})();