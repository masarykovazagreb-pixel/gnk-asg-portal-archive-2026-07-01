(() => {
  if (window.__GNK_MARKET_PAGE__) return;
  window.__GNK_MARKET_PAGE__ = true;

  const isEnglish = document.documentElement.lang?.toLowerCase().startsWith('en');
  const locale = isEnglish ? 'en-GB' : 'hr-HR';
  const copy = {
    loading: isEnglish ? 'Loading market backend…' : 'Učitavanje tržišnog backenda…',
    updated: isEnglish ? 'Updated' : 'Ažurirano',
    items: isEnglish ? 'items' : 'stavki',
    noData: isEnglish ? 'No market data is currently available.' : 'Trenutačno nema dostupnih tržišnih podataka.',
    backend: isEnglish ? 'Backend' : 'Backend',
    error: isEnglish ? 'Market backend error' : 'Greška tržišnog backenda',
    chartWaiting: isEnglish ? 'Waiting for additional snapshot data for the chart.' : 'Čekaju se dodatni snapshot podatci za grafikon.'
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);

  function node(id) {
    return document.getElementById(id);
  }

  function formatNumber(value, suffix = '') {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    const formatted = number.toLocaleString(locale, { maximumFractionDigits: 2 });
    return `${formatted}${suffix || ''}`;
  }

  function parseDate(value) {
    const timestamp = Date.parse(value || '');
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function formatDate(value) {
    const timestamp = parseDate(value);
    if (!timestamp) return '—';
    return new Intl.DateTimeFormat(locale, {
      timeZone: 'Europe/Zagreb',
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(timestamp));
  }

  function classifyStatus(data) {
    const declared = String(data?.status || '').toLowerCase();
    const timestamp = parseDate(data?.updatedAt || data?.generatedAt || data?.timestamp);
    const ageMinutes = timestamp ? Math.max(0, (Date.now() - timestamp) / 60_000) : Infinity;

    if (declared.includes('fallback')) return ['FALLBACK', 'fallback'];
    if (declared.includes('delay')) return ['DELAYED', 'delayed'];
    if (declared.includes('snapshot')) return ageMinutes <= 1_440 ? ['SNAPSHOT', 'snapshot'] : ['DELAYED', 'delayed'];
    if (declared.includes('live') && ageMinutes <= 30) return ['LIVE', 'live'];
    if (ageMinutes <= 30) return ['LIVE', 'live'];
    if (ageMinutes <= 1_440) return ['SNAPSHOT', 'snapshot'];
    if (ageMinutes <= 4_320) return ['DELAYED', 'delayed'];
    return ['FALLBACK', 'fallback'];
  }

  function ensureBadge(statusNode) {
    let badge = node('marketBadge');
    if (badge) return badge;
    badge = document.createElement('span');
    badge.id = 'marketBadge';
    badge.className = 'status-badge fallback';
    badge.textContent = 'FALLBACK';
    statusNode?.parentNode?.insertBefore(badge, statusNode);
    return badge;
  }

  function renderCard(item) {
    const label = String(item?.label || item?.symbol || copy.backend).trim();
    const value = formatNumber(item?.value, item?.suffix);
    const note = String(item?.note || item?.source || '').trim();
    return `<article class="card"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><div class="note muted">${esc(note)}</div></article>`;
  }

  function draw(history = []) {
    const canvas = node('chart');
    if (!canvas?.getContext) return;
    const context = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = 'rgba(212,175,55,.20)';
    context.lineWidth = 1;

    for (let index = 0; index < 6; index += 1) {
      const y = 30 + index * (height - 60) / 5;
      context.beginPath();
      context.moveTo(40, y);
      context.lineTo(width - 20, y);
      context.stroke();
    }

    const rows = Array.isArray(history) ? history.filter(Boolean) : [];
    const series = [
      ['btc_eur', 'BTC EUR', '#d4af37'],
      ['eth_eur', 'ETH EUR', '#6fb7ff'],
      ['asg_gold_eur', 'ASG GOLD EUR', '#f8fafc'],
      ['brent_usd', 'BRENT USD', '#ff9d5c']
    ];

    if (rows.length < 2) {
      context.fillStyle = '#aab3c4';
      context.font = '16px Inter, Arial';
      context.fillText(copy.chartWaiting, 50, 160);
      return;
    }

    series.forEach(([field, label, color], seriesIndex) => {
      const values = rows.map(row => Number(row?.[field])).filter(Number.isFinite);
      if (values.length < 2) return;
      const minimum = Math.min(...values);
      const maximum = Math.max(...values);
      const span = maximum - minimum || 1;
      let started = false;

      context.strokeStyle = color;
      context.lineWidth = 2;
      context.beginPath();
      rows.forEach((row, index) => {
        const value = Number(row?.[field]);
        if (!Number.isFinite(value)) return;
        const x = 50 + index * (width - 80) / Math.max(1, rows.length - 1);
        const y = height - 35 - ((value - minimum) / span) * (height - 75);
        if (!started) {
          context.moveTo(x, y);
          started = true;
        } else {
          context.lineTo(x, y);
        }
      });
      context.stroke();
      context.fillStyle = color;
      context.font = '13px Inter, Arial';
      context.fillText(label, 60 + seriesIndex * 145, 22);
    });
  }

  let lastData = null;
  let applying = false;

  function render(data) {
    const cards = node('cards');
    const statusNode = node('status');
    if (!cards || !statusNode) return;
    applying = true;
    lastData = data;

    const rows = Array.isArray(data?.cards) ? data.cards : [];
    cards.innerHTML = rows.length
      ? rows.map(renderCard).join('')
      : renderCard({ label: copy.backend, value: null, note: copy.noData });

    const [statusLabel, statusClass] = classifyStatus(data);
    const badge = ensureBadge(statusNode);
    badge.textContent = statusLabel;
    badge.className = `status-badge ${statusClass}`;
    statusNode.textContent = `${copy.updated}: ${formatDate(data?.updatedAt || data?.generatedAt || data?.timestamp)} · ${copy.items}: ${rows.length}`;
    cards.dataset.gnkMarketManaged = 'true';
    statusNode.dataset.gnkMarketManaged = 'true';
    document.documentElement.dataset.gnkMarketStatus = statusClass;
    draw(data?.history || []);
    applying = false;

    window.dispatchEvent(new CustomEvent('gnk:market-ready', {
      detail: { status: statusClass, count: rows.length, updatedAt: data?.updatedAt || null }
    }));
  }

  async function load(refresh = false) {
    const statusNode = node('status');
    const button = node('refresh');
    if (!statusNode) return;
    statusNode.textContent = copy.loading;
    if (button) button.disabled = true;

    try {
      const response = await fetch(`/api/market${refresh ? '?refresh=1' : `?cb=${Date.now()}`}`, {
        cache: 'no-store',
        headers: { accept: 'application/json' }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      render(data);
    } catch (error) {
      render({
        status: 'fallback',
        updatedAt: null,
        cards: [{ label: copy.error, value: null, note: error.message }],
        history: []
      });
    } finally {
      if (button) button.disabled = false;
    }
  }

  function bind() {
    const button = node('refresh');
    if (button && button.dataset.gnkMarketBound !== 'true') {
      button.dataset.gnkMarketBound = 'true';
      button.addEventListener('click', event => {
        event.preventDefault();
        load(true);
      });
    }

    const cards = node('cards');
    const statusNode = node('status');
    if (cards && statusNode) {
      const observer = new MutationObserver(() => {
        if (applying || !lastData) return;
        if (cards.dataset.gnkMarketManaged !== 'true' || statusNode.dataset.gnkMarketManaged !== 'true') {
          render(lastData);
        }
      });
      observer.observe(cards, { childList: true, subtree: true });
      observer.observe(statusNode, { childList: true, characterData: true, subtree: true });
      setTimeout(() => observer.disconnect(), 8_000);
    }

    load(false);
  }

  window.GNKMarketPage = { load, render, classifyStatus };
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', bind, { once: true })
    : bind();
})();
