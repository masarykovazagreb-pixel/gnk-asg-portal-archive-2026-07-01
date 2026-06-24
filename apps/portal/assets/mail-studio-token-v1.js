(() => {
  'use strict';
  if (window.__GNK_ASG_MAIL_STUDIO_TOKEN_V1__) return;
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (path !== '/mail-studio' && path !== '/mail-studio-pro') return;
  window.__GNK_ASG_MAIL_STUDIO_TOKEN_V1__ = true;

  const KEY = 'gnk_asg_mail_studio_token';
  const readToken = () => {
    try { return sessionStorage.getItem(KEY) || ''; }
    catch (_) { return ''; }
  };
  const saveToken = value => {
    try {
      if (value) sessionStorage.setItem(KEY, value);
      else sessionStorage.removeItem(KEY);
    } catch (_) {}
  };
  const q = id => document.getElementById(id);
  const setStatus = value => { if (q('status')) q('status').textContent = value; };

  function ensurePanel() {
    if (q('gnkMailTokenPanel')) return;
    const compose = document.querySelector('.compose') || document.body;
    const panel = document.createElement('div');
    panel.id = 'gnkMailTokenPanel';
    panel.className = 'panel';
    panel.style.marginBottom = '14px';
    panel.innerHTML = `
      <h3>Sigurni operatorski pristup</h3>
      <div class="small">Token se čuva samo u ovoj kartici preglednika i briše zatvaranjem kartice.</div>
      <div class="grid" style="margin-top:10px">
        <div class="field" style="margin:0"><label>Operatorski token</label><input id="gnkMailToken" type="password" autocomplete="current-password" placeholder="Unesite operatorski token"></div>
        <div class="actions" style="align-items:end;margin:0"><button type="button" id="gnkMailTokenSave" class="gold">Provjeri i spremi</button><button type="button" id="gnkMailTokenClear">Odjavi token</button></div>
      </div>`;
    compose.insertBefore(panel, compose.firstChild);
    q('gnkMailToken').value = readToken();
  }

  async function verifyToken() {
    const value = q('gnkMailToken')?.value.trim() || '';
    if (!value) { setStatus('Token nije unesen.'); return false; }
    setStatus('Provjera tokena…');
    try {
      const response = await fetch('/api/operator-signature-load?mailbox=info&cb=' + Date.now(), {
        headers: { authorization:`Bearer ${value}`, 'x-operator-token':value, 'cache-control':'no-cache' }
      });
      if (!response.ok) {
        saveToken('');
        setStatus('Token nije prihvaćen.');
        return false;
      }
      saveToken(value);
      setStatus('Token je potvrđen. Mail Studio je otključan.');
      return true;
    } catch (error) {
      setStatus('Provjera tokena nije uspjela: ' + error.message);
      return false;
    }
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const raw = typeof input === 'string' ? input : input?.url || '';
    if (!raw.includes('/api/admin-mail-send')) return originalFetch(input, init);

    const token = readToken();
    if (!token) {
      ensurePanel();
      q('gnkMailToken')?.focus();
      setStatus('Unesite operatorski token prije slanja.');
      return new Response(JSON.stringify({ ok:false, error:'operator_token_required', message:'Operatorski token nije unesen.' }), {
        status:401,
        headers:{ 'content-type':'application/json; charset=utf-8' }
      });
    }

    const headers = new Headers(init.headers || {});
    headers.set('authorization', `Bearer ${token}`);
    headers.set('x-operator-token', token);
    return originalFetch('/api/operator-send-mail', { ...init, headers, credentials:'same-origin' });
  };

  function bind() {
    ensurePanel();
    q('gnkMailTokenSave')?.addEventListener('click', verifyToken);
    q('gnkMailTokenClear')?.addEventListener('click', () => {
      saveToken('');
      if (q('gnkMailToken')) q('gnkMailToken').value = '';
      setStatus('Token je uklonjen iz ove kartice.');
    });
    if (readToken()) setStatus('Token je spremljen u ovoj kartici.');
    else setStatus('Za slanje unesite operatorski token.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once:true });
  else bind();
})();