(() => {
  if (window.__GNK_ASG_ADMIN_SECURE_GATE__) return;
  window.__GNK_ASG_ADMIN_SECURE_GATE__ = true;

  const protectedPrefixes = [
    '/operator-dashboard/',
    '/operator-mobile/',
    '/mail-studio/',
    '/mail-studio-pro/',
    '/pdf-publisher/',
    '/admin/'
  ];

  const path = location.pathname.toLowerCase();
  if (!protectedPrefixes.some(prefix => path.startsWith(prefix))) return;

  const SESSION_KEY = 'GNK_ASG_OPERATOR_TOKEN_SESSION';
  const LEGACY_KEYS = ['GNK_ASG_OPERATOR_TOKEN'];
  const originalFetch = window.fetch.bind(window);
  let validating = false;
  let gate;

  function getToken() {
    if (window.GNKOperatorToken?.get) return String(window.GNKOperatorToken.get() || '').trim();
    return String(sessionStorage.getItem(SESSION_KEY) || '').trim();
  }

  function setToken(value) {
    const token = String(value || '').trim();
    if (window.GNKOperatorToken?.set) return window.GNKOperatorToken.set(token);
    if (!token) return clearToken();
    sessionStorage.setItem(SESSION_KEY, token);
    LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
    return true;
  }

  function clearToken() {
    if (window.GNKOperatorToken?.clear) window.GNKOperatorToken.clear();
    sessionStorage.removeItem(SESSION_KEY);
    LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
  }

  function tokenHeaders(token = getToken()) {
    if (!token) return {};
    return {
      authorization: `Bearer ${token}`,
      'x-operator-token': token,
      'x-admin-token': token,
      'x-gnk-asg-token': token
    };
  }

  function stripTokenFromUrl() {
    const url = new URL(location.href);
    let changed = false;
    ['token','operatorToken','operator_token','adminToken'].forEach(key => {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    });
    if (changed) history.replaceState(null,'',url.pathname + (url.search ? url.search : '') + url.hash);
  }

  function buildGate() {
    if (gate) return gate;
    document.documentElement.classList.add('gnk-admin-locked');
    gate = document.createElement('section');
    gate.className = 'gnk-admin-gate';
    gate.innerHTML = `
      <div class="gnk-admin-gate-card" role="dialog" aria-modal="true" aria-labelledby="gnk-admin-gate-title">
        <p style="margin:0 0 6px;color:#f0d477;font-weight:900;letter-spacing:.12em;text-transform:uppercase">GNK ASG privatni pristup</p>
        <h1 id="gnk-admin-gate-title">Operator token</h1>
        <p>Za pristup web administraciji, mobilnoj administraciji, Mail Studiju i PDF Publisheru potreban je valjani operator token.</p>
        <label for="gnk-admin-token-input">Token</label>
        <input id="gnk-admin-token-input" type="password" autocomplete="off" spellcheck="false">
        <div class="gnk-admin-gate-actions">
          <button class="primary" id="gnk-admin-token-submit" type="button">Sigurna prijava</button>
          <button class="secondary" id="gnk-admin-token-clear" type="button">Obriši token</button>
          <a href="/" style="align-self:center;color:#f0d477;font-weight:800;text-decoration:none">Povratak na portal</a>
        </div>
        <div class="gnk-admin-gate-error" id="gnk-admin-gate-error"></div>
      </div>`;
    document.body.appendChild(gate);

    const input = gate.querySelector('#gnk-admin-token-input');
    const submit = gate.querySelector('#gnk-admin-token-submit');
    const clear = gate.querySelector('#gnk-admin-token-clear');

    input.value = getToken();
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') submit.click();
    });
    submit.addEventListener('click', async () => {
      const value = input.value.trim();
      if (!value) {
        showError('Unesite operator token.');
        return;
      }
      setToken(value);
      submit.disabled = true;
      submit.textContent = 'Provjera…';
      const ok = await validateToken();
      submit.disabled = false;
      submit.textContent = 'Sigurna prijava';
      if (ok) unlock();
      else {
        clearToken();
        showError('Token nije valjan ili je sesija istekla.');
      }
    });
    clear.addEventListener('click', () => {
      clearToken();
      input.value = '';
      showError('Token je obrisan iz ove sesije.');
    });
    return gate;
  }

  function showError(message) {
    buildGate().querySelector('#gnk-admin-gate-error').textContent = message || '';
  }

  function lock(message = '') {
    buildGate().hidden = false;
    document.documentElement.classList.add('gnk-admin-locked');
    if (message) showError(message);
  }

  function unlock() {
    document.documentElement.classList.remove('gnk-admin-locked');
    if (gate) gate.hidden = true;
    window.dispatchEvent(new CustomEvent('gnk:operator-session-validated', { detail: { valid: true } }));
  }

  async function validateEndpoint(url, token) {
    try {
      const response = await originalFetch(url, {
        method:'GET',
        headers:tokenHeaders(token),
        cache:'no-store',
        credentials:'omit',
        redirect:'manual'
      });
      if (response.status === 200) return true;
      if (response.status === 401 || response.status === 403) return false;
    } catch {}
    return null;
  }

  async function validateToken() {
    if (validating) return false;
    validating = true;
    const token = getToken();
    if (!token) {
      validating = false;
      return false;
    }

    const endpoints = path.startsWith('/mail-studio')
      ? ['/api/mail-agent/inbox?limit=1&cb=' + Date.now(), '/operator/status?cb=' + Date.now(), 'https://operator.gnk-asg.hr/operator/status?cb=' + Date.now()]
      : ['/operator/status?cb=' + Date.now(), 'https://operator.gnk-asg.hr/operator/status?cb=' + Date.now(), '/api/mail-agent/inbox?limit=1&cb=' + Date.now()];

    for (const endpoint of endpoints) {
      const result = await validateEndpoint(endpoint, token);
      if (result === true) {
        validating = false;
        return true;
      }
      if (result === false) {
        validating = false;
        return false;
      }
    }

    validating = false;
    return false;
  }

  function shouldAttachToken(url) {
    try {
      const parsed = new URL(url, location.origin);
      if (parsed.origin !== location.origin && parsed.hostname !== 'operator.gnk-asg.hr') return false;
      return parsed.pathname.startsWith('/api/mail-agent/') ||
        parsed.pathname.startsWith('/api/admin-') ||
        parsed.pathname.startsWith('/api/operator-') ||
        parsed.pathname.startsWith('/operator/') ||
        parsed.pathname === '/api/media-upload' ||
        parsed.pathname === '/api/admin-asset-list' ||
        parsed.pathname === '/api/operator-send-mail';
    } catch {
      return false;
    }
  }

  window.fetch = async function(input, init = {}) {
    const url = typeof input === 'string' ? input : String(input?.url || '');
    const options = { ...init };
    if (shouldAttachToken(url)) {
      const headers = new Headers(options.headers || (input instanceof Request ? input.headers : {}));
      Object.entries(tokenHeaders()).forEach(([key,value]) => headers.set(key,value));
      options.headers = headers;
      options.cache = options.cache || 'no-store';
    }
    const response = await originalFetch(input, options);
    if (response.status === 401 && shouldAttachToken(url)) {
      clearToken();
      lock('Token nije valjan ili je sesija istekla. Prijavite se ponovno.');
      window.dispatchEvent(new CustomEvent('gnk:operator-session-invalid', { detail: { status:401, url } }));
    }
    return response;
  };

  async function boot() {
    stripTokenFromUrl();
    lock();
    if (getToken() && await validateToken()) unlock();
    else showError('Unesite valjani operator token.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
