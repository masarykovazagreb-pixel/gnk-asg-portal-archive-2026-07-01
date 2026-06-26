
(() => {
  function initPanel(panel){
    if (!panel || panel.dataset.ready === '1') return;
    panel.dataset.ready = '1';

    const buttons = [...panel.querySelectorAll('.gnk-safe-media-tabs button')];
    const views = [...panel.querySelectorAll('.gnk-safe-media-view')];

    const activate = (name) => {
      buttons.forEach(btn => btn.setAttribute('aria-selected', btn.dataset.view === name ? 'true' : 'false'));
      views.forEach(view => view.classList.toggle('is-active', view.dataset.view === name));
      if (name === 'code') {
        const frame = panel.querySelector('iframe[data-src]');
        if (frame && !frame.src) frame.src = frame.dataset.src;
      }
    };

    buttons.forEach(btn => btn.addEventListener('click', () => activate(btn.dataset.view)));

    const slides = [...panel.querySelectorAll('.gnk-safe-slides img')];
    let active = 0;
    if (slides.length > 1) {
      window.setInterval(() => {
        slides[active].classList.remove('is-active');
        active = (active + 1) % slides.length;
        slides[active].classList.add('is-active');
      }, 10000);
    }
  }

  document.querySelectorAll('.gnk-safe-media-panel').forEach(initPanel);
})();
