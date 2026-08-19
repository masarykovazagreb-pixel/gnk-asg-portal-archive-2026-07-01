(() => {
  'use strict';
  if (window.__GNK_GALLERY_BOOTSTRAP__) return;
  window.__GNK_GALLERY_BOOTSTRAP__ = true;

  const scope = document;
  const images = [...scope.querySelectorAll('[data-gallery] img, .gallery img, [data-gallery-item] img')];
  for (const img of images) {
    if (!img.hasAttribute('loading')) img.loading = 'lazy';
    if (!img.hasAttribute('decoding')) img.decoding = 'async';
    if (!img.hasAttribute('draggable')) img.draggable = false;
  }

  for (const root of scope.querySelectorAll('[data-gallery], .gallery')) {
    if (!root.hasAttribute('role')) root.setAttribute('role', 'region');
    if (!root.hasAttribute('aria-label')) root.setAttribute('aria-label', 'GNK ASG visual gallery');
  }
})();
