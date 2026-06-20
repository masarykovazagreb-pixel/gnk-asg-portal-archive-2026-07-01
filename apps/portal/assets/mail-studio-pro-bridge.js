(() => {
  if (window.__GNK_ASG_MAIL_STUDIO_BRIDGE__) return;
  window.__GNK_ASG_MAIL_STUDIO_BRIDGE__ = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = function(input, init = {}) {
    const url = typeof input === 'string' ? input : String(input?.url || '');
    if (url === '/api/admin-mail-send' || url.startsWith('/api/admin-mail-send?')) {
      const target = url.replace('/api/admin-mail-send', '/api/mail-agent/send');
      return originalFetch(target, init);
    }
    return originalFetch(input, init);
  };
})();
