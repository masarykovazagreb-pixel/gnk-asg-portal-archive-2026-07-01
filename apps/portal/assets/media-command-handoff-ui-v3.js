(() => {
  'use strict';
  if (window.__GNK_ASG_MEDIA_HANDOFF_UI_V3__) return;
  window.__GNK_ASG_MEDIA_HANDOFF_UI_V3__ = true;

  const API = '/api/media-command-center';
  const state = { manifest:null, contacts:null, sha256:'', sizeBytes:0, preview:null };
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  async function api(path, options={}) {
    const response = await fetch(`${API}${path}`, {
      credentials:'same-origin',
      headers:{'content-type':'application/json', ...(options.headers || {})},
      ...options
    });
    const data = await response.json().catch(() => ({ok:false,error:`HTTP_${response.status}`}));
    if (!response.ok || data.ok === false) {
      const error = new Error(data.message || data.error || `HTTP_${response.status}`);
      error.payload = data;
      throw error;
    }
    return data;
  }

  async function sha256(buffer) {
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  }

  function setNotice(text, error=false) {
    const notice = $('systemNotice');
    if (!notice) return;
    notice.textContent = text;
    notice.classList.toggle('error', error);
  }

  function replaceControl(id) {
    const current = $(id);
    if (!current) return null;
    const clone = current.cloneNode(true);
    current.replaceWith(clone);
    return clone;
  }

  function ensureManifestBox() {
    const panel = $('data-quality');
    if (!panel) return null;
    let box = $('handoffManifest');
    if (!box) {
      box = document.createElement('section');
      box.id = 'handoffManifest';
      box.className = 'mcc-handoff-status';
      box.innerHTML = '<strong>Učitavanje sigurnosnog manifesta…</strong>';
      panel.querySelector('.mcc-panel-head')?.after(box);
    }
    return box;
  }

  function ensureHashDetails(fileCard) {
    let details = $('contactImportHashDetails');
    if (details) return details;
    details = document.createElement('dl');
    details.id = 'contactImportHashDetails';
    details.className = 'mcc-hash-list';
    details.innerHTML = '<dt>Izračunati SHA-256</dt><dd><code id="contactImportHash">—</code></dd><dt>Status</dt><dd id="contactImportHashStatus">Čeka odabir datoteke</dd>';
    fileCard.querySelector('#contactImportFileInfo')?.after(details);
    return details;
  }

  function renderManifest() {
    const box = ensureManifestBox();
    const handoff = state.manifest?.handoff;
    if (!box || !handoff) return;
    box.innerHTML = `
      <div><strong>ZIP handoff manifest potvrđen</strong><span>${esc(handoff.version)}</span></div>
      <div><small>Očekivani dataset</small><b>${esc(handoff.contactCount)} kontakata · ${esc(handoff.withEmail)} e-mailova · ${esc(handoff.automationCandidates)} kandidata</b></div>
      <div><small>Očekivani SHA-256</small><code>${esc(handoff.sha256)}</code></div>
      <div><small>Privatnost</small><b>Puni dataset nije javni portal asset</b></div>`;
  }

  function resetImport(message='Čeka odabir datoteke') {
    state.contacts = null;
    state.sha256 = '';
    state.sizeBytes = 0;
    state.preview = null;
    const hash = $('contactImportHash');
    const hashStatus = $('contactImportHashStatus');
    if (hash) hash.textContent = '—';
    if (hashStatus) { hashStatus.textContent = message; hashStatus.className = ''; }
    const previewButton = $('previewContactImport');
    const applyButton = $('applyContactImport');
    if (previewButton) previewButton.disabled = true;
    if (applyButton) applyButton.disabled = true;
  }

  async function inspectFile(file) {
    resetImport('Provjera datoteke…');
    const info = $('contactImportFileInfo');
    if (!file) {
      if (info) info.textContent = 'Nijedna datoteka nije odabrana.';
      return;
    }
    const buffer = await file.arrayBuffer();
    const hash = await sha256(buffer);
    const text = new TextDecoder('utf-8', {fatal:true}).decode(buffer);
    let contacts;
    try { contacts = JSON.parse(text); }
    catch { throw new Error('Odabrana datoteka nije valjani UTF-8 JSON.'); }
    if (!Array.isArray(contacts)) throw new Error('JSON mora sadržavati polje kontakata.');

    state.contacts = contacts;
    state.sha256 = hash;
    state.sizeBytes = file.size;
    const handoff = state.manifest?.handoff || {};
    const expectedNames = handoff.expectedFileNames || [];
    const nameOk = !expectedNames.length || expectedNames.includes(file.name);
    const hashOk = hash === handoff.sha256;
    const sizeOk = Number(file.size) === Number(handoff.sizeBytes);
    const countOk = contacts.length === Number(handoff.contactCount);
    const valid = hashOk && sizeOk && countOk;

    if (info) info.textContent = `${file.name} · ${contacts.length} kontakata · ${(file.size / 1024).toFixed(1)} KB${nameOk ? '' : ' · nestandardni naziv'}`;
    $('contactImportHash').textContent = hash;
    const status = $('contactImportHashStatus');
    if (status) {
      status.textContent = valid ? 'IDENTIČAN SLUŽBENOM ZIP DATASETU' : `ODBIJENO · hash ${hashOk?'OK':'NE'} · veličina ${sizeOk?'OK':'NE'} · broj zapisa ${countOk?'OK':'NE'}`;
      status.className = valid ? 'ok' : 'bad';
    }
    $('previewContactImport').disabled = !valid;
    if (!valid) throw new Error('Dataset ne odgovara službenom ZIP handoff manifestu.');
    setNotice('ZIP dataset je lokalno potvrđen SHA-256 hashom. Spreman je za D1 preview.');
  }

  async function previewImport() {
    try {
      if (!state.contacts || !state.sha256) throw new Error('Prvo odaberite i potvrdite službeni dataset.');
      const result = await api('/import-preview', {
        method:'POST',
        body:JSON.stringify({contacts:state.contacts,datasetSha256:state.sha256,datasetSizeBytes:state.sizeBytes})
      });
      state.preview = result;
      $('contactImportPreview').textContent = JSON.stringify(result, null, 2);
      $('applyContactImport').disabled = false;
      setNotice('D1 preview je završen. Ništa još nije uvezeno.');
    } catch (error) {
      state.preview = null;
      $('applyContactImport').disabled = true;
      $('contactImportPreview').textContent = JSON.stringify(error.payload || {ok:false,error:error.message}, null, 2);
      setNotice(error.message, true);
    }
  }

  async function applyImport() {
    try {
      if (!state.preview || !state.contacts) throw new Error('Prvo završite D1 preview.');
      const confirmation = $('contactImportConfirmation')?.value.trim();
      if (confirmation !== 'IMPORT_112_CONTACTS') throw new Error('Potvrda nije točna.');
      const result = await api('/import-contacts', {
        method:'POST',
        body:JSON.stringify({
          contacts:state.contacts,
          datasetSha256:state.sha256,
          datasetSizeBytes:state.sizeBytes,
          confirm:confirmation,
          importedBy:'ADMIN'
        })
      });
      $('contactImportPreview').textContent = JSON.stringify(result, null, 2);
      $('applyContactImport').disabled = true;
      setNotice('Službeni ZIP dataset je uvezen. Produkcijsko slanje ostaje zaključano.');
      setTimeout(() => location.reload(), 1800);
    } catch (error) {
      setNotice(error.message, true);
    }
  }

  async function start() {
    const panel = $('data-quality');
    const fileCard = $('contactImportFile')?.closest('.mcc-import-card');
    if (!panel || !fileCard) return;
    ensureManifestBox();
    ensureHashDetails(fileCard);

    const fileInput = replaceControl('contactImportFile');
    const previewButton = replaceControl('previewContactImport');
    const applyButton = replaceControl('applyContactImport');
    if (!fileInput || !previewButton || !applyButton) return;
    previewButton.disabled = true;
    applyButton.disabled = true;

    try {
      state.manifest = await api('/handoff-manifest');
      renderManifest();
    } catch (error) {
      ensureManifestBox().innerHTML = `<strong>Manifest nije dostupan</strong><span>${esc(error.message)}</span>`;
      resetImport('Manifest nije dostupan');
      return;
    }

    fileInput.addEventListener('change', async () => {
      try { await inspectFile(fileInput.files?.[0]); }
      catch (error) { setNotice(error.message, true); }
    });
    previewButton.addEventListener('click', previewImport);
    applyButton.addEventListener('click', applyImport);
    resetImport();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
