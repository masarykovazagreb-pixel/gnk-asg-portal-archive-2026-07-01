(() => {
  'use strict';
  if (window.__GNK_ASG_ADMIN_AUTH_CONTROLS_V1__) return;
  window.__GNK_ASG_ADMIN_AUTH_CONTROLS_V1__ = true;

  const privatePaths = [
    '/admin-center',
    '/operator-dashboard',
    '/operator-mobile',
    '/mail-studio',
    '/mail-studio-pro',
    '/news-admin',
    '/pdf-publisher',
    '/social-share',
    '/wa-center',
    '/review'
  ];
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (!privatePaths.some(prefix => path === prefix || path.startsWith(prefix + '/'))) return;

  const mount = () => {
    if (document.getElementById('gnk-admin-auth-controls')) return;
    const bar = document.createElement('section');
    bar.id = 'gnk-admin-auth-controls';
    bar.innerHTML = `
      <div class="gnk-auth-copy">
        <strong>Sigurnosni pristup</strong>
        <span>Sesija je aktivna. Token se ne sprema u preglednik.</span>
      </div>
      <form method="post" action="${location.pathname}" autocomplete="off">
        <input type="hidden" name="next" value="${location.pathname}">
        <label>Operatorski token<input name="token" type="password" required autocomplete="current-password" placeholder="Unesite token"></label>
        <button type="submit" class="gnk-auth-login">Prijava / obnovi sesiju</button>
      </form>
      <form method="post" action="/operator/session/logout">
        <button type="submit" class="gnk-auth-logout">Odjava</button>
      </form>`;
    const shell = document.getElementById('gnk-backend-shell');
    if (shell && shell.nextSibling) shell.parentNode.insertBefore(bar, shell.nextSibling);
    else document.body.insertBefore(bar, document.body.firstChild);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();