(() => {
  if (window.__GNK_MOBILE_QUICK_PUBLISHER__) return;
  window.__GNK_MOBILE_QUICK_PUBLISHER__ = true;
  if (!location.pathname.toLowerCase().startsWith('/operator-mobile/')) return;

  const DRAFT_KEY = 'GNK_ASG_MOBILE_QUICK_DRAFTS';
  const PUBLISH_URL = 'https://publish.gnk-asg.hr/api/publications/publish';
  let verified = false;
  let objectUrl = '';

  const q = id => document.getElementById(id);
  const token = () => window.GNKOperatorToken?.get?.() || '';
  const auth = () => window.GNKOperatorToken?.headers?.() || {};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));
  const countWords = text => (String(text || '').match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || []).length;
  const bodyHtml = text => String(text || '')
    .split(/\n\s*\n/)
    .map(paragraph => `<p>${esc(paragraph)}</p>`)
    .join('');
  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  function classify(text, lang) {
    const value = normalize(text);
    const rules = [
      {
        category: 'BPP i fintech',
        routeHr: '/objave/',
        routeEn: '/publications/',
        relatedHr: '/platforme/bpp/',
        relatedEn: '/en/platforms/bpp/',
        keywords: ['bpp', 'bitcoin payment processor', 'merchant', 'platna infrastruktura', 'payment processor', 'fintech']
      },
      {
        category: 'Tržišta',
        routeHr: '/objave/',
        routeEn: '/publications/',
        relatedHr: '/trzista/',
        relatedEn: '/markets/',
        keywords: ['bitcoin', 'zlato', 'brent', 'nafta', 'burza', 'trziste', 'tržište', 'euro', 'dolar', 'stablecoin', 'digitalna imovina']
      },
      {
        category: 'AI i tehnologija',
        routeHr: '/objave/',
        routeEn: '/publications/',
        relatedHr: '/assistant/',
        relatedEn: '/en/assistant/',
        keywords: ['ai', 'umjetna inteligencija', 'cloud', 'softver', 'software', 'api', 'automatizacija', 'kiberneticka', 'kibernetička', 'digitalna transformacija']
      },
      {
        category: 'Sport i ekonomija',
        routeHr: '/objave/',
        routeEn: '/publications/',
        relatedHr: '/#grupa',
        relatedEn: '/en/#grupa',
        keywords: ['sport', 'stadion', 'nogomet', 'kosarka', 'košarka', 'klub', 'igrac', 'igrač', 'sportska infrastruktura']
      },
      {
        category: 'Mediji i komunikacija',
        routeHr: '/objave/',
        routeEn: '/publications/',
        relatedHr: '/media-kit/',
        relatedEn: '/media-kit/',
        keywords: ['mediji', 'priopcenje', 'priopćenje', 'intervju', 'press', 'komunikacija', 'novinari']
      },
      {
        category: 'Korporativno upravljanje',
        routeHr: '/objave/',
        routeEn: '/publications/',
        relatedHr: '/#o-nama',
        relatedEn: '/en/#o-nama',
        keywords: ['upravljanje', 'revizija', 'kapital', 'imovina', 'direktor', 'nermin sefic', 'nermin sefić', 'gnk asg', 'gnk dinamo ltd']
      }
    ];

    let best = {
      category: 'Poslovanje',
      routeHr: '/objave/',
      routeEn: '/publications/',
      relatedHr: '/#o-nama',
      relatedEn: '/en/#o-nama',
      score: 0
    };

    for (const rule of rules) {
      const score = rule.keywords.reduce(
        (total, keyword) => total + (value.includes(normalize(keyword)) ? 3 : 0),
        0
      );
      if (score > best.score) best = { ...rule, score };
    }

    return {
      category: best.category,
      publicRoute: lang === 'en' ? best.routeEn : best.routeHr,
      relatedRoute: lang === 'en' ? best.relatedEn : best.relatedHr,
      reason: best.score
        ? `Prepoznate ključne teme za rubriku ${best.category}.`
        : 'Nije pronađena uža tema pa je odabrana opća poslovna rubrika.'
    };
  }

  function renderShell() {
    if (q('quick-publish')) return;
    const tabs = document.querySelector('.admin-tabs');
    const host = tabs?.parentElement;
    if (!tabs || !host) return;

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.dataset.tab = 'quick-publish';
    tab.textContent = 'Uslikaj i objavi';
    const desktopLink = tabs.querySelector('a');
    tabs.insertBefore(tab, desktopLink || null);

    const panel = document.createElement('div');
    panel.id = 'quick-publish';
    panel.className = 'admin-panel mobile-quick-publisher';
    panel.innerHTML = `
      <div class="mqp-auth">
        <span id="mqpTokenBadge" class="mqp-badge locked">TOKEN NIJE POTVRĐEN</span>
        <span id="mqpAuthText">Objava, AI priprema i upload zahtijevaju valjan operator token.</span>
      </div>
      <div class="mqp-grid">
        <div>
          <label>Fotografiraj ili odaberi sliku</label>
          <input id="mqpFile" type="file" accept="image/*" capture="environment">
          <div class="mqp-preview" id="mqpImagePreview"><span>Pregled fotografije</span></div>
          <label>Jezik</label>
          <select id="mqpLang"><option value="hr">HR</option><option value="en">EN</option></select>
          <label>Naslov</label>
          <input id="mqpTitle" maxlength="180" placeholder="Naslov objave">
          <label>Kratka bilješka ili cijeli tekst</label>
          <textarea id="mqpText" placeholder="Napišite što se dogodilo, gdje, kada i zašto je važno."></textarea>
          <div id="mqpWordCount" class="mqp-count">0 riječi</div>
          <label>Izvor URL – opcionalno</label>
          <input id="mqpSource" type="url" placeholder="https://...">
        </div>
        <div>
          <label>Predložena rubrika</label>
          <input id="mqpCategory" readonly>
          <div id="mqpRoute" class="mqp-route"></div>
          <label>Sažetak</label>
          <textarea id="mqpSummary" placeholder="Sustav će pripremiti sažetak."></textarea>
          <label>Slika URL nakon uploada</label>
          <input id="mqpImageUrl" readonly>
          <label>Ključne riječi</label>
          <input id="mqpKeywords" placeholder="GNK ASG, ...">
          <div class="mqp-actions">
            <button id="mqpClassify" type="button">Odredi rubriku</button>
            <button id="mqpAiPrepare" type="button">AI pripremi 500+ riječi</button>
            <button id="mqpSaveDraft" type="button">Spremi draft</button>
            <button id="mqpCheck" type="button">Provjeri</button>
            <button id="mqpPublish" class="primary" type="button">Objavi</button>
          </div>
          <div id="mqpStatus" class="mqp-status">Spremno.</div>
        </div>
      </div>`;
    host.appendChild(panel);

    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-panel').forEach(item => item.classList.remove('active'));
      document.querySelectorAll('[data-tab]').forEach(item => item.classList.remove('active'));
      panel.classList.add('active');
      tab.classList.add('active');
      location.hash = 'quick-publish';
    });

    if (location.hash === '#quick-publish') tab.click();
  }

  function status(text) {
    if (q('mqpStatus')) q('mqpStatus').textContent = text;
  }

  function updateCount() {
    const count = countWords(q('mqpText')?.value);
    if (!q('mqpWordCount')) return count;
    q('mqpWordCount').textContent = `${count} riječi`;
    q('mqpWordCount').className = `mqp-count${count >= 500 ? ' ok' : ''}`;
    return count;
  }

  function classifyCurrent() {
    const lang = q('mqpLang').value;
    const result = classify(`${q('mqpTitle').value} ${q('mqpText').value}`, lang);
    q('mqpCategory').value = result.category;
    q('mqpRoute').innerHTML = `<strong>Objava ide u:</strong> ${esc(result.publicRoute)}<br><strong>Povezani sadržaj:</strong> ${esc(result.relatedRoute)}<br>${esc(result.reason)}`;
    const base = ['GNK ASG', 'GNK DINAMO Ltd.', 'Nermin Sefić', result.category];
    q('mqpKeywords').value = [...new Set(base)].join(', ');
    return result;
  }

  function updateGuard() {
    const badge = q('mqpTokenBadge');
    if (!badge) return;
    badge.textContent = verified
      ? 'TOKEN POTVRĐEN'
      : token()
        ? 'TOKEN NIJE POTVRĐEN'
        : 'TOKEN NEDOSTAJE';
    badge.className = `mqp-badge ${verified ? 'ready' : 'locked'}`;
    ['mqpAiPrepare', 'mqpCheck', 'mqpPublish'].forEach(id => {
      if (q(id)) q(id).disabled = !verified;
    });
  }

  async function verifyToken() {
    verified = false;
    updateGuard();
    if (!token()) {
      status('Unesite operator token u glavnom dijelu Mobilnog Admina.');
      return false;
    }

    try {
      const response = await fetch('https://publish.gnk-asg.hr/api/publications/status', {
        headers: auth(),
        cache: 'no-store'
      });
      verified = response.ok;
      updateGuard();
      status(verified
        ? 'Operator token je potvrđen.'
        : `Token nije prihvaćen. HTTP ${response.status}`);
      return verified;
    } catch (error) {
      status(`Provjera tokena nije dostupna: ${error.message}`);
      updateGuard();
      return false;
    }
  }

  async function uploadImage() {
    const file = q('mqpFile').files?.[0];
    if (!file) throw new Error('Fotografija nije odabrana.');
    if (!verified && !(await verifyToken())) throw new Error('Operator token nije potvrđen.');

    const form = new FormData();
    form.append('title', q('mqpTitle').value.trim() || `mobilna-objava-${Date.now()}`);
    form.append('file', file);

    const response = await fetch('/operator/media-upload', {
      method: 'POST',
      headers: auth(),
      body: form
    });
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { raw }; }
    if (!response.ok) throw new Error(data.error || `Upload HTTP ${response.status}`);

    const url = data.url || data.publicUrl || data.imageUrl;
    if (!url) throw new Error('Upload nije vratio URL slike.');
    q('mqpImageUrl').value = url;
    return url;
  }

  async function aiPrepare() {
    if (!verified && !(await verifyToken())) return;
    const classification = classifyCurrent();
    const note = q('mqpText').value.trim();
    const title = q('mqpTitle').value.trim();
    if (!title || !note) return status('Unesite naslov i osnovnu bilješku.');

    status('AI priprema puni tekst bez izmišljanja činjenica…');
    const prompt = `Na temelju korisnikove bilješke pripremi profesionalnu GNK ASG objavu na ${q('mqpLang').value === 'en' ? 'engleskom' : 'hrvatskom'} jeziku. Rubrika: ${classification.category}. Tekst mora imati najmanje 500 riječi, jasan uvod, objašnjenje važnosti i vlastiti zaključak. Ne izmišljaj datume, iznose, osobe ni činjenice koje nisu u bilješci. Ako podatak nedostaje, napiši neutralno bez nadopunjavanja. Naslov: ${title}. Bilješka: ${note}`;

    try {
      const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...auth()
        },
        body: JSON.stringify({
          question: prompt,
          prompt,
          task: 'mobile-publication',
          publicOnly: false
        })
      });
      const raw = await response.text();
      let data;
      try { data = JSON.parse(raw); } catch { data = { answer: raw }; }
      const answer = data.answer || data.response || data.text || data.result;
      if (!response.ok || !answer) throw new Error(data.error || 'AI nije vratio tekst.');

      q('mqpText').value = answer;
      if (!q('mqpSummary').value.trim()) {
        q('mqpSummary').value = answer.replace(/\s+/g, ' ').slice(0, 300);
      }
      updateCount();
      classifyCurrent();
      status('AI tekst je pripremljen. Provjerite činjenice prije objave.');
    } catch (error) {
      status(`AI priprema nije uspjela: ${error.message}`);
    }
  }

  function readDrafts() {
    try {
      const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveDraft() {
    const classification = classifyCurrent();
    const item = {
      id: `mobile-draft-${Date.now()}`,
      createdAt: new Date().toISOString(),
      lang: q('mqpLang').value,
      title: q('mqpTitle').value,
      text: q('mqpText').value,
      summary: q('mqpSummary').value,
      source: q('mqpSource').value,
      imageUrl: q('mqpImageUrl').value,
      category: classification.category,
      publicRoute: classification.publicRoute,
      relatedRoute: classification.relatedRoute,
      filename: q('mqpFile').files?.[0]?.name || ''
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify([item, ...readDrafts()].slice(0, 100)));
    status('Mobilni draft je spremljen lokalno.');
  }

  function payload(dryRun) {
    const classification = classifyCurrent();
    const text = q('mqpText').value.trim();
    const title = q('mqpTitle').value.trim();
    const summary = q('mqpSummary').value.trim() || text.replace(/\s+/g, ' ').slice(0, 300);
    const source = q('mqpSource').value.trim();

    return {
      title,
      lang: q('mqpLang').value,
      summary,
      bodyHtml: bodyHtml(text),
      category: classification.category,
      image: q('mqpImageUrl').value.trim(),
      imageAlt: title,
      author: 'Nermin Sefić',
      sources: source ? [{ title: 'Izvor', url: source }] : [],
      keywords: q('mqpKeywords').value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean),
      seo: {
        description: summary,
        canonicalRoute: classification.publicRoute,
        relatedRoute: classification.relatedRoute
      },
      mobileCreated: true,
      targetRoute: classification.publicRoute,
      relatedRoute: classification.relatedRoute,
      dryRun
    };
  }

  async function publish(dryRun) {
    if (!verified && !(await verifyToken())) return;
    if (!q('mqpTitle').value.trim()) return status('Nedostaje naslov.');
    if (updateCount() < 500) {
      return status('Objava mora imati najmanje 500 riječi. Upotrijebite AI pripremu ili dopunite tekst.');
    }

    try {
      if (!q('mqpImageUrl').value.trim()) {
        status('Učitavanje fotografije…');
        await uploadImage();
      }

      const data = payload(dryRun);
      status(dryRun ? 'Provjera objave…' : 'Objavljivanje…');
      const response = await fetch(PUBLISH_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...auth()
        },
        body: JSON.stringify(data)
      });
      const raw = await response.text();
      let result;
      try { result = JSON.parse(raw); } catch { result = { raw }; }
      if (!response.ok) {
        throw new Error(result.error || result.validation?.join(', ') || `HTTP ${response.status}`);
      }

      status(dryRun
        ? `Provjera je prošla. Rubrika: ${data.category}.`
        : `Objava je prihvaćena. Rubrika: ${data.category}. Cilj: ${data.targetRoute}`);
    } catch (error) {
      status(`Objava nije prihvaćena: ${error.message}`);
    }
  }

  function previewFile() {
    const file = q('mqpFile').files?.[0];
    const host = q('mqpImagePreview');
    if (!file || !host) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    host.innerHTML = `<img src="${objectUrl}" alt="Pregled odabrane fotografije">`;
  }

  function bind() {
    q('mqpFile').addEventListener('change', previewFile);
    q('mqpTitle').addEventListener('input', classifyCurrent);
    q('mqpText').addEventListener('input', () => {
      updateCount();
      classifyCurrent();
    });
    q('mqpLang').addEventListener('change', classifyCurrent);
    q('mqpClassify').onclick = classifyCurrent;
    q('mqpAiPrepare').onclick = aiPrepare;
    q('mqpSaveDraft').onclick = saveDraft;
    q('mqpCheck').onclick = () => publish(true);
    q('mqpPublish').onclick = () => publish(false);

    q('saveToken')?.addEventListener('click', () => setTimeout(verifyToken, 100));
    q('clearToken')?.addEventListener('click', () => {
      verified = false;
      updateGuard();
    });

    window.addEventListener('gnk:operator-token-changed', event => {
      verified = false;
      updateGuard();
      if (event.detail?.present && token()) {
        verifyToken();
      } else {
        status('Operator token je uklonjen. Objavljivanje je zaključano.');
      }
    });

    window.addEventListener('hashchange', () => {
      if (location.hash === '#quick-publish') {
        document.querySelector('[data-tab="quick-publish"]')?.click();
      }
    });

    classifyCurrent();
    updateCount();
    verifyToken();
  }

  function init() {
    renderShell();
    if (!q('quick-publish')) return setTimeout(init, 250);
    bind();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
