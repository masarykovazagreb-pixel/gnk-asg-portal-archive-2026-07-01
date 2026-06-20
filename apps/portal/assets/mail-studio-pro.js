(() => {
  if (window.__GNK_ASG_MAIL_STUDIO_PRO__) return;
  window.__GNK_ASG_MAIL_STUDIO_PRO__ = true;

  const q = id => document.getElementById(id);
  const TOKEN_KEY = 'GNK_ASG_OPERATOR_TOKEN';
  const DRAFT_KEY = 'GNK_ASG_MAIL_STUDIO_PRO_DRAFTS';
  const MAX_PDF_TOTAL = 3_400_000;
  let currentBox = 'inbox';
  let messages = [];
  let selected = null;
  let signatures = null;
  let attachments = [];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  })[ch]);
  const token = () => localStorage.getItem(TOKEN_KEY) || '';
  const auth = () => token() ? {authorization:`Bearer ${token()}`,'x-operator-token':token()} : {};
  const status = text => { if (q('status')) q('status').textContent = text; };

  async function request(url, options = {}) {
    const response = await fetch(url, {...options, headers:{...(options.headers || {}), ...auth()}});
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = {raw}; }
    return {ok:response.ok,status:response.status,data,raw};
  }

  async function loadSignatures() {
    try {
      const response = await fetch(`/data/mail-signatures.json?cb=${Date.now()}`, {cache:'no-store'});
      signatures = await response.json();
    } catch {
      signatures = {
        brand:{name:'GNK ASG d.o.o.',logo:'/assets/gnk-asg-email-logo-final.png',address:'Zagrebačka cesta 130, 10090 Zagreb',oib:'75227917632',mbs:'081512375',web:'https://gnk-asg.hr',phone:'+385 91 535 8365'},
        profiles:[{key:'office',label:'GNK ASG Office',address:'office@gnk-asg.hr',name:'GNK ASG Office',title:'Korporativni ured',disclaimer:''}]
      };
    }
    q('profile').innerHTML = signatures.profiles.map(profile => `<option value="${esc(profile.key)}">${esc(profile.label)} — ${esc(profile.address)}</option>`).join('');
    renderSignature();
  }

  function profile() {
    return signatures?.profiles?.find(item => item.key === q('profile').value) || signatures?.profiles?.[0];
  }

  function renderSignature() {
    const p = profile();
    const b = signatures?.brand;
    if (!p || !b) return;
    q('from').value = p.address || '';
    q('fromName').value = p.name || '';
    q('signaturePreview').innerHTML = `
      <img src="${esc(b.logo)}" alt="GNK ASG">
      <div><strong style="font-size:18px">${esc(p.name)}</strong><br>${esc(p.title || '')}<br>${esc(b.name || '')}<br>${esc(b.address || '')}<br>OIB: ${esc(b.oib || '')} · MBS: ${esc(b.mbs || '')}<br><a href="${esc(b.web || '#')}">${esc(b.web || '')}</a> · ${esc(b.phone || '')}</div>
      <small style="display:block;margin-top:10px;color:#6b7280">${esc(p.disclaimer || '')}</small>`;
  }

  function extractItems(data) {
    if (Array.isArray(data)) return data;
    for (const key of ['items','messages','emails','inbox','sent','outbox','held','logs','data']) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
  }

  async function loadBox(type = currentBox) {
    currentBox = type;
    document.querySelectorAll('[data-box]').forEach(button => button.classList.toggle('active', button.dataset.box === type));
    q('mailList').innerHTML = '<p>Učitavanje…</p>';

    if (type === 'drafts') {
      messages = readDrafts();
      renderList();
      status(`Drafts: ${messages.length}`);
      return;
    }

    const endpoints = {
      inbox:['/api/mail-agent/inbox','/api/mail-center/inbox','/operator/contact-inbox'],
      sent:['/api/mail-agent/sent','/api/mail-center/sent','/operator/mail-log-list'],
      outbox:['/api/mail-agent/outbox','/api/mail-center/outbox'],
      held:['/api/mail-agent/held']
    }[type] || [];

    for (const endpoint of endpoints) {
      try {
        const result = await request(`${endpoint}?cb=${Date.now()}`, {cache:'no-store'});
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
    q('mailList').innerHTML = messages.length ? messages.slice(0,200).map((item,index) => `
      <article class="mail-item" data-index="${index}">
        <strong>${esc(item.subject || item.title || '(bez predmeta)')}</strong>
        <small>${esc(item.from || item.sender || item.to || item.recipient || item.email || '')}${item.createdAt || item.sentAt || item.receivedAt ? ` · ${esc(item.createdAt || item.sentAt || item.receivedAt)}` : ''}</small>
        <p>${esc(String(item.snippet || item.message || item.body || item.text || '').slice(0,240))}</p>
      </article>`).join('') : '<p>Nema zapisa ili backend nije dostupan.</p>';
    document.querySelectorAll('.mail-item').forEach(node => node.addEventListener('click', () => selectMessage(Number(node.dataset.index), node)));
  }

  function selectMessage(index, node) {
    selected = messages[index] || null;
    document.querySelectorAll('.mail-item').forEach(item => item.classList.remove('active'));
    node?.classList.add('active');
    if (!selected) return;

    const subject = selected.subject || selected.title || '(bez predmeta)';
    const from = selected.from || selected.sender || selected.email || '';
    const to = selected.to || selected.recipient || '';
    const date = selected.receivedAt || selected.sentAt || selected.createdAt || selected.timestamp || '';
    q('originalSubject').textContent = subject;
    q('originalMeta').textContent = [from && `From: ${from}`, to && `To: ${to}`, date && `Date: ${date}`].filter(Boolean).join(' · ');
    q('originalBody').textContent = selected.body || selected.message || selected.text || selected.snippet || JSON.stringify(selected,null,2);

    if (currentBox === 'inbox' || currentBox === 'held') {
      q('to').value = from;
      q('subject').value = /^re:/i.test(subject) ? subject : `Re: ${subject}`;
    }
    if (currentBox === 'drafts') restoreDraft(selected);
  }

  function mailContext() {
    return {
      subject:q('originalSubject').textContent,
      from:selected?.from || selected?.sender || selected?.email || '',
      body:q('originalBody').textContent,
      currentDraft:q('bodyText').value,
      extraContext:q('aiContext').value,
      senderProfile:profile()?.label || '',
      recipients:{to:q('to').value,cc:q('cc').value,bcc:q('bcc').value}
    };
  }

  async function callAi(task) {
    q('aiOutput').textContent = 'AI analizira sadržaj…';
    const instructions = {
      summary:'Sažmi odabranu poruku. Izdvoji zahtjeve, rokove, rizike i potrebne radnje. Ne izmišljaj činjenice.',
      reply:'Napiši kontekstualan odgovor na hrvatskom jeziku. Odgovori izravno na konkretna pitanja. Ne koristi gotov predložak i ne preuzimaj pravne, financijske ili ugovorne obveze.',
      improve:'Poboljšaj postojeći tekst bez promjene činjenica. Ukloni ponavljanja i učini ga jasnim i profesionalnim.',
      shorten:'Skrati postojeći tekst uz očuvanje svih bitnih činjenica i značenja.',
      translate:'Prevedi postojeći tekst na drugi jezik između hrvatskog i engleskog. Sačuvaj ton i činjenice.'
    }[task];

    try {
      const response = await fetch('/api/ai-assist', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({question:instructions,message:instructions,prompt:instructions,mailContext:mailContext(),task,pageUrl:location.href,publicOnly:false})
      });
      const raw = await response.text();
      let data;
      try { data = JSON.parse(raw); } catch { data = {answer:raw}; }
      const answer = data.answer || data.response || data.message || data.text || data.result;
      if (!response.ok || !answer) throw new Error('AI endpoint nije vratio odgovor.');
      q('aiOutput').textContent = answer;
      if (task !== 'summary') q('bodyText').value = answer;
      status('AI obrada završena.');
    } catch (error) {
      q('aiOutput').textContent = `AI nije dostupan: ${error.message}`;
      status('AI fallback.');
    }
  }

  function readDrafts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  function saveDraft() {
    const drafts = readDrafts();
    const item = {
      id:`draft-${Date.now()}`,
      createdAt:new Date().toISOString(),
      profile:q('profile').value,
      from:q('from').value,
      fromName:q('fromName').value,
      to:q('to').value,
      cc:q('cc').value,
      bcc:q('bcc').value,
      subject:q('subject').value,
      body:q('bodyText').value,
      attachments
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify([item,...drafts].slice(0,100)));
    status('Draft spremljen.');
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
    ['to','cc','bcc','subject','bodyText','aiContext'].forEach(id => { if (q(id)) q(id).value = ''; });
    q('originalMeta').textContent = 'Nije odabrana poruka.';
    q('originalSubject').textContent = '—';
    q('originalBody').textContent = 'Odaberite poruku iz pretinca.';
    attachments = [];
    renderAttachments();
    status('Nova poruka.');
  }

  function previewMessage() {
    const p = profile();
    const b = signatures?.brand || {};
    const popup = window.open('', 'GNKASGMailStudioPreview', 'width=900,height=850');
    if (!popup) return;
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>GNK ASG Mail Preview</title></head><body style="font-family:Arial,sans-serif;line-height:1.55;color:#111827;padding:32px"><h3>${esc(q('subject').value || '(bez predmeta)')}</h3><div>${esc(q('bodyText').value).replace(/\n/g,'<br>')}</div><hr style="margin:28px 0;border:0;border-top:1px solid #d1d5db"><img src="${esc(b.logo || '/assets/gnk-asg-email-logo-final.png')}" style="width:145px"><p><strong>${esc(p?.name || '')}</strong><br>${esc(p?.title || '')}<br>${esc(b.name || '')}<br>${esc(b.address || '')}<br>${esc(b.web || '')} · ${esc(b.phone || '')}</p><small>${esc(p?.disclaimer || '')}</small></body></html>`);
    popup.document.close();
  }

  function fileToBase64(file) {
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',').pop());
      reader.onerror = () => reject(reader.error || new Error('Greška čitanja datoteke'));
      reader.readAsDataURL(file);
    });
  }

  async function addAttachments(files) {
    let total = attachments.reduce((sum,item) => sum + Number(item.size || 0), 0);
    for (const file of Array.from(files || [])) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) continue;
      if (total + file.size > MAX_PDF_TOTAL) {
        status('PDF privitci prelaze ukupni limit od približno 3,4 MB.');
        break;
      }
      attachments.push({filename:file.name,mimeType:'application/pdf',size:file.size,base64:await fileToBase64(file)});
      total += file.size;
    }
    renderAttachments();
  }

  function renderAttachments() {
    q('attachmentList').innerHTML = attachments.length ? attachments.map((item,index) => `<div><strong>${esc(item.filename)}</strong> · ${Math.round(item.size/1024)} KB <button type="button" data-remove-attachment="${index}">Ukloni</button></div>`).join('') : 'Nema privitaka.';
    document.querySelectorAll('[data-remove-attachment]').forEach(button => button.addEventListener('click', () => {
      attachments.splice(Number(button.dataset.removeAttachment),1);
      renderAttachments();
    }));
  }

  function splitRecipients(value) {
    return String(value || '').split(/[;,]/).map(item => item.trim()).filter(Boolean).join(',');
  }

  async function sendMessage() {
    const p = profile();
    if (!q('to').value.trim() || !q('subject').value.trim() || !q('bodyText').value.trim()) {
      status('Nedostaje To, predmet ili sadržaj poruke.');
      return;
    }

    const payload = {
      mailbox:p?.key || 'office',
      from:p?.address || q('from').value,
      fromName:p?.name || q('fromName').value,
      to:splitRecipients(q('to').value),
      cc:splitRecipients(q('cc').value),
      bcc:splitRecipients(q('bcc').value),
      subject:q('subject').value,
      body:q('bodyText').value,
      signature:q('signaturePreview').innerText,
      signatureProfile:p?.key || 'office',
      addSignature:true,
      attachments
    };

    status('Slanje…');
    let result = await request('/api/admin-mail-send', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify(payload)
    });
    if (!result.ok) {
      result = await request('/api/operator-send-mail', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(payload)
      });
    }
    status(result.ok ? 'Poruka je poslana ili evidentirana.' : `Slanje nije uspjelo: HTTP ${result.status}`);
    if (result.ok) {
      newMessage();
      loadBox('sent');
    }
  }

  function bind() {
    q('operatorToken').value = token();
    q('saveToken').addEventListener('click', () => {
      const value = q('operatorToken').value.trim();
      if (value) localStorage.setItem(TOKEN_KEY,value);
      loadBox('inbox');
    });
    q('logout').addEventListener('click', () => {
      localStorage.removeItem(TOKEN_KEY);
      q('operatorToken').value = '';
      status('Odjavljeni ste.');
    });
    q('profile').addEventListener('change',renderSignature);
    q('newMessage').addEventListener('click',newMessage);
    q('saveDraft').addEventListener('click',saveDraft);
    q('previewMessage').addEventListener('click',previewMessage);
    q('sendMessage').addEventListener('click',sendMessage);
    q('refreshBox').addEventListener('click',() => loadBox(currentBox));
    q('pdfFiles').addEventListener('change',async event => { await addAttachments(event.target.files); event.target.value=''; });
    document.querySelectorAll('[data-box]').forEach(button => button.addEventListener('click',() => loadBox(button.dataset.box)));
    q('aiSummarize').addEventListener('click',() => callAi('summary'));
    q('aiReply').addEventListener('click',() => callAi('reply'));
    q('aiImprove').addEventListener('click',() => callAi('improve'));
    q('aiShorten').addEventListener('click',() => callAi('shorten'));
    q('aiTranslate').addEventListener('click',() => callAi('translate'));
  }

  async function init() {
    await loadSignatures();
    bind();
    renderAttachments();
    if (token()) loadBox('inbox');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
