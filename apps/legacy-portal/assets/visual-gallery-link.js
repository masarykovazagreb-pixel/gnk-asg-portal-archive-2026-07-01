(() => {
  'use strict';

  const isHome = () => {
    const path = location.pathname.replace(/\/+$/, '/');
    return path === '/' || path === '/index.html' || path === '/en/' || path === '/en/index.html';
  };
  const isEn = () => document.documentElement.lang === 'en' || /\/en(?:\/|$)/.test(location.pathname) || window.GNK_LANG?.get?.() === 'en';

  function mount() {
    if (!isHome() || document.getElementById('visualIndexCube')) return;
    if (!document.getElementById('visualIndexCubeStyle')) {
      const style = document.createElement('style');
      style.id = 'visualIndexCubeStyle';
      style.textContent = '.visual-index-cube-wrap{display:flex;justify-content:center;margin:28px auto 20px}.visual-index-cube{width:42px;height:42px;border-radius:11px;border:1px solid rgba(212,175,55,.48);background:linear-gradient(135deg,#07162d,#102b4e);color:#d4af37;display:grid;place-items:center;text-decoration:none;font-weight:900;box-shadow:0 12px 28px rgba(7,22,45,.18);transition:.18s ease}.visual-index-cube:hover{transform:translateY(-2px);box-shadow:0 16px 32px rgba(7,22,45,.25)}.visual-index-cube span{font-size:22px;line-height:1}.visual-index-cube small{position:absolute;clip:rect(0 0 0 0);clip-path:inset(50%);height:1px;overflow:hidden;white-space:nowrap;width:1px}';
      document.head.appendChild(style);
    }
    const wrap = document.createElement('div');
    wrap.className = 'visual-index-cube-wrap';
    const label = isEn() ? 'Visual index gallery' : 'Vizualni indeks galerija';
    wrap.innerHTML = '<a class="visual-index-cube" id="visualIndexCube" href="/visual-index/" title="' + label + '" aria-label="' + label + '"><span>▦</span><small>' + label + '</small></a>';
    const footer = document.querySelector('footer') || document.body.lastElementChild;
    if (footer && footer.parentNode) footer.parentNode.insertBefore(wrap, footer);
    else document.body.appendChild(wrap);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', mount) : mount();
  window.addEventListener('gnk-language-change', () => {
    const cube = document.getElementById('visualIndexCube');
    if (!cube) return;
    const label = isEn() ? 'Visual index gallery' : 'Vizualni indeks galerija';
    cube.title = label;
    cube.setAttribute('aria-label', label);
  });
})();
