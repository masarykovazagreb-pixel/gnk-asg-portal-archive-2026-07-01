(() => {
  if (window.__GNK_IMAGE_LIGHTBOX__) return;
  window.__GNK_IMAGE_LIGHTBOX__ = true;

  let images = [];
  let currentIndex = -1;

  function eligible(image) {
    if (!image || image.dataset.noLightbox === 'true') return false;
    if (image.closest('header,nav,button,a.gnk-preview-float,#gnk-image-lightbox')) return false;
    if (image.classList.contains('gnk-preview-group-logo')) return true;
    const width = Number(image.naturalWidth || image.width || 0);
    const height = Number(image.naturalHeight || image.height || 0);
    return width >= 320 && height >= 180;
  }

  function collect() {
    images = [...document.querySelectorAll('img')].filter(eligible);
    images.forEach(image => image.dataset.gnkLightboxReady = 'true');
  }

  function makeLightbox() {
    if (document.getElementById('gnk-image-lightbox')) return document.getElementById('gnk-image-lightbox');
    const root = document.createElement('div');
    root.id = 'gnk-image-lightbox';
    root.hidden = true;
    root.innerHTML = `
      <div class="gnk-lightbox-dialog" role="dialog" aria-modal="true" aria-label="Pregled slike">
        <button class="gnk-lightbox-close" type="button" aria-label="Zatvori">×</button>
        <button class="gnk-lightbox-prev" type="button" aria-label="Prethodna slika">‹</button>
        <button class="gnk-lightbox-next" type="button" aria-label="Sljedeća slika">›</button>
        <div class="gnk-lightbox-stage"><img alt=""></div>
        <div class="gnk-lightbox-meta"><strong></strong><span></span></div>
      </div>`;
    document.body.appendChild(root);
    root.querySelector('.gnk-lightbox-close').onclick = close;
    root.querySelector('.gnk-lightbox-prev').onclick = event => { event.stopPropagation(); show(currentIndex - 1); };
    root.querySelector('.gnk-lightbox-next').onclick = event => { event.stopPropagation(); show(currentIndex + 1); };
    root.addEventListener('click',event => { if (event.target === root) close(); });
    return root;
  }

  function metadata(image) {
    const figureCaption = image.closest('figure')?.querySelector('figcaption')?.textContent?.trim() || '';
    const title = image.dataset.title || image.getAttribute('title') || image.getAttribute('alt') || 'GNK ASG';
    const caption = image.dataset.caption || figureCaption || image.getAttribute('alt') || '';
    const credit = image.dataset.credit || '';
    return { title, caption: [caption,credit].filter(Boolean).join(' · ') };
  }

  function show(index) {
    collect();
    if (!images.length) return;
    currentIndex = (index + images.length) % images.length;
    const source = images[currentIndex];
    const root = makeLightbox();
    const target = root.querySelector('.gnk-lightbox-stage img');
    const meta = metadata(source);
    target.src = source.currentSrc || source.src;
    target.alt = source.alt || meta.title;
    root.querySelector('.gnk-lightbox-meta strong').textContent = meta.title;
    root.querySelector('.gnk-lightbox-meta span').textContent = meta.caption;
    root.querySelector('.gnk-lightbox-meta').hidden = !meta.title && !meta.caption;
    root.querySelector('.gnk-lightbox-prev').hidden = images.length < 2;
    root.querySelector('.gnk-lightbox-next').hidden = images.length < 2;
    root.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    root.querySelector('.gnk-lightbox-close').focus();
  }

  function close() {
    const root = document.getElementById('gnk-image-lightbox');
    if (!root || root.hidden) return;
    root.hidden = true;
    document.documentElement.style.overflow = '';
    images[currentIndex]?.focus?.();
  }

  function bind() {
    document.addEventListener('click',event => {
      const image = event.target.closest('img');
      if (!eligible(image)) return;
      if (image.closest('a[href]') && !event.altKey) event.preventDefault();
      collect();
      const index = images.indexOf(image);
      if (index >= 0) show(index);
    });
    document.addEventListener('keydown',event => {
      const root = document.getElementById('gnk-image-lightbox');
      if (!root || root.hidden) return;
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') show(currentIndex - 1);
      if (event.key === 'ArrowRight') show(currentIndex + 1);
    });
    const observer = new MutationObserver(() => collect());
    observer.observe(document.body,{childList:true,subtree:true});
    collect();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
