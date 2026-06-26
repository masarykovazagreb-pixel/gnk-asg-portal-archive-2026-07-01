(() => {
  'use strict';
  if (window.__GNK_ASG_SINGLE_ADMIN_CENTER_V3__) return;
  window.__GNK_ASG_SINGLE_ADMIN_CENTER_V3__ = true;

  const modules = [
    {id:'overview',label:'Admin pregled',icon:'⌂',title:'Admin pregled',description:'Status sustava i jedinstveni pristup administrativnim alatima.',route:'/admin-center/'},
    {id:'mail',label:'Mail Studio',icon:'✉',title:'GNK ASG Mail Studio',description:'Pošiljatelji, To / CC / BCC, potpisi, PDF prilozi, Inbox, Sent i Outbox.',route:'/mail-studio/'},
    {id:'operator',label:'Operator',icon:'▣',title:'Operator centar',description:'Status, konfiguracija, inbox, evidencije i operativne postavke.',route:'/operator-dashboard/'},
    {id:'media',label:'Medijski centar',icon:'◎',title:'Medijski komandni centar',description:'Medijska baza, kampanje, prijave, dokumenti i odobrenja.',route:'/media-command-center/'},
    {id:'editor',label:'Auto Editor',icon:'✎',title:'Auto Editor',description:'Objave i automatizirani urednički procesi.',route:'/auto-editor/'},
    {id:'news',label:'News Admin',icon:'◫',title:'News Admin',description:'Izvori, vijesti, provjera i urednička kontrola.',route:'/news-admin/'},
    {id:'pdf',label:'PDF Publisher',icon:'▤',title:'PDF Publisher',description:'Dokumenti, PDF objava i evidencija.',route:'/pdf-publisher/'}
  ];

  const q = id => document.getElementById(id);
  const nav = q('gnkHubNav');
  const frame = q('gnkHubFrame');
  const loading = q('gnkHubLoading');
  const overview = q('gnkHubOverview');
  const modulePanel = q('gnkHubModule');
  const standalone = q('gnkHubStandalone');
  const phone = '+385 (0) 916104398';
  const whatsappIcon = '<svg aria-label="WhatsApp" viewBox="0 0 24 24" width="1em" height="1em" style="display:inline-block;vertical-align:-0.15em;margin-left:.25em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z"/><path d="M9.1 8.2c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5-.1.7l-.6.8c-.1.2-.1.4 0 .6.5.9 1.2 1.6 2.1 2.1.2.1.4.1.6 0l.8-.6c.2-.2.5-.2.7-.1l1.8.8c.3.1.4.3.4.5v.5c0 .3 0 .5-.4.7-.5.3-1.2.6-2 .5-1.3-.1-3.3-.8-5.2-2.7-1.9-1.9-2.6-3.9-2.7-5.2 0-.8.2-1.5.5-2Z"/></svg>';
  const contact = `☎ ${phone} ${whatsappIcon}`;
  let current = 'overview';

  const getModule = id => modules.find(item => item.id === id) || modules[0];
  const closeMenu = () => document.body.classList.remove('gnk-hub-menu-open');
  const openMenu = () => document.body.classList.add('gnk-hub-menu-open');

  function moduleUrl(item, mode='embedded') {
    const url = new URL(item.route, location.origin);
    if (mode === 'embedded') {
      url.searchParams.set('embedded','1');
      url.searchParams.set('hubmodule',item.id);
    } else {
      url.searchParams.set('standalone','1');
    }
    return url.pathname + url.search;
  }

  nav.innerHTML = modules.map(item => `
    <button type="button" data-module="${item.id}" aria-label="${item.title}">
      <i aria-hidden="true">${item.icon}</i><span>${item.label}</span>
    </button>`).join('');

  function showLoading(label='Učitavanje modula…') {
    const text = loading?.querySelector('strong');
    if (text) text.textContent = label;
    if (loading) loading.hidden = false;
    if (frame) frame.hidden = true;
  }

  function patchMailContact(doc) {
    if (current !== 'mail' || !doc) return;
    const apply = () => {
      doc.querySelectorAll('.signature,#preview').forEach(node => {
        const next = node.innerHTML
          .replace(/(?:Telefon|Kontakt):\s*091\s*535\s*8365/gi,contact)
          .replace(/091\s*535\s*8365/g,phone);
        if (next !== node.innerHTML) node.innerHTML = next;
      });
    };
    apply();
    if (!doc.documentElement.dataset.gnkContactObserver) {
      doc.documentElement.dataset.gnkContactObserver = '1';
      new frame.contentWindow.MutationObserver(apply).observe(doc.documentElement,{childList:true,subtree:true});
    }
  }

  function cleanEmbeddedModule() {
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      let style = doc.getElementById('gnk-hub-embedded-clean-v1');
      if (!style) {
        style = doc.createElement('style');
        style.id = 'gnk-hub-embedded-clean-v1';
        style.textContent = '#gnk-backend-shell,#gnk-admin-module-launcher-v7,#gnk-admin-lock-notice-v7{display:none!important}body{padding-top:0!important}';
        doc.head.appendChild(style);
      }
      patchMailContact(doc);
    } catch (_) {}
  }

  function select(id, push=true) {
    const item = getModule(id);
    current = item.id;
    nav.querySelectorAll('[data-module]').forEach(button => {
      const active = button.dataset.module === item.id;
      button.classList.toggle('active',active);
      button.setAttribute('aria-current',active ? 'page' : 'false');
    });
    q('gnkHubTitle').textContent = item.title;
    q('gnkHubDescription').textContent = item.description;
    q('gnkHubCurrent').textContent = item.title;

    if (item.id === 'overview') {
      overview.classList.add('active');
      modulePanel.classList.remove('active');
      standalone.hidden = true;
      q('gnkHubReload').textContent = 'Provjeri status';
      frame.hidden = true;
      loadStatus();
    } else {
      overview.classList.remove('active');
      modulePanel.classList.add('active');
      standalone.hidden = false;
      standalone.href = moduleUrl(item,'standalone');
      q('gnkHubReload').textContent = 'Osvježi modul';
      const target = moduleUrl(item,'embedded');
      showLoading(`Učitavanje: ${item.title}`);
      if (frame.dataset.route !== target) {
        frame.dataset.route = target;
        frame.src = target;
      } else {
        loading.hidden = true;
        frame.hidden = false;
        cleanEmbeddedModule();
      }
    }

    closeMenu();
    if (push) {
      const url = new URL(location.href);
      item.id === 'overview' ? url.searchParams.delete('module') : url.searchParams.set('module',item.id);
      history.pushState({module:item.id},'',url);
    }
  }

  async function check(path) {
    try {
      const url = new URL(path,location.origin);
      url.searchParams.set('cb',Date.now());
      const response = await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json','cache-control':'no-cache'}});
      let data = null;
      try { data = await response.json(); } catch (_) {}
      return {ok:response.ok,status:response.status,data};
    } catch (error) {
      return {ok:false,status:0,error:error.message};
    }
  }

  function statusCard(label, result, description) {
    const ok = Boolean(result?.ok);
    const authRequired = [401,403].includes(result?.status);
    const state = ok ? 'ok' : authRequired ? 'warn' : 'bad';
    const title = ok ? 'Spremno' : authRequired ? 'Prijava potrebna' : `Nedostupno (${result?.status || 0})`;
    return `<article class="gnk-hub-status-card ${state}"><small>${label}</small><strong>${title}</strong><p>${description}</p></article>`;
  }

  async function loadStatus() {
    const grid = q('gnkHubStatusGrid');
    if (!grid) return;
    grid.querySelectorAll('article').forEach(card => card.classList.add('loading'));
    const [auth,backend,mail,media,health] = await Promise.all([
      check('/api/operator-auth-check'),
      check('/api/operator-backend-status'),
      check('/api/mail-center/status'),
      check('/api/media-command-center/status'),
      check('/data/platform-health.json')
    ]);
    grid.innerHTML = [
      statusCard('Sesija',auth,auth.data?.mode || 'HttpOnly sigurna sesija'),
      statusCard('Backend',backend,backend.data?.authLayer || 'Operatorske funkcije'),
      statusCard('Mail',mail,mail.data?.status || 'Inbox, Sent, Outbox i slanje'),
      statusCard('Mediji',media,media.data?.version || 'Medijski komandni centar'),
      statusCard('Platforma',health,health.data?.version || 'Assets, KV i D1')
    ].join('');
    const session = q('gnkHubSessionText')?.closest('.gnk-hub-session');
    session?.classList.toggle('ok',auth.ok);
    session?.classList.toggle('bad',!auth.ok && ![401,403].includes(auth.status));
    q('gnkHubSessionText').textContent = auth.ok ? 'Sigurna sesija aktivna' : 'Prijava nije potvrđena';
    q('gnkHubSessionHint').textContent = auth.ok ? 'Privatni moduli su dostupni' : 'Otvorite modul i prijavite se';
  }

  async function logout() {
    try {
      await fetch('/operator/session/logout',{method:'POST',credentials:'same-origin',cache:'no-store'});
    } catch (_) {}
    location.href = '/admin-center/';
  }

  nav.addEventListener('click',event => {
    const button = event.target.closest('[data-module]');
    if (button) select(button.dataset.module);
  });
  frame.addEventListener('load',() => {
    cleanEmbeddedModule();
    setTimeout(cleanEmbeddedModule,150);
    setTimeout(cleanEmbeddedModule,600);
    loading.hidden = true;
    frame.hidden = false;
  });
  frame.addEventListener('error',() => showLoading('Modul se nije uspio učitati.'));
  q('gnkHubReload').addEventListener('click',() => {
    if (current === 'overview') { loadStatus(); return; }
    const item = getModule(current);
    showLoading(`Osvježavanje: ${item.title}`);
    const url = new URL(frame.dataset.route || moduleUrl(item),location.origin);
    url.searchParams.set('cb',Date.now());
    frame.src = url.pathname + url.search;
  });
  q('gnkHubMenu')?.addEventListener('click',openMenu);
  q('gnkHubCloseMenu')?.addEventListener('click',closeMenu);
  q('gnkHubBackdrop')?.addEventListener('click',closeMenu);
  q('gnkHubLogout')?.addEventListener('click',logout);
  q('gnkHubLogoutSide')?.addEventListener('click',logout);
  addEventListener('popstate',() => select(new URL(location.href).searchParams.get('module') || 'overview',false));
  addEventListener('keydown',event => { if (event.key === 'Escape') closeMenu(); });

  select(new URL(location.href).searchParams.get('module') || 'overview',false);
})();
