(() => {
  if (window.__GNK_BUSINESS_NEWS_V17__) return;
  window.__GNK_BUSINESS_NEWS_V17__ = true;

  const root = document.getElementById('newsGrid');
  const status = document.getElementById('newsStatus');
  if (!root || !status) return;

  const en = document.body.dataset.language === 'en';
  const locale = en ? 'en-GB' : 'hr-HR';
  const PUBLIC_LIMIT = 100;
  const ARCHIVE_LIMIT = 500;
  const MINIMUM_VISIBLE = 15;
  const FALLBACK_IMAGE = '/assets/news-fallback.svg';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const labels = {
    loading: en ? 'Loading verified business news…' : 'Učitavanje provjerenih poslovnih vijesti…',
    open: en ? 'Open original source' : 'Otvori izvorni članak',
    none: en ? 'Verified news is temporarily unavailable.' : 'Provjerene vijesti trenutačno nisu dostupne.',
    updated: en ? 'Last verification' : 'Zadnja provjera',
    items: en ? 'news items' : 'vijesti',
    source: en ? 'Source' : 'Izvor',
    fallback: en ? 'GNK ASG fallback image' : 'GNK ASG zamjenska slika'
  };

  function ts(value) { const parsed = Date.parse(value || ''); return Number.isFinite(parsed) ? parsed : 0; }
  function fmt(value) {
    return value ? new Intl.DateTimeFormat(locale,{timeZone:'Europe/Zagreb',dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) : (en ? 'unknown' : 'nepoznato');
  }
  function valid(value) {
    try { const url = new URL(String(value || ''), location.origin); return ['http:','https:'].includes(url.protocol) ? url.href : ''; }
    catch { return ''; }
  }
  function ownPath(value) {
    const raw = String(value || '').trim();
    if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
    return valid(raw);
  }
  function isFallback(value) { const image = String(value || '').toLowerCase(); return !image || image.includes('/assets/news-fallback.svg') || image.startsWith('data:image/'); }
  function listFrom(payload) { return Array.isArray(payload) ? payload : (Array.isArray(payload?.items) ? payload.items : []); }

  async function getJson(path) {
    const response = await fetch(`${path}?cb=${Date.now()}`, {cache:'no-store',headers:{accept:'application/json'}});
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
  }

  function normalize(feeds) {
    const seen = new Set();
    const items = [];
    for (const payload of feeds) {
      for (const item of listFrom(payload).slice(0, ARCHIVE_LIMIT)) {
        const url = valid(item?.url || item?.link || item?.articleUrl || item?.sourceUrl);
        const rawImage = ownPath(item?.image || item?.imageUrl || item?.image_url || item?.thumbnail || item?.thumbnailUrl);
        const image = rawImage || FALLBACK_IMAGE;
        const title = String(item?.title || item?.titleHr || item?.titleEn || '').replace(/\s+/g,' ').trim();
        const summary = String(item?.summary || item?.summaryHr || item?.summaryEn || item?.description || item?.text || item?.excerpt || '').replace(/\s+/g,' ').trim();
        const source = String(item?.source || item?.sourceTitle || item?.region || item?.category || 'GNK ASG').replace(/\s+/g,' ').trim();
        const hasStrictVerification = item?.verified === true || item?.verification;
        const strictOk = item?.verified === true && item?.verification?.article?.ok === true && (item?.verification?.image?.ok === true || isFallback(image));
        if (hasStrictVerification && !strictOk) continue;
        if (!url || !title || summary.length < 40 || !source) continue;
        const key = String(item?.id || url).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({
          ...item,
          url,
          image,
          title,
          summary,
          source,
          publishedAt: item?.publishedAt || item?.published_at || item?.date || '',
          imageAlt: String(item?.imageAlt || (isFallback(image) ? labels.fallback : title)),
          imageCredit: String(item?.imageCredit || (isFallback(image) ? 'GNK ASG' : source))
        });
      }
    }
    items.sort((a,b) => ts(b.publishedAt) - ts(a.publishedAt));
    const newest = Math.max(...feeds.map(feed => ts(feed?.updatedAt || feed?.generatedAt)), ...items.map(item => ts(item.publishedAt)), 0);
    return {items:items.slice(0,PUBLIC_LIMIT),newest};
  }

  function card(item,index) {
    const meta = `${labels.source}: ${item.source} · ${fmt(ts(item.publishedAt))}`;
    return `<article class="news-card" id="verified-news-${index}" data-verified-news="1"><img src="${esc(item.image)}" alt="${esc(item.imageAlt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-news-image><small>${esc(meta)}</small><h2>${esc(item.title)}</h2><p>${esc(item.summary)}</p><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer external">${labels.open} →</a></article>`;
  }

  function updateVisibleStatus(feed) {
    const visible = root.querySelectorAll('.news-card[data-verified-news="1"]').length;
    const state = visible >= MINIMUM_VISIBLE ? 'LIVE' : visible ? 'DELAYED' : 'UNAVAILABLE';
    status.dataset.status = state.toLowerCase();
    status.innerHTML = `<strong>${state}</strong> · ${labels.updated}: ${esc(fmt(feed.newest))} · ${visible} ${labels.items}`;
  }

  function bindImages(feed) {
    root.querySelectorAll('[data-news-image]').forEach(image => {
      if (isFallback(image.getAttribute('src'))) return;
      image.addEventListener('error', () => { image.src = FALLBACK_IMAGE; image.alt = labels.fallback; updateVisibleStatus(feed); }, {once:true});
      image.addEventListener('load', () => {
        if (image.naturalWidth < 120 || image.naturalHeight < 80) { image.src = FALLBACK_IMAGE; image.alt = labels.fallback; updateVisibleStatus(feed); }
      }, {once:true});
    });
  }

  async function load() {
    status.textContent = labels.loading;
    try {
      const primary = await getJson('/data/news.json');
      let archive = [];
      try { archive = await getJson('/data/news_archive.json'); } catch (_) {}
      const feed = normalize([primary, archive]);
      if (!feed.items.length) throw new Error('empty_news_feed');
      root.innerHTML = feed.items.map(card).join('');
      bindImages(feed);
      updateVisibleStatus(feed);
    } catch (error) {
      root.innerHTML = `<article class="news-card"><h2>${labels.none}</h2><p>${esc(error.message)}</p></article>`;
      status.dataset.status = 'unavailable';
      status.innerHTML = `<strong>UNAVAILABLE</strong> · ${labels.none}`;
    }
  }

  load();
})();
