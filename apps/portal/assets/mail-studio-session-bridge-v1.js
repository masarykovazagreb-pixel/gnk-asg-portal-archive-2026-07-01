(() => {
  'use strict';
  if (window.__GNK_ASG_MAIL_SESSION_BRIDGE_V1__) return;
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (path !== '/mail-studio' && path !== '/mail-studio-pro') return;
  window.__GNK_ASG_MAIL_SESSION_BRIDGE_V1__ = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const raw = typeof input === 'string' ? input : input?.url || '';
    if (!raw.includes('/api/admin-mail-send')) return originalFetch(input, init);
    const target = new URL('/api/operator-send-mail', location.origin).toString();
    return originalFetch(target, { ...(init || {}), credentials:'same-origin' });
  };
})();