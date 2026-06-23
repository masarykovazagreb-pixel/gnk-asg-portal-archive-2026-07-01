(() => {
  'use strict';

  const inFrame = window.self !== window.top;
  document.body.classList.add('gnk-backend-ui');
  if (inFrame) {
    document.body.classList.add('gnk-backend-embedded');
    return;
  }
  if (document.getElementById('gnk-backend-shell')) return;

  const path = location.pathname.replace(/\/+$/, '') || '/';
  const items = [
    ['Portal', '/'],
    ['Profil', '/#profil'],
    ['Financije', '/#financije'],
    ['Grupa', '/#mreza-grupe'],
    ['Tržišta', '/trzista/'],
    ['Objave', '/objave/'],
    ['Vijesti', '/vijesti/'],
    ['PDF / Media', '/#dokumenti'],
    ['Visual Index', '/visual-index/'],
    ['AI pomoć', '/assistant/'],
    ['Kontakt', '/contact/'],
    ['Legal', '/legal/'],
    ['App', '/app/'],
    ['Mail Center', '/mail-studio/'],
    ['Mobilni Admin', '/operator-mobile/'],
    ['Admin', '/operator-dashboard/']
  ];

  const shell = document.createElement('header');
  shell.id = 'gnk-backend-shell';
  shell.innerHTML = `
    <div class="gnk-shell-row">
      <a class="gnk-shell-brand" href="/" aria-label="GNK ASG korporativni portal">
        <svg class="gnk-shell-logo" viewBox="0 0 100 100" aria-hidden="true">
          <defs><linearGradient id="gnkShellGold" x1="0" x2="1"><stop stop-color="#a87516"/><stop offset=".5" stop-color="#ffe092"/><stop offset="1" stop-color="#b77d13"/></linearGradient></defs>
          <circle cx="50" cy="50" r="41" fill="none" stroke="url(#gnkShellGold)" stroke-width="5"/>
          <path d="M20 42Q50 10 82 34M17 58Q48 28 84 55M25 73Q52 48 80 73" fill="none" stroke="url(#gnkShellGold)" stroke-width="2"/>
          <rect x="30" y="58" width="9" height="20" fill="url(#gnkShellGold)"/><rect x="46" y="47" width="9" height="31" fill="url(#gnkShellGold)"/><rect x="62" y="34" width="9" height="44" fill="url(#gnkShellGold)"/>
        </svg>
        <span><strong>GNK ASG d.o.o.</strong><span>Secure Operations Layer</span></span>
      </a>
      <nav class="gnk-shell-nav" aria-label="GNK ASG backend navigation">
        ${items.map(([label, href]) => `<a href="${href}" class="${path === href.replace(/\/+$/, '') ? 'active' : ''}">${label}</a>`).join('')}
      </nav>
      <span class="gnk-shell-status"><i></i> Sustav aktivan</span>
    </div>`;
  document.body.insertBefore(shell, document.body.firstChild);

  const currentTitle = document.querySelector('h1');
  if (currentTitle && !currentTitle.dataset.gnkEnhanced) {
    currentTitle.dataset.gnkEnhanced = '1';
    currentTitle.setAttribute('title', currentTitle.textContent.trim());
  }
})();