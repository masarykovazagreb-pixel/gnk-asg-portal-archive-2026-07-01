(() => {
  if (window.__GNK_ASG_OPERATOR_MOBILE_LIVE_BRIDGE__) return;
  window.__GNK_ASG_OPERATOR_MOBILE_LIVE_BRIDGE__ = true;

  const $ = id => document.getElementById(id);
  const token = () => window.GNKOperatorToken?.get?.() || '';
  const auth = () => window.GNKOperatorToken?.headers?.() || {};
  const show = (id, value) => {
    const node = $(id);
    if (!node) return;
    node.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  };
  const esc = value => String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);

  async function request(url, options = {}) {
    const headers = new Headers(options.headers || {});
    for (const [key, value] of Object.entries(auth())) headers.set(key, value);
    const response = await fetch(url, {
      ...options,
      headers,
      cache: options.cache || 'no-store'
    });
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { raw }; }
    return { ok: response.ok, status: response.status, data };
  }

  async function firstAvailable(endpoints) {
    let last = { ok: false, status: 0, data: { error: 'not_available' } };
    for (const endpoint of endpoints) {
      try {
        const result = await request(`${endpoint}${endpoint.includes('?') ? '&' : '?'}cb=${Date.now()}`);
        last = result;
        if (result.ok) return result;
      } catch (error) {
        last = { ok: false, status: 0, data: { error: String(error?.message || error) } };
      }
    }
    return last;
  }

  function readinessView(mail) {
    const data = mail?.data || {};
    const automation = data.automation || data.readiness?.automation || {};
    const modules = automation.modules || {};
    return {
      status: data.status || (mail.ok ? 'available' : 'unavailable'),
      codeReady: Boolean(data.ok ?? data.readiness?.codeReady),
      liveReady: Boolean(data.liveReady ?? data.readiness?.liveReady),
      mailLiveReady: Boolean(data.mailLiveReady ?? data.readiness?.mailLiveReady),
      routineAutoSendReady: Boolean(data.routineAutoSendReady ?? data.readiness?.routineAutoSendReady),
      automation: {
        codeReady: Boolean(automation.codeReady),
        previewReady: Boolean(automation.previewReady),
        liveReady: Boolean(automation.liveReady),
        productionTouched: Boolean(automation.productionTouched),
        dataSync: modules.dataSync || null,
        autoEditor: modules.autoEditor || null
      },
      blockedItems: data.blockedItems || data.readiness?.blockedItems || []
    };
  }

  async function loadStatus() {
    const [mail, admin] = await Promise.all([
      request('/api/mail-agent/health'),
      firstAvailable(['/api/admin-control-status', '/operator/dashboard-status'])
    ]);
    show('statusOut', {
      ok: mail.ok && admin.ok,
      readiness: readinessView(mail),
      adminBackend: {
        ok: admin.ok,
        status: admin.status,
        data: admin.data
      },
      security: {
        tokenStorage: 'session',
        tokenInUrl: false
      },
      productionTouched: Boolean(mail.data?.productionTouched),
      checkedAt: new Date().toISOString()
    });
  }

  async function loadBoxes() {
    const result = await firstAvailable(['/api/contact-mailboxes', '/api/operator-mailbox-config']);
    const source = result.data?.mailboxes || result.data?.items || result.data || [];
    const items = Array.isArray(source) && source.length ? source : [
      { key: 'info', label: 'Info', address: 'info@gnk-asg.hr' },
      { key: 'it', label: 'IT', address: 'it@gnk-asg.hr' },
      { key: 'legal', label: 'Legal', address: 'legal@gnk-asg.hr' },
      { key: 'media', label: 'Media', address: 'media@gnk-asg.hr' }
    ];
    const select = $('mailbox');
    if (select) {
      select.innerHTML = items.map(item => {
        const key = item.key || item.id || String(item.address || '').split('@')[0] || 'info';
        const label = item.label || item.name || key;
        return `<option value="${esc(key)}" data-address="${esc(item.address || '')}">${esc(`${label} — ${item.address || ''}`)}</option>`;
      }).join('');
    }
  }

  function mailboxProfile() {
    const select = $('mailbox');
    const option = select?.selectedOptions?.[0];
    return {
      key: select?.value || 'info',
      address: option?.dataset?.address || `${select?.value || 'info'}@gnk-asg.hr`,
      label: option?.textContent?.split(' — ')[0] || 'GNK ASG'
    };
  }

  async function sendMail() {
    const profile = mailboxProfile();
    const payload = {
      mailbox: profile.key,
      from: profile.address,
      fromName: profile.label,
      to: $('mailTo')?.value.trim() || '',
      subject: $('mailSubject')?.value.trim() || '',
      body: $('mailBody')?.value.trim() || '',
      signatureProfile: profile.key,
      addSignature: true,
      attachments: []
    };
    if (!payload.to || !payload.subject || !payload.body) {
      show('mailOut', 'Nedostaje primatelj, predmet ili tekst poruke.');
      return;
    }
    const result = await request('/api/mail-agent/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    show('mailOut', result);
    if (result.ok) await loadSent();
  }

  async function loadInbox() {
    const result = await firstAvailable([
      '/api/mail-agent/inbox',
      '/operator/contact-inbox',
      '/api/mail-center/inbox'
    ]);
    renderList('inboxOut', result.data);
  }

  async function loadSent() {
    const result = await firstAvailable([
      '/api/mail-agent/sent',
      '/api/mail-center/sent',
      '/operator/mail-log-list'
    ]);
    renderList('sentOut', result.data);
  }

  function renderList(id, data) {
    const node = $(id);
    if (!node) return;
    const items = Array.isArray(data)
      ? data
      : (data?.items || data?.messages || data?.logs || data?.data || []);
    node.innerHTML = items.length
      ? items.slice(0, 100).map(item => `
          <article class="mail-item">
            <strong>${esc(item.subject || item.title || item.event || '(bez predmeta)')}</strong>
            <small>${esc(item.from || item.to || item.email || item.createdAt || item.sentAt || '')}</small>
            <div>${esc(String(item.snippet || item.message || item.body || item.bodyPreview || JSON.stringify(item)).slice(0, 450))}</div>
          </article>`).join('')
      : '<article class="mail-item">Nema zapisa ili backend nije dostupan.</article>';
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',').pop() || '');
      reader.onerror = () => reject(reader.error || new Error('Greška čitanja datoteke.'));
      reader.readAsDataURL(file);
    });
  }

  async function uploadMedia() {
    const file = $('mediaFile')?.files?.[0];
    if (!file) {
      show('mediaOut', 'Odaberite ili fotografirajte sliku.');
      return;
    }
    if (!String(file.type || '').startsWith('image/')) {
      show('mediaOut', 'Dopuštene su samo slikovne datoteke.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      show('mediaOut', 'Slika je veća od 15 MB.');
      return;
    }

    show('mediaOut', 'Učitavanje slike…');
    const title = $('mediaTitle')?.value.trim() || file.name;
    const payload = {
      filename: file.name,
      mime: file.type || 'image/jpeg',
      base64: await fileToBase64(file),
      folder: 'mobile-admin',
      title,
      alt: title,
      caption: title
    };
    const result = await request('/api/media-upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    show('mediaOut', result);
    const asset = result.data?.asset || result.data;
    const publicUrl = asset?.newsProxyUrl || asset?.publicUrl || asset?.suggestedPublicPath || '';
    if (result.ok && publicUrl && $('pubImage')) $('pubImage').value = publicUrl;
  }

  async function listMedia() {
    const result = await firstAvailable(['/api/admin-asset-list', '/operator/media-list']);
    show('mediaOut', result);
  }

  function bind() {
    const handlers = {
      loadStatus,
      sendMail,
      loadInbox,
      loadSent,
      uploadMedia,
      listMedia
    };
    for (const [id, handler] of Object.entries(handlers)) {
      const node = $(id);
      if (node) node.onclick = handler;
    }

    const desktopMail = document.querySelector('.admin-tabs a[href="/mail-studio/"]');
    if (desktopMail) desktopMail.href = '/mail-studio-pro/';

    window.addEventListener('gnk:operator-token-changed', event => {
      if (event.detail?.present) {
        Promise.allSettled([loadStatus(), loadInbox(), loadSent()]);
      } else {
        show('statusOut', 'Operator je odjavljen. Status i privatni podatci nisu učitani.');
        renderList('inboxOut', []);
        renderList('sentOut', []);
      }
    });

    loadBoxes();
    if (token()) Promise.allSettled([loadStatus(), loadInbox(), loadSent()]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
