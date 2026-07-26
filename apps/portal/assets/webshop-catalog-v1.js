(() => {
  'use strict';
  if (window.__GNK_WEBSHOP_V1__) return;
  window.__GNK_WEBSHOP_V1__ = true;

  const en = document.documentElement.lang?.toLowerCase().startsWith('en');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = en ? {
    requestQuote: 'Request a quote', empty: 'No products available at the moment.',
    selected: 'Selected item:', subjectPrefix: 'Quote request:',
    messageTemplate: (name) => `I would like to request a quote for: ${name}\n\nPlease include:\n\n`,
  } : {
    requestQuote: 'Zatraži ponudu', empty: 'Trenutno nema dostupnih stavki.',
    selected: 'Odabrana stavka:', subjectPrefix: 'Zahtjev za ponudu:',
    messageTemplate: (name) => `Molim ponudu za: ${name}\n\nMolim uključite:\n\n`,
  };

  function render(products, grid) {
    if (!products.length) { grid.innerHTML = `<p class="shop-empty">${T.empty}</p>`; return; }
    grid.innerHTML = products.map(p => `
      <article class="shop-card">
        <span class="shop-kicker">${esc(p.category)}</span>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.description)}</p>
        <p class="shop-price">${esc(p.priceNote)}</p>
        <button type="button" class="shop-quote-btn" data-product="${esc(p.name)}">${T.requestQuote}</button>
      </article>`).join('');
  }

  function wireQuoteButtons(grid, form) {
    grid.addEventListener('click', e => {
      const btn = e.target.closest('.shop-quote-btn');
      if (!btn || !form) return;
      const name = btn.dataset.product;
      const subjectEl = form.elements.subject;
      const messageEl = form.elements.message;
      const departmentEl = form.elements.department;
      if (subjectEl) subjectEl.value = `${T.subjectPrefix} ${name}`;
      if (messageEl) messageEl.value = T.messageTemplate(name);
      if (departmentEl && [...departmentEl.options].some(o => o.value === 'webshop')) departmentEl.value = 'webshop';
      const noteEl = document.getElementById('shopSelectedNote');
      if (noteEl) noteEl.textContent = `${T.selected} ${name}`;
      form.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      if (messageEl) { messageEl.focus(); messageEl.setSelectionRange(messageEl.value.length, messageEl.value.length); }
    });
  }

  async function boot() {
    const grid = document.getElementById('shopGrid');
    if (!grid) return;
    const form = document.getElementById('contactForm');
    wireQuoteButtons(grid, form);
    try {
      const res = await fetch('/data/webshop-products.json?v=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      render(data.products || [], grid);
    } catch {
      grid.innerHTML = `<p class="shop-empty">${T.empty}</p>`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
