(() => {
  'use strict';
  if (window.__GNK_WEBSHOP_V4__) return;
  window.__GNK_WEBSHOP_V4__ = true;

  const en = document.documentElement.lang?.toLowerCase().startsWith('en');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const T = en ? {
    requestQuote: 'Request a quote', empty: 'No matching items are currently available.', selected: 'Selected item:', subjectPrefix: 'Quote request:', all: 'All categories',
    results: count => `${count} ${count === 1 ? 'item' : 'items'}`, updated: value => `Catalog updated: ${value}`, source: value => `Source: ${value}`,
    messageTemplate: name => `I would like to request a quote for: ${name}\n\nPlease include:\n\n`, converted: 'Indicative EUR conversion — final quote on request'
  } : {
    requestQuote: 'Zatraži ponudu', empty: 'Nema stavki koje odgovaraju odabranim kriterijima.', selected: 'Odabrana stavka:', subjectPrefix: 'Zahtjev za ponudu:', all: 'Sve kategorije',
    results: count => `${count} ${count === 1 ? 'stavka' : count < 5 ? 'stavke' : 'stavki'}`, updated: value => `Katalog ažuriran: ${value}`, source: value => `Izvor: ${value}`,
    messageTemplate: name => `Molim ponudu za: ${name}\n\nMolim uključite:\n\n`, converted: 'Informativna EUR konverzija — konačna ponuda na upit'
  };

  const state = { products: [], query: '', category: '', sort: 'featured' };
  function priceValue(product) {
    const raw = product.price?.amount ?? product.priceAmount ?? product.priceEur ?? product.priceUsd;
    return Number.isFinite(Number(raw)) ? Number(raw) : null;
  }
  function priceLabel(product) {
    const value = priceValue(product);
    if (value === null) return product.priceNote || '';
    const currency = product.price?.currency || product.currency || (product.priceEur != null ? 'EUR' : product.priceUsd != null ? 'USD' : 'EUR');
    return new Intl.NumberFormat(en ? 'en-IE' : 'hr-HR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  }
  function filteredProducts() {
    const query = state.query.trim().toLocaleLowerCase(en ? 'en' : 'hr');
    const filtered = state.products.filter(product => {
      const categoryMatch = !state.category || product.category === state.category;
      const haystack = [product.name, product.description, product.category, product.brand, product.sku, product.providerSku, ...(product.tags || [])].filter(Boolean).join(' ').toLocaleLowerCase(en ? 'en' : 'hr');
      return categoryMatch && (!query || haystack.includes(query));
    });
    return filtered.sort((a, b) => {
      if (state.sort === 'name') return String(a.name).localeCompare(String(b.name), en ? 'en' : 'hr');
      if (state.sort === 'price-asc') return (priceValue(a) ?? Number.MAX_SAFE_INTEGER) - (priceValue(b) ?? Number.MAX_SAFE_INTEGER);
      if (state.sort === 'price-desc') return (priceValue(b) ?? -1) - (priceValue(a) ?? -1);
      return (a.order ?? 9999) - (b.order ?? 9999);
    });
  }
  function render(grid) {
    const products = filteredProducts();
    const count = document.getElementById('shopResultCount');
    if (count) count.textContent = T.results(products.length);
    if (!products.length) { grid.innerHTML = `<p class="shop-empty">${T.empty}</p>`; return; }
    grid.innerHTML = products.map(product => {
      const tags = Array.isArray(product.tags) ? product.tags.slice(0, 3) : [];
      const availability = product.availabilityLabel || product.availability || '';
      const converted = product.sourceCurrency === 'USD' || product.priceUsd != null;
      const referenceNote = converted ? `<span class="shop-price-note">${esc(T.converted)}${product.fxDate ? ` · ECB ${esc(product.fxDate)}` : ''}</span>` : '';
      return `<article class="shop-card" data-product-id="${esc(product.id || product.sku || '')}">
        ${product.image ? `<div class="shop-card-image"><img src="${esc(product.image)}" alt="${esc(product.name)}" loading="lazy" width="480" height="300"></div>` : ''}
        <div class="shop-card-body"><div class="shop-card-meta"><span class="shop-kicker">${esc(product.category)}</span>${availability ? `<span class="shop-availability">${esc(availability)}</span>` : ''}</div>
        <h3>${esc(product.name)}</h3>${product.brand ? `<p class="shop-brand">${esc(product.brand)}${product.sku ? ` · ${esc(product.sku)}` : ''}</p>` : ''}
        <p>${esc(product.description)}</p>${tags.length ? `<div class="shop-tags">${tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div>` : ''}
        <div class="shop-card-footer"><div><p class="shop-price">${esc(priceLabel(product))}</p>${referenceNote}</div><button type="button" class="shop-quote-btn" data-product="${esc(product.name)}" data-product-id="${esc(product.id || product.sku || '')}">${T.requestQuote}</button></div>
        </div></article>`;
    }).join('');
  }
  function populateCategories(select) {
    const categories = [...new Set(state.products.map(product => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, en ? 'en' : 'hr'));
    select.innerHTML = `<option value="">${T.all}</option>${categories.map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join('')}`;
  }
  function setActiveChip(active) {
    document.querySelectorAll('.shop-chip').forEach(chip => chip.setAttribute('aria-pressed', chip === active ? 'true' : 'false'));
  }
  function wireControls(grid) {
    const search = document.getElementById('shopSearch');
    const category = document.getElementById('shopCategory');
    document.getElementById('shopSort')?.addEventListener('change', event => { state.sort = event.target.value; render(grid); });
    search?.addEventListener('input', event => { state.query = event.target.value; setActiveChip(null); render(grid); });
    category?.addEventListener('change', event => { state.category = event.target.value; setActiveChip(null); render(grid); });
    document.querySelectorAll('.shop-chip').forEach(chip => chip.addEventListener('click', () => {
      state.category = chip.dataset.category || '';
      state.query = chip.dataset.search || '';
      if (search) search.value = state.query;
      if (category) category.value = state.category;
      setActiveChip(chip);
      render(grid);
    }));
  }
  function wireQuoteButtons(grid, form) {
    grid.addEventListener('click', event => {
      const button = event.target.closest('.shop-quote-btn'); if (!button || !form) return;
      const name = button.dataset.product, id = button.dataset.productId, subject = form.elements.subject, message = form.elements.message, department = form.elements.department;
      if (subject) subject.value = `${T.subjectPrefix} ${name}`;
      if (message) message.value = `${T.messageTemplate(name)}${id ? `Referenca proizvoda: ${id}\n` : ''}`;
      if (department && [...department.options].some(option => option.value === 'webshop')) department.value = 'webshop';
      const note = document.getElementById('shopSelectedNote'); if (note) note.textContent = `${T.selected} ${name}${id ? ` (${id})` : ''}`;
      form.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); if (message) { message.focus(); message.setSelectionRange(message.value.length, message.value.length); }
    });
  }
  function renderCatalogMeta(data, bestBuyMeta) {
    const meta = document.getElementById('shopCatalogMeta'); if (!meta) return; const parts = [];
    if (data.updatedAt) { const date = new Date(data.updatedAt); parts.push(T.updated(Number.isNaN(date.getTime()) ? data.updatedAt : new Intl.DateTimeFormat(en ? 'en-GB' : 'hr-HR', { dateStyle: 'medium', timeStyle: 'short' }).format(date))); }
    if (data.sourceLabel) parts.push(T.source(data.sourceLabel));
    if (bestBuyMeta?.fx?.rate) parts.push(`ECB EUR/USD ${bestBuyMeta.fx.rate}${bestBuyMeta.fx.date ? ` · ${bestBuyMeta.fx.date}` : ''}`);
    meta.textContent = parts.join(' · ');
  }
  async function loadBestBuy() {
    try {
      const response = await fetch('/api/commerce/bestbuy/products?q=laptop&pageSize=24', { headers: { accept: 'application/json' } });
      if (!response.ok) return { products: [], meta: null };
      const data = await response.json(); return { products: Array.isArray(data.products) ? data.products : [], meta: data };
    } catch { return { products: [], meta: null }; }
  }
  async function boot() {
    const grid = document.getElementById('shopGrid'); if (!grid) return; const form = document.getElementById('contactForm'); wireQuoteButtons(grid, form); wireControls(grid);
    try {
      const [staticResponse, bestBuy] = await Promise.all([fetch('/data/webshop-products.json?v=' + Date.now(), { cache: 'no-store' }), loadBestBuy()]);
      if (!staticResponse.ok) throw new Error(`Catalog HTTP ${staticResponse.status}`);
      const data = await staticResponse.json(); const staticProducts = Array.isArray(data.products) ? data.products : [];
      const seen = new Set(); state.products = [...staticProducts, ...bestBuy.products].filter(product => { const key = String(product.id || product.sku || product.name); if (seen.has(key)) return false; seen.add(key); return true; });
      const category = document.getElementById('shopCategory'); if (category) populateCategories(category); renderCatalogMeta(data, bestBuy.meta); render(grid);
    } catch (error) { console.error('[webshop] catalog load failed', error); grid.innerHTML = `<p class="shop-empty">${T.empty}</p>`; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();