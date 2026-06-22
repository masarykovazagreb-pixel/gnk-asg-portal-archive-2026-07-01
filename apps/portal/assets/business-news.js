(() => {
  if (window.__GNK_BUSINESS_NEWS__) return;
  window.__GNK_BUSINESS_NEWS__ = 2;

  const root = document.getElementById('newsGrid');
  const statusNode = document.getElementById('newsStatus');
  const actionsNode = document.querySelector('.news-actions');
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
    open: isEnglish ? 'Open article or source' : 'Otvori članak ili izvor',
    unavailable: isEnglish ? 'News feed is temporarily unavailable.' : 'Vijesti trenutačno nisu dostupne.',
    fallback: 'FALLBACK',
    delayed: isEnglish ? 'DELAYED' : 'ODGOĐENO',
    snapshot: isEnglish ? 'SNAPSHOT' : 'SNIMKA',
    live: 'LIVE',
    updated: isEnglish ? 'Last refresh' : 'Zadnje osvježavanje',
    items: isEnglish ? 'items' : 'vijesti',
    refresh: isEnglish ? 'Refresh news' : 'Osvježi vijesti',
    refreshing: isEnglish ? 'Refreshing…' : 'Osvježavanje…',
    refreshed: isEnglish ? 'News refreshed.' : 'Vijesti su osvježene.',
    cooldown: isEnglish ? 'Refresh was recently completed.' : 'Osvježavanje je nedavno već provedeno.',
    failed: isEnglish ? 'Refresh failed.' : 'Osvježavanje nije uspjelo.'
  };

  function validUrl(value) {
    try {
      const url = new URL(String(value || ''), window.location.origin);
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
      const url = validUrl(raw?.url || raw?.sourceUrl);
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
    if (feed.declaredStatus === 'live' && ageHours <= 3) return 'live';
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
    const image = item.image
      ? `<img src="${esc(validUrl(item.image))}" alt="${esc(item.imageAlt || item.title)}" loading="lazy">`
      : '';

    return `<article class="news-card">
      ${image}
      <small>${meta || 'GNK ASG'}</small>
      <h2>${esc(item.title)}</h2>
      ${summary}
      <a href="${esc(item.url)}" target="${item.url.startsWith(window.location.origin) ? '_self' : '_blank'}" rel="noopener noreferrer">${text.open} →</a>
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
      root.innerHTML = feed.items.slice(0, 48).map(renderCard).join('');
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

  async function refreshNews(button) {
    button.disabled = true;
    button.dataset.loading = 'true';
    button.textContent = text.refreshing;

    try {
      const response = await fetch('/api/news-refresh', {
        method: 'POST',
        cache: 'no-store',
        headers: { accept: 'application/json' }
      });

      const result = await response.json().catch(() => ({}));

      if (response.status === 429) {
        statusNode.textContent = `${text.cooldown}${result.retryAfter ? ` (${result.retryAfter}s)` : ''}`;
      } else if (!response.ok || result.ok === false) {
        throw new Error(result.error || `HTTP ${response.status}`);
      } else {
        statusNode.textContent = text.refreshed;
      }

      await load();
    } catch (error) {
      statusNode.textContent = `${text.failed} ${error.message}`;
    } finally {
      button.disabled = false;
      button.dataset.loading = 'false';
      button.textContent = text.refresh;
    }
  }

  if (actionsNode && !document.getElementById('newsRefreshButton')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'newsRefreshButton';
    button.className = 'news-refresh-button';
    button.textContent = text.refresh;
    button.addEventListener('click', () => refreshNews(button));
    actionsNode.appendChild(button);
  }

  load();
})();