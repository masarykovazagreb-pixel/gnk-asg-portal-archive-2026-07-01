(() => {
  if (window.__GNK_ASG_MAIL_STUDIO_AUTH_FIX_V1__) return;
  window.__GNK_ASG_MAIL_STUDIO_AUTH_FIX_V1__ = true;

  const originalFetch = window.fetch.bind(window);
  const protectedPaths = new Set([
    '/api/admin-mail-send',
    '/api/operator-send-mail',
    '/api/mail-agent/send'
  ]);

  function readToken() {
    return String(
      document.getElementById('operatorToken')?.value ||
      window.GNKOperatorToken?.get?.() ||
      sessionStorage.getItem('GNK_ASG_OPERATOR_TOKEN_SESSION') ||
      localStorage.getItem('GNK_ASG_OPERATOR_TOKEN') ||
      ''
    ).trim();
  }

  function saveFieldToken() {
    const value = String(document.getElementById('operatorToken')?.value || '').trim();
    if (!value) return;
    sessionStorage.setItem('GNK_ASG_OPERATOR_TOKEN_SESSION', value);
    window.GNKOperatorToken?.set?.(value);
  }

  function installSaveHook() {
    document.getElementById('saveToken')?.addEventListener('click', saveFieldToken, true);
  }

  window.fetch = function(input, init = {}) {
    const rawUrl = typeof input === 'string' ? input : String(input?.url || '');
    let parsed;

    try {
      parsed = new URL(rawUrl, window.location.origin);
    } catch {
      return originalFetch(input, init);
    }

    const method = String(init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (method !== 'POST' || !protectedPaths.has(parsed.pathname)) {
      return originalFetch(input, init);
    }

    parsed.pathname = '/api/mail-agent/send';
    const token = readToken();
    const headers = new Headers(
      init.headers ||
      (input instanceof Request ? input.headers : undefined) ||
      {}
    );

    if (token) {
      headers.set('authorization', `Bearer ${token}`);
      headers.set('x-operator-token', token);
    }

    const target = parsed.origin === window.location.origin
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : parsed.toString();

    const requestInit = {
      ...init,
      method: 'POST',
      headers,
      credentials: 'same-origin',
      cache: 'no-store'
    };

    console.info('[GNK ASG Mail Studio auth-fix]', {
      target,
      tokenPresent: Boolean(token),
      tokenLength: token.length
    });

    return originalFetch(target, requestInit);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installSaveHook, { once: true });
  } else {
    installSaveHook();
  }
})();
