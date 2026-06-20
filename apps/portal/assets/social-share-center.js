(() => {
  if (window.__GNK_ASG_SOCIAL_SHARE_CENTER__) return;
  window.__GNK_ASG_SOCIAL_SHARE_CENTER__ = true;

  const q = id => document.getElementById(id);
  const TOKEN_KEY = 'GNK_ASG_OPERATOR_TOKEN';
  const LOG_KEY = 'GNK_ASG_SOCIAL_SHARE_LOG';
  let config = null;
  let shareUrl = '';

  const token = () => localStorage.getItem(TOKEN_KEY) || '';
  const authHeaders = () => token() ? {authorization:`Bearer ${token()}`,'x-operator-token':token()} : {};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const status = text => { q('status').textContent = text; };

  async function init() {
    q('operatorToken').value = token();
    try {
      const response = await fetch(`/data/social-share-config.json?cb=${Date.now()}`, {cache:'no-store'});
      config = await response.json();
    } catch {
      config = {brand:{name:'GNK ASG',defaultImage:'https://gnk-asg.hr/assets/gnk-asg-email-logo-final.png',defaultImageAlt:'GNK ASG',defaultHashtags:['GNKASG']}};
    }
    bind();
    useBrandImage();
    updatePreview();
    renderLog();
  }

  function bind() {
    q('saveToken').onclick = () => {
      const value = q('operatorToken').value.trim();
      if (value) localStorage.setItem(TOKEN_KEY, value);
      q('authStatus').textContent = value ? 'Operator token spremljen lokalno.' : 'Token nije unesen.';
    };
    q('logout').onclick = () => {
      localStorage.removeItem(TOKEN_KEY);
      q('operatorToken').value = '';
      q('authStatus').textContent = 'Odjavljeni ste.';
    };
    q('readPage').onclick = readPage;
    q('useBrandImage').onclick = useBrandImage;
    q('generateCaption').onclick = generateCaption;
    q('createShareLink').onclick = createShareLink;
    q('copyCaption').onclick = () => copyText(composePostText());
    q('clearForm').onclick = clearForm;
    q('refreshLog').onclick = renderLog;
    ['targetUrl','contentType','language','title','description','canonical','image','imageAlt','caption','hashtags'].forEach(id => q(id).addEventListener('input',updatePreview));
    document.querySelectorAll('[data-provider]').forEach(button => button.onclick = () => share(button.dataset.provider));
  }

  function normalizeTarget(value) {
    const input = String(value || '').trim();
    if (!input) throw new Error('Nedostaje URL sadržaja.');
    const url = new URL(input, 'https://gnk-asg.hr');
    if (!/(^|\.)gnk-asg\.hr$/i.test(url.hostname) && !/\.workers\.dev$/i.test(url.hostname)) throw new Error('Dopuštene su samo GNK ASG javne stranice i preview URL-ovi.');
    if (/\/(operator|admin|mail-center|mail-studio|command-center|social-share)\//i.test(url.pathname)) throw new Error('Privatne administratorske stranice nije dopušteno dijeliti.');
    url.hash = '';
    return url.href;
  }

  async function readPage() {
    status('Učitavanje stranice i metapodataka…');
    try {
      const target = normalizeTarget(q('targetUrl').value);
      const response = await fetch(target, {cache:'no-store',headers:{accept:'text/html'}});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html,'text/html');
      const canonical = absolute(meta(doc,'link[rel="canonical"]','href') || target, target);
      const title = meta(doc,'meta[property="og:title"]','content') || meta(doc,'meta[name="twitter:title"]','content') || doc.querySelector('h1')?.textContent?.trim() || doc.title || 'GNK ASG';
      const description = meta(doc,'meta[property="og:description"]','content') || meta(doc,'meta[name="description"]','content') || meta(doc,'meta[name="twitter:description"]','content') || firstParagraph(doc) || '';
      const image = pickImage(doc,target);
      const alt = meta(doc,'meta[property="og:image:alt"]','content') || doc.querySelector('article img[alt],main img[alt]')?.getAttribute('alt') || `${title} | GNK ASG`;
      q('targetUrl').value = target;
      q('canonical').value = canonical;
      q('title').value = title.slice(0,180);
      q('description').value = description.slice(0,500);
      q('image').value = image;
      q('imageAlt').value = alt.slice(0,220);
      q('caption').value = suggestedCaption(title,description,canonical);
      q('hashtags').value = defaultHashtags();
      shareUrl = canonical;
      updatePreview();
      status('Stranica je učitana. Provjerite naslov, opis i sliku prije dijeljenja.');
    } catch (error) {
      status(`Učitavanje nije uspjelo: ${error.message}`);
    }
  }

  function meta(doc, selector, attribute) {
    return doc.querySelector(selector)?.getAttribute(attribute)?.trim() || '';
  }

  function firstParagraph(doc) {
    return [...doc.querySelectorAll('article p,main p')].map(node => node.textContent.trim()).find(text => text.length > 80) || '';
  }

  function pickImage(doc, base) {
    const candidates = [
      meta(doc,'meta[property="og:image"]','content'),
      meta(doc,'meta[property="og:image:secure_url"]','content'),
      meta(doc,'meta[name="twitter:image"]','content'),
      meta(doc,'link[rel="image_src"]','href'),
      doc.querySelector('article img[src]')?.getAttribute('src'),
      doc.querySelector('main img[src]')?.getAttribute('src'),
      config?.categories?.[q('contentType').value]?.fallbackImage,
      config?.brand?.defaultImage
    ].filter(Boolean);
    return absolute(candidates[0] || '/assets/gnk-asg-email-logo-final.png', base);
  }

  function absolute(value, base) {
    try { return new URL(value, base).href; } catch { return String(value || ''); }
  }

  function useBrandImage() {
    q('image').value = config?.categories?.[q('contentType').value]?.fallbackImage || config?.brand?.defaultImage || 'https://gnk-asg.hr/assets/gnk-asg-email-logo-final.png';
    q('imageAlt').value = config?.brand?.defaultImageAlt || 'GNK ASG – Global Network Kapital';
    if (!q('hashtags').value) q('hashtags').value = defaultHashtags();
    updatePreview();
    status('Postavljena je GNK ASG identitetska slika.');
  }

  function defaultHashtags() {
    return (config?.brand?.defaultHashtags || ['GNKASG']).map(tag => `#${String(tag).replace(/^#/,'')}`).join(' ');
  }

  function suggestedCaption(title,description,url) {
    const intro = q('language').value === 'en' ? 'New from GNK ASG:' : 'Novo na GNK ASG portalu:';
    return [intro,title,description,url].filter(Boolean).join('\n\n');
  }

  async function generateCaption() {
    status('AI priprema tekst za društvene mreže…');
    const prompt = [
      'Napiši profesionalan tekst za dijeljenje na LinkedInu i Facebooku.',
      'Ne izmišljaj činjenice. Napiši 2 kratka odlomka, jednu jasnu završnu rečenicu i 4 do 6 relevantnih hashtagova.',
      `Jezik: ${q('language').value}`,
      `Vrsta: ${q('contentType').value}`,
      `Naslov: ${q('title').value}`,
      `Opis: ${q('description').value}`,
      `URL: ${q('canonical').value || q('targetUrl').value}`
    ].join('\n');
    try {
      const response = await fetch('/api/ai-assist',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:prompt,prompt,message:prompt,publicOnly:false,task:'social-share-caption'})});
      const raw = await response.text();
      let data; try { data = JSON.parse(raw); } catch { data = {answer:raw}; }
      const answer = data.answer || data.response || data.message || data.text || data.result;
      if (!response.ok || !answer) throw new Error('AI odgovor nije dostupan.');
      q('caption').value = String(answer).trim();
      updatePreview();
      status('AI tekst je pripremljen.');
    } catch (error) {
      q('caption').value = suggestedCaption(q('title').value,q('description').value,q('canonical').value || q('targetUrl').value);
      status(`Primijenjen je lokalni prijedlog: ${error.message}`);
    }
  }

  async function createShareLink() {
    status('Izrada share zapisa…');
    try {
      const payload = metadataPayload();
      const response = await fetch('/api/social-share/create',{method:'POST',headers:{'content-type':'application/json',...authHeaders()},body:JSON.stringify(payload)});
      const raw = await response.text();
      let data; try { data = JSON.parse(raw); } catch { data = {}; }
      if (!response.ok || !data.shareUrl) throw new Error(data.error || `HTTP ${response.status}`);
      shareUrl = data.shareUrl;
      addLocalLog({...payload,shareUrl,provider:'created'});
      updatePreview();
      status(`Share link izrađen: ${shareUrl}`);
    } catch (error) {
      shareUrl = q('canonical').value || q('targetUrl').value;
      status(`Backend share link nije dostupan; koristit će se canonical URL. ${error.message}`);
    }
  }

  function metadataPayload() {
    return {
      targetUrl:normalizeTarget(q('canonical').value || q('targetUrl').value),
      title:q('title').value.trim(),
      description:q('description').value.trim(),
      image:q('image').value.trim() || config?.brand?.defaultImage,
      imageAlt:q('imageAlt').value.trim() || config?.brand?.defaultImageAlt,
      contentType:q('contentType').value,
      language:q('language').value,
      caption:q('caption').value.trim(),
      hashtags:q('hashtags').value.trim(),
      createdBy:'admin'
    };
  }

  function composePostText() {
    return [q('caption').value.trim(),q('hashtags').value.trim(),currentShareUrl()].filter(Boolean).join('\n\n');
  }

  function currentShareUrl() {
    return shareUrl || q('canonical').value.trim() || q('targetUrl').value.trim();
  }

  async function share(provider) {
    try {
      const url = normalizeTarget(currentShareUrl());
      const title = q('title').value.trim();
      const text = composePostText();
      let destination = '';
      if (provider === 'linkedin') destination = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
      if (provider === 'facebook') destination = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      if (provider === 'x') destination = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`${title} ${q('hashtags').value}`)}`;
      if (provider === 'whatsapp') destination = `https://wa.me/?text=${encodeURIComponent(text)}`;
      if (provider === 'email') destination = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`;
      if (provider === 'copy') await copyText(url);
      else if (provider === 'native' && navigator.share) await navigator.share({title,text:q('caption').value,url});
      else if (destination) window.open(destination,'_blank','noopener,noreferrer,width=980,height=720');
      await logShare(provider,url);
      status(`Dijeljenje pripremljeno: ${provider}.`);
    } catch (error) {
      status(`Dijeljenje nije uspjelo: ${error.message}`);
    }
  }

  async function logShare(provider,url) {
    const item = {...metadataPayload(),provider,shareUrl:url,createdAt:new Date().toISOString()};
    addLocalLog(item);
    try {
      await fetch('/api/social-share/log',{method:'POST',headers:{'content-type':'application/json',...authHeaders()},body:JSON.stringify(item)});
    } catch {}
    renderLog();
  }

  function addLocalLog(item) {
    const items = readLocalLog();
    localStorage.setItem(LOG_KEY,JSON.stringify([item,...items].slice(0,200)));
  }

  function readLocalLog() {
    try { const items = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); return Array.isArray(items) ? items : []; } catch { return []; }
  }

  function renderLog() {
    const items = readLocalLog();
    q('shareLog').innerHTML = items.length ? items.map(item => `<article><strong>${esc(item.title || '(bez naslova)')}</strong><br><small>${esc(item.provider || '')} · ${esc(item.createdAt || '')} · ${esc(item.shareUrl || item.targetUrl || '')}</small></article>`).join('') : 'Nema evidentiranih dijeljenja.';
  }

  function updatePreview() {
    const image = q('image').value.trim() || config?.brand?.defaultImage || '/assets/gnk-asg-email-logo-final.png';
    q('previewImage').src = image;
    q('previewImage').alt = q('imageAlt').value || 'GNK ASG';
    q('previewTitle').textContent = q('title').value || 'Naslov sadržaja';
    q('previewDescription').textContent = q('description').value || 'Opis sadržaja prikazat će se ovdje.';
    q('previewType').textContent = config?.categories?.[q('contentType').value]?.label || q('contentType').value;
    q('previewUrl').textContent = q('canonical').value || q('targetUrl').value || 'gnk-asg.hr';
    renderSeoCheck();
  }

  function renderSeoCheck() {
    const checks = [
      ['Naslov',q('title').value.trim().length >= 20],
      ['Opis',q('description').value.trim().length >= 70],
      ['Canonical',/^https:\/\//i.test(q('canonical').value.trim() || q('targetUrl').value.trim())],
      ['Slika',/^https:\/\//i.test(q('image').value.trim())],
      ['Alt slike',q('imageAlt').value.trim().length >= 8],
      ['Tekst za objavu',q('caption').value.trim().length >= 40]
    ];
    q('seoCheck').innerHTML = checks.map(([label,ok]) => `<div class="${ok?'ok':'bad'}">${ok?'✓':'!'} ${esc(label)}</div>`).join('');
  }

  async function copyText(text) {
    await navigator.clipboard.writeText(String(text || ''));
    status('Kopirano u međuspremnik.');
  }

  function clearForm() {
    ['targetUrl','title','description','canonical','imageAlt','caption','hashtags'].forEach(id => q(id).value = '');
    shareUrl = '';
    useBrandImage();
    updatePreview();
    status('Obrazac je očišćen.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
