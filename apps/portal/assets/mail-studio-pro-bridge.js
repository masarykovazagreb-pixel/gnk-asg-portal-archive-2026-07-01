(() => {
  if (window.__GNK_ASG_MAIL_STUDIO_BRIDGE_V2__) return;
  window.__GNK_ASG_MAIL_STUDIO_BRIDGE_V2__ = true;

  const originalFetch = window.fetch.bind(window);

  function activeToken() {
    const fieldValue = String(document.getElementById('operatorToken')?.value || '').trim();
    const vaultValue = String(window.GNKOperatorToken?.get?.() || '').trim();
    const sessionValue = String(sessionStorage.getItem('GNK_ASG_OPERATOR_TOKEN_SESSION') || '').trim();
    return fieldValue || vaultValue || sessionValue;
  }

  function resolveTarget(rawUrl) {
    try {
      const parsed = new URL(rawUrl, window.location.origin);
      if (
        parsed.pathname === '/api/admin-mail-send' ||
        parsed.pathname === '/api/operator-send-mail'
      ) {
        parsed.pathname = '/api/mail-agent/send';
        return parsed.origin === window.location.origin
          ? `${parsed.pathname}${parsed.search}${parsed.hash}`
          : parsed.toString();
      }
    } catch {}
    return rawUrl;
  }

  window.fetch = function(input, init = {}) {
    const rawUrl = typeof input === 'string'
      ? input
      : String(input?.url || '');
    const target = resolveTarget(rawUrl);
    const headers = new Headers(
      init.headers ||
      (typeof input !== 'string' && input?.headers ? input.headers : undefined) ||
      {}
    );
    const token = activeToken();

    let targetPath = '';
    try {
      targetPath = new URL(target, window.location.origin).pathname;
    } catch {}

    if (token && targetPath.startsWith('/api/mail-agent/')) {
      headers.set('authorization', `Bearer ${token}`);
      headers.set('x-operator-token', token);
    }

    if (typeof input !== 'string' && input instanceof Request) {
      const request = new Request(target, input);
      return originalFetch(request, {
        ...init,
        headers,
        credentials: 'same-origin',
        cache: 'no-store'
      });
    }

    return originalFetch(target, {
      ...init,
      headers,
      credentials: 'same-origin',
      cache: 'no-store'
    });
  };
})();
