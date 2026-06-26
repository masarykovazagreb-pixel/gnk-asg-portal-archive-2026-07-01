(() => {
  'use strict';
  if (window.__GNK_ASG_MEDIA_APPLICATION_V1__) return;
  window.__GNK_ASG_MEDIA_APPLICATION_V1__ = true;

  const API = '/api/media-application';
  const DRAFT_KEY = 'gnk-media-application-draft-v1';
  const $ = id => document.getElementById(id);
  const form = $('applicationForm');
  const notice = $('formNotice');
  const submitButton = $('submitButton');
  let config = {maxFileBytes:10 * 1024 * 1024, maxFiles:4};
  let countdownTimer = null;
  let saveTimer = null;

  function setNotice(message, kind='') {
    if (!notice) return;
    notice.textContent = message;
    notice.className = `form-notice${kind ? ` ${kind}` : ''}`;
  }

  function formatDeadline(value) {
    try {
      return new Intl.DateTimeFormat('hr-HR', {
        dateStyle:'long', timeStyle:'short', timeZone:'Europe/Zagreb'
      }).format(new Date(value));
    } catch (_) { return value; }
  }

  function renderCountdown(deadline) {
    const node = $('countdown');
    if (!node) return;
    clearInterval(countdownTimer);
    const tick = () => {
      const ms = Date.parse(deadline) - Date.now();
      if (!Number.isFinite(ms)) { node.textContent = 'Rok nije dostupan / Deadline unavailable'; return; }
      if (ms <= 0) { node.textContent = 'Rok je istekao / Deadline passed'; submitButton.disabled = true; return; }
      const days = Math.floor(ms / 86400000);
      const hours = Math.floor(ms % 86400000 / 3600000);
      const minutes = Math.floor(ms % 3600000 / 60000);
      node.textContent = `${days} dana · ${hours} h · ${minutes} min`;
    };
    tick();
    countdownTimer = setInterval(tick, 30000);
  }

  async function loadConfig() {
    try {
      const response = await fetch(`${API}/config`, {credentials:'same-origin', cache:'no-store', headers:{accept:'application/json'}});
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      config = {...config, ...data};
      $('deadlineText').textContent = formatDeadline(data.deadline);
      renderCountdown(data.deadline);
    } catch (_) {
      renderCountdown('2026-07-20T21:59:59.000Z');
    }
  }

  function serializableDraft() {
    const draft = {};
    for (const element of form.elements) {
      if (!element.name || element.type === 'file' || element.type === 'submit' || element.name === 'companyFax') continue;
      draft[element.name] = element.type === 'checkbox' ? element.checked : element.value;
    }
    return draft;
  }

  function saveDraft() {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(serializableDraft()));
      setNotice('Nacrt je spremljen u ovoj kartici preglednika. Datoteke se ne spremaju.', 'success');
    } catch (_) {}
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 700);
  }

  function restoreDraft() {
    try {
      const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
      let restored = 0;
      for (const [name, value] of Object.entries(draft)) {
        const element = form.elements.namedItem(name);
        if (!element || element.type === 'file') continue;
        if (element.type === 'checkbox') element.checked = Boolean(value);
        else element.value = String(value ?? '');
        restored += 1;
      }
      if (restored) setNotice('Vraćen je privremeno spremljen nacrt. Ponovno odaberite priloge.', 'success');
    } catch (_) {}
  }

  function normalizePhone(value) {
    return String(value || '').replace(/[\s().-]/g, '');
  }

  function validateFiles() {
    const files = [...form.querySelectorAll('input[type="file"]')].flatMap(input => [...(input.files || [])]);
    if (files.length > Number(config.maxFiles || 4)) throw new Error(`Najviše ${config.maxFiles || 4} datoteke / Maximum ${config.maxFiles || 4} files.`);
    for (const file of files) {
      if (file.size > Number(config.maxFileBytes || 10 * 1024 * 1024)) throw new Error(`${file.name}: datoteka je veća od 10 MB.`);
      if (/passport|putovnic/i.test(file.name)) throw new Error('Preslika putovnice ne smije se priložiti u početnoj fazi.');
    }
  }

  function validateForm() {
    if (!form.reportValidity()) throw new Error('Ispunite sva obvezna polja i potvrdite izjave.');
    for (const name of ['applicantMobile','editorMobile']) {
      const value = normalizePhone(form.elements.namedItem(name)?.value);
      if (!/^\+[1-9]\d{7,14}$/.test(value)) throw new Error('Telefonski brojevi moraju biti u međunarodnom formatu, primjerice +385...');
    }
    validateFiles();
  }

  function humanStatus(value) {
    const map = {
      READY_FOR_HUMAN_REVIEW:'Spremna za ljudsku provjeru',
      MANUAL_DOMAIN_VERIFICATION:'Potrebna ručna provjera domene',
      INCOMPLETE:'Potrebna dopuna',
      LATE:'Zaprimljena nakon roka'
    };
    return map[value] || value || 'Zaprimljena';
  }

  function showResult(data) {
    $('resultApplicationId').textContent = data.applicationId || '—';
    $('resultStatus').textContent = humanStatus(data.status);
    $('resultReceivedAt').textContent = new Intl.DateTimeFormat('hr-HR', {dateStyle:'long', timeStyle:'medium'}).format(new Date(data.receivedAt));
    $('resultMessage').textContent = data.message || 'Prijava čeka ljudsku provjeru.';
    form.hidden = true;
    $('resultPanel').hidden = false;
    sessionStorage.removeItem(DRAFT_KEY);
    $('resultPanel').scrollIntoView({behavior:'smooth', block:'start'});
  }

  async function submit(event) {
    event.preventDefault();
    try {
      validateForm();
      submitButton.disabled = true;
      submitButton.textContent = 'Slanje… / Submitting…';
      setNotice('Prijenos i sigurnosna provjera dokumenata su u tijeku…');
      const response = await fetch(`${API}/submit`, {method:'POST', body:new FormData(form), credentials:'same-origin', headers:{accept:'application/json'}});
      const data = await response.json().catch(() => ({ok:false,error:`HTTP_${response.status}`}));
      if (!response.ok || !data.ok) {
        const messages = {
          invitation_code_not_found:'Šifra poziva nije pronađena. Provjerite službeni poziv.',
          required_fields_missing:'Nedostaju obvezni podaci.',
          required_confirmations_missing:'Potvrdite sve obvezne izjave.',
          invalid_email:'Provjerite službene e-mail adrese.',
          invalid_phone:'Provjerite međunarodni format telefonskog broja.',
          duplicate_recent:'Prijava s ovom šifrom i e-mailom nedavno je već zaprimljena.',
          rate_limit:'Previše pokušaja. Pričekajte prije ponovnog slanja.',
          request_too_large:'Ukupna veličina prijave je prevelika.'
        };
        throw new Error(data.message || messages[data.error] || data.error || 'Prijava nije poslana.');
      }
      showResult(data);
    } catch (error) {
      setNotice(error.message || 'Prijava nije poslana. Pokušajte ponovno.', 'error');
      notice?.scrollIntoView({behavior:'smooth', block:'center'});
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Pošalji prijavu / Submit application';
    }
  }

  form?.addEventListener('input', scheduleSave);
  form?.addEventListener('change', scheduleSave);
  form?.addEventListener('submit', submit);
  restoreDraft();
  loadConfig();
})();
