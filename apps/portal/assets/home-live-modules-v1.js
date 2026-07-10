(() => {
  'use strict';
  if (window.__GNK_ASG_HOME_LIVE_V1__) return;
  window.__GNK_ASG_HOME_LIVE_V1__ = true;

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const lang = document.documentElement.lang === 'en' ? 'en' : 'hr';
  const t = {
    hr: {
      newsEy: 'Newsroom', newsTitle: 'Najnovije objave', newsEmpty: 'Vijesti trenutačno nisu dostupne.', newsMore: 'Otvori Newsroom →',
      pubEy: 'Publikacije', pubTitle: 'Službene objave', pubEmpty: 'Trenutačno nema objavljenih službenih publikacija.',
      mktEy: 'Tržišta', mktTitle: 'Read-only pregled indeksa', mktEmpty: 'Tržišni podaci trenutačno nisu dostupni.', mktUpdated: 'Ažurirano',
      fnEy: 'Javne funkcije Grupe', fnTitle: 'Društva, gradovi i funkcije unutar objavljene mreže.', fnNote: 'Prikazuju se javno objavljena društva, njihova lokacija i funkcija — bez broja zaposlenih.'
    },
    en: {
      newsEy: 'Newsroom', newsTitle: 'Latest updates', newsEmpty: 'News is currently unavailable.', newsMore: 'Open Newsroom →',
      pubEy: 'Publications', pubTitle: 'Official publications', pubEmpty: 'No official publications are published yet.',
      mktEy: 'Markets', mktTitle: 'Read-only index snapshot', mktEmpty: 'Market data is currently unavailable.', mktUpdated: 'Updated',
      fnEy: 'Public Group functions', fnTitle: 'Companies, cities and functions across the disclosed network.', fnNote: 'Shows publicly disclosed companies, their location and function — with no employee counts.'
    }
  }[lang];

  const timeAgo = iso => {
    const diff = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(diff)) return '';
    const h = Math.floor(diff / 3600000);
    if (h < 1) return lang === 'en' ? 'just now' : 'upravo';
    if (h < 24) return lang === 'en' ? `${h}h ago` : `prije ${h} h`;
    const d = Math.floor(h / 24);
    return lang === 'en' ? `${d}d ago` : `prije ${d} d`;
  };

  async function mountNews(target) {
    try {
      const res = await fetch('/data/news.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('bad status');
      const items = (await res.json()).slice(0, 3);
      if (!items.length) throw new Error('empty');
      target.innerHTML = `
        <div class="dhq-section-head"><div><div class="dhq-ey">${t.newsEy}</div><h2 class="dhq-h2">${t.newsTitle}</h2></div></div>
        <div class="dhq-grid-3">${items.map(a => `
          <article class="dhq-card">
            <span style="font-size:11px;color:#8e8164;letter-spacing:1px;">${esc(a.source || '')} · ${esc(timeAgo(a.published_at || a.publishedAt))}</span>
            <h3 class="dhq-h3" style="margin-top:6px;">${esc(a.title)}</h3>
            <a class="dhq-btn" style="margin-top:10px;" href="${esc(a.url)}" target="_blank" rel="noopener">${lang === 'en' ? 'Read' : 'Pročitaj'} →</a>
          </article>`).join('')}</div>
        <div class="dhq-actions"><a class="dhq-btn is-primary" href="/newsroom/">${t.newsMore}</a></div>`;
    } catch (e) {
      target.innerHTML = `<div class="dhq-section-head"><div><div class="dhq-ey">${t.newsEy}</div><h2 class="dhq-h2">${t.newsTitle}</h2></div></div><p style="color:#8e8164">${t.newsEmpty}</p>`;
    }
  }

  async function mountPublications(target) {
    try {
      const res = await fetch('/data/publications.json', { cache: 'no-store' });
      const data = res.ok ? await res.json() : { publications: [] };
      const items = (data.publications || []).slice(0, 3);
      if (!items.length) {
        target.innerHTML = `<div class="dhq-section-head"><div><div class="dhq-ey">${t.pubEy}</div><h2 class="dhq-h2">${t.pubTitle}</h2></div></div><p style="color:#8e8164">${t.pubEmpty}</p>`;
        return;
      }
      const excerpt = (text, n) => { const s = String(text || ''); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '\u2026' : s; };
      target.innerHTML = `
        <div class="dhq-section-head"><div><div class="dhq-ey">${t.pubEy}</div><h2 class="dhq-h2">${t.pubTitle}</h2></div></div>
        <div class="dhq-grid-3">${items.map(p => `
          <article class="dhq-card">${p.image && p.image.src ? `<img src="${esc(p.image.src)}" alt="${esc(p.image.alt || p.title || '')}" loading="lazy" style="width:100%;height:140px;object-fit:cover;border-radius:10px;margin-bottom:12px;border:1px solid rgba(214,173,79,.2);">` : ''}<h3 class="dhq-h3">${esc(p.title || '')}</h3><p>${esc(excerpt(p.summary, 180))}</p></article>`).join('')}</div>`;
    } catch (e) {
      target.innerHTML = `<div class="dhq-section-head"><div><div class="dhq-ey">${t.pubEy}</div><h2 class="dhq-h2">${t.pubTitle}</h2></div></div><p style="color:#8e8164">${t.pubEmpty}</p>`;
    }
  }

  async function mountMarkets(target) {
    try {
      const res = await fetch('/data/market_indices.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      const rows = (data.indices || []).slice(0, 6);
      if (!rows.length) throw new Error('empty');
      target.innerHTML = `
        <div class="dhq-section-head"><div><div class="dhq-ey">${t.mktEy}</div><h2 class="dhq-h2">${t.mktTitle}</h2></div>
        <p style="font-size:11px;color:#8e8164;">${t.mktUpdated}: ${esc(new Date(data.updated_at).toLocaleString(lang === 'en' ? 'en-US' : 'hr-HR'))}</p></div>
        <div class="dhq-grid-4">${rows.map(i => `
          <div class="dhq-kpi"><span>${esc(i.label)}</span><b style="color:${i.change_percent >= 0 ? '#8fe7aa' : '#ff9c9c'}">${i.current.toLocaleString(lang === 'en' ? 'en-US' : 'hr-HR', {maximumFractionDigits:2})} <small>(${i.change_percent >= 0 ? '+' : ''}${i.change_percent}%)</small></b></div>`).join('')}</div>`;
    } catch (e) {
      target.innerHTML = `<div class="dhq-section-head"><div><div class="dhq-ey">${t.mktEy}</div><h2 class="dhq-h2">${t.mktTitle}</h2></div></div><p style="color:#8e8164">${t.mktEmpty}</p>`;
    }
  }

  async function mountFunctions(target) {
    try {
      const res = await fetch('/data/public-group-network.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      const nodes = (data.nodes || []).filter(n => n.publicName);
      if (!nodes.length) throw new Error('empty');
      const rows = nodes.map(n => `
        <article class="dhq-card">
          <span style="font-size:11px;color:#8e8164;letter-spacing:1px;">${esc(n.code || '')} · ${esc(n.status === 'operating' ? (lang==='en'?'Operating':'Operativno') : (lang==='en'?'Dormant':'Dormant'))}</span>
          <h3 class="dhq-h3" style="margin-top:6px;font-size:16px;">${esc(n.publicName)}</h3>
          <p style="margin-top:4px;">${esc(n.city || '')}${n.country ? ', ' + esc(n.country) : ''}</p>
          <p style="margin-top:6px;color:#8e8164;font-size:12px;">${esc(n.function || '—')}</p>
        </article>`).join('');
      target.innerHTML = `
        <div class="dhq-section-head"><div><div class="dhq-ey">${t.fnEy}</div><h2 class="dhq-h2">${t.fnTitle}</h2></div><p>${t.fnNote}</p></div>
        <div class="dhq-grid-3">${rows}</div>
        <div class="dhq-actions"><a class="dhq-btn is-primary" href="/group-network/">${lang === 'en' ? 'Open full network directory →' : 'Otvori cijeli imenik mreže →'}</a></div>`;
    } catch (e) { target.innerHTML = ''; }
  }

  document.querySelectorAll('[data-gnk-news-mount]').forEach(mountNews);
  document.querySelectorAll('[data-gnk-publications-mount]').forEach(mountPublications);
  document.querySelectorAll('[data-gnk-markets-mount]').forEach(mountMarkets);
  document.querySelectorAll('[data-gnk-functions-mount]').forEach(mountFunctions);
})();
