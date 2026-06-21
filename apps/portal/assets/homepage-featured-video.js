(() => {
  if (window.__GNK_HOME_VIDEO__) return;
  window.__GNK_HOME_VIDEO__ = 1;

  const path = location.pathname.toLowerCase();
  if (!['/', '/index.html', '/en/', '/en/index.html'].includes(path)) return;
  const language = path.startsWith('/en/') ? 'en' : 'hr';

  function ensureStyles() {
    if (document.querySelector('link[data-gnk-video-styles]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/assets/portal-video.css?v=20260621-2';
    link.dataset.gnkVideoStyles = 'true';
    document.head.appendChild(link);
  }

  function loadScript(src, ready) {
    if (ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${src}?v=20260621-2`;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function ensurePlayer() {
    await loadScript('/assets/video-modal-shell.js', () => Boolean(window.GNKVideoModalShell));
    await loadScript('/assets/video-player-controls.js', () => Boolean(window.GNKVideoPlayer));
  }

  function isUploaded(item) {
    const status = String(item?.status || '').toLowerCase();
    return ['ready', 'published', 'live'].includes(status) && Boolean(item?.mp4Url || item?.streamUrl);
  }

  async function init() {
    if (document.getElementById('gnk-featured-video')) return;

    let item;
    try {
      const response = await fetch(`/data/video-featured.json?cb=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      item = await response.json();
    } catch {
      return;
    }

    ensureStyles();
    const uploaded = isUploaded(item);
    const title = language === 'en' ? item.titleEn : item.titleHr;
    const description = language === 'en' ? item.descriptionEn : item.descriptionHr;

    const section = document.createElement('section');
    section.id = 'gnk-featured-video';
    section.className = 'gnk-video-teaser';
    section.dataset.videoStatus = uploaded ? 'ready' : 'awaiting-upload';

    const inner = document.createElement('div');
    inner.className = 'gnk-video-teaser-inner';

    const poster = document.createElement('div');
    poster.className = 'gnk-video-poster';
    const image = document.createElement('img');
    image.src = item.poster || '/assets/gnk-asg-social-card.png';
    image.alt = title || 'GNK ASG video';
    image.width = 1280;
    image.height = 720;
    const play = document.createElement('span');
    play.className = 'gnk-video-play';
    play.textContent = uploaded ? '▶' : '4K';
    poster.append(image, play);

    const copy = document.createElement('div');
    copy.className = 'gnk-video-copy';
    const label = document.createElement('small');
    label.textContent = language === 'en' ? 'Featured 4K video' : 'Istaknuti 4K video';
    const heading = document.createElement('h2');
    heading.textContent = title || 'GNK ASG';
    const paragraph = document.createElement('p');
    paragraph.textContent = description || '';
    copy.append(label, heading, paragraph);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gnk-video-open';
    button.textContent = uploaded
      ? (language === 'en' ? 'Play film' : 'Pokreni film')
      : (language === 'en' ? 'Film in preparation' : 'Film u pripremi');
    button.disabled = !uploaded;
    button.setAttribute('aria-disabled', String(!uploaded));

    if (uploaded) {
      button.addEventListener('click', async () => {
        await ensurePlayer();
        window.GNKVideoPlayer.open({
          ...item,
          uploaded: true,
          titleHr: item.titleHr || item.title,
          titleEn: item.titleEn || item.titleHr || item.title,
          descriptionHr: item.descriptionHr || item.description,
          descriptionEn: item.descriptionEn || item.descriptionHr || item.description
        }, language);
      });
    }

    inner.append(poster, copy, button);
    section.appendChild(inner);

    const main = document.querySelector('main');
    const anchor = main?.querySelector(':scope > section');
    if (anchor?.nextSibling) main.insertBefore(section, anchor.nextSibling);
    else main?.prepend(section);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 250), { once: true });
  } else {
    setTimeout(init, 250);
  }
})();
