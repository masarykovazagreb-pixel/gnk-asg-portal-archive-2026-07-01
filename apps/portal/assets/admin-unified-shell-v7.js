(() => {
  'use strict';
  if (window.__GNK_ASG_ADMIN_UNIFIED_SHELL_V9__) return;
  window.__GNK_ASG_ADMIN_UNIFIED_SHELL_V9__ = true;
  window.__GNK_ASG_ADMIN_UNIFIED_SHELL_V8__ = true;
  window.__GNK_ASG_ADMIN_UNIFIED_SHELL_V7__ = true;

  const path = location.pathname.replace(/\/+$/, '') || '/';
  const privateRoutes = [
    '/admin-center','/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro',
    '/auto-editor','/news-admin','/pdf-publisher','/social-share','/wa-center','/review'
  ];
  if (!privateRoutes.some(route => path === route || path.startsWith(`${route}/`))) return;

  const isLoginDocument = () => {
    const title = String(document.title || '').toLocaleLowerCase('hr');
    const tokenForm = document.querySelector('main.card form input[name="token"], form[action*="admin-center"] input[name="token"]');
    const explicitLogin = document.body?.classList.contains('gnk-auth-login-page') || document.documentElement.dataset.gnkAuthLogin === '1';
    return explicitLogin || title.includes('sigurna prijava') || Boolean(tokenForm && !document.getElementById('app'));
  };

  const removeShellFromLogin = () => {
    document.getElementById('gnk-backend-shell')?.remove();
    document.getElementById('gnk-admin-module-launcher-v7')?.remove();
    document.getElementById('gnk-admin-lock-notice-v7')?.remove();
    document.body?.classList.remove('gnk-backend-ui','gnk-admin-unified-v7','gnk-admin-shared-auth');
  };

  if (isLoginDocument()) {
    removeShellFromLogin();
    document.documentElement.dataset.gnkAdminShellSuppressed = 'LOGIN_DOCUMENT';
    return;
  }

  const items = [
    ['Admin','/admin-center/','⚙','Glavni sigurni ulaz'],
    ['Operator','/operator-dashboard/','▣','Status, inbox i postavke'],
    ['Mail Studio','/mail-studio/','✉','Poruke, potpisi i pretinci'],
    ['Auto Editor','/auto-editor/','✎','Objave i automatizacija'],
    ['News Admin','/news-admin/','◫','Upravljanje vijestima'],
    ['PDF Publisher','/pdf-publisher/','▤','PDF dokumenti i objava'],
    ['Social Share','/social-share/','↗','Dijeljenje sadržaja'],
    ['WhatsApp','/wa-center/','◉','WhatsApp centar'],
    ['Mobilni Admin','/operator-mobile/','▯','Mobilni operatorski sloj'],
    ['Portal','/','⌂','Povratak na javni portal']
  ];

  const cleanPath = href => {
    try { return new URL(href,location.origin).pathname.replace(/\/+$/,'') || '/'; }
    catch { return href; }
  };
  const active = href => {
    const target = cleanPath(href);
    return target === '/' ? path === '/' : path === target || path.startsWith(`${target}/`);
  };
  const links = () => items.map(([label,href,icon,description]) =>
    `<a href="${href}" class="${active(href)?'active':''}" title="${description}"><i aria-hidden="true">${icon}</i>${label}</a>`
  ).join('');

  const launcherMarkup = () => `
    <div class="gnk-admin-launcher-head">
      <div><strong>Administrativni moduli</strong><span>Jedinstveni pristup svim privatnim alatima</span></div>
      <span class="gnk-admin-launcher-state"><i></i> Privatni sloj</span>
    </div>
    <div class="gnk-admin-launcher-grid">
      ${items.filter(([,href]) => !['/','/admin-center/','/operator-dashboard/'].includes(href)).map(([label,href,icon,description]) =>
        `<a href="${href}"><i aria-hidden="true">${icon}</i><span><strong>${label}</strong><small>${description}</small></span></a>`
      ).join('')}
    </div>`;

  const setMarkupIfChanged = (element, markup) => {
    if (!element || element.innerHTML === markup) return false;
    element.innerHTML = markup;
    return true;
  };

  const removeLegacyEmbed = () => {
    document.getElementById('gnkMailStudioEmbedDashboard')?.remove();
    document.querySelectorAll('iframe[src^="/mail-studio/"]').forEach(frame => {
      if (path === '/operator-dashboard') frame.closest('section')?.remove();
    });
  };

  const createShell = () => {
    const shell = document.createElement('header');
    shell.id = 'gnk-backend-shell';
    shell.className = 'gnk-admin-shell-lite';
    shell.innerHTML = `
      <div class="gnk-shell-wrap">
        <div class="gnk-shell-top">
          <a class="gnk-shell-brand" href="/admin-center/" aria-label="GNK ASG Admin Center">
            <span class="gnk-admin-lite-logo" aria-hidden="true"><i></i><i></i><i></i></span>
            <span><strong>GNK ASG Admin</strong><span>Secure Operations Layer</span></span>
          </a>
          <nav class="gnk-shell-nav" aria-label="GNK ASG administratorska navigacija">${links()}</nav>
        </div>
      </div>`;
    document.body.prepend(shell);
    return shell;
  };

  const ensureShell = () => {
    if (isLoginDocument()) {
      removeShellFromLogin();
      return null;
    }
    let shell = document.getElementById('gnk-backend-shell');
    if (!shell) shell = createShell();
    const nav = shell.querySelector('.gnk-shell-nav');
    setMarkupIfChanged(nav,links());
    shell.dataset.adminShellVersion = '9';
    document.body.classList.add('gnk-backend-ui','gnk-admin-unified-v7',`gnk-admin-route-${path.replace(/^\//,'').replace(/\//g,'-')||'admin'}`);
    if (shell.querySelector('.gnk-shell-auth')) document.body.classList.add('gnk-admin-shared-auth');
    return shell;
  };

  const ensureLauncher = shell => {
    if (!shell || !['/operator-dashboard','/admin-center'].includes(path)) return;
    let launcher = document.getElementById('gnk-admin-module-launcher-v7');
    if (!launcher) {
      launcher = document.createElement('section');
      launcher.id = 'gnk-admin-module-launcher-v7';
      shell.insertAdjacentElement('afterend',launcher);
    }
    setMarkupIfChanged(launcher,launcherMarkup());
  };

  const ensureLockNotice = shell => {
    if (!shell || path !== '/operator-dashboard') return;
    let notice = document.getElementById('gnk-admin-lock-notice-v7');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'gnk-admin-lock-notice-v7';
      notice.innerHTML = '<strong>Operator Dashboard je zaključan</strong><span>Prijavite se operatorskim tokenom u gornjoj traci. Mail Studio i ostali privatni moduli dostupni su kroz zajednički Admin izbornik.</span>';
      const header = document.querySelector('body > header:not(#gnk-backend-shell)');
      (header || shell).insertAdjacentElement('afterend',notice);
    }
  };

  const activateDashboardTab = (id,button) => {
    const app = document.getElementById('app');
    const target = document.getElementById(id);
    if (!app || !target || !app.contains(target)) return false;
    app.querySelectorAll('section').forEach(section => section.classList.remove('active'));
    const sideNav = app.querySelector(':scope > nav');
    sideNav?.querySelectorAll('button').forEach(item => item.classList.remove('active'));
    target.classList.add('active');
    button?.classList.add('active');
    target.scrollIntoView({block:'nearest'});
    return true;
  };

  const bindDashboardTabs = () => {
    const app = document.getElementById('app');
    const sideNav = app?.querySelector(':scope > nav');
    if (!sideNav || sideNav.dataset.gnkStableTabs === '1') return;
    sideNav.dataset.gnkStableTabs = '1';
    sideNav.addEventListener('click',event => {
      const button = event.target.closest('button');
      if (!button || !sideNav.contains(button)) return;
      const handler = button.getAttribute('onclick') || '';
      const match = handler.match(/tab\(['"]([^'"]+)['"]/i);
      if (!match) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      activateDashboardTab(match[1],button);
    },true);
    window.gnkActivateAdminTab = activateDashboardTab;
  };

  let applying = false;
  const apply = () => {
    if (applying) return;
    applying = true;
    try {
      if (isLoginDocument()) {
        removeShellFromLogin();
        return;
      }
      removeLegacyEmbed();
      const shell = ensureShell();
      if (!shell) return;
      ensureLauncher(shell);
      ensureLockNotice(shell);
      bindDashboardTabs();
      const authenticated = document.body.classList.contains('gnk-admin-authenticated') || !document.getElementById('app')?.classList.contains('hidden');
      document.getElementById('gnk-admin-lock-notice-v7')?.classList.toggle('hidden',authenticated);
    } finally {
      applying = false;
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',apply,{once:true}); else apply();
  window.addEventListener('load',apply,{once:true});
  [100,350,900,1800].forEach(delay => setTimeout(apply,delay));

  let queued = false;
  new MutationObserver(records => {
    if (applying || queued) return;
    const relevant = records.some(record => {
      const target = record.target instanceof Element ? record.target : record.target?.parentElement;
      if (!target) return true;
      return !target.closest('#gnk-backend-shell,#gnk-admin-module-launcher-v7,#gnk-admin-lock-notice-v7');
    });
    if (!relevant) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
