(() => {
  'use strict';
  if (window.__GNK_ASG_INDEX_NEWS_ROTATION_V1__) return;
  window.__GNK_ASG_INDEX_NEWS_ROTATION_V1__ = true;

  const route = location.pathname.replace(/\/+$/, '') || '/';
  if (!['/', '/en'].includes(route)) return;

  const lang = document.documentElement.lang === 'en' ? 'en' : 'hr';
  const POOL_SIZE = 30;
  const ROTATION_MS = 10000;
  const DATA_REFRESH_MS = 15 * 60 * 1000;
  const SIDE_COUNT = 5;

  let items = [];
  let position = 0;
  let rotateTimer = null;
  let dataTimer = null;
  let paused = false;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[char]));

  const text = (item, field) => {
    if (field === 'title') return lang === 'en'
      ? (item.titleEn || item.title || item.titleHr || '')
      : (item.titleHr || item.title || item.titleEn || '');
    return lang === 'en'
      ? (item.summaryEn || item.summary || item.description || item.excerpt || '')
      : (item.summaryHr || item.summary || item.description || item.excerpt || '');
  };

  const validUrl = value => {
    try {
      const url = new URL(String(value || ''), location.origin);
      return /^https?:$/.test(url.protocol) ? url.href : (lang === 'en' ? '/news/' : '/vijesti/');
    } catch {
      return lang === 'en' ? '/news/' : '/vijesti/';
    }
  };

  const uniqueLatest = input => {
    const seen = new Set();
    return (Array.isArray(input) ? input : [])
      .filter(item => item && text(item,'title'))
      .sort((a,b) => Date.parse(b.publishedAt || b.published_at || 0) - Date.parse(a.publishedAt || a.published_at || 0))
      .filter(item => {
        const key = String(item.id || item.url || item.sourceUrl || text(item,'title')).toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0,POOL_SIZE);
  };

  const formatTime = value => {
    const date = new Date(value || '');
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'hr-HR', {
      day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Zagreb'
    }).format(date);
  };

  function installStyle() {
    if (document.getElementById('gnk-index-news-rotation-style-v1')) return;
    const style = document.createElement('style');
    style.id = 'gnk-index-news-rotation-style-v1';
    style.textContent = `
      #featuredTitle,#featuredSummary,#latestNews{transition:opacity .24s ease,transform .24s ease}
      .gnk-news-changing{opacity:.18!important;transform:translateY(3px)!important}
      .gnk-news-rotation-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:7px 0 0;color:#8fa1b8;font-size:8px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
      .gnk-news-rotation-meta span:first-child{color:#ffe08a}
      .news-item.gnk-news-current{border-color:rgba(215,170,60,.58)!important;background:linear-gradient(145deg,rgba(215,170,60,.12),rgba(43,143,230,.08))!important}
      @media(prefers-reduced-motion:reduce){#featuredTitle,#featuredSummary,#latestNews{transition:none}.gnk-news-changing{transform:none!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureMeta() {
    const content = document.querySelector('.featured-content');
    if (!content) return null;
    let meta = document.getElementById('gnk-news-rotation-meta');
    if (!meta) {
      meta = document.createElement('div');
      meta.id = 'gnk-news-rotation-meta';
      meta.className = 'gnk-news-rotation-meta';
      content.appendChild(meta);
    }
    return meta;
  }

  function renderNow() {
    if (!items.length) return;
    const featuredTitle = document.getElementById('featuredTitle');
    const featuredSummary = document.getElementById('featuredSummary');
    const featuredLink = document.getElementById('featuredLink');
    const list = document.getElementById('latestNews');
    if (!featuredTitle || !featuredSummary || !featuredLink || !list) return;

    const current = items[position % items.length];
    const title = text(current,'title');
    const summary = text(current,'summary');
    const href = validUrl(current.url || current.sourceUrl);

    [featuredTitle,featuredSummary,list].forEach(node => node.classList.add('gnk-news-changing'));
    window.setTimeout(() => {
      featuredTitle.textContent = title;
      featuredSummary.textContent = summary || (lang === 'en' ? 'Open the original source for full details.' : 'Otvorite izvor za potpune informacije.');
      featuredLink.href = href;
      featuredLink.textContent = lang === 'en' ? 'Open source' : 'Otvori izvor';

      const side = [];
      for (let offset = 1; offset <= Math.min(SIDE_COUNT,items.length - 1); offset += 1) {
        side.push(items[(position + offset) % items.length]);
      }
      if (!side.length) side.push(current);
      list.innerHTML = side.map((item,index) => {
        const itemTitle = text(item,'title');
        const source = item.source || item.category || 'GNK ASG Intelligence Desk';
        const published = formatTime(item.publishedAt || item.published_at);
        return `<a class="news-item${index===0?' gnk-news-current':''}" href="${esc(validUrl(item.url || item.sourceUrl))}"><strong>${esc(itemTitle)}</strong><small>${esc(source)}${published ? ` · ${esc(published)}` : ''}</small></a>`;
      }).join('');

      const meta = ensureMeta();
      if (meta) meta.innerHTML = `<span>${position + 1} / ${items.length}</span><span>${esc(current.source || 'GNK ASG Intelligence Desk')} · ${esc(formatTime(current.publishedAt || current.published_at))}</span>`;
      [featuredTitle,featuredSummary,list].forEach(node => node.classList.remove('gnk-news-changing'));
    },220);
  }

  function advance() {
    if (paused || items.length < 2) return;
    position = (position + 1) % items.length;
    renderNow();
  }

  function restartRotation() {
    if (rotateTimer) clearInterval(rotateTimer);
    rotateTimer = setInterval(advance,ROTATION_MS);
  }

  async function fetchNews() {
    try {
      const response = await fetch(`/data/news.json?cb=${Date.now()}`, { cache:'no-store', headers:{accept:'application/json'} });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const next = uniqueLatest(Array.isArray(payload) ? payload : (payload.items || payload.news || []));
      if (!next.length) return;
      const currentKey = items[position]?.id || items[position]?.url || items[position]?.sourceUrl;
      items = next;
      const retainedIndex = currentKey ? items.findIndex(item => (item.id || item.url || item.sourceUrl) === currentKey) : -1;
      position = retainedIndex >= 0 ? retainedIndex : 0;
      renderNow();
      restartRotation();
    } catch (_) {}
  }

  function boot() {
    installStyle();
    fetchNews();
    dataTimer = setInterval(fetchNews,DATA_REFRESH_MS);
    document.addEventListener('visibilitychange',() => {
      paused = document.hidden;
      if (!paused) {
        fetchNews();
        restartRotation();
      }
    });
    const featureGrid = document.querySelector('.feature-grid');
    featureGrid?.addEventListener('mouseenter',() => { paused = true; });
    featureGrid?.addEventListener('mouseleave',() => { paused = document.hidden; });
    featureGrid?.addEventListener('focusin',() => { paused = true; });
    featureGrid?.addEventListener('focusout',() => { paused = document.hidden; });
    window.addEventListener('pagehide',() => {
      if (rotateTimer) clearInterval(rotateTimer);
      if (dataTimer) clearInterval(dataTimer);
    },{once:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
