(() => {
  if (window.__GNK_ASG_MAIL_STUDIO_BRIDGE__) return;
  window.__GNK_ASG_MAIL_STUDIO_BRIDGE__ = true;

  const originalFetch = window.fetch.bind(window);

  function activeToken() {
    const fieldValue = String(document.getElementById('operatorToken')?.value || '').trim();
    const vaultValue = String(window.GNKOperatorToken?.get?.() || '').trim();
    const sessionValue = String(sessionStorage.getItem('GNK_ASG_OPERATOR_TOKEN_SESSION') || '').trim();
    return fieldValue || vaultValue || sessionValue;
  }

  window.fetch = function(input, init = {}) {
    const rawUrl = typeof input === 'string'
      ? input
      : String(input?.url || '');

    let target = rawUrl;

    if (
      rawUrl === '/api/admin-mail-send' ||
      rawUrl.startsWith('/api/admin-mail-send?')
    ) {
      target = rawUrl.replace('/api/admin-mail-send', '/api/mail-agent/send');
    } else if (
      rawUrl === '/api/operator-send-mail' ||
      rawUrl.startsWith('/api/operator-send-mail?')
    ) {
      target = rawUrl.replace('/api/operator-send-mail', '/api/mail-agent/send');
    }

    const headers = new Headers(init.headers || {});
    const token = activeToken();

    if (token && target.startsWith('/api/mail-agent/')) {
      headers.set('authorization', `Bearer ${token}`);
      headers.set('x-operator-token', token);
    }

    return originalFetch(
      target === rawUrl ? input : target,
      {
        ...init,
        headers,
        credentials: 'same-origin',
        cache: 'no-store'
      }
    );
  };
})();
