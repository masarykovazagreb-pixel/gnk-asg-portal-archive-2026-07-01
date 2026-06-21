(() => {
  if (window.__GNK_VIDEO_LIBRARY_PAGE__) return;
  window.__GNK_VIDEO_LIBRARY_PAGE__ = 1;

  const language = document.documentElement.lang?.toLowerCase().startsWith('en') ? 'en' : 'hr';

  function loadScript(src, ready) {
    if (ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src^="${src}"]`);
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = `${src}?v=20260621-2`;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Ne mogu učitati ${src}`));
      document.head.appendChild(script);
    });
  }

  async function loadDependencies() {
    await loadScript('/assets/video-catalog.js', () => Boolean(window.GNKVideoCatalog));
    await loadScript('/assets/video-modal-shell.js', () => Boolean(window.GNKVideoModalShell));
    await loadScript('/assets/video-player-controls.js', () => Boolean(window.GNKVideoPlayer));
    await loadScript('/assets/video-seo.js', () => Boolean(window.GNKVideoSEO));
  }

  function text(item, key) {
    return language === 'en' ? item[`${key}En`] : item[`${key}Hr`];
  }

  function createCard(item) {
    const card = document.createElement('article');
    card.className = 'video-card';
    card.dataset.videoId = item.id;

    if (item.poster) {
      const image = document.createElement('img');
      image.src = item.poster;
      image.alt = text(item, 'title') || 'GNK ASG video';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.width = 1280;
      image.height = 720;
      card.appendChild(image);
    }

    const body = document.createElement('div');
    body.className = 'video-card-body';

    const meta = document.createElement('small');
    meta.textContent = [item.duration, item.uploadDate].filter(Boolean).join(' · ');

    const title = document.createElement('h2');
    title.textContent = text(item, 'title') || 'GNK ASG video';

    const description = document.createElement('p');
    description.textContent = text(item, 'description') || '';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = language === 'en' ? 'Play film' : 'Pokreni film';
    button.addEventListener('click', () => window.GNKVideoPlayer.open(item, language));

    if (meta.textContent) body.appendChild(meta);
    body.append(title, description, button);
    card.appendChild(body);
    return card;
  }

  function renderEmpty(grid) {
    const empty = document.createElement('article');
    empty.className = 'video-card video-card-empty';
    const body = document.createElement('div');
    body.className = 'video-card-body';
    const title = document.createElement('h2');
    title.textContent = language === 'en' ? 'Video library is being prepared' : 'Videoteka je u pripremi';
    const description = document.createElement('p');
    description.textContent = language === 'en'
      ? 'Only verified, fully uploaded films are published here. No placeholder video is indexed.'
      : 'Ovdje se objavljuju samo provjereni i potpuno učitani filmovi. Zamjenski videozapisi ne indeksiraju se.';
    body.append(title, description);
    empty.appendChild(body);
    grid.appendChild(empty);
  }

  async function init() {
    const grid = document.getElementById('videoGrid');
    if (!grid) return;

    try {
      await loadDependencies();
      const catalog = await window.GNKVideoCatalog.load();
      const uploaded = catalog.filter(item => item.uploaded);
      grid.replaceChildren();

      if (!uploaded.length) renderEmpty(grid);
      else uploaded.forEach(item => grid.appendChild(createCard(item)));

      await window.GNKVideoSEO.apply(language);
      window.GNKVideoLibraryReady = true;
      window.GNKVideoLibraryItems = uploaded;
      document.documentElement.dataset.gnkVideoLibrary = 'ready';
      document.documentElement.dataset.gnkVideoCount = String(uploaded.length);
    } catch (error) {
      grid.replaceChildren();
      renderEmpty(grid);
      document.documentElement.dataset.gnkVideoLibrary = 'fallback';
      console.error('GNK ASG video library:', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
