(() => {
  if (window.__GNK_ASG_MAIL_STUDIO_BRIDGE__) return;
  window.__GNK_ASG_MAIL_STUDIO_BRIDGE__ = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = function(input, init = {}) {
    const rawUrl = typeof input === 'string'
      ? input
      : String(input?.url || '');

    let target = rawUrl;

    if (
      rawUrl === '/api/admin-mail-send' ||
      rawUrl.startsWith('/api/admin-mail-send?')
    ) {
      target = rawUrl.replace(
        '/api/admin-mail-send',
        '/api/mail-agent/send'
      );
    } else if (
      rawUrl === '/api/operator-send-mail' ||
      rawUrl.startsWith('/api/operator-send-mail?')
    ) {
      target = rawUrl.replace(
        '/api/operator-send-mail',
        '/api/mail-agent/send'
      );
    }

    return originalFetch(
      target === rawUrl ? input : target,
      {
        ...init,
        cache: 'no-store'
      }
    );
  };
})();