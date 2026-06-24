(() => {
  'use strict';
  if (window.__GNK_ASG_OPERATOR_AUTH_V2__) return;
  window.__GNK_ASG_OPERATOR_AUTH_V2__ = true;

  const KEY = 'gnk_asg_operator_token_v1';
  let sessionActive = false;
  const read = () => {
    try { return sessionStorage.getItem(KEY) || ''; }
    catch (_) { return ''; }
  };
  const write = value => {
    try {
      if (value) sessionStorage.setItem(KEY, value);
      else sessionStorage.removeItem(KEY);
    } catch (_) {}
  };

  const style = document.createElement('style');
  style.textContent = `
  .gnk-auth-launch{position:fixed;right:18px;top:18px;z-index:2147483644;border:1px solid rgba(215,170,60,.6);border-radius:999px;background:#07172a;color:#fff;padding:10px 14px;font:900 11px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;box-shadow:0 12px 38px rgba(0,0,0,.35)}
  .gnk-auth-launch.ok{border-color:#31d47c;color:#a7f3d0}.gnk-auth-layer{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.74);backdrop-filter:blur(12px)}.gnk-auth-layer[hidden]{display:none}
  .gnk-auth-box{width:min(470px,100%);padding:24px;border:1px solid rgba(215,170,60,.6);border-radius:22px;background:#07172a;color:#fff;box-shadow:0 28px 90px rgba(0,0,0,.65)}.gnk-auth-box h2{margin:0 0 8px;color:#ffe08a;font:700 26px Georgia,serif}.gnk-auth-box p{color:#afbdd0;line-height:1.5}.gnk-auth-box label{display:block;margin:14px 0 7px;color:#ffe08a;font-weight:900}.gnk-auth-box input{width:100%;box-sizing:border-box;padding:13px;border:1px solid rgba(215,170,60,.45);border-radius:12px;background:#020812;color:#fff;font:inherit}.gnk-auth-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:15px}.gnk-auth-actions button{padding:11px 14px;border:1px solid rgba(215,170,60,.58);border-radius:11px;background:rgba(255,255,255,.07);color:#fff;font-weight:900;cursor:pointer}.gnk-auth-actions .primary{background:linear-gradient(135deg,#d7aa3c,#ffe08a);color:#07101d}.gnk-auth-msg{min-height:20px;color:#fecaca!important;font-size:13px}
  `;
  document.head.appendChild(style);

  const launch = document.createElement('button');
  launch.type = 'button';
  launch.className = 'gnk-auth-launch';
  document.body.appendChild(launch);

  const layer = document.createElement('div');
  layer.className = 'gnk-auth-layer';
  layer.hidden = true;
  layer.innerHTML = `<section class="gnk-auth-box" role="dialog" aria-modal="true"><h2>Operatorska prijava</h2><p>Token se čuva samo u ovoj kartici preglednika do njezina zatvaranja. Ako ste se prijavili na sigurnom ulazu, koristi se HttpOnly sesija.</p><label for="gnk-auth-value">Operatorski token</label><input id="gnk-auth-value" type="password" autocomplete="current-password"><div class="gnk-auth-actions"><button class="primary" id="gnk-auth-save" type="button">Provjeri i spremi</button><button id="gnk-auth-clear" type="button">Odjavi lokalni token</button><button id="gnk-auth-close" type="button">Zatvori</button></div><p class="gnk-auth-msg" id="gnk-auth-msg"></p></section>`;
  document.body.appendChild(layer);

  const input = layer.querySelector('#gnk-auth-value');
  const msg = layer.querySelector('#gnk-auth-msg');
  const render = () => {
    const tokenActive = Boolean(read());
    const active = tokenActive || sessionActive;
    launch.textContent = sessionActive ? 'Sesija aktivna' : (tokenActive ? 'Token aktivan' : 'Unesi token');
    launch.classList.toggle('ok', active);
  };
  const open = note => {
    layer.hidden = false;
    input.value = read();
    msg.textContent = note || (sessionActive ? 'Sigurna operatorska sesija već je aktivna.' : '');
    setTimeout(() => input.focus(), 0);
  };
  const close = () => { layer.hidden = true; };
  const headers = () => {
    const token = read();
    return token ? { authorization: `Bearer ${token}`, 'x-operator-token': token } : {};
  };

  async function checkSession() {
    try {
      const response = await fetch('/operator/session/status?cb=' + Date.now(), { credentials:'same-origin', cache:'no-store' });
      if (!response.ok) return false;
      const data = await response.json();
      sessionActive = Boolean(data?.authenticated);
      render();
      return sessionActive;
    } catch (_) {
      sessionActive = false;
      render();
      return false;
    }
  }

  async function verify(candidate) {
    const response = await fetch('/api/operator-signature-load?mailbox=info&cb=' + Date.now(), {
      headers: { authorization: `Bearer ${candidate}`, 'x-operator-token': candidate, 'cache-control': 'no-cache' }
    });
    return response.ok;
  }

  layer.querySelector('#gnk-auth-save').addEventListener('click', async () => {
    const candidate = input.value.trim();
    if (!candidate) { msg.textContent = 'Token nije unesen.'; return; }
    msg.textContent = 'Provjera tokena…';
    try {
      if (!(await verify(candidate))) {
        write(''); render(); msg.textContent = 'Token nije prihvaćen.'; return;
      }
      write(candidate); render(); msg.textContent = 'Token je potvrđen.';
      setTimeout(close, 450);
    } catch (error) {
      msg.textContent = 'Provjera nije uspjela: ' + error.message;
    }
  });
  layer.querySelector('#gnk-auth-clear').addEventListener('click', () => { write(''); input.value = ''; render(); msg.textContent = sessionActive ? 'Lokalni token je uklonjen; HttpOnly sesija ostaje aktivna.' : 'Token je uklonjen.'; });
  layer.querySelector('#gnk-auth-close').addEventListener('click', close);
  launch.addEventListener('click', () => open(''));
  layer.addEventListener('click', event => { if (event.target === layer) close(); });

  window.GNK_ASG_OPERATOR_AUTH = { read, write, headers, open, close, verify, checkSession, hasSession:() => sessionActive };
  render();

  const path = location.pathname.replace(/\/+$/, '') || '/';
  checkSession().then(active => {
    if (['/mail-studio','/mail-studio-pro','/admin-center'].includes(path) && !active && !read()) {
      setTimeout(() => open('Za rad s mailom potrebno je jednom unijeti operatorski token.'), 250);
    }
  });
})();