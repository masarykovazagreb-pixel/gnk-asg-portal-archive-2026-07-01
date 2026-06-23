(() => {
  'use strict';
  async function resolveDocuments() {
    const cards = [...document.querySelectorAll('.source-doc')];
    if (!cards.length) return;
    try {
      const response = await fetch('/api/admin-asset-list',{cache:'no-store'});
      const data = await response.json();
      const items = Array.isArray(data.items) ? data.items : [];
      for (const card of cards) {
        const filename = String(card.dataset.match || '').toLowerCase();
        const title = String(card.dataset.title || '').toLowerCase();
        const asset = items.find(item =>
          String(item.filename || '').toLowerCase() === filename ||
          String(item.title || '').toLowerCase().includes(title)
        );
        const status = card.querySelector('.status');
        if (asset && (asset.newsProxyUrl || asset.suggestedPublicPath)) {
          card.href = asset.newsProxyUrl || asset.suggestedPublicPath;
          card.target = '_blank';
          card.rel = 'noopener';
          card.classList.remove('pending');
          card.classList.add('ready');
          if (status) status.textContent = document.documentElement.lang === 'en' ? 'Document is publicly available' : 'Dokument je javno dostupan';
        } else if (status) {
          status.textContent = document.documentElement.lang === 'en' ? 'File is being placed in the public repository' : 'Datoteka se postavlja u javno spremište';
        }
      }
    } catch {
      cards.forEach(card => {
        const status = card.querySelector('.status');
        if (status) status.textContent = document.documentElement.lang === 'en' ? 'Availability check is temporarily unavailable' : 'Provjera trenutačno nije dostupna';
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',resolveDocuments,{once:true});
  else resolveDocuments();
})();
