(() => {
  if (window.__GNK_BUSINESS_NEWS__) return;
  window.__GNK_BUSINESS_NEWS__ = 1;

  const root = document.getElementById('newsGrid');
  const statusNode = document.getElementById('newsStatus');
  if (!root || !statusNode) return;

  const isEnglish = document.body.dataset.language === 'en';
  const locale = isEnglish ? 'en-GB' : 'hr-HR';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);

  const text = {
    loading: isEnglish ? 'Loading business news…' : 'Učitavanje poslovnih vijesti…',
    open: isEnglish ? 'Open source' : 'Otvori izvor',
    unavailable: isEnglish ? 'News feed is temporarily unavailable.' : 'Vijesti trenutačno nisu dostupne.',
    fallback: isEnglish ? 'FALLBACK' : 'FALLBACK',
    delayed: isEnglish ? 'DELAYED' : 'ODGOĐENO',
    snapshot: isEnglish ? 'SNAPSHOT' : 'SNIMKA',
    live: 'LIVE',
    updated: isEnglish ? 'Newest item' : 'Najnovija vijest',
    items: isEnglish ? 'items' : 'vijesti'
  };

  function validUrl(value) {
    try {
      const url = new URL(String(value || ''));
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function parseDate(value) {
    const timestamp = Date.parse(value || '');
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function normalizePayload(payload) {
    const rawItems = Array.isArray(payload) ? payload : (Array.isArray(payload?.items) ? payload.items : []);
    const metadata = Array.isArray(payload) ? {} : payload;
    const seen = new Set();
    const items = [];

    for (const raw of rawItems) {
      const url = validUrl(raw?.url);
      const title = String(raw?.title || '').trim();
      if (!url || !title) continue;
      const key = String(raw?.id || url).trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        ...raw,
        url,
        title,
        summary: String(raw?.summary || raw?.description || '').trim(),
        source: String(raw?.source || raw?.region || raw?.category || 'GNK ASG').trim(),
        publishedAt: raw?.publishedAt || raw?.published_at || raw?.date || ''
      });
    }

    items.sort((left, right) => parseDate(right.publishedAt) - parseDate(left.publishedAt));
    const newestTimestamp = Math.max(
      parseDate(metadata?.updatedAt || metadata?.generatedAt || metadata?.lastUpdated),
      ...items.map(item => parseDate(item.publishedAt)),
      0
    );

    return {
      items,
      newestTimestamp,
      declaredStatus: String(metadata?.status || '').trim().toLowerCase(),
      source: String(metadata?.source || '').trim()
    };
  }

  function deriveStatus(feed) {
    if (!feed.newestTimestamp) return 'fallback';
    const ageHours = Math.max(0, (Date.now() - feed.newestTimestamp) / 3_600_000);
    if (feed.declaredStatus === 'fallback') return 'fallback';
    if (feed.declaredStatus === 'delayed') return 'delayed';
    if (feed.declaredStatus === 'snapshot') return ageHours <= 24 ? 'snapshot' : 'delayed';
    if (feed.declaredStatus === 'live' && ageHours <= 2) return 'live';
    if (ageHours <= 18) return 'snapshot';
    if (ageHours <= 72) return 'delayed';
    return 'fallback';
  }

  function formatDate(timestamp) {
    if (!timestamp) return isEnglish ? 'unknown time' : 'vrijeme nije poznato';
    return new Intl.DateTimeFormat(locale, {
      timeZone: 'Europe/Zagreb',
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(timestamp));
  }

  function statusLabel(status) {
    if (status === 'live') return text.live;
    if (status === 'snapshot') return text.snapshot;
    if (status === 'delayed') return text.delayed;
    return text.fallback;
  }

  function renderStatus(feed) {
    const status = deriveStatus(feed);
    statusNode.dataset.status = status;
    statusNode.innerHTML = `<strong>${statusLabel(status)}</strong> · ${text.updated}: ${esc(formatDate(feed.newestTimestamp))} · ${feed.items.length} ${text.items}`;
  }

  function renderCard(item) {
    const publishedTimestamp = parseDate(item.publishedAt);
    const published = publishedTimestamp ? formatDate(publishedTimestamp) : '';
    const meta = [item.source, published].filter(Boolean).map(esc).join(' · ');
    const summary = item.summary ? `<p>${esc(item.summary)}</p>` : '';

    return `<article class="news-card">
      <small>${meta || 'GNK ASG'}</small>
      <h2>${esc(item.title)}</h2>
      ${summary}
      <a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${text.open} →</a>
    </article>`;
  }

  async function load() {
    statusNode.textContent = text.loading;
    try {
      const response = await fetch(`/data/news.json?cb=${Date.now()}`, {
        cache: 'no-store',
        headers: { accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const feed = normalizePayload(await response.json());
      if (!feed.items.length) throw new Error('empty_news_feed');
      root.innerHTML = feed.items.slice(0, 36).map(renderCard).join('');
      renderStatus(feed);
      document.documentElement.dataset.gnkNewsStatus = deriveStatus(feed);
      window.dispatchEvent(new CustomEvent('gnk:news-ready', {
        detail: {
          count: feed.items.length,
          status: deriveStatus(feed),
          newestTimestamp: feed.newestTimestamp
        }
      }));
    } catch (error) {
      root.innerHTML = `<article class="news-card"><h2>${text.unavailable}</h2><p>${esc(error.message)}</p></article>`;
      statusNode.dataset.status = 'fallback';
      statusNode.innerHTML = `<strong>${text.fallback}</strong> · ${text.unavailable}`;
      document.documentElement.dataset.gnkNewsStatus = 'fallback';
    }
  }

  load();
})();
