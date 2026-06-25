(() => {
  'use strict';
  if (window.__GNK_ASG_MAIL_STUDIO_AUTH_BRIDGE_V15__) return;
  window.__GNK_ASG_MAIL_STUDIO_AUTH_BRIDGE_V15__ = true;

  const VERSION = 'GNK_ASG_MAIL_STUDIO_AUTH_BRIDGE_V15_20260626';
  const protectedPath = path =>
    path.startsWith('/api/admin-') ||
    path.startsWith('/api/operator-') ||
    path.startsWith('/api/mail-center/') ||
    path.startsWith('/operator/') ||
    path === '/api/ai-assist' ||
    path === '/api/media-upload' ||
    path === '/api/admin-asset-list' ||
    path === '/api/publish-queue';

  const readToken = () => {
    try {
      const central = window.GNK_ASG_ADMIN_AUTH?.read?.();
      if (central) return String(central).trim();
      return String(
        sessionStorage.getItem('gnk_asg_operator_token_session') ||
        sessionStorage.getItem('gnk_asg_mail_studio_token') ||
        sessionStorage.getItem('gnk-operator-token') ||
        localStorage.getItem('GNK_ASG_OPERATOR_TOKEN') ||
        ''
      ).trim();
    } catch (_) {
      return '';
    }
  };

  const invalidAuthorization = value => {
    const normalized = String(value || '').trim().toLowerCase();
    return !normalized || normalized === 'bearer' || normalized === 'bearer undefined' || normalized === 'bearer null';
  };

  const status = message => {
    const node = document.getElementById('status');
    if (node) node.textContent = message;
  };

  const previousFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    let url;
    try {
      url = new URL(typeof input === 'string' ? input : input.url, location.origin);
    } catch (_) {
      return previousFetch(input, init);
    }

    if (url.origin !== location.origin || !protectedPath(url.pathname)) {
      return previousFetch(input, init);
    }

    const next = { ...init, credentials: 'same-origin', cache: init.cache || 'no-store' };
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined) || {});
    const currentAuthorization = headers.get('authorization');

    if (invalidAuthorization(currentAuthorization)) headers.delete('authorization');
    if (invalidAuthorization(headers.get('x-operator-token'))) headers.delete('x-operator-token');

    const token = readToken();
    if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
    if (token && !headers.has('x-operator-token')) headers.set('x-operator-token', token);

    headers.set('x-gnk-asg-ui-bridge', VERSION);
    next.headers = headers;

    const response = await previousFetch(input, next);
    if (response.status === 401) {
      status('Sesija nije prihvaćena. Kliknite Prijava i ponovno unesite operatorski token.');
    }
    return response;
  };

  const installButtonGuard = () => {
    const ids = ['send','save','load','helper','autoReply','clear','aiPersonalReply','aiPersonalImprove','aiPersonalLegal','aiPersonalShort'];
    for (const id of ids) {
      const button = document.getElementById(id);
      if (!button) continue;
      button.disabled = false;
      button.style.pointerEvents = 'auto';
      button.style.cursor = 'pointer';
      if (!button.dataset.gnkBridgeStatus) {
        button.dataset.gnkBridgeStatus = '1';
        button.addEventListener('click', () => {
          if (id === 'send') status('Obrada zahtjeva za slanje…');
        }, true);
      }
    }
    document.querySelectorAll('button.tab[data-box]').forEach(button => {
      button.disabled = false;
      button.style.pointerEvents = 'auto';
      button.style.cursor = 'pointer';
    });
  };

  const verifySession = async () => {
    try {
      const response = await window.fetch(`/api/operator-auth-check?cb=${Date.now()}`, {
        headers: { accept: 'application/json', 'cache-control': 'no-cache' }
      });
      if (response.ok) status('Mail Studio spreman · sigurna sesija potvrđena.');
      else status('Mail Studio je otvoren, ali prijava nije potvrđena.');
    } catch (error) {
      status(`Provjera sesije nije uspjela: ${error.message}`);
    }
  };

  const boot = () => {
    installButtonGuard();
    verifySession();
    const observer = new MutationObserver(installButtonGuard);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(installButtonGuard, 300);
    setTimeout(installButtonGuard, 1000);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
