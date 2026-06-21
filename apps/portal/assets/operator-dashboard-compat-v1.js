(() => {
  if (window.__GNK_ASG_OPERATOR_DASHBOARD_COMPAT_V1__ || !location.pathname.startsWith('/operator-dashboard/')) return;
  window.__GNK_ASG_OPERATOR_DASHBOARD_COMPAT_V1__ = true;

  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const vault = () => window.GNKOperatorToken;
  const headers = extra => ({...(extra || {}),...(vault()?.headers?.() || {})});

  function readFile(file) {
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',').pop() || '');
      reader.onerror = () => reject(reader.error || new Error('Greška čitanja PDF-a.'));
      reader.readAsDataURL(file);
    });
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {...options,headers:headers(options.headers),cache:'no-store'});
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = {raw}; }
    return {ok:response.ok,status:response.status,data};
  }

  function show(id, value) {
    const node = byId(id);
    if (node) node.textContent = typeof value === 'string' ? value : JSON.stringify(value,null,2);
  }

  function openWorkspace() {
    byId('workspace')?.classList.remove('hidden');
  }

  function mailboxAddress() {
    const key = byId('mailFrom')?.value || 'info';
    const option = byId('mailFrom')?.selectedOptions?.[0];
    const match = String(option?.textContent || '').match(/[A-Z0-9._%+-]+@gnk-asg\.hr/i);
    return match?.[0] || `${key}@gnk-asg.hr`;
  }

  function renderMessages(targetId, items) {
    const target = byId(targetId);
    if (!target) return;
    const list = Array.isArray(items) ? items : [];
    target.innerHTML = list.length ? list.slice(0,100).map((item,index) => {
      const subject = item.subject || item.title || '(bez predmeta)';
      const meta = item.from || item.to || item.email || item.sentAt || item.createdAt || '';
      const body = item.body || item.message || item.snippet || item.bodyPreview || JSON.stringify(item,null,2);
      return `<button type="button" class="mail-item" data-dashboard-message="${index}"><strong>${escapeHtml(subject)}</strong><small>${escapeHtml(meta)}</small><div>${escapeHtml(String(body).slice(0,220))}</div><pre hidden>${escapeHtml(String(body))}</pre></button>`;
    }).join('') : '<article class="mail-item">Nema poruka.</article>';
    target.querySelectorAll('[data-dashboard-message]').forEach(button => button.addEventListener('click',() => {
      const detail = button.querySelector('pre');
      detail.hidden = !detail.hidden;
    }));
  }

  async function login() {
    const value = String(byId('tokenInput')?.value || '').trim();
    if (!value) return show('loginOut','Token nije upisan.');
    vault()?.set?.(value);
    const result = await api('/operator/status?cb=' + Date.now());
    if (!result.ok) return show('loginOut',`Operator prijava nije prihvaćena: HTTP ${result.status}`);
    openWorkspace();
    show('loginOut','Sigurna operator sesija je potvrđena.');
    if (typeof window.fillAll === 'function') window.fillAll();
    await Promise.allSettled([loadInbox(),loadSent()]);
  }

  function logout() {
    vault()?.clear?.();
    if (byId('tokenInput')) byId('tokenInput').value = '';
    byId('workspace')?.classList.add('hidden');
    show('loginOut','Odjavljeni ste.');
  }

  async function sendMail() {
    const file = byId('mailPdf')?.files?.[0];
    const attachments = [];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return show('mailOut','Privitak mora biti PDF.');
      if (file.size > 8_000_000) return show('mailOut','PDF ne smije biti veći od 8 MB.');
      attachments.push({filename:file.name,mimeType:'application/pdf',size:file.size,base64:await readFile(file)});
    }
    const payload = {
      mailbox:byId('mailFrom')?.value || 'info',
      from:mailboxAddress(),
      fromName:'GNK ASG',
      to:String(byId('mailTo')?.value || '').trim(),
      subject:String(byId('mailSubject')?.value || '').trim(),
      body:String(byId('mailBody')?.value || '').trim(),
      signature:String(byId('mailSignature')?.value || ''),
      addSignature:byId('mailAddSignature')?.checked !== false,
      signatureProfile:byId('mailFrom')?.value || 'info',
      attachments
    };
    if (!payload.to || !payload.subject || !payload.body) return show('mailOut','Nedostaje primatelj, predmet ili tekst poruke.');
    show('mailOut','Slanje…');
    const result = await api('/api/mail-agent/send',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    show('mailOut',result.ok ? 'Poruka je poslana i evidentirana u Sent.' : `Slanje nije uspjelo: ${result.data?.message || result.data?.error || `HTTP ${result.status}`}`);
    if (result.ok) await loadSent();
  }

  async function loadInbox() {
    const result = await api('/api/mail-agent/inbox?cb=' + Date.now());
    renderMessages('inboxOut',result.ok ? result.data?.items : []);
    if (!result.ok) show('loginOut',`Inbox nije dostupan: HTTP ${result.status}`);
  }

  async function loadSent() {
    const result = await api('/api/mail-agent/sent?cb=' + Date.now());
    renderMessages('sentOut',result.ok ? result.data?.items : []);
    if (!result.ok) show('mailOut',`Sent nije dostupan: HTTP ${result.status}`);
  }

  async function sendContact() {
    const mailbox = byId('cMailbox')?.value || 'contact';
    const payload = {
      mailbox,department:mailbox,recipientMailbox:mailbox,toMailbox:mailbox,
      name:String(byId('cName')?.value || '').trim(),
      fullName:String(byId('cName')?.value || '').trim(),
      email:String(byId('cEmail')?.value || '').trim(),
      senderEmail:String(byId('cEmail')?.value || '').trim(),
      phone:'000',
      subject:String(byId('cSubject')?.value || '').trim(),
      message:String(byId('cMessage')?.value || '').trim(),
      body:String(byId('cMessage')?.value || '').trim(),
      consent:true,consentAccepted:true
    };
    const result = await api('/api/contact-submit?cb=' + Date.now(),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    show('contactOut',result.ok ? result.data : {ok:false,error:result.data?.message || result.data?.error || `HTTP ${result.status}`});
  }

  function bind() {
    if (!vault()) return setTimeout(bind,100);
    if (byId('tokenInput')) byId('tokenInput').value = vault().get?.() || '';
    if (byId('loginButton')) byId('loginButton').onclick = login;
    if (byId('logoutButton')) byId('logoutButton').onclick = logout;
    if (byId('sendMail')) byId('sendMail').onclick = sendMail;
    if (byId('loadInbox')) byId('loadInbox').onclick = loadInbox;
    if (byId('loadSent')) byId('loadSent').onclick = loadSent;
    if (byId('sendContact')) byId('sendContact').onclick = sendContact;
    if (vault().get?.()) { openWorkspace(); Promise.allSettled([loadInbox(),loadSent()]); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
