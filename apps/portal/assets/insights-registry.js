(() => {
  const grid = document.querySelector('[data-insights-grid]');
  if (!grid) return;
  const pageLang = document.documentElement.lang || 'en';
  const latestAction = document.querySelector('[data-latest-insight]');

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  }

  function render(items) {
    const published = items.filter(item => item.status === 'published');
    if (!published.length) return;
    grid.innerHTML = published.map(item => {
      const small = [item.date, item.category].filter(Boolean).join(' · ');
      const title = escapeHtml(item.title);
      const summary = escapeHtml(item.summary);
      const url = escapeHtml(item.url);
      const action = item.language === 'en' ? 'Open publication →' : 'Otvori objavu →';
      return '<article class="insight-card">' +
        '<small>' + escapeHtml(small) + '</small>' +
        '<h2>' + title + '</h2>' +
        '<p>' + summary + '</p>' +
        '<a href="' + url + '">' + action + '</a>' +
      '</article>';
    }).join('');
    if (latestAction && published[0] && published[0].url) latestAction.href = published[0].url;
  }

  fetch('/data/insights.json?v=' + Date.now(), { cache: 'no-store' })
    .then(response => response.ok ? response.json() : null)
    .then(data => { if (data && Array.isArray(data.items)) render(data.items); })
    .catch(() => {});
})();