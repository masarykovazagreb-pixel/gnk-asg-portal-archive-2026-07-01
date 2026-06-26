(() => {
  if (window.__GNK_BUSINESS_NEWS_V16__) return;
  window.__GNK_BUSINESS_NEWS_V16__ = true;

  const root = document.getElementById('newsGrid');
  const status = document.getElementById('newsStatus');
  if (!root || !status) return;

  const en = document.body.dataset.language === 'en';
  const locale = en ? 'en-GB' : 'hr-HR';
  const PUBLIC_LIMIT = 100;
  const MINIMUM_VISIBLE = 15;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const labels = {
    loading: en ? 'Loading verified business news…' : 'Učitavanje provjerenih poslovnih vijesti…',
    open: en ? 'Open original source' : 'Otvori izvorni članak',
    none: en ? 'Verified news is temporarily unavailable.' : 'Provjerene vijesti trenutačno nisu dostupne.',
    updated: en ? 'Last verification' : 'Zadnja provjera',
    items: en ? 'verified items' : 'provjerenih vijesti',
    source: en ? 'Source' : 'Izvor'
  };

  function ts(value) { const parsed = Date.parse(value || ''); return Number.isFinite(parsed) ? parsed : 0; }
  function fmt(value) {
    return value ? new Intl.DateTimeFormat(locale,{timeZone:'Europe/Zagreb',dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) : (en ? 'unknown' : 'nepoznato');
  }
  function valid(value) {
    try { const url = new URL(String(value || ''), location.origin); return ['http:','https:'].includes(url.protocol) ? url.href : ''; }
    catch { return ''; }
  }
  function fallbackImage(value) { const image=String(value||'').toLowerCase(); return !image || image.includes('/assets/news-fallback.svg') || image.startsWith('data:image/'); }

  function normalize(payload) {
    const raw = Array.isArray(payload) ? payload : (Array.isArray(payload?.items) ? payload.items : []);
    const seen = new Set();
    const items = [];
    for (const item of raw) {
      const url = valid(item?.url || item?.link || item?.articleUrl || item?.sourceUrl);
      const image = valid(item?.image || item?.imageUrl || item?.image_url);
      const title = String(item?.title || '').trim();
      const summary = String(item?.summary || item?.description || item?.text || item?.excerpt || '').replace(/\s+/g,' ').trim();
      const source = String(item?.source || item?.sourceTitle || '').trim();
      const verified = item?.verified === true && item?.verification?.article?.ok === true && item?.verification?.image?.ok === true;
      if (!verified || !url || !image || fallbackImage(image) || !title || summary.length < 60 || !source) continue;
      const key = String(item?.id || url).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({...item,url,image,title,summary,source,publishedAt:item?.publishedAt || item?.published_at || '',imageAlt:String(item?.imageAlt || title),imageCredit:String(item?.imageCredit || source)});
    }
    items.sort((a,b) => ts(b.publishedAt) - ts(a.publishedAt));
    const newest = Math.max(ts(payload?.updatedAt || payload?.generatedAt), ...items.map(item => ts(item.publishedAt)), 0);
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
      image.addEventListener('error', () => { image.closest('.news-card')?.remove(); updateVisibleStatus(feed); }, {once:true});
      image.addEventListener('load', () => {
        if (image.naturalWidth < 240 || image.naturalHeight < 120) { image.closest('.news-card')?.remove(); updateVisibleStatus(feed); }
      }, {once:true});
    });
  }

  async function load() {
    status.textContent = labels.loading;
    try {
      const response = await fetch(`/data/news.json?cb=${Date.now()}`, {cache:'no-store',headers:{accept:'application/json'}});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const feed = normalize(await response.json());
      if (!feed.items.length) throw new Error('empty_verified_news_feed');
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
