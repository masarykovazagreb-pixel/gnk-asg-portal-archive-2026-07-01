(() => {
  'use strict';
  if (window.__GNK_ASG_ADMIN_SESSION_FALLBACK_V17__) return;
  window.__GNK_ASG_ADMIN_SESSION_FALLBACK_V17__ = true;

  const VERSION = 'GNK_ASG_ADMIN_SESSION_FALLBACK_V17_20260626';
  const STORAGE_KEYS = [
    'gnk_asg_operator_token_session',
    'gnk_asg_mail_studio_token',
    'gnk-operator-token'
  ];

  const setStatus = (text, ok) => {
    const box = document.getElementById('gnkAdminAuthStatus');
    const label = box?.querySelector('span');
    if (label) label.textContent = text;
    box?.classList.toggle('ok', Boolean(ok));
  };

  const unlock = async token => {
    try {
      if (token) STORAGE_KEYS.forEach(key => sessionStorage.setItem(key, token));
      localStorage.removeItem('GNK_ASG_OPERATOR_TOKEN');
    } catch (_) {}
    document.getElementById('login')?.classList.add('hidden');
    document.getElementById('app')?.classList.remove('hidden');
    document.body.classList.add('gnk-admin-authenticated');
    try { await window.init?.(); } catch (_) {}
  };

  const check = async token => {
    const headers = { accept:'application/json', 'cache-control':'no-cache' };
    if (token) {
      headers.authorization = `Bearer ${token}`;
      headers['x-operator-token'] = token;
    }
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
        setStatus('Sigurna sesija je aktivna', true);
        await unlock('');
      } else {
        setStatus('Unesite operatorski token', false);
        input?.focus();
      }
      return;
    }

    setStatus('Provjera pristupa…', false);
    const direct = await check(token);
    if (direct?.ok) {
      setStatus('Prijava potvrđena', true);
      await unlock(token);
      return;
    }

    const session = await check('');
    if (session?.ok) {
      setStatus('Sigurna sesija je aktivna', true);
      await unlock('');
      return;
    }

    setStatus('Token nije prihvaćen', false);
  };

  const boot = async () => {
    const button = document.getElementById('gnkAdminLogin');
    if (button && !button.dataset.gnkSessionFallbackV17) {
      button.dataset.gnkSessionFallbackV17 = '1';
      button.addEventListener('click', login, true);
    }

    const session = await check('');
    if (session?.ok) {
      setStatus('Sigurna sesija je aktivna', true);
      await unlock('');
    }

    document.documentElement.dataset.gnkAdminSessionFallback = VERSION;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }
})();
