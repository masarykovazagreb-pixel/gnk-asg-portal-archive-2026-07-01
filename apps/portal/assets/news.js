(() => {
  const grid = document.getElementById('newsGrid');
  const tabs = Array.from(document.querySelectorAll('#newsTabs button'));
  let articles = [];
  const clean = (value) => String(value || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function card(item) {
    const type = item.category === 'technology' ? ' is-tech' : item.category === 'digital-assets' ? ' is-assets' : item.group === 'mentions' ? ' is-mention' : '';
    return `<article class="news-card${type}"><span class="meta">${clean(item.source || item.category || 'NEWS')}</span><h3>${clean(item.title)}</h3><p>${clean(item.summary || 'Otvorite izvor za cijelu objavu.')}</p><a target="_blank" rel="noopener nofollow" href="${clean(item.url)}">OTVORI IZVOR →</a></article>`;
  }
  function render(filter) {
    if (!grid) return;
    if (filter === 'fina') {
      grid.innerHTML = '<article class="news-card"><span class="meta">FINA / RGFI</span><h3>Službene javne informacije</h3><p>Službene FINA i RGFI poveznice prikazane su u bočnom panelu.</p><a href="https://rgfi.fina.hr/JavnaObjava-web/" target="_blank" rel="noopener nofollow">OTVORI JAVNU OBJAVU →</a></article>';
      return;
    }
    const list = filter === 'all' ? articles : articles.filter((item) => String(item.group || item.category || '').toLowerCase().includes(filter));
    grid.innerHTML = list.length ? list.slice(0, 15).map(card).join('') : '<article class="news-card"><span class="meta">AUTOMATSKO AŽURIRANJE</span><h3>Čeka se sadržaj rubrike</h3><p>Vijesti se osvježavaju svakog sata putem GitHub workflowa.</p></article>';
  }
  async function boot() {
    if (!grid) return;
    try {
      const response = await fetch('data/news.json?v=' + Date.now(), {cache:'no-store'});
      articles = response.ok ? await response.json() : [];
    } catch (error) { articles = []; }
    render('all');
    tabs.forEach((button) => button.addEventListener('click', () => {
      tabs.forEach((entry) => entry.classList.remove('active'));
      button.classList.add('active');
      render(button.dataset.filter || 'all');
    }));
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
