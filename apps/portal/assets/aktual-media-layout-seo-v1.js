(() => {
  'use strict';
  if (window.__AKTUAL_MEDIA_V2__) return;
  window.__AKTUAL_MEDIA_V2__ = true;

  const BRAND = 'GNK ASG d.o.o. · Nermin Sefić · GNK DINAMO Ltd.';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const groups = { hrvatska:'Hrvatska', international:'Svijet', technology:'Tehnologija', economy:'Burza i biznis', 'digital-assets':'Digitalna imovina', 'digital-workforce-simulation':'GNK ASG · Simulacija' };
  const state = { items: [], featuredIndex: 0, categoryOffsets: {} };

  function ensureMeta(name, content, property = false) {
    let node = document.head.querySelector(property ? `meta[property="${name}"]` : `meta[name="${name}"]`);
    if (!node) { node = document.createElement('meta'); node.setAttribute(property ? 'property' : 'name', name); document.head.appendChild(node); }
    node.setAttribute('content', content);
  }

  function installSeo() {
    document.title = 'AKTUAL MEDIA — Vijesti, GNK ASG d.o.o., Nermin Sefić i GNK DINAMO Ltd.';
    ensureMeta('description', 'AKTUAL MEDIA donosi rotirajući slikovni pregled vijesti i tekstualne poveznice. Izdavački i entitetski kontekst: GNK ASG d.o.o., Nermin Sefić i GNK DINAMO Ltd.');
    ensureMeta('keywords', 'AKTUAL MEDIA, Nermin Sefić, GNK ASG d.o.o., GNK DINAMO Ltd., vijesti, gospodarstvo, tehnologija, digitalna imovina');
    ensureMeta('author', 'Nermin Sefić, GNK ASG d.o.o., GNK DINAMO Ltd.');
    ensureMeta('robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    ensureMeta('og:site_name', BRAND, true);
    ensureMeta('article:author', 'Nermin Sefić', true);
    const schema = {
      '@context':'https://schema.org', '@graph':[
        {'@type':'Organization','@id':'https://gnk-asg.hr/#organization','name':'GNK ASG d.o.o.','url':'https://gnk-asg.hr/'},
        {'@type':'Organization','@id':'https://gnk-asg.hr/#gnk-dinamo-ltd','name':'GNK DINAMO Ltd.','url':'https://gnk-asg.hr/'},
        {'@type':'Person','@id':'https://gnk-asg.hr/#nermin-sefic','name':'Nermin Sefić','url':'https://gnk-asg.hr/','affiliation':[{'@id':'https://gnk-asg.hr/#organization'},{'@id':'https://gnk-asg.hr/#gnk-dinamo-ltd'}]},
        {'@type':'CollectionPage','@id':'https://gnk-asg.hr/gnk-aktual/#webpage','url':'https://gnk-asg.hr/gnk-aktual/','name':'AKTUAL MEDIA — Vijesti','publisher':{'@id':'https://gnk-asg.hr/#organization'},'about':[{'@id':'https://gnk-asg.hr/#nermin-sefic'},{'@id':'https://gnk-asg.hr/#gnk-dinamo-ltd'}]}
      ]
    };
    const ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.textContent = JSON.stringify(schema); document.head.appendChild(ld);
  }

  function timeAgo(iso) {
    const d = new Date(iso); if (Number.isNaN(d.getTime())) return '';
    const minutes = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.round(minutes / 60); if (hours < 24) return `${hours} h`;
    return `${Math.round(hours / 24)} d`;
  }

  function imageBlock(item, eager = false) {
    return `<div class="ak-media-frame"><span class="ak-watermark">GNK ASG</span><img src="${esc(item.image)}" alt="${esc(BRAND)} · ${esc(item.title)}" title="${esc(BRAND)} · ${esc(item.title)}" loading="${eager ? 'eager' : 'lazy'}"><span class="ak-indexable-brand">${BRAND}</span></div>`;
  }

  function renderFeatured() {
    const item = state.items[state.featuredIndex % state.items.length];
    const el = document.getElementById('akFeatured'); if (!el || !item) return;
    el.innerHTML = `<article class="ak-featured">${imageBlock(item, true)}<div class="ak-featured-body"><span class="ak-tag">${esc(groups[item.group] || item.category || 'Vijest')}</span><h2><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(item.title)}</a></h2><p>${esc(item.summary || '')}</p><div class="ak-meta"><span>${esc(item.source || '')}</span><span>·</span><span>${timeAgo(item.published_at)}</span><span>·</span><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer nofollow">Pročitaj izvorni članak →</a></div></div></article>`;
  }

  function grouped() {
    return state.items.reduce((acc, item) => { const g = item.group || 'international'; (acc[g] ||= []).push(item); return acc; }, {});
  }

  function renderImageSections() {
    const container = document.getElementById('akCategories'); if (!container) return;
    const byGroup = grouped();
    const order = ['economy','technology','digital-assets','international','hrvatska'];
    container.innerHTML = order.map(group => {
      const items = byGroup[group] || []; if (!items.length) return '';
      const offset = state.categoryOffsets[group] || 0;
      const slice = [...items.slice(offset, offset + 6), ...items.slice(0, Math.max(0, offset + 6 - items.length))].slice(0, 6);
      return `<section class="ak-section"><div class="ak-section-head"><h2>${esc(groups[group] || group)}</h2><span>slikovne vijesti · rotira se</span></div><div class="ak-cat-grid">${slice.map(item => `<article class="ak-card"><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer nofollow">${imageBlock(item)}</a><div class="ak-card-body"><h3><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(item.title)}</a></h3><p>${esc((item.summary || '').slice(0, 145))}${item.summary && item.summary.length > 145 ? '…' : ''}</p><span class="ak-src">${esc(item.source || '')} · ${timeAgo(item.published_at)}</span></div></article>`).join('')}</div></section>`;
    }).join('');
  }

  function renderTextLinks() {
    const top = document.getElementById('akTop10');
    const all = document.getElementById('akAllList');
    if (top) top.innerHTML = state.items.slice(0, 10).map((item, i) => `<li><b>${i + 1}</b><div><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(item.title)}</a><span class="ak-src">${esc(item.source || '')} · ${timeAgo(item.published_at)} · ${BRAND}</span></div></li>`).join('');
    if (all) all.innerHTML = state.items.map(item => `<li><span class="cat">${esc(groups[item.group] || item.category || 'Vijest')}</span><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(item.title)}</a><span class="meta">${esc(item.source || '')} · ${timeAgo(item.published_at)}</span></li>`).join('');
    document.getElementById('akTopSection')?.removeAttribute('hidden');
    document.getElementById('akAllSection')?.removeAttribute('hidden');
    const count = document.getElementById('akAllCount'); if (count) count.textContent = '';
  }

  function reorder() {
    const categories = document.getElementById('akCategories');
    const top = document.getElementById('akTopSection');
    const all = document.getElementById('akAllSection');
    if (categories && top) categories.after(top);
    if (top && all) top.after(all);
    const heading = top?.querySelector('h2'); if (heading) heading.textContent = 'Najnovije tekstualne objave i poveznice';
    const allHeading = all?.querySelector('h2'); if (allHeading) allHeading.textContent = 'Sve tekstualne objave i poveznice';
  }

  function addVisibleEntityBlock() {
    if (document.getElementById('akEntitySeo')) return;
    const section = document.createElement('section'); section.id = 'akEntitySeo'; section.className = 'ak-entity-seo';
    section.innerHTML = `<strong>AKTUAL MEDIA · GNK ASG d.o.o.</strong><span>Nermin Sefić · GNK DINAMO Ltd. · medijske objave, vijesti, analize i poveznice</span>`;
    document.querySelector('.ak-wrap')?.appendChild(section);
  }

  async function boot() {
    installSeo(); reorder(); addVisibleEntityBlock();
    try {
      const response = await fetch('/data/news.json?v=' + Date.now(), { cache:'no-store' });
      const data = await response.json();
      const source = Array.isArray(data) ? data : (data.items || []);
      state.items = source.filter(item => item && item.title && item.url && item.image);
      const status = document.getElementById('akStatus');
      if (status) status.textContent = state.items.length ? `Najnovije slikovne vijesti · automatska rotacija · ${BRAND}` : 'Vijesti trenutačno nisu dostupne.';
      if (!state.items.length) return;
      renderFeatured(); renderImageSections(); renderTextLinks(); reorder();
      setInterval(() => {
        state.featuredIndex = (state.featuredIndex + 1) % state.items.length;
        const byGroup = grouped(); Object.keys(byGroup).forEach(g => state.categoryOffsets[g] = ((state.categoryOffsets[g] || 0) + 2) % byGroup[g].length);
        renderFeatured(); renderImageSections();
      }, 8000);
    } catch (error) {
      console.error('[aktual-media] load failed', error);
    }
  }

  const style = document.createElement('style');
  style.textContent = `.ak-media-frame{position:relative}.ak-media-frame>img{width:100%;display:block;object-fit:cover}.ak-watermark{position:absolute;left:10px;top:10px;z-index:3;padding:5px 9px;border:1px solid rgba(242,210,125,.78);border-radius:999px;background:rgba(5,5,5,.9);color:#f2d27d;font:900 .64rem/1 Arial,sans-serif;letter-spacing:.1em}.ak-indexable-brand{display:block;padding:7px 10px;background:#09090b;color:#e2c66f;font:800 .66rem/1.35 Arial,sans-serif;letter-spacing:.04em}.ak-featured>.ak-media-frame img{height:100%;min-height:280px}.ak-card .ak-media-frame img{height:150px}.ak-entity-seo{margin:40px 0 0;padding:20px;border:1px solid rgba(212,175,55,.35);border-radius:14px;background:rgba(212,175,55,.06);font-family:Arial,sans-serif}.ak-entity-seo strong,.ak-entity-seo span{display:block}.ak-entity-seo strong{color:#f2d27d;margin-bottom:7px}.ak-entity-seo span{color:#b9b2a7;font-size:.82rem}@media(max-width:640px){.ak-card .ak-media-frame img{height:120px}}`;
  document.head.appendChild(style);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true }); else boot();
})();
