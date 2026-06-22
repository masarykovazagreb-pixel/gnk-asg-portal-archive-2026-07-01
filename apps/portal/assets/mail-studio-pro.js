(() => {
  if (window.__GNK_ASG_MAIL_STUDIO_PRO__) return;
  window.__GNK_ASG_MAIL_STUDIO_PRO__ = true;

  const q = id => document.getElementById(id);
  const DRAFT_KEY = 'GNK_ASG_MAIL_STUDIO_PRO_DRAFTS';
  const MAX_PDF_TOTAL = 3_400_000;
  let currentBox = 'inbox';
  let messages = [];
  let selected = null;
  let signatures = null;
  let attachments = [];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[ch]);
  const token = () => String(
    document.getElementById('operatorToken')?.value
    || window.GNKOperatorToken?.get?.()
    || sessionStorage.getItem('GNK_ASG_OPERATOR_TOKEN_SESSION')
    || ''
  ).trim();

  const auth = () => {
    const value = token();
    return value ? {
      authorization: `Bearer ${value}`,
      'x-operator-token': value
    } : {};
  };
  const status = text => {
    if (q('status')) q('status').textContent = text;
  };

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
    return { ok: response.ok, status: response.status, data, raw };
  }

  async function loadSignatures() {
    try {
      const response = await fetch(`/data/mail-signatures.json?cb=${Date.now()}`, { cache: 'no-store' });
      signatures = await response.json();
    } catch {
      signatures = {
        brand: {
          name: 'GNK ASG d.o.o.',
          logo: '/assets/gnk-asg-email-logo-final.png',
          address: 'Zagrebačka cesta 130, 10090 Zagreb',
          oib: '75227917632',
          mbs: '081512375',
          web: 'https://gnk-asg.hr',
          phone: '+385 91 535 8365'
        },
        profiles: [{
          key: 'office',
          label: 'GNK ASG Office',
          address: 'office@gnk-asg.hr',
          name: 'GNK ASG Office',
          title: 'Korporativni ured',
          disclaimer: ''
        }]
      };
    }

    q('profile').innerHTML = signatures.profiles
      .map(item => `<option value="${esc(item.key)}">${esc(item.label)} — ${esc(item.address)}</option>`)
      .join('');
    renderSignature();
  }

  function profile() {
    return signatures?.profiles?.find(item => item.key === q('profile').value)
      || signatures?.profiles?.[0];
  }

  function renderSignature() {
    const activeProfile = profile();
    const brand = signatures?.brand;
    if (!activeProfile || !brand) return;

    q('from').value = activeProfile.address || '';
    q('fromName').value = activeProfile.name || '';
    q('signaturePreview').innerHTML = `
      <img src="${esc(brand.logo)}" alt="GNK ASG">
      <div>
        <strong style="font-size:18px">${esc(activeProfile.name)}</strong><br>
        ${esc(activeProfile.title || '')}<br>
        ${esc(brand.name || '')}<br>
        ${esc(brand.address || '')}<br>
        OIB: ${esc(brand.oib || '')} · MBS: ${esc(brand.mbs || '')}<br>
        <a href="${esc(brand.web || '#')}">${esc(brand.web || '')}</a> · ${esc(brand.phone || '')}
      </div>
      <small style="display:block;margin-top:10px;color:#6b7280">${esc(activeProfile.disclaimer || '')}</small>`;
  }

  function extractItems(data) {
    if (Array.isArray(data)) return data;
    for (const key of ['items', 'messages', 'emails', 'inbox', 'sent', 'outbox', 'held', 'logs', 'data']) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
  }

  async function loadBox(type = currentBox) {
    currentBox = type;
    selected = null;
    document.querySelectorAll('[data-box]').forEach(button => {
      button.classList.toggle('active', button.dataset.box === type);
    });
    q('mailList').innerHTML = '<p>Učitavanje…</p>';

    if (type === 'drafts') {
      messages = readDrafts();
      renderList();
      status(`Drafts: ${messages.length}`);
      return;
    }

    if (!token()) {
      messages = [];
      renderList();
      status('Prijavite se operator tokenom.');
      return;
    }

    const endpoints = {
      inbox: ['/api/mail-agent/inbox', '/api/mail-center/inbox', '/operator/contact-inbox'],
      sent: ['/api/mail-agent/sent', '/api/mail-center/sent', '/operator/mail-log-list'],
      outbox: ['/api/mail-agent/outbox', '/api/mail-center/outbox'],
      held: ['/api/mail-agent/held']
    }[type] || [];

    for (const endpoint of endpoints) {
      try {
        const result = await request(`${endpoint}?cb=${Date.now()}`);
        if (!result.ok) continue;
        messages = extractItems(result.data);
        renderList();
        status(`${type}: ${messages.length}`);
        return;
      } catch {}
    }

    messages = [];
    renderList();
    status('Pretinac nije dostupan. Provjerite token i preview backend.');
  }

  function renderList() {
    q('mailList').innerHTML = messages.length
      ? messages.slice(0, 200).map((item, index) => {
          const time = item.createdAt || item.sentAt || item.receivedAt || '';
          const party = item.from || item.sender || item.to || item.recipient || item.email || '';
          const preview = item.snippet || item.message || item.body || item.text || item.draft?.body || '';
          const state = item.status || item.classification?.status || '';
          return `
            <article class="mail-item" data-index="${index}">
              <strong>${esc(item.subject || item.title || '(bez predmeta)')}</strong>
              <small>${esc(party)}${time ? ` · ${esc(time)}` : ''}${state ? ` · ${esc(state)}` : ''}</small>
              <p>${esc(String(preview).slice(0, 240))}</p>
            </article>`;
        }).join('')
      : '<p>Nema zapisa ili backend nije dostupan.</p>';

    document.querySelectorAll('.mail-item').forEach(node => {
      node.addEventListener('click', () => selectMessage(Number(node.dataset.index), node));
    });
  }

  function selectMessage(index, node) {
    selected = messages[index] || null;
    document.querySelectorAll('.mail-item').forEach(item => item.classList.remove('active'));
    node?.classList.add('active');
    if (!selected) return;

    const subject = selected.subject || selected.title || '(bez predmeta)';
    const from = selected.from || selected.sender || selected.senderEmail || selected.email || '';
    const to = selected.to || selected.recipient || '';
    const date = selected.receivedAt || selected.sentAt || selected.createdAt || selected.timestamp || '';
    const body = selected.body || selected.message || selected.text || selected.snippet || selected.draft?.body || '';
    const threadCount = Number(selected.threadContext?.messageCount || selected.classification?.threadMessageCount || 0);
    const threadId = selected.threadContext?.threadId || selected.classification?.threadId || selected.draft?.threadId || '';

    q('originalSubject').textContent = subject;
    q('originalMeta').textContent = [
      from && `From: ${from}`,
      to && `To: ${to}`,
      date && `Date: ${date}`,
      threadCount && `Thread: ${threadCount} poruka`,
      threadId && `ID: ${threadId}`
    ].filter(Boolean).join(' · ');
    q('originalBody').textContent = body || JSON.stringify(selected, null, 2);

    if (currentBox === 'inbox' || currentBox === 'held') {
      q('to').value = selected.replyTo || selected.senderEmail || from;
      q('subject').value = /^re:/i.test(subject) ? subject : `Re: ${subject}`;
    }

    if (currentBox === 'held' && selected.draft?.body) {
      q('bodyText').value = selected.draft.body;
      const mailbox = selected.draft.mailbox || selected.classification?.mailbox;
      if (mailbox && signatures?.profiles?.some(item => item.key === mailbox)) {
        q('profile').value = mailbox;
        renderSignature();
      }
      status('AI draft je učitan za provjeru. Slanje ostaje ručna radnja.');
    }

    if (currentBox === 'drafts') restoreDraft(selected);
  }

  function compactThreadContext() {
    const thread = selected?.threadContext;
    if (!thread || !Array.isArray(thread.messages)) return null;
    return {
      threadId: thread.threadId || '',
      subject: thread.subject || '',
      participants: Array.isArray(thread.participants) ? thread.participants.slice(0, 20) : [],
      messageCount: Number(thread.messageCount || thread.messages.length),
      messages: thread.messages.slice(-20).map(item => ({
        from: item.from || item.senderEmail || '',
        to: item.to || '',
        subject: item.subject || '',
        body: String(item.body || '').slice(0, 4000),
        timestamp: item.timestamp || '',
        status: item.status || ''
      }))
    };
  }

  function mailContext() {
    return {
      subject: q('originalSubject').textContent,
      from: selected?.from || selected?.sender || selected?.senderEmail || selected?.email || '',
      to: selected?.to || selected?.recipient || '',
      body: q('originalBody').textContent,
      currentDraft: q('bodyText').value,
      extraContext: q('aiContext').value,
      senderProfile: profile()?.label || '',
      recipients: {
        to: q('to').value,
        cc: q('cc').value,
        bcc: q('bcc').value
      },
      threadContext: compactThreadContext(),
      threadId: selected?.threadContext?.threadId || selected?.classification?.threadId || selected?.draft?.threadId || '',
      threadMessageCount: Number(selected?.threadContext?.messageCount || selected?.classification?.threadMessageCount || 0),
      classification: selected?.classification || null,
      heldDraft: selected?.draft || null
    };
  }

  async function callAi(task) {
    if (!token()) {
      status('AI pomoć zahtijeva operator prijavu.');
      return;
    }

    q('aiOutput').textContent = 'AI analizira sadržaj i dostupni thread…';
    const instructions = {
      summary: 'Sažmi odabranu poruku i cijeli dostupni thread. Izdvoji neriješena pitanja, već dane odgovore, rokove, rizike i potrebne radnje. Ne izmišljaj činjenice.',
      reply: 'Napiši kontekstualan odgovor na hrvatskom jeziku koristeći cijeli dostupni thread. Odgovori izravno na sva još neriješena konkretna pitanja, ali ne ponavljaj odgovore koji su već jasno dani. Ne koristi gotov predložak i ne preuzimaj pravne, financijske ili ugovorne obveze.',
      improve: 'Poboljšaj postojeći tekst bez promjene činjenica i uzimajući u obzir cijeli dostupni thread. Ukloni ponavljanja i učini tekst jasnim i profesionalnim.',
      shorten: 'Skrati postojeći tekst uz očuvanje svih bitnih činjenica, odgovora i značenja iz dostupnog threada.',
      translate: 'Prevedi postojeći tekst na drugi jezik između hrvatskog i engleskog. Sačuvaj ton, činjenice, imena i značenje.'
    }[task];

    try {
      const result = await request('/api/ai-assist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          question: instructions,
          message: instructions,
          prompt: instructions,
          mailContext: mailContext(),
          task,
          pageUrl: location.href,
          publicOnly: false
        })
      });
      const answer = result.data?.answer
        || result.data?.response
        || result.data?.message
        || result.data?.text
        || result.data?.result
        || (!result.data?.error ? result.raw : '');
      if (!result.ok || !answer) {
        throw new Error(result.data?.error || `AI endpoint nije vratio odgovor. HTTP ${result.status}`);
      }

      q('aiOutput').textContent = answer;
      if (task !== 'summary') q('bodyText').value = answer;
      status('AI obrada završena. Provjerite činjenice prije slanja.');
    } catch (error) {
      q('aiOutput').textContent = `AI nije dostupan: ${error.message}`;
      status('AI fallback.');
    }
  }

  function readDrafts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveDraft() {
    const drafts = readDrafts();
    const item = {
      id: `draft-${Date.now()}`,
      createdAt: new Date().toISOString(),
      profile: q('profile').value,
      from: q('from').value,
      fromName: q('fromName').value,
      to: q('to').value,
      cc: q('cc').value,
      bcc: q('bcc').value,
      subject: q('subject').value,
      body: q('bodyText').value,
      sourceMessageId: selected?.id || '',
      threadId: selected?.threadContext?.threadId || selected?.classification?.threadId || selected?.draft?.threadId || '',
      attachments
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify([item, ...drafts].slice(0, 100)));
    status('Draft spremljen lokalno.');
    if (currentBox === 'drafts') loadBox('drafts');
  }

  function restoreDraft(item) {
    q('profile').value = item.profile || q('profile').value;
    renderSignature();
    q('to').value = item.to || '';
    q('cc').value = item.cc || '';
    q('bcc').value = item.bcc || '';
    q('subject').value = item.subject || '';
    q('bodyText').value = item.body || '';
    attachments = Array.isArray(item.attachments) ? item.attachments : [];
    renderAttachments();
  }

  function newMessage() {
    selected = null;
    ['to', 'cc', 'bcc', 'subject', 'bodyText', 'aiContext'].forEach(id => {
      if (q(id)) q(id).value = '';
    });
    q('originalMeta').textContent = 'Nije odabrana poruka.';
    q('originalSubject').textContent = '—';
    q('originalBody').textContent = 'Odaberite poruku iz pretinca.';
    q('aiOutput').textContent = 'AI koristi sadržaj odabrane poruke, dostupni thread i vaš dodatni kontekst.';
    attachments = [];
    renderAttachments();
    status('Nova poruka.');
  }

  function previewMessage() {
    const activeProfile = profile();
    const brand = signatures?.brand || {};
    const popup = window.open('', 'GNKASGMailStudioPreview', 'width=900,height=850');
    if (!popup) return;
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>GNK ASG Mail Preview</title></head><body style="font-family:Arial,sans-serif;line-height:1.55;color:#111827;padding:32px"><h3>${esc(q('subject').value || '(bez predmeta)')}</h3><div>${esc(q('bodyText').value).replace(/\n/g, '<br>')}</div><hr style="margin:28px 0;border:0;border-top:1px solid #d1d5db"><img src="${esc(brand.logo || '/assets/gnk-asg-email-logo-final.png')}" style="width:145px"><p><strong>${esc(activeProfile?.name || '')}</strong><br>${esc(activeProfile?.title || '')}<br>${esc(brand.name || '')}<br>${esc(brand.address || '')}<br>${esc(brand.web || '')} · ${esc(brand.phone || '')}</p><small>${esc(activeProfile?.disclaimer || '')}</small></body></html>`);
    popup.document.close();
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',').pop());
      reader.onerror = () => reject(reader.error || new Error('Greška čitanja datoteke'));
      reader.readAsDataURL(file);
    });
  }

  async function addAttachments(files) {
    let total = attachments.reduce((sum, item) => sum + Number(item.size || 0), 0);
    for (const file of Array.from(files || [])) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) continue;
      if (total + file.size > MAX_PDF_TOTAL) {
        status('PDF privitci prelaze ukupni limit od približno 3,4 MB.');
        break;
      }
      attachments.push({
        filename: file.name,
        mimeType: 'application/pdf',
        size: file.size,
        base64: await fileToBase64(file)
      });
      total += file.size;
    }
    renderAttachments();
  }

  function renderAttachments() {
    q('attachmentList').innerHTML = attachments.length
      ? attachments.map((item, index) => `<div><strong>${esc(item.filename)}</strong> · ${Math.round(item.size / 1024)} KB <button type="button" data-remove-attachment="${index}">Ukloni</button></div>`).join('')
      : 'Nema privitaka.';
    document.querySelectorAll('[data-remove-attachment]').forEach(button => {
      button.addEventListener('click', () => {
        attachments.splice(Number(button.dataset.removeAttachment), 1);
        renderAttachments();
      });
    });
  }

  function splitRecipients(value) {
    return String(value || '')
      .split(/[;,]/)
      .map(item => item.trim())
      .filter(Boolean)
      .join(',');
  }

  async function sendMessage() {
    const activeProfile = profile();
    if (!token()) {
      status('Slanje zahtijeva operator prijavu.');
      return;
    }
    if (!q('to').value.trim() || !q('subject').value.trim() || !q('bodyText').value.trim()) {
      status('Nedostaje To, predmet ili sadržaj poruke.');
      return;
    }

    const payload = {
      mailbox: activeProfile?.key || 'office',
      from: activeProfile?.address || q('from').value,
      fromName: activeProfile?.name || q('fromName').value,
      to: splitRecipients(q('to').value),
      cc: splitRecipients(q('cc').value),
      bcc: splitRecipients(q('bcc').value),
      subject: q('subject').value,
      body: q('bodyText').value,
      signature: q('signaturePreview').innerText,
      signatureProfile: activeProfile?.key || 'office',
      addSignature: true,
      attachments,
      sourceMessageId: selected?.id || '',
      messageId: selected?.messageId || '',
      inReplyTo: selected?.messageId || selected?.inReplyTo || '',
      references: selected?.references || selected?.messageId || '',
      threadId: selected?.threadContext?.threadId || selected?.classification?.threadId || selected?.draft?.threadId || ''
    };

    status('Slanje…');
    let result = await request('/api/mail-agent/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!result.ok) {
      result = await request('/api/operator-send-mail', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    status(result.ok
      ? 'Poruka je poslana ili evidentirana.'
      : `Slanje nije uspjelo: HTTP ${result.status}`);
    if (result.ok) {
      newMessage();
      loadBox('sent');
    }
  }

  function bind() {
    q('operatorToken').value = token();
    q('saveToken').addEventListener('click', () => {
      const value = q('operatorToken').value.trim();
      if (!value) {
        status('Unesite operator token.');
        return;
      }
      window.GNKOperatorToken?.set?.(value);
      loadBox('inbox');
    });
    q('logout').addEventListener('click', () => {
      window.GNKOperatorToken?.clear?.();
      q('operatorToken').value = '';
      messages = [];
      selected = null;
      renderList();
      status('Odjavljeni ste.');
    });

    window.addEventListener('gnk:operator-token-changed', event => {
      q('operatorToken').value = event.detail?.present ? token() : '';
      if (event.detail?.present) loadBox(currentBox);
    });

    q('profile').addEventListener('change', renderSignature);
    q('newMessage').addEventListener('click', newMessage);
    q('saveDraft').addEventListener('click', saveDraft);
    q('previewMessage').addEventListener('click', previewMessage);
    q('sendMessage').addEventListener('click', sendMessage);
    q('refreshBox').addEventListener('click', () => loadBox(currentBox));
    q('pdfFiles').addEventListener('change', async event => {
      await addAttachments(event.target.files);
      event.target.value = '';
    });
    document.querySelectorAll('[data-box]').forEach(button => {
      button.addEventListener('click', () => loadBox(button.dataset.box));
    });
    q('aiSummarize').addEventListener('click', () => callAi('summary'));
    q('aiReply').addEventListener('click', () => callAi('reply'));
    q('aiImprove').addEventListener('click', () => callAi('improve'));
    q('aiShorten').addEventListener('click', () => callAi('shorten'));
    q('aiTranslate').addEventListener('click', () => callAi('translate'));
  }

  async function init() {
    await loadSignatures();
    bind();
    renderAttachments();
    if (token()) loadBox('inbox');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
