(() => {
  'use strict';
  let galleryItems = null;

  async function loadGallery() {
    if (galleryItems) return galleryItems;
    try {
      const response = await fetch('/data/visual_gallery.json?v=' + Date.now(), { cache: 'no-store' });
      const data = await response.json();
      galleryItems = Array.isArray(data.items) ? data.items.filter(item => /\.svg$/i.test(item.src || '')) : [];
    } catch (_) {
      galleryItems = [];
    }
    return galleryItems;
  }

  function hashSeed(seed) {
    let h = 0;
    const s = String(seed || '');
    for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return h;
  }

  // Deterministic pick: same seed (e.g. article slug/title) always returns the same image,
  // so a given article keeps a stable illustration across page loads/re-publications.
  async function pickGalleryImage(seed) {
    const items = await loadGallery();
    if (!items.length) return null;
    const index = hashSeed(seed) % items.length;
    return items[index];
  }
  window.GNK_pickGalleryImage = pickGalleryImage;

  // Automatic fallback: any editorial/article image that fails to load gets replaced with
  // a deterministically-assigned gallery image + matching alt text, instead of a broken icon.
  document.addEventListener(
    'error',
    async (event) => {
      const img = event.target;
      if (!img || img.tagName !== 'IMG') return;
      if (!img.closest('.editorial-card, .editorial-hero, .article-header, .ah')) return;
      if (img.dataset.galleryFallbackApplied) return;
      img.dataset.galleryFallbackApplied = '1';
      const seed = img.alt || img.closest('article')?.querySelector('h1,h2,h3')?.textContent || img.src;
      const picked = await pickGalleryImage(seed);
      if (picked) { img.src = picked.src; img.alt = picked.alt || img.alt; }
    },
    true
  );
})();
