(() => {
  'use strict';
  if (window.__GNK_GALLERY_BRAND_SAFETY__) return;
  window.__GNK_GALLERY_BRAND_SAFETY__ = true;

  const allowedProtocols = new Set(['http:', 'https:', 'data:', 'blob:']);
  const images = [...document.querySelectorAll('[data-gallery] img, .gallery img, [data-gallery-item] img')];

  for (const img of images) {
    const raw = img.getAttribute('src');
    if (!raw) continue;
    try {
      const url = new URL(raw, window.location.href);
      if (!allowedProtocols.has(url.protocol)) img.removeAttribute('src');
    } catch {
      img.removeAttribute('src');
    }
    if (!img.alt) img.alt = 'GNK ASG visual';
    img.referrerPolicy = 'strict-origin-when-cross-origin';
  }
})();
