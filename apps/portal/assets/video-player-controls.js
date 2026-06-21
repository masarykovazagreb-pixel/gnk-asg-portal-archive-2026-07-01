(() => {
  if (window.__GNK_VIDEO_PLAYER_CONTROLS__) return;
  window.__GNK_VIDEO_PLAYER_CONTROLS__ = 1;

  function root() {
    return window.GNKVideoModalShell();
  }

  function stop(modal) {
    modal.querySelectorAll('video').forEach(video => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
    modal.querySelectorAll('iframe').forEach(frame => frame.remove());
  }

  function close() {
    const modal = document.getElementById('gnk-video-modal');
    if (!modal || modal.hidden) return;
    stop(modal);
    modal.hidden = true;
    document.documentElement.style.overflow = '';
  }

  function minimize() {
    const windowNode = root().querySelector('.gnk-video-window');
    windowNode.classList.toggle('minimized');
    windowNode.classList.remove('maximized');
    document.documentElement.style.overflow = windowNode.classList.contains('minimized') ? '' : 'hidden';
  }

  function maximize() {
    const windowNode = root().querySelector('.gnk-video-window');
    windowNode.classList.toggle('maximized');
    windowNode.classList.remove('minimized');
    document.documentElement.style.overflow = 'hidden';
  }

  function open(item, language = 'hr') {
    if (!item?.uploaded) return;

    const modal = root();
    const windowNode = modal.querySelector('.gnk-video-window');
    const stage = modal.querySelector('.gnk-video-stage');
    const title = language === 'en' ? item.titleEn : item.titleHr;
    const description = language === 'en' ? item.descriptionEn : item.descriptionHr;

    stop(modal);
    windowNode.classList.remove('minimized', 'maximized');
    modal.querySelector('.gnk-video-toolbar strong').textContent = title || 'GNK ASG';
    modal.querySelector('.gnk-video-meta strong').textContent = title || 'GNK ASG';
    modal.querySelector('.gnk-video-meta span').textContent = description || '';
    stage.innerHTML = '';

    if (item.mp4Url) {
      const video = document.createElement('video');
      video.src = item.mp4Url;
      video.poster = item.poster || '';
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      stage.appendChild(video);
      video.play().catch(() => {});
    } else if (item.streamUrl) {
      const frame = document.createElement('iframe');
      frame.src = item.streamUrl;
      frame.title = title || 'GNK ASG video';
      frame.allow = 'autoplay; fullscreen; picture-in-picture';
      frame.allowFullscreen = true;
      frame.loading = 'eager';
      stage.appendChild(frame);
    }

    modal.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    modal.querySelector('[data-video-action="close"]')?.focus();
  }

  function bind() {
    const modal = root();
    modal.querySelector('[data-video-action="close"]').onclick = close;
    modal.querySelector('[data-video-action="minimize"]').onclick = minimize;
    modal.querySelector('[data-video-action="maximize"]').onclick = maximize;
    modal.addEventListener('click', event => {
      if (event.target === modal) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
    });
  }

  window.GNKVideoPlayer = { open, close, minimize, maximize };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
