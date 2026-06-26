(() => {
  if (window.__GNK_BUSINESS_NEWS__) return;
  window.__GNK_BUSINESS_NEWS__ = true;

  const root = document.getElementById('newsGrid');
  const status = document.getElementById('newsStatus');
  const actions = document.querySelector('.news-actions');
  if (!root || !status) return;

  const en = document.body.dataset.language === 'en';
  const locale = en ? 'en-GB' : 'hr-HR';
  const PUBLIC_LIMIT = 100;
  const FALLBACK_IMAGE = '/assets/news-fallback.svg';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[char]));
  const labels = {
    loading: en ? 'Loading business news…' : 'Učitavanje poslovnih vijesti…',
    open: en ? 'Open article or source' : 'Otvori članak ili izvor',
    none: en ? 'News feed is temporarily unavailable.' : 'Vijesti trenutačno nisu dostupne.',
    refresh: en ? 'Refresh news' : 'Osvježi vijesti',
    refreshing: en ? 'Refreshing…' : 'Osvježavanje…',
    updated: en ? 'Last refresh' : 'Zadnje osvježavanje',
    items: en ? 'items' : 'vijesti'
  };

  function ts(value) {
    const parsed = Date.parse(value || '');
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function fmt(value) {
    return value
      ? new Intl.DateTimeFormat(locale, {
          timeZone:'Europe/Zagreb', dateStyle:'medium', timeStyle:'short'
        }).format(new Date(value))
      : (en ? 'unknown' : 'nepoznato');
  }

  function valid(value) {
    try {
      const url = new URL(String(value || ''), location.origin);
      return ['http:','https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function normalize(payload) {
    const raw = Array.isArray(payload) ? payload : (Array.isArray(payload?.items) ? payload.items : []);
    const seen = new Set();
    const items = [];
    for (const item of raw) {
      const url = valid(item?.url || item?.sourceUrl);
      const title = String(item?.title || '').trim();
      if (!url || !title) continue;
      const key = String(item?.id || url).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        ...item,
        url,
        title,
        summary:String(item?.summary || item?.description || '').trim(),
        source:String(item?.source || item?.region || item?.category || 'GNK ASG'),
        publishedAt:item?.publishedAt || item?.published_at || '',
        image:valid(item?.image) || FALLBACK_IMAGE,
        imageAlt:String(item?.imageAlt || title),
        imageCredit:String(item?.imageCredit || item?.source || '')
      });
    }
    items.sort((a,b) => ts(b.publishedAt) - ts(a.publishedAt));
    const newest = Math.max(ts(payload?.updatedAt || payload?.generatedAt), ...items.map(item => ts(item.publishedAt)), 0);
    return {items:items.slice(0,PUBLIC_LIMIT), newest, status:String(payload?.status || '').toLowerCase()};
  }

  function state(feed) {
    if (feed.status === 'live' && Date.now() - feed.newest < 10800000) return 'live';
    if (Date.now() - feed.newest < 64800000) return 'snapshot';
    if (Date.now() - feed.newest < 259200000) return 'delayed';
    return 'fallback';
  }

  function card(item) {
    const meta = [item.source, fmt(ts(item.publishedAt))].filter(Boolean).map(esc).join(' · ');
    const image = esc(item.image || FALLBACK_IMAGE);
    return `<article class="news-card"><img src="${image}" alt="${esc(item.imageAlt || item.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"><small>${meta}</small><h2>${esc(item.title)}</h2>${item.summary ? `<p>${esc(item.summary)}</p>` : ''}<a href="${esc(item.url)}" target="${item.url.startsWith(location.origin) ? '_self' : '_blank'}" rel="noopener noreferrer">${labels.open} →</a></article>`;
  }

  async function load() {
    status.textContent = labels.loading;
    try {
      const response = await fetch(`/data/news.json?cb=${Date.now()}`, {
        cache:'no-store', headers:{accept:'application/json'}
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const feed = normalize(await response.json());
      if (!feed.items.length) throw new Error('empty_news_feed');
      root.innerHTML = feed.items.map(card).join('');
      const currentState = state(feed);
      status.dataset.status = currentState;
      status.innerHTML = `<strong>${currentState.toUpperCase()}</strong> · ${labels.updated}: ${esc(fmt(feed.newest))} · ${feed.items.length} ${labels.items}`;
    } catch (error) {
      root.innerHTML = `<article class="news-card"><h2>${labels.none}</h2><p>${esc(error.message)}</p></article>`;
      status.dataset.status = 'fallback';
      status.innerHTML = `<strong>FALLBACK</strong> · ${labels.none}`;
    }
  }

  async function refresh(button) {
    button.disabled = true;
    button.textContent = labels.refreshing;
    try {
      const response = await fetch('/api/news-refresh', {
        method:'POST', cache:'no-store', headers:{accept:'application/json'}
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 429) throw new Error(data.error || `HTTP ${response.status}`);
      await load();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = labels.refresh;
    }
  }

  if (actions && !document.getElementById('newsRefreshButton')) {
    const button = document.createElement('button');
    button.id = 'newsRefreshButton';
    button.type = 'button';
    button.textContent = labels.refresh;
    button.addEventListener('click', () => refresh(button));
    actions.appendChild(button);
  }

  load();
})();
