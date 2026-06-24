(() => {
  'use strict';
  if (window.__GNK_ASG_BACKEND_SHELL_V6__) return;
  window.__GNK_ASG_BACKEND_SHELL_V6__ = true;

  const path = location.pathname.replace(/\/+$/, '') || '/';
  const protectedRoute = /^(\/admin-center|\/operator-dashboard|\/operator-mobile|\/mail-studio|\/mail-studio-pro|\/auto-editor)(\/|$)/.test(path);
  if (!protectedRoute) return;

  const KEY = 'gnk_asg_operator_token_session';
  const LEGACY_KEYS = ['gnk_asg_mail_studio_token','gnk-operator-token'];
  const cssId = 'gnk-backend-grid-alignment-v4';
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId;
    link.rel = 'stylesheet';
    link.href = '/assets/backend-grid-alignment-v4.css?v=20260624-grid-4';
    document.head.appendChild(link);
  }

  const readToken = () => {
    try {
      const direct = sessionStorage.getItem(KEY) || '';
      if (direct) return direct;
      for (const legacy of LEGACY_KEYS) {
        const value = sessionStorage.getItem(legacy) || '';
        if (value) return value;
      }
    } catch (_) {}
    return '';
  };

  const writeToken = value => {
    const token = String(value || '').trim();
    try {
      if (token) {
        sessionStorage.setItem(KEY, token);
        LEGACY_KEYS.forEach(key => sessionStorage.setItem(key, token));
      } else {
        sessionStorage.removeItem(KEY);
        LEGACY_KEYS.forEach(key => sessionStorage.removeItem(key));
      }
      localStorage.removeItem('GNK_ASG_OPERATOR_TOKEN');
    } catch (_) {}
  };

  const authHeaders = token => token ? {
    authorization: `Bearer ${token}`,
    'x-operator-token': token
  } : {};

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const raw = typeof input === 'string' ? input : (input && input.url) || '';
    let target;
    try { target = new URL(raw, location.origin); } catch (_) { return nativeFetch(input, init); }
    const guarded = target.pathname.startsWith('/api/operator-') ||
      target.pathname.startsWith('/operator/') ||
      target.pathname.startsWith('/api/admin-mail-send') ||
      target.pathname.startsWith('/api/mail-center/');
    if (!guarded) return nativeFetch(input, init);
    const token = readToken();
    const headers = new Headers(init.headers || (typeof input !== 'string' && input ? input.headers : undefined) || {});
    if (token && !headers.has('authorization')) {
      headers.set('authorization', `Bearer ${token}`);
      headers.set('x-operator-token', token);
    }
    return nativeFetch(input, { ...init, headers, credentials:'same-origin' });
  };

  window.GNK_ASG_ADMIN_AUTH = {
    read: readToken,
    clear: () => writeToken(''),
    headers: () => authHeaders(readToken())
  };

  document.body.classList.add('gnk-backend-ui');

  const unlockLocalUi = async token => {
    const dashboardInput = document.getElementById('tokenInput');
    if (dashboardInput && token) dashboardInput.value = token;
    const editorInput = document.getElementById('token');
    if (editorInput && token) editorInput.value = token;
    document.getElementById('login')?.classList.add('hidden');
    document.getElementById('app')?.classList.remove('hidden');
    document.body.classList.add('gnk-admin-authenticated');
    try { await window.init?.(); } catch (_) {}
  };

  const lockLocalUi = () => {
    document.body.classList.remove('gnk-admin-authenticated');
    document.getElementById('app')?.classList.add('hidden');
  };

  const verifyToken = async token => {
    if (!token) return false;
    const urls = [
      '/api/operator-auth-check?cb=' + Date.now(),
      '/api/operator-signature-load?mailbox=info&cb=' + Date.now()
    ];
    for (const url of urls) {
      try {
        const response = await nativeFetch(url, {
          headers:{ ...authHeaders(token), 'cache-control':'no-cache' },
          credentials:'same-origin',
          cache:'no-store'
        });
        if (response.ok) return true;
      } catch (_) {}
    }
    return false;
  };

  const checkCookieSession = async () => {
    try {
      const response = await nativeFetch('/api/operator-auth-check?cb=' + Date.now(), {
        credentials:'same-origin',
        cache:'no-store',
        headers:{'cache-control':'no-cache'}
      });
      return response.ok;
    } catch (_) { return false; }
  };

  const inFrame = window.self !== window.top;
  if (inFrame) {
    document.body.classList.add('gnk-backend-embedded');
    const existing = readToken();
    if (existing) verifyToken(existing).then(ok => { if (ok) unlockLocalUi(existing); });
    else checkCookieSession().then(ok => { if (ok) unlockLocalUi(''); });
    return;
  }

  document.getElementById('gnk-backend-shell')?.remove();

  const items = [
    { label:'Admin', href:'/admin-center/', icon:'⚙' },
    { label:'Operator', href:'/operator-dashboard/', icon:'▣' },
    { label:'Mail', href:'/mail-studio/', icon:'✉' },
    { label:'Auto Editor', href:'/auto-editor/', icon:'✎' },
    { label:'Mobilni Admin', href:'/operator-mobile/', icon:'▯' },
    { label:'Portal', href:'/', icon:'⌂' }
  ];

  const routePath = href => {
    try { return new URL(href,location.origin).pathname.replace(/\/+$/,'') || '/'; }
    catch (_) { return href; }
  };
  const active = href => {
    const target = routePath(href);
    if (target === '/') return path === '/';
    return path === target || path.startsWith(target + '/');
  };

  const shell = document.createElement('header');
  shell.id = 'gnk-backend-shell';
  shell.innerHTML = `
    <div class="gnk-shell-wrap">
      <div class="gnk-shell-top">
        <a class="gnk-shell-brand" href="/admin-center/" aria-label="GNK ASG Admin Center">
          <svg class="gnk-shell-logo" viewBox="0 0 100 100" aria-hidden="true">
            <defs><linearGradient id="gnkShellGold" x1="0" x2="1"><stop stop-color="#a87516"/><stop offset=".5" stop-color="#ffe092"/><stop offset="1" stop-color="#b77d13"/></linearGradient></defs>
            <circle cx="50" cy="50" r="41" fill="none" stroke="url(#gnkShellGold)" stroke-width="5"/>
            <path d="M20 42Q50 10 82 34M17 58Q48 28 84 55M25 73Q52 48 80 73" fill="none" stroke="url(#gnkShellGold)" stroke-width="2"/>
            <rect x="30" y="58" width="9" height="20" fill="url(#gnkShellGold)"/><rect x="46" y="47" width="9" height="31" fill="url(#gnkShellGold)"/><rect x="62" y="34" width="9" height="44" fill="url(#gnkShellGold)"/>
          </svg>
          <span><strong>GNK ASG Admin</strong><span>Secure Operations Layer</span></span>
        </a>
        <nav class="gnk-shell-nav" aria-label="GNK ASG administratorska navigacija">
          ${items.map(item => `<a href="${item.href}" class="${active(item.href)?'active':''}"><i aria-hidden="true">${item.icon}</i>${item.label}</a>`).join('')}
        </nav>
      </div>
      <div class="gnk-shell-auth">
        <label for="gnkAdminToken">Operatorski token</label>
        <input id="gnkAdminToken" type="password" autocomplete="current-password" placeholder="Ručno unesite svoj operatorski token">
        <button id="gnkAdminLogin" type="button">Prijava</button>
        <button id="gnkAdminLogout" type="button" class="secondary">Odjava</button>
        <span id="gnkAdminAuthStatus" class="gnk-shell-auth-status"><i></i><span>Prijava nije potvrđena</span></span>
      </div>
    </div>`;

  document.body.insertBefore(shell,document.body.firstChild);

  const input = document.getElementById('gnkAdminToken');
  const status = document.getElementById('gnkAdminAuthStatus');
  const statusText = status?.querySelector('span');
  const setStatus = (text, ok=false) => {
    if (statusText) statusText.textContent = text;
    status?.classList.toggle('ok', ok);
  };

  const stored = readToken();
  if (input && stored) input.value = stored;

  document.getElementById('gnkAdminLogin')?.addEventListener('click', async () => {
    const token = String(input?.value || '').trim();
    if (!token) { setStatus('Unesite operatorski token', false); input?.focus(); return; }
    setStatus('Provjera tokena…', false);
    if (!(await verifyToken(token))) {
      writeToken('');
      setStatus('Token nije prihvaćen', false);
      return;
    }
    writeToken(token);
    setStatus('Prijava potvrđena', true);
    await unlockLocalUi(token);
  });

  document.getElementById('gnkAdminLogout')?.addEventListener('click', async () => {
    writeToken('');
    if (input) input.value = '';
    lockLocalUi();
    try {
      await nativeFetch('/operator/session/logout', {
        method:'POST',
        credentials:'same-origin',
        cache:'no-store'
      });
    } catch (_) {}
    setStatus('Odjavljeni ste', false);
  });

  const boot = async () => {
    if (stored && await verifyToken(stored)) {
      setStatus('Prijava potvrđena', true);
      await unlockLocalUi(stored);
      return;
    }
    if (await checkCookieSession()) {
      setStatus('Sigurna sesija je aktivna', true);
      await unlockLocalUi('');
      return;
    }
    setStatus('Unesite svoj operatorski token', false);
    lockLocalUi();
  };
  boot();
})();