(() => {
  'use strict';
  if (window.__GNK_ASG_ADMIN_SESSION_FALLBACK_V19__) return;
  window.__GNK_ASG_ADMIN_SESSION_FALLBACK_V19__ = true;
  window.__GNK_ASG_ADMIN_SESSION_FALLBACK_V18__ = true;
  window.__GNK_ASG_ADMIN_SESSION_FALLBACK_V17__ = true;

  const VERSION = 'GNK_ASG_ADMIN_SESSION_FALLBACK_V19_20260626_COOKIE_ONLY_HEALTH';
  const STORAGE_KEYS = [
    'gnk_asg_operator_token_session',
    'gnk_asg_mail_studio_token',
    'gnk-operator-token',
    'GNK_ASG_OPERATOR_TOKEN'
  ];

  const purgeLegacyTokens = () => {
    try {
      for (const key of STORAGE_KEYS) {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      }
    } catch (_) {}
  };

  const setStatus = (text, ok) => {
    const box = document.getElementById('gnkAdminAuthStatus');
    const label = box?.querySelector('span');
    if (label) label.textContent = text;
    box?.classList.toggle('ok', Boolean(ok));
  };

  const loadAdminHealth = () => {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    if (path !== '/admin-center' || document.querySelector('script[src*="admin-center-health-v1.js"]')) return;
    const script = document.createElement('script');
    script.src = '/assets/admin-center-health-v1.js?v=20260626-1';
    script.defer = true;
    document.head.appendChild(script);
  };

  const unlock = async () => {
    purgeLegacyTokens();
    const input = document.getElementById('gnkAdminToken');
    if (input) input.value = '';
    document.getElementById('login')?.classList.add('hidden');
    document.getElementById('app')?.classList.remove('hidden');
    document.body.classList.add('gnk-admin-authenticated');
    try { await window.init?.(); } catch (_) {}
  };

  const check = async token => {
    const headers = { accept:'application/json', 'cache-control':'no-cache' };
    if (token) headers.authorization = `Bearer ${token}`;
    try {
      return await fetch(`/api/operator-auth-check?ui=${Date.now()}`, {
        credentials:'same-origin',
        cache:'no-store',
        headers
      });
    } catch (_) {
      return null;
    }
  };

  const login = async event => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const input = document.getElementById('gnkAdminToken');
    const token = String(input?.value || '').trim();
    if (!token) {
      const session = await check('');
      if (session?.ok) {
        setStatus('Sigurna HttpOnly sesija je aktivna', true);
        await unlock();
      } else {
        setStatus('Unesite operatorski token', false);
        input?.focus();
      }
      return;
    }

    setStatus('Provjera pristupa…', false);
    const direct = await check(token);
    if (direct?.ok) {
      setStatus('Prijava potvrđena · token je uklonjen iz preglednika', true);
      await unlock();
      return;
    }

    purgeLegacyTokens();
    setStatus('Token nije prihvaćen', false);
  };

  const boot = async () => {
    purgeLegacyTokens();
    loadAdminHealth();
    const button = document.getElementById('gnkAdminLogin');
    if (button && !button.dataset.gnkSessionFallbackV19) {
      button.dataset.gnkSessionFallbackV19 = '1';
      button.addEventListener('click', login, true);
    }

    const session = await check('');
    if (session?.ok) {
      setStatus('Sigurna HttpOnly sesija je aktivna', true);
      await unlock();
    }

    document.documentElement.dataset.gnkAdminSessionFallback = VERSION;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }
})();
