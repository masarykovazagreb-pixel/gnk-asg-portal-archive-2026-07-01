(() => {
  if (window.__GNK_PORTAL_LANGUAGE__) return;
  window.__GNK_PORTAL_LANGUAGE__ = true;

  const LOCAL_KEY = 'GNK_ASG_LANGUAGE_PREFERENCE';
  const SESSION_KEY = 'GNK_ASG_LANGUAGE_SESSION';
  const PANEL_SEEN = 'GNK_ASG_LANGUAGE_PANEL_SEEN';
  const privatePath = /\/(operator-dashboard|operator-mobile|mail-studio|mail-studio-pro|command-center|social-share|wa-center|pdf-publisher|document-studio|admin)\//;
  const path = location.pathname.toLowerCase();

  const pairs = new Map([
    ['/','/en/'],['/en/','/'],
    ['/trzista/','/markets/'],['/markets/','/trzista/'],
    ['/objave/','/publications/'],['/publications/','/objave/'],
    ['/vijesti/','/news/'],['/news/','/vijesti/'],
    ['/contact/','/en/contact/'],['/en/contact/','/contact/'],
    ['/assistant/','/en/assistant/'],['/en/assistant/','/assistant/'],
    ['/legal/','/en/legal/'],['/en/legal/','/legal/'],
    ['/privatnost/','/en/privacy/'],['/en/privacy/','/privatnost/'],
    ['/kolacici/','/en/cookies/'],['/en/cookies/','/kolacici/'],
    ['/uvjeti-koristenja/','/en/terms/'],['/en/terms/','/uvjeti-koristenja/'],
    ['/platforme/bpp/','/en/platforms/bpp/'],['/en/platforms/bpp/','/platforme/bpp/']
  ]);

  const currentLanguage = () => path.startsWith('/en/') || ['/news/','/markets/','/publications/'].includes(path) ? 'en' : 'hr';

  function counterpartFor(language) {
    if (language === currentLanguage()) return location.pathname + location.search + location.hash;
    if (pairs.has(path)) return pairs.get(path) + location.search + location.hash;
    if (path.startsWith('/objave/')) return '/publications/' + location.search + location.hash;
    if (path.startsWith('/publications/')) return '/objave/' + location.search + location.hash;
    return language === 'en' ? '/en/' : '/';
  }

  function remembered() {
    return localStorage.getItem(LOCAL_KEY) || sessionStorage.getItem(SESSION_KEY) || '';
  }

  function save(language, persist) {
    if (persist) {
      localStorage.setItem(LOCAL_KEY, language);
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, language);
      localStorage.removeItem(LOCAL_KEY);
    }
  }

  function makePanel() {
    if (document.getElementById('gnk-language-panel')) return document.getElementById('gnk-language-panel');
    const panel = document.createElement('section');
    panel.id = 'gnk-language-panel';
    panel.hidden = true;
    panel.setAttribute('aria-label','Odabir jezika');
    panel.innerHTML = `
      <button class="gnk-language-close" type="button" aria-label="Zatvori">×</button>
      <strong>Jezik / Language</strong>
      <p>Odaberite jezik portala. Bez trajnog spremanja izbor vrijedi samo za ovu sesiju.</p>
      <div class="gnk-language-buttons">
        <button type="button" data-language="hr">HR</button>
        <button type="button" data-language="en">EN</button>
      </div>
      <label class="gnk-language-remember"><input id="gnk-language-remember" type="checkbox"> Zapamti moj izbor / Remember my choice</label>`;
    document.body.appendChild(panel);
    panel.querySelector('.gnk-language-close').onclick = () => { panel.hidden = true; sessionStorage.setItem(PANEL_SEEN,'1'); };
    panel.querySelectorAll('[data-language]').forEach(button => {
      button.onclick = () => {
        const language = button.dataset.language;
        save(language, panel.querySelector('#gnk-language-remember').checked);
        const target = counterpartFor(language);
        panel.hidden = true;
        if (target !== location.pathname + location.search + location.hash) location.assign(target);
      };
    });
    return panel;
  }

  function openPanel() {
    const panel = makePanel();
    const language = remembered() || currentLanguage();
    panel.querySelectorAll('[data-language]').forEach(button => button.classList.toggle('active',button.dataset.language === language));
    panel.querySelector('#gnk-language-remember').checked = Boolean(localStorage.getItem(LOCAL_KEY));
    panel.hidden = false;
  }

  async function preferredLanguage() {
    const stored = remembered();
    if (stored) return stored;
    try {
      const response = await fetch('/__preview/locale',{cache:'no-store'});
      if (response.ok) {
        const data = await response.json();
        return data.defaultLanguage === 'hr' ? 'hr' : 'en';
      }
    } catch {}
    return navigator.language?.toLowerCase().startsWith('hr') ? 'hr' : 'en';
  }

  async function applyInitialPreference() {
    if (privatePath.test(path)) return;
    const preferred = await preferredLanguage();
    const target = counterpartFor(preferred);
    const current = location.pathname + location.search + location.hash;
    if (target !== current && pairs.has(path) && !new URLSearchParams(location.search).has('lang')) {
      location.replace(target);
      return;
    }
    if (!remembered() && !sessionStorage.getItem(PANEL_SEEN)) {
      setTimeout(openPanel,900);
      sessionStorage.setItem(PANEL_SEEN,'1');
    }
  }

  function bindLanguageButton() {
    document.addEventListener('click',event => {
      const button = event.target.closest('#gnk-preview-language');
      if (!button) return;
      event.preventDefault();
      openPanel();
    },true);
  }

  function init() {
    makePanel();
    bindLanguageButton();
    applyInitialPreference();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
