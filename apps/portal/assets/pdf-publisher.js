(() => {
  if (window.__GNK_PDF_PUBLISHER__) return;
  window.__GNK_PDF_PUBLISHER__ = true;

  const q = id => document.getElementById(id);
  const TOKEN_KEY = 'GNK_ASG_OPERATOR_TOKEN';
  const DRAFT_KEY = 'GNK_ASG_PDF_DRAFTS';
  let objectUrl = '';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const token = () => localStorage.getItem(TOKEN_KEY) || '';
  const status = text => { q('statusBox').textContent = text; };

  function fields() {
    const file = q('pdfFile').files?.[0] || null;
    return {
      file,
      type:q('type').value,
      lang:q('lang').value,
      status:q('status').value,
      author:q('author').value.trim(),
      title:q('title').value.trim(),
      summary:q('summary').value.trim(),
      category:q('category').value.trim(),
      image:q('image').value.trim(),
      keywords:q('keywords').value.trim(),
      sourceUrl:q('sourceUrl').value.trim()
    };
  }

  function validate(data) {
    return [
      ['PDF datoteka', Boolean(data.file && (data.file.type === 'application/pdf' || data.file.name.toLowerCase().endsWith('.pdf')))],
      ['Naslov', data.title.length >= 5],
      ['Sažetak', data.summary.length >= 20],
      ['Autor', data.author.length >= 3],
      ['Naslovna slika', /^https:\/\//i.test(data.image)],
      ['Jezik', ['hr','en'].includes(data.lang)],
      ['Veličina do 20 MB', !data.file || data.file.size <= 20 * 1024 * 1024]
    ];
  }

  function renderPreview() {
    const data = fields();
    const checks = validate(data);
    q('metaPreview').innerHTML = `<strong>${esc(data.title || 'Naslov dokumenta')}</strong><br><small>${esc(data.type)} · ${esc(data.lang.toUpperCase())} · ${esc(data.author || 'Autor')}</small><p>${esc(data.summary || 'Sažetak dokumenta')}</p>`;
    q('seoCheck').innerHTML = checks.map(([label,ok]) => `<div class="${ok?'ok':'bad'}">${ok?'✓':'!'} ${esc(label)}</div>`).join('');
    return checks.every(([,ok]) => ok);
  }

  function previewFile() {
    const file = q('pdfFile').files?.[0];
    if (!file) return status('Odaberite PDF datoteku.');
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    q('pdfFrame').src = objectUrl;
    renderPreview();
    status(`Pregled: ${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`);
  }

  function readDrafts() {
    try { const data = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; }
  }

  function saveDraft() {
    const data = fields();
    const item = {
      id:`draft-${Date.now()}`,
      type:data.type,lang:data.lang,status:'draft',author:data.author,title:data.title,summary:data.summary,
      category:data.category,image:data.image,keywords:data.keywords,sourceUrl:data.sourceUrl,
      filename:data.file?.name || '',size:data.file?.size || 0,createdAt:new Date().toISOString()
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify([item, ...readDrafts()].slice(0,100)));
    renderDrafts();
    status('Lokalni draft je spremljen. PDF datoteka nije spremljena u preglednik.');
  }

  function renderDrafts() {
    const items = readDrafts();
    q('draftList').innerHTML = items.length ? items.map(item => `<article><strong>${esc(item.title || '(bez naslova)')}</strong><br><small>${esc(item.type)} · ${esc(item.lang)} · ${esc(item.filename)} · ${esc(item.createdAt)}</small></article>`).join('') : 'Nema draftova.';
  }

  async function publish() {
    const data = fields();
    if (!renderPreview()) return status('Nisu ispunjeni svi uvjeti za slanje.');
    if (!token()) return status('Nedostaje operator token.');
    localStorage.setItem(TOKEN_KEY, q('operatorToken').value.trim());
    const form = new FormData();
    for (const key of ['type','lang','status','author','title','summary','category','image','keywords','sourceUrl']) form.append(key, data[key] || '');
    form.append('file', data.file, data.file.name);
    status('Slanje u PDF Publisher preview…');
    try {
      const response = await fetch('/api/pdf-publications/upload', { method:'POST', headers:{authorization:`Bearer ${token()}`,'x-operator-token':token()}, body:form });
      const raw = await response.text();
      let result; try { result = JSON.parse(raw); } catch { result = {error:raw}; }
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      status(`PDF je zaprimljen u preview. ID: ${result.record?.id || '—'}`);
    } catch (error) {
      saveDraft();
      status(`Backend još nije povezan; spremljen je lokalni draft. ${error.message}`);
    }
  }

  function bind() {
    q('operatorToken').value = token();
    q('operatorToken').addEventListener('change', () => localStorage.setItem(TOKEN_KEY, q('operatorToken').value.trim()));
    q('previewPdf').onclick = previewFile;
    q('saveDraft').onclick = saveDraft;
    q('publishPdf').onclick = publish;
    q('refreshDrafts').onclick = renderDrafts;
    q('pdfFile').addEventListener('change', previewFile);
    ['type','lang','status','author','title','summary','category','image','keywords','sourceUrl'].forEach(id => q(id).addEventListener('input', renderPreview));
  }

  function init() { bind(); renderPreview(); renderDrafts(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
