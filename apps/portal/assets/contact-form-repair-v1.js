(() => {
  if (window.__GNK_ASG_CONTACT_FORM_REPAIR_V1__) return;
  window.__GNK_ASG_CONTACT_FORM_REPAIR_V1__ = true;

  const q = id => document.getElementById(id);
  const isEn = location.pathname.startsWith('/en/');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const fallback = ['info','contact','it','legal','privacy','media','press','ubo','sefic','assistant']
    .map(key => ({key,label:key.toUpperCase(),address:`${key}@gnk-asg.hr`}));

  function mailboxRows(data) {
    const raw = Array.isArray(data) ? data : (data?.mailboxes || data?.items || data?.addresses || []);
    return raw.map(item => {
      if (typeof item === 'string') {
        const address = item.includes('@') ? item : `${item}@gnk-asg.hr`;
        return {key:address.split('@')[0],label:address,address};
      }
      const address = item.address || item.email || item.mailboxAddress || (item.key ? `${item.key}@gnk-asg.hr` : '');
      return {key:item.key || address.split('@')[0],label:item.label || item.name || address,address};
    }).filter(item => item.key && item.address);
  }

  function renderMailboxes(select, rows) {
    const current = select.value;
    select.innerHTML = rows.map(item => `<option value="${esc(item.key)}">${esc(item.label)} — ${esc(item.address)}</option>`).join('');
    if (current && [...select.options].some(option => option.value === current)) select.value = current;
  }

  async function loadMailboxes(select) {
    try {
      const response = await fetch('/api/contact-mailboxes?cb=' + Date.now(), {cache:'no-store'});
      const rows = response.ok ? mailboxRows(await response.json()) : [];
      renderMailboxes(select,rows.length ? rows : fallback);
    } catch { renderMailboxes(select,fallback); }
  }

  function toBase64(file) {
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',').pop() || '');
      reader.onerror = () => reject(reader.error || new Error('file_read_error'));
      reader.readAsDataURL(file);
    });
  }

  async function submit(form, out) {
    const fd = new FormData(form);
    const mailbox = String(fd.get('mailbox') || '').trim();
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const phone = String(fd.get('phone') || '').trim();
    const subject = String(fd.get('subject') || '').trim();
    const message = String(fd.get('message') || '').trim();
    const consent = form.querySelector('[name="consent"]')?.checked === true;
    const file = fd.get('pdf');

    if (!mailbox || !name || !email || !subject || !message || !consent) {
      out.className = 'gnk-contact-result error';
      out.textContent = isEn ? 'Complete all required fields and accept the privacy consent.' : 'Ispunite sva obvezna polja i potvrdite privolu za obradu podataka.';
      return;
    }
    if (file instanceof File && file.size > 8_000_000) {
      out.className = 'gnk-contact-result error';
      out.textContent = isEn ? 'PDF may not exceed 8 MB.' : 'PDF ne smije biti veći od 8 MB.';
      return;
    }

    out.className = 'gnk-contact-result';
    out.textContent = isEn ? 'Sending…' : 'Slanje…';
    const attachment = file instanceof File && file.size ? {
      filename:file.name,
      name:file.name,
      mimeType:'application/pdf',
      type:'application/pdf',
      size:file.size,
      base64:await toBase64(file)
    } : null;
    const payload = {
      mailbox,
      department:mailbox,
      recipientMailbox:mailbox,
      toMailbox:mailbox,
      name,
      fullName:name,
      senderName:name,
      email,
      senderEmail:email,
      phone,
      subject,
      message,
      body:message,
      consent:true,
      consentAccepted:true,
      consentValue:'yes',
      pdfAttachment:attachment,
      pdf:attachment,
      pdfName:attachment?.filename || '',
      pdfBase64:attachment?.base64 || ''
    };

    try {
      let response = await fetch('/api/contact-submit?cb=' + Date.now(), {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(payload)
      });
      let raw = await response.text();
      let data;
      try { data = JSON.parse(raw); } catch { data = {message:raw}; }

      if (!response.ok && data?.error === 'missing_required_fields') {
        const retry = new FormData();
        for (const [key,value] of Object.entries(payload)) {
          if (value === null || typeof value === 'object') continue;
          retry.append(key,String(value));
        }
        retry.append('consent','yes');
        if (file instanceof File && file.size) retry.append('pdf',file,file.name);
        response = await fetch('/api/contact-submit?cb=' + Date.now(), {method:'POST',body:retry});
        raw = await response.text();
        try { data = JSON.parse(raw); } catch { data = {message:raw}; }
      }

      if (!response.ok || data?.ok === false) throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
      out.className = 'gnk-contact-result ok';
      const reference = data.caseId || data.reference || data.id || data.ticket || '';
      out.textContent = `${isEn?'Message received':'Poruka je zaprimljena'}${reference ? ` · ${reference}` : ''}.`;
      form.querySelector('[name="message"]').value = '';
      form.querySelector('[name="pdf"]').value = '';
    } catch (error) {
      out.className = 'gnk-contact-result error';
      out.textContent = `${isEn?'Sending failed':'Slanje nije uspjelo'}: ${error.message}`;
    }
  }

  function init() {
    const form = q('f');
    const select = q('mailbox');
    const out = q('out');
    if (!form || !select || !out || form.dataset.gnkRepair === '1') return;
    form.dataset.gnkRepair = '1';
    out.className = 'gnk-contact-result';
    loadMailboxes(select);
    form.addEventListener('submit',event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      submit(form,out);
    },true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
