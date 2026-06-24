(() => {
  'use strict';
  if (window.__GNK_ASG_BACKEND_SHELL_V4__) return;
  window.__GNK_ASG_BACKEND_SHELL_V4__ = true;

  const loadOperatorModules = () => {
    if (document.getElementById('gnk-operator-auth-session-v1')) return;
    const auth = document.createElement('script');
    auth.id = 'gnk-operator-auth-session-v1';
    auth.src = '/assets/operator-auth-session-v1.js?v=20260624-1';
    auth.addEventListener('load', () => {
      if (document.getElementById('gnk-mail-studio-operator-bridge-v1')) return;
      const bridge = document.createElement('script');
      bridge.id = 'gnk-mail-studio-operator-bridge-v1';
      bridge.src = '/assets/mail-studio-operator-bridge-v1.js?v=20260624-1';
      document.head.appendChild(bridge);
    }, { once:true });
    document.head.appendChild(auth);
  };
  loadOperatorModules();

  const inFrame = window.self !== window.top;
  document.body.classList.add('gnk-backend-ui');
  if (inFrame) {
    document.body.classList.add('gnk-backend-embedded');
    return;
  }

  document.getElementById('gnk-backend-shell')?.remove();

  const path = location.pathname.replace(/\/+$/, '') || '/';
  const items = [
    { label:'Portal', href:'/', icon:'⌂' },
    { label:'Auto Editor', href:'/auto-editor/', icon:'✎' },
    { label:'Mail Center', href:'/mail-studio/', icon:'✦' },
    { label:'Admin', href:'/admin-center/', icon:'⚙' },
    { label:'Mobilni Admin', href:'/operator-mobile/', icon:'▯' },
    { label:'Objave', href:'/objave/', icon:'▤' },
    { label:'Vijesti', href:'/vijesti/', icon:'▦' },
    { label:'PDF / Media', href:'/downloads/', icon:'⇩' },
    { label:'Visual Index', href:'/visual-index/', icon:'◇' },
    { label:'Kontakt', href:'/contact/', icon:'✉' },
    { label:'App', href:'/app/', icon:'▯' }
  ];

  const routePath = href => {
    try { return new URL(href,location.origin).pathname.replace(/\/+$/,'') || '/'; }
    catch { return href; }
  };

  const active = href => {
    const target = routePath(href);
    if (target === '/') return path === '/';
    return path === target || path.startsWith(target + '/');
  };

  const shell = document.createElement('header');
  shell.id = 'gnk-backend-shell';
  shell.innerHTML = `
    <div class="gnk-shell-wrap">
      <div class="gnk-shell-top">
        <a class="gnk-shell-brand" href="/" aria-label="GNK ASG korporativni portal">
          <svg class="gnk-shell-logo" viewBox="0 0 100 100" aria-hidden="true">
            <defs><linearGradient id="gnkShellGold" x1="0" x2="1"><stop stop-color="#a87516"/><stop offset=".5" stop-color="#ffe092"/><stop offset="1" stop-color="#b77d13"/></linearGradient></defs>
            <circle cx="50" cy="50" r="41" fill="none" stroke="url(#gnkShellGold)" stroke-width="5"/>
            <path d="M20 42Q50 10 82 34M17 58Q48 28 84 55M25 73Q52 48 80 73" fill="none" stroke="url(#gnkShellGold)" stroke-width="2"/>
            <rect x="30" y="58" width="9" height="20" fill="url(#gnkShellGold)"/><rect x="46" y="47" width="9" height="31" fill="url(#gnkShellGold)"/><rect x="62" y="34" width="9" height="44" fill="url(#gnkShellGold)"/>
          </svg>
          <span><strong>GNK ASG d.o.o.</strong><span>Secure Operations Layer</span></span>
        </a>
        <div class="gnk-shell-spacer"></div>
        <div class="gnk-shell-identity"><strong>GNK DINAMO Ltd.</strong><small>Boulder · Colorado</small></div>
        <span class="gnk-shell-status"><i></i> Sustav aktivan</span>
      </div>
      <nav class="gnk-shell-nav" aria-label="GNK ASG backend navigation">
        ${items.map(item => `<a href="${item.href}" class="${active(item.href)?'active':''}"><i aria-hidden="true">${item.icon}</i>${item.label}</a>`).join('')}
      </nav>
    </div>
    <div class="gnk-shell-progress" aria-hidden="true"><span></span></div>`;

  document.body.insertBefore(shell,document.body.firstChild);

  const title = document.querySelector('h1');
  if (title && !title.dataset.gnkEnhanced) {
    title.dataset.gnkEnhanced = '1';
    title.setAttribute('title',title.textContent.trim());
  }

  let ticking = false;
  const updateProgress = () => {
    const max = Math.max(1,document.documentElement.scrollHeight-innerHeight);
    const value = Math.max(0,Math.min(1,scrollY/max));
    shell.querySelector('.gnk-shell-progress span')?.style.setProperty('transform',`scaleX(${value})`);
    ticking = false;
  };
  addEventListener('scroll',() => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateProgress);
    }
  },{passive:true});
  updateProgress();
})();