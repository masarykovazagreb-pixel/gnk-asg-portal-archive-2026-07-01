(() => {
  'use strict';
  if (window.__GNK_ASG_MAIL_STUDIO_CONTROLS_V18__) return;
  window.__GNK_ASG_MAIL_STUDIO_CONTROLS_V18__ = true;

  const VERSION = 'GNK_ASG_MAIL_STUDIO_CONTROLS_V18_20260626';
  const DRAFT_KEY = 'gnk_asg_mail_studio_draft_v18';
  const LEGACY_DRAFT_KEY = 'gnk_asg_mail_studio_draft';
  const ACTIONS = ['send','save','load','helper','autoReply','clear'];

  const el = id => document.getElementById(id);
  const value = id => String(el(id)?.value || '');
  const setValue = (id, next) => { const node = el(id); if (node) node.value = next || ''; };
  const setStatus = text => { const node = el('status'); if (node) node.textContent = text; };
  const escapeHtml = text => String(text || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const bodyHtml = () => escapeHtml(value('bodyText')).replace(/\r?\n/g,'<br>');
  const previewHtml = () => el('preview')?.innerHTML || bodyHtml();

  const profileData = () => ({
    profile:value('profile') || 'office',
    from:value('from'),
    fromName:value('fromName'),
    to:value('to'),
    cc:value('cc'),
    bcc:value('bcc'),
    subject:value('subject'),
    body:value('bodyText')
  });

  const refreshPreview = () => {
    const subject = value('subject') || '(bez predmeta)';
    const preview = el('preview');
    if (!preview) return;
    const existingSignature = preview.querySelector('.signature, table');
    const signature = existingSignature ? existingSignature.outerHTML : '';
    preview.innerHTML = `<b>Predmet:</b> ${escapeHtml(subject)}<br><br>${bodyHtml()}${signature}`;
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(profileData()));
      localStorage.setItem(LEGACY_DRAFT_KEY, JSON.stringify(profileData()));
      setStatus('Draft spremljen.');
    } catch (error) {
      setStatus(`Greška spremanja drafta: ${error.message}`);
    }
  };

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY) || localStorage.getItem(LEGACY_DRAFT_KEY) || '';
      if (!raw) { setStatus('Nema spremljenog drafta.'); return; }
      const draft = JSON.parse(raw);
      ['profile','from','fromName','to','cc','bcc','subject'].forEach(id => setValue(id,draft[id]));
      setValue('bodyText',draft.body);
      el('profile')?.dispatchEvent(new Event('change',{bubbles:true}));
      el('bodyText')?.dispatchEvent(new Event('input',{bubbles:true}));
      refreshPreview();
      setStatus('Draft učitan.');
    } catch (error) {
      setStatus(`Greška učitavanja drafta: ${error.message}`);
    }
  };

  const makeTemplate = () => {
    const mode = value('mode') || 'reply';
    const current = value('bodyText').trim();
    let text;
    if (mode === 'legal') {
      text = `Poštovani,\n\nvezano uz Vašu poruku, potvrđujemo primitak te ćemo navode razmotriti u okviru dostupne dokumentacije i nadležnosti GNK ASG d.o.o.\n\n${current}\n\nSva prava i pravni interesi GNK ASG d.o.o. ostaju pridržani.\n\nSrdačan pozdrav,`;
    } else if (mode === 'short') {
      text = 'Poštovani,\n\nhvala na poruci. Zaprimili smo Vaš upit i javit ćemo se s odgovorom u najkraćem razumnom roku.\n\nSrdačan pozdrav,';
    } else if (mode === 'media') {
      text = 'Poštovani,\n\nhvala na medijskom upitu. Molimo da sva dodatna pitanja i rokove dostavite pisanim putem kako bismo mogli pripremiti cjelovit odgovor.\n\nSrdačan pozdrav,';
    } else {
      text = `Poštovani,\n\nzahvaljujemo na Vašoj poruci te potvrđujemo da smo je uredno zaprimili.\n\n${current}\n\nSrdačan pozdrav,`;
    }
    setValue('bodyText',text);
    el('bodyText')?.dispatchEvent(new Event('input',{bubbles:true}));
    refreshPreview();
    setStatus('Predložak pripremljen.');
  };

  const makeAutoReply = () => {
    setValue('bodyText','Poštovani,\n\novim putem potvrđujemo da je Vaša poruka uredno zaprimljena u sustavu GNK ASG. Nakon interne obrade, odgovor ćemo Vam dostaviti pisanim putem u najkraćem mogućem roku.\n\nHvala na razumijevanju.\n\nSrdačan pozdrav,');
    el('bodyText')?.dispatchEvent(new Event('input',{bubbles:true}));
    refreshPreview();
    setStatus('Auto odgovor pripremljen.');
  };

  const clearForm = () => {
    ['to','cc','bcc','subject','bodyText'].forEach(id => setValue(id,''));
    el('bodyText')?.dispatchEvent(new Event('input',{bubbles:true}));
    refreshPreview();
    setStatus('Polja su očišćena.');
  };

  const authHeaders = () => {
    try { return window.GNK_ASG_ADMIN_AUTH?.headers?.() || {}; }
    catch (_) { return {}; }
  };

  const sendMail = async button => {
    const payload = {
      ...profileData(),
      body:previewHtml(),
      html:previewHtml(),
      bodyHtml:previewHtml(),
      text:value('bodyText'),
      attachments:Array.isArray(window.GNK_ASG_PDF_ATTACHMENTS_FINAL) ? window.GNK_ASG_PDF_ATTACHMENTS_FINAL.slice() : []
    };
    payload.attachmentCount = payload.attachments.length;

    if (!payload.to.trim()) { setStatus('Nedostaje To primatelj.'); el('to')?.focus(); return; }
    if (!payload.subject.trim()) { setStatus('Nedostaje predmet.'); el('subject')?.focus(); return; }

    button.disabled = true;
    setStatus('Slanje poruke…');
    try {
      const headers = new Headers({'content-type':'application/json','accept':'application/json'});
      Object.entries(authHeaders()).forEach(([key,val]) => { if (val) headers.set(key,val); });
      const response = await fetch('/api/admin-mail-send',{
        method:'POST',
        credentials:'same-origin',
        cache:'no-store',
        headers,
        body:JSON.stringify(payload)
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (_) { data = {raw:text}; }
      const list = el('list');
      if (list) list.textContent = JSON.stringify({status:response.status,ok:response.ok,data},null,2);
      if (!response.ok) {
        setStatus(`Greška slanja: ${response.status}`);
        return;
      }
      setStatus(`Poruka je poslana/evidentirana. PDF priloga: ${payload.attachmentCount}`);
    } catch (error) {
      setStatus(`Greška slanja: ${error.message}`);
    } finally {
      button.disabled = false;
    }
  };

  const handlers = {
    send:sendMail,
    save:saveDraft,
    load:loadDraft,
    helper:makeTemplate,
    autoReply:makeAutoReply,
    clear:clearForm
  };

  const replaceButton = action => {
    const old = el(action);
    if (!old || old.dataset.gnkV18Replaced === '1') return;
    const next = old.cloneNode(true);
    next.id = `gnkMailV18_${action}`;
    next.dataset.gnkV18Action = action;
    next.dataset.gnkV18Replaced = '1';
    next.disabled = false;
    next.style.pointerEvents = 'auto';
    next.style.cursor = 'pointer';
    old.replaceWith(next);
    next.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const fn = handlers[action];
      if (action === 'send') fn(next);
      else fn();
    });
  };

  const install = () => {
    ACTIONS.forEach(replaceButton);
    document.documentElement.dataset.gnkMailControls = VERSION;
    setStatus('Mail Studio kontrole V18 su aktivne.');
  };

  const boot = () => {
    setTimeout(install,0);
    setTimeout(install,250);
    setTimeout(install,1000);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
