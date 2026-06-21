(() => {
  if (window.__GNK_PDF_PUBLISHER_SECURE__) return;
  window.__GNK_PDF_PUBLISHER_SECURE__ = true;

  const $ = id => document.getElementById(id);
  const DRAFTS = 'GNK_ASG_PDF_DRAFTS';
  let previewUrl = '';

  const session = () => window.GNKOperatorToken;
  const status = text => { $('statusBox').textContent = text; };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));

  function values() {
    const file = $('pdfFile').files?.[0] || null;
    return {
      file,
      type: $('type').value,
      lang: $('lang').value,
      status: $('status').value,
      author: $('author').value.trim(),
      title: $('title').value.trim(),
      summary: $('summary').value.trim(),
      category: $('category').value.trim(),
      image: $('image').value.trim(),
      keywords: $('keywords').value.trim(),
      sourceUrl: $('sourceUrl').value.trim()
    };
  }

  function checks(data) {
    return [
      ['PDF datoteka', Boolean(data.file && (data.file.type === 'application/pdf' || data.file.name.toLowerCase().endsWith('.pdf')))],
      ['Naslov', data.title.length >= 5],
      ['Sažetak', data.summary.length >= 20],
      ['Autor', data.author.length >= 3],
      ['Naslovna slika', /^https:\/\//i.test(data.image)],
      ['Jezik', ['hr', 'en'].includes(data.lang)],
      ['Veličina do 20 MB', !data.file || data.file.size <= 20 * 1024 * 1024]
    ];
  }

  function render() {
    const data = values();
    const result = checks(data);
    $('metaPreview').innerHTML = `<strong>${escapeHtml(data.title || 'Naslov dokumenta')}</strong><br><small>${escapeHtml(data.type)} · ${escapeHtml(data.lang.toUpperCase())} · ${escapeHtml(data.author || 'Autor')}</small><p>${escapeHtml(data.summary || 'Sažetak dokumenta')}</p>`;
    $('seoCheck').innerHTML = result.map(([label, ok]) => `<div class="${ok ? 'ok' : 'bad'}">${ok ? '✓' : '!'} ${escapeHtml(label)}</div>`).join('');
    return result.every(([, ok]) => ok);
  }

  function preview() {
    const file = values().file;
    if (!file) return status('Odaberite PDF datoteku.');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    $('pdfFrame').src = previewUrl;
    render();
    status(`Pregled: ${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`);
  }

  function readDrafts() {
    try {
      const data = JSON.parse(localStorage.getItem(DRAFTS) || '[]');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function renderDrafts() {
    const items = readDrafts();
    $('draftList').innerHTML = items.length
      ? items.map(item => `<article><strong>${escapeHtml(item.title || '(bez naslova)')}</strong><br><small>${escapeHtml(item.type)} · ${escapeHtml(item.lang)} · ${escapeHtml(item.filename)} · ${escapeHtml(item.createdAt)}</small></article>`).join('')
      : 'Nema draftova.';
  }

  function saveDraft() {
    const data = values();
    const draft = {
      id: `draft-${Date.now()}`,
      type: data.type,
      lang: data.lang,
      status: 'draft',
      author: data.author,
      title: data.title,
      summary: data.summary,
      category: data.category,
      image: data.image,
      keywords: data.keywords,
      sourceUrl: data.sourceUrl,
      filename: data.file?.name || '',
      size: data.file?.size || 0,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(DRAFTS, JSON.stringify([draft, ...readDrafts()].slice(0, 100)));
    renderDrafts();
    status('Lokalni draft je spremljen. PDF datoteka nije spremljena u preglednik.');
  }

  async function publish() {
    const entered = $('operatorToken').value.trim();
    if (entered) session()?.set?.(entered);
    const data = values();
    if (!render()) return status('Nisu ispunjeni svi uvjeti za slanje.');
    if (!session()?.get?.()) return status('Nedostaje operator prijava.');

    const form = new FormData();
    for (const key of ['type', 'lang', 'status', 'author', 'title', 'summary', 'category', 'image', 'keywords', 'sourceUrl']) {
      form.append(key, data[key] || '');
    }
    form.append('file', data.file, data.file.name);
    status('Slanje u PDF Publisher preview…');

    try {
      const response = await fetch('/api/pdf-publications/upload', {
        method: 'POST',
        headers: session()?.headers?.() || {},
        body: form
      });
      const raw = await response.text();
      let result;
      try { result = JSON.parse(raw); } catch { result = { error: raw }; }
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      status(`PDF je zaprimljen u preview. ID: ${result.record?.id || '—'}`);
    } catch (error) {
      saveDraft();
      status(`Backend još nije povezan; spremljen je lokalni draft. ${error.message}`);
    }
  }

  function init() {
    $('operatorToken').value = session()?.get?.() || '';
    $('operatorToken').addEventListener('change', () => {
      const value = $('operatorToken').value.trim();
      if (value) session()?.set?.(value);
      else session()?.clear?.();
    });
    window.addEventListener('gnk:operator-token-changed', event => {
      $('operatorToken').value = event.detail?.present ? session()?.get?.() || '' : '';
    });
    $('previewPdf').onclick = preview;
    $('saveDraft').onclick = saveDraft;
    $('publishPdf').onclick = publish;
    $('refreshDrafts').onclick = renderDrafts;
    $('pdfFile').addEventListener('change', preview);
    ['type', 'lang', 'status', 'author', 'title', 'summary', 'category', 'image', 'keywords', 'sourceUrl']
      .forEach(id => $(id).addEventListener('input', render));
    render();
    renderDrafts();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
