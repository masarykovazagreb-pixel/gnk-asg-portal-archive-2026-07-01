(() => {
  'use strict';

  const iqCss = document.createElement('link');
  iqCss.rel = 'stylesheet';
  iqCss.href = '/assets/index-iq200.css?v=20260623-iq200-1';
  document.head.appendChild(iqCss);

  const iqScript = document.createElement('script');
  iqScript.src = '/assets/index-iq200.js?v=20260623-iq200-1';
  iqScript.defer = true;
  document.head.appendChild(iqScript);

  const lang = document.documentElement.lang === 'en' ? 'en' : 'hr';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));

  const copy = {
    hr: {
      loading: 'Učitavanje…', noItems: 'Trenutačno nema dostupnih zapisa.',
      autoTitle: 'Auto Editor', mediaTitle: 'Media Kit', docsTitle: 'Dokumenti i PDF centar',
      openPublications: 'Otvori Objave', openNews: 'Otvori Vijesti', openVisual: 'Otvori Visual Index',
      contact: 'Kontakt za medije', statusUnavailable: 'Javni feed trenutačno nije dostupan. Dostupne su povezane javne sekcije portala.',
      groupAll: 'Sve', existing: 'Postojeće', planned: 'Planirano 2026.'
    },
    en: {
      loading: 'Loading…', noItems: 'No entries are currently available.',
      autoTitle: 'Auto Editor', mediaTitle: 'Media Kit', docsTitle: 'Documents and PDF Centre',
      openPublications: 'Open Publications', openNews: 'Open News', openVisual: 'Open Visual Index',
      contact: 'Media contact', statusUnavailable: 'The public feed is temporarily unavailable. Related public portal sections remain available.',
      groupAll: 'All', existing: 'Existing', planned: 'Planned 2026'
    }
  }[lang];

  const modals = Object.fromEntries([...document.querySelectorAll('.modal')].map(modal => [modal.id, modal]));
  function openModal(id) {
    const modal = modals[id];
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    const close = modal.querySelector('[data-close]');
    if (close) close.focus();
  }
  function closeModal(modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-open]');
    if (opener) {
      event.preventDefault();
      const id = opener.dataset.open;
      openModal(id);
      if (id === 'auto-editor-modal') loadAutoEditor();
    }
    const close = event.target.closest('[data-close]');
    if (close) closeModal(close.closest('.modal'));
    if (event.target.classList.contains('modal')) closeModal(event.target);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.querySelectorAll('.modal.open').forEach(closeModal);
  });

  async function getJson(url) {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function loadAutoEditor() {
    const box = document.querySelector('#auto-editor-modal .modal-grid');
    if (!box) return;
    box.innerHTML = `<article class="modal-item"><h4>${copy.loading}</h4></article>`;
    try {
      const payload = await getJson('/data/auto-editor.json');
      const items = Array.isArray(payload) ? payload : (payload.items || payload.articles || []);
      box.innerHTML = items.length ? items.slice(0, 10).map(item => `
        <article class="modal-item">
          <h4>${esc(lang === 'en' ? (item.titleEn || item.title) : (item.titleHr || item.title))}</h4>
          <p>${esc(lang === 'en' ? (item.summaryEn || item.summary || item.excerpt) : (item.summaryHr || item.summary || item.excerpt))}</p>
        </article>`).join('') : `<article class="modal-item"><h4>${copy.noItems}</h4><p>${copy.statusUnavailable}</p></article>`;
    } catch (error) {
      box.innerHTML = `<article class="modal-item"><h4>${copy.statusUnavailable}</h4><p>${esc(error.message)}</p></article>`;
    }
  }

  async function loadNews() {
    try {
      const payload = await getJson('/data/news.json');
      const items = Array.isArray(payload) ? payload : (payload.items || []);
      if (!items.length) return;
      const top = items[0];
      const title = top.title || top.titleHr || top.titleEn || (lang === 'en' ? 'Featured information' : 'Ključna informacija');
      const summary = top.summary || top.description || top.excerpt || '';
      const link = top.url || top.sourceUrl || (lang === 'en' ? '/news/' : '/vijesti/');
      const titleEl = document.getElementById('featuredTitle');
      const summaryEl = document.getElementById('featuredSummary');
      const linkEl = document.getElementById('featuredLink');
      if (titleEl) titleEl.textContent = title;
      if (summaryEl) summaryEl.textContent = summary;
      if (linkEl) linkEl.href = link;
      const list = document.getElementById('latestNews');
      if (list) list.innerHTML = items.slice(0, 5).map(item => `
        <a class="news-item" href="${esc(item.url || item.sourceUrl || (lang === 'en' ? '/news/' : '/vijesti/'))}">
          <strong>${esc(item.title || item.titleHr || item.titleEn || 'News')}</strong>
          <small>${esc(item.source || item.category || 'GNK ASG')}</small>
        </a>`).join('');
    } catch (_) {}
  }

  async function loadMarket() {
    const target = document.getElementById('marketRows');
    if (!target) return;
    try {
      const payload = await getJson('/api/market');
      const assets = payload.assets || {};
      const rows = [
        ['ASG Gold Reference', assets.asg_gold_reference?.value_eur, ' EUR'],
        ['Bitcoin / EUR', assets.bitcoin?.price_eur, ' EUR'],
        ['USD / EUR', assets.usd_eur?.rate, ''],
        ['Brent', assets.brent?.price_usd ?? assets.brent?.price, ' USD']
      ];
      target.innerHTML = rows.map(([name, value, suffix]) => `
        <div class="market-row"><span>${name}</span><b class="market-value">${value == null ? '—' : Number(value).toLocaleString(lang === 'en' ? 'en-US' : 'hr-HR', { maximumFractionDigits: 2 }) + suffix}</b></div>`).join('');
    } catch (_) {
      target.querySelectorAll('.market-value').forEach(el => { el.textContent = '—'; });
    }
  }

  async function loadPublications() {
    const target = document.getElementById('publicationRows');
    if (!target) return;
    try {
      const payload = await getJson('/data/auto-editor.json');
      const items = Array.isArray(payload) ? payload : (payload.items || payload.articles || []);
      target.innerHTML = items.length ? items.slice(0, 5).map(item => `
        <a class="publication-row" href="${lang === 'en' ? '/publications/' : '/objave/'}">
          <span>${esc(lang === 'en' ? (item.titleEn || item.title) : (item.titleHr || item.title))}</span>
          <small>${esc(String(item.publishedAt || item.date || '').slice(0, 10))}</small>
        </a>`).join('') : `<a class="publication-row" href="${lang === 'en' ? '/publications/' : '/objave/'}"><span>${copy.openPublications}</span></a>`;
    } catch (_) {
      target.innerHTML = `<a class="publication-row" href="${lang === 'en' ? '/publications/' : '/objave/'}"><span>${copy.openPublications}</span></a>`;
    }
  }

  async function loadNetwork() {
    const list = document.getElementById('locationList');
    const tabs = document.getElementById('continentTabs');
    const plannedList = document.getElementById('plannedList');
    if (!list || !tabs) return;
    try {
      const data = await getJson('/data/group_network.json');
      const active = (data.nodes || []).filter(node => node.status === 'active');
      const planned = (data.nodes || []).filter(node => node.status === 'planned');
      const regions = [...new Set(active.map(node => node.region).filter(Boolean))];
      tabs.innerHTML = [`<button class="active" data-region="all">${copy.groupAll}</button>`, ...regions.map(region => `<button data-region="${esc(region)}">${esc(region)}</button>`)].join('');
      const render = region => {
        const nodes = active.filter(node => region === 'all' || node.region === region);
        const center = data.center ? [data.center] : [];
        list.innerHTML = [...center, ...nodes].map(node => `
          <div class="location"><b>${esc(node.id === 'boulder' ? node.name : (lang === 'en' ? (node.name_en || node.name_hr) : (node.name_hr || node.name_en)))}</b>
          <span>${esc(node.id === 'boulder' ? node.place : (lang === 'en' ? (node.place_en || node.place_hr) : (node.place_hr || node.place_en)))} · ${esc(node.region || '')}</span></div>`).join('');
      };
      render('all');
      tabs.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
          tabs.querySelectorAll('button').forEach(item => item.classList.remove('active'));
          button.classList.add('active');
          render(button.dataset.region);
        });
      });
      if (plannedList) plannedList.innerHTML = planned.map(node => `<li>${esc(lang === 'en' ? (node.name_en || node.name_hr) : (node.name_hr || node.name_en))} · ${esc(lang === 'en' ? (node.place_en || node.place_hr) : (node.place_hr || node.place_en))}</li>`).join('');
    } catch (_) {
      list.innerHTML = `<div class="location"><b>${copy.statusUnavailable}</b></div>`;
    }
  }

  const play = document.querySelector('.play');
  if (play) play.addEventListener('click', () => {
    const active = play.dataset.playing === '1';
    play.dataset.playing = active ? '0' : '1';
    play.textContent = active ? '▶' : 'Ⅱ';
    const featured = play.closest('.featured');
    if (featured) featured.style.filter = active ? '' : 'saturate(1.35) brightness(1.08)';
  });

  loadNews();
  loadMarket();
  loadPublications();
  loadNetwork();
})();