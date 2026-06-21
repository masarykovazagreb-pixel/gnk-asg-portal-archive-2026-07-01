(() => {
  if (window.__GNK_ASG_MEDIA_CAMPAIGN_STUDIO__) return;
  window.__GNK_ASG_MEDIA_CAMPAIGN_STUDIO__ = true;

  const $ = id => document.getElementById(id);
  const SESSION_KEY = 'GNK_ASG_OPERATOR_TOKEN_SESSION';
  const LEGACY_TOKEN_KEY = 'GNK_ASG_OPERATOR_TOKEN';
  const CAMPAIGN_KEY = 'GNK_ASG_MEDIA_CAMPAIGN_ID';
  const state = {
    recipients: [],
    invalid: [],
    pdf: null,
    currentCampaignId: localStorage.getItem(CAMPAIGN_KEY) || ''
  };

  function fallbackSession() {
    return {
      get() {
        return String(sessionStorage.getItem(SESSION_KEY) || '').trim();
      },
      set(value) {
        const token = String(value || '').trim();
        if (!token) return this.clear();
        sessionStorage.setItem(SESSION_KEY, token);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        window.dispatchEvent(new CustomEvent('gnk:operator-token-changed', { detail: { present: true } }));
        return true;
      },
      clear() {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        window.dispatchEvent(new CustomEvent('gnk:operator-token-changed', { detail: { present: false } }));
        return false;
      },
      headers() {
        const token = this.get();
        return token ? { authorization: `Bearer ${token}`, 'x-operator-token': token } : {};
      }
    };
  }

  const localSession = fallbackSession();
  const session = () => window.GNKOperatorToken || localSession;
  const token = () => session().get();
  const authHeaders = () => session().headers();
  const status = message => { if ($('campaignStatus')) $('campaignStatus').textContent = message; };
  const esc = value => String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);

  localStorage.removeItem(LEGACY_TOKEN_KEY);

  async function request(requestPath, options = {}) {
    const headers = new Headers(options.headers || {});
    for (const [key, value] of Object.entries(authHeaders())) headers.set(key, value);
    const response = await fetch(requestPath, {
      ...options,
      headers,
      cache: options.cache || 'no-store'
    });
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { raw }; }
    return { ok: response.ok, status: response.status, data };
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function validEmail(value) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value || '').trim());
  }

  function detectDelimiter(line) {
    return [',', ';', '\t'].sort((left, right) => line.split(right).length - line.split(left).length)[0];
  }

  function parseRow(line, delimiter) {
    const cells = [];
    let current = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"') {
        if (quoted && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (character === delimiter && !quoted) {
        cells.push(current.trim());
        current = '';
      } else {
        current += character;
      }
    }
    cells.push(current.trim());
    return cells;
  }

  function normaliseHeader(value) {
    return clean(value).toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }

  function headerKey(value) {
    const map = {
      ime: 'firstName', firstname: 'firstName', name: 'firstName',
      prezime: 'lastName', lastname: 'lastName', surname: 'lastName',
      medij: 'media', media: 'media', company: 'media', tvrtka: 'media',
      email: 'email', emailadresa: 'email', mail: 'email',
      jezik: 'language', language: 'language'
    };
    return map[normaliseHeader(value)] || '';
  }

  function parseRecipients(text) {
    const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return { valid: [], invalid: [{ row: 1, error: 'missing_rows' }] };
    const delimiter = detectDelimiter(lines[0]);
    const headers = parseRow(lines[0], delimiter).map(headerKey);
    const valid = [];
    const invalid = [];
    const seen = new Set();

    lines.slice(1, 101).forEach((line, index) => {
      const values = parseRow(line, delimiter);
      const recipient = {};
      headers.forEach((key, position) => { if (key) recipient[key] = clean(values[position]); });
      recipient.email = String(recipient.email || '').toLowerCase();
      recipient.language = String(recipient.language || $('campaignLanguage')?.value || 'hr').toLowerCase();
      let error = '';
      if (!validEmail(recipient.email)) error = 'invalid_email';
      else if (!recipient.media) error = 'missing_media';
      else if (seen.has(recipient.email)) error = 'duplicate_email';
      if (error) invalid.push({ row: index + 2, recipient, error });
      else {
        seen.add(recipient.email);
        valid.push(recipient);
      }
    });
    return { valid, invalid };
  }

  function renderRecipients() {
    $('recipientStats').textContent = `${state.recipients.length} valjanih · ${state.invalid.length} nevaljanih · maksimalno 100`;
    $('recipientTable').innerHTML = state.recipients.length
      ? state.recipients.map((item, index) => `<tr><td>${index + 1}</td><td>${esc(item.firstName)}</td><td>${esc(item.lastName)}</td><td>${esc(item.media)}</td><td>${esc(item.email)}</td></tr>`).join('')
      : '<tr><td colspan="5">Kontakti još nisu učitani.</td></tr>';
    $('invalidRows').textContent = state.invalid.length ? JSON.stringify(state.invalid, null, 2) : 'Nema nevaljanih redaka.';
  }

  async function importFile(file) {
    if (!file) return;
    const parsed = parseRecipients(await file.text());
    state.recipients = parsed.valid;
    state.invalid = parsed.invalid;
    renderRecipients();
    status(`Uvezeno ${state.recipients.length} valjanih kontakata.`);
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',').pop() || '');
      reader.onerror = () => reject(reader.error || new Error('Greška čitanja datoteke.'));
      reader.readAsDataURL(file);
    });
  }

  async function loadPdf(file) {
    if (!file) {
      state.pdf = null;
      $('pdfStatus').textContent = 'PDF nije učitan.';
      return;
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new Error('Privitak mora biti PDF.');
    if (file.size > 8_000_000) throw new Error('PDF je veći od 8 MB.');
    state.pdf = {
      filename: file.name,
      mimeType: 'application/pdf',
      size: file.size,
      base64: await fileToBase64(file)
    };
    $('pdfStatus').textContent = `${file.name} · ${Math.ceil(file.size / 1024)} KB`;
  }

  function scheduledAt() {
    const value = $('campaignSchedule').value;
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error('Neispravan datum zakazivanja.');
    return date.toISOString();
  }

  function campaignPayload() {
    if (!token()) throw new Error('Nedostaje operator prijava.');
    if (!state.recipients.length) throw new Error('Uvezite barem jednog valjanog primatelja.');
    if (!state.pdf) throw new Error('Učitajte PDF privitak.');
    const subject = clean($('campaignSubject').value);
    const bodyTemplate = clean($('campaignBody').value);
    if (!subject || !bodyTemplate) throw new Error('Nedostaje predmet ili tekst poruke.');
    return {
      subject,
      bodyTemplate,
      senderMailbox: $('campaignFrom').value,
      from: $('campaignFrom').value,
      signatureProfile: $('campaignProfile').value,
      language: $('campaignLanguage').value,
      pdfAttachmentName: state.pdf.filename,
      scheduledAt: scheduledAt(),
      recipients: state.recipients
    };
  }

  function personalise(template, recipient) {
    const values = {
      firstName: recipient.firstName || '',
      lastName: recipient.lastName || '',
      fullName: `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim(),
      media: recipient.media || '',
      email: recipient.email || ''
    };
    return String(template || '').replace(/{{\s*(firstName|lastName|fullName|media|email)\s*}}/gi, (_, key) => {
      const match = Object.keys(values).find(item => item.toLowerCase() === key.toLowerCase());
      return values[match] || '';
    }).trim();
  }

  async function uploadPdf(campaignId) {
    if (!state.pdf) throw new Error('PDF nije učitan.');
    const result = await request(`/api/mail-agent/media-campaign/${encodeURIComponent(campaignId)}/attachment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pdfAttachment: state.pdf })
    });
    if (!result.ok) throw new Error(result.data?.error || `PDF upload HTTP ${result.status}`);
    return result.data;
  }

  async function createPreview() {
    try {
      const payload = campaignPayload();
      status('Kreiranje kampanje…');
      const result = await request('/api/mail-agent/media-campaign/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!result.ok) throw new Error(result.data?.error || `HTTP ${result.status}`);
      state.currentCampaignId = result.data?.batch?.id || '';
      localStorage.setItem(CAMPAIGN_KEY, state.currentCampaignId);
      await uploadPdf(state.currentCampaignId);
      renderCampaignStatus(result.data?.batch || result.data);
      status('Kampanja i PDF sigurno su spremljeni u testnom režimu.');
      await loadCampaigns();
    } catch (error) {
      status(`Greška: ${error.message}`);
    }
  }

  async function testSend() {
    try {
      const address = clean($('testAddress').value).toLowerCase();
      if (!validEmail(address)) throw new Error('Unesite valjanu testnu e-mail adresu.');
      const payload = campaignPayload();
      const recipient = { ...state.recipients[0], email: address };
      const result = await request('/api/mail-agent/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          from: payload.from,
          fromName: 'GNK ASG Media',
          to: address,
          subject: `[TEST] ${personalise(payload.subject, recipient)}`,
          body: personalise(payload.bodyTemplate, recipient),
          language: payload.language,
          signatureProfile: payload.signatureProfile,
          attachments: [state.pdf]
        })
      });
      if (!result.ok) throw new Error(result.data?.error || `HTTP ${result.status}`);
      status(`Testna poruka poslana je na ${address}.`);
    } catch (error) {
      status(`Test nije uspio: ${error.message}`);
    }
  }

  async function campaignAction(action) {
    try {
      if (!token()) throw new Error('Nedostaje operator prijava.');
      if (!state.currentCampaignId) throw new Error('Nije odabrana kampanja.');
      const method = ['pause', 'resume', 'execute-window'].includes(action) ? 'POST' : 'GET';
      const result = await request(`/api/mail-agent/media-campaign/${encodeURIComponent(state.currentCampaignId)}/${action}`, { method });
      if (!result.ok) throw new Error(result.data?.error || `HTTP ${result.status}`);
      renderCampaignStatus(result.data?.campaign || result.data?.preview || result.data);
      status(action === 'execute-window'
        ? 'Obrađen je testni prozor. Stvarno masovno slanje ostaje isključeno.'
        : `Akcija ${action} je izvršena.`);
      await loadCampaigns();
    } catch (error) {
      status(`Akcija nije uspjela: ${error.message}`);
    }
  }

  function renderCampaignStatus(campaign = {}) {
    const values = {
      campaignId: campaign.id || campaign.batchId || state.currentCampaignId || '—',
      campaignState: campaign.status || campaign.reason || '—',
      campaignSent: Number(campaign.sent || 0),
      campaignTested: Number(campaign.tested || 0),
      campaignFailed: Number(campaign.failed || 0),
      campaignRemaining: Number(campaign.remaining || 0)
    };
    Object.entries(values).forEach(([id, value]) => { if ($(id)) $(id).textContent = value; });
  }

  async function loadCampaigns() {
    if (!token()) return;
    const result = await request('/api/mail-agent/media-campaigns');
    const campaigns = result.data?.campaigns || [];
    $('campaignList').innerHTML = campaigns.length
      ? campaigns.map(item => `<button type="button" class="campaign-item" data-campaign-id="${esc(item.id)}"><strong>${esc(item.id)}</strong><span>${esc(item.status)} · Sent ${Number(item.sent || 0)} · Tested ${Number(item.tested || 0)} · Failed ${Number(item.failed || 0)} · Suppressed ${Number(item.suppressed || 0)} · Remaining ${Number(item.remaining || 0)}</span></button>`).join('')
      : '<p>Nema spremljenih kampanja.</p>';
    document.querySelectorAll('[data-campaign-id]').forEach(button => {
      button.addEventListener('click', () => {
        state.currentCampaignId = button.dataset.campaignId;
        localStorage.setItem(CAMPAIGN_KEY, state.currentCampaignId);
        campaignAction('status');
      });
    });
  }

  async function loadMailboxes() {
    try {
      const response = await fetch(`/data/mail-signatures.json?cb=${Date.now()}`, { cache: 'no-store' });
      const data = await response.json();
      const profiles = Array.isArray(data.profiles) ? data.profiles : [];
      if (profiles.length) {
        $('campaignFrom').innerHTML = profiles.map(item => `<option value="${esc(item.address)}">${esc(item.label || item.name)} — ${esc(item.address)}</option>`).join('');
        $('campaignProfile').innerHTML = profiles.map(item => `<option value="${esc(item.key)}">${esc(item.label || item.key)}</option>`).join('');
      }
    } catch {}
  }

  function bind() {
    $('operatorToken').value = token();
    $('saveToken').addEventListener('click', async () => {
      const value = $('operatorToken').value.trim();
      if (value) session().set(value);
      else session().clear();
      status(value ? 'Operator prijava spremljena je samo za aktivnu sesiju.' : 'Operator prijava je uklonjena.');
      if (value) await loadCampaigns();
    });
    $('logout').addEventListener('click', () => {
      session().clear();
      $('operatorToken').value = '';
      $('campaignList').innerHTML = '<p>Prijavite se za učitavanje kampanja.</p>';
      status('Odjavljeni ste.');
    });
    window.addEventListener('gnk:operator-token-changed', event => {
      $('operatorToken').value = event.detail?.present ? token() : '';
      if (event.detail?.present) loadCampaigns();
    });
    $('recipientFile').addEventListener('change', event => importFile(event.target.files?.[0]).catch(error => status(error.message)));
    $('pdfFile').addEventListener('change', event => loadPdf(event.target.files?.[0]).catch(error => status(error.message)));
    $('createCampaign').addEventListener('click', createPreview);
    $('testSend').addEventListener('click', testSend);
    $('pauseCampaign').addEventListener('click', () => campaignAction('pause'));
    $('resumeCampaign').addEventListener('click', () => campaignAction('resume'));
    $('windowCampaign').addEventListener('click', () => campaignAction('window'));
    $('executeWindow').addEventListener('click', () => campaignAction('execute-window'));
    $('refreshCampaigns').addEventListener('click', loadCampaigns);
  }

  async function init() {
    bind();
    renderRecipients();
    await loadMailboxes();
    if (token()) await loadCampaigns();
    if (state.currentCampaignId && token()) await campaignAction('status');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
