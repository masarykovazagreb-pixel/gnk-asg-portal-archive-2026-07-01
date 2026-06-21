(() => {
  if (window.GNKOperatorToken) return;

  const SESSION_KEY = 'GNK_ASG_OPERATOR_TOKEN_SESSION';
  const LEGACY_KEYS = ['GNK_ASG_OPERATOR_TOKEN'];

  function migrateLegacyToken() {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    for (const key of LEGACY_KEYS) {
      const value = String(localStorage.getItem(key) || '').trim();
      if (!value) continue;
      sessionStorage.setItem(SESSION_KEY, value);
      localStorage.removeItem(key);
      break;
    }
  }

  function get() {
    return String(sessionStorage.getItem(SESSION_KEY) || '').trim();
  }

  function set(value) {
    const token = String(value || '').trim();
    if (!token) return clear();
    sessionStorage.setItem(SESSION_KEY, token);
    LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
    window.dispatchEvent(new CustomEvent('gnk:operator-token-changed', {
      detail: { present: true }
    }));
    return true;
  }

  function clear() {
    sessionStorage.removeItem(SESSION_KEY);
    LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
    window.dispatchEvent(new CustomEvent('gnk:operator-token-changed', {
      detail: { present: false }
    }));
    return false;
  }

  function headers() {
    const token = get();
    return token ? {
      authorization: `Bearer ${token}`,
      'x-operator-token': token,
      'x-admin-token': token,
      'x-gnk-asg-token': token
    } : {};
  }

  function installSecureGate() {
    const path = location.pathname.toLowerCase();
    const protectedPath = /\/(operator-dashboard|operator-mobile|mail-studio|mail-studio-pro|pdf-publisher|admin)\//.test(path);
    if (!protectedPath) return;
    if (![...document.styleSheets].some(sheet => String(sheet.href || '').includes('approved-ui-layout-20260621.css'))) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/assets/approved-ui-layout-20260621.css?v=20260621-mailfix';
      document.head.appendChild(link);
    }
    if (![...document.scripts].some(script => String(script.src || '').includes('admin-secure-gate.js'))) {
      const script = document.createElement('script');
      script.src = '/assets/admin-secure-gate.js?v=20260621-mailfix';
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  migrateLegacyToken();
  window.GNKOperatorToken = Object.freeze({ get, set, clear, headers });
  installSecureGate();
})();
