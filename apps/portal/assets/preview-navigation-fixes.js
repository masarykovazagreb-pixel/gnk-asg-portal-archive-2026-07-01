(() => {
  if (window.__GNK_PREVIEW_NAV_FIXES__) return;
  window.__GNK_PREVIEW_NAV_FIXES__ = true;

  const path = location.pathname.toLowerCase();
  const english = path.startsWith('/en/') || path.startsWith('/news/') || path.startsWith('/markets/') || path.startsWith('/publications/');

  const languageMap = new Map([
    ['/','/en/'],['/en/','/'],
    ['/trzista/','/markets/'],['/markets/','/trzista/'],
    ['/objave/','/publications/'],['/publications/','/objave/'],
    ['/vijesti/','/news/'],['/news/','/vijesti/'],
    ['/contact/','/en/contact/'],['/en/contact/','/contact/'],
    ['/assistant/','/en/assistant/'],['/en/assistant/','/assistant/'],
    ['/legal/','/en/legal/'],['/en/legal/','/legal/']
  ]);

  function counterpart() {
    if (languageMap.has(path)) return languageMap.get(path);
    if (path.startsWith('/objave/')) return '/publications/';
    if (path.startsWith('/publications/')) return '/objave/';
    return english ? '/' : '/en/';
  }

  function normalizeLinks() {
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href') || '';
      const label = (link.textContent || '').trim().toLowerCase();
      if (href === '/mail-studio/' || href.startsWith('/mail-studio/#')) {
        const hash = href.includes('#') ? href.slice(href.indexOf('#')) : '';
        link.setAttribute('href','/mail-studio-pro/' + hash);
      }
      if (href === '/mobile-app/' || href === '/instalacija/') link.setAttribute('href','/app/');
      if (label === 'mobilna aplikacija') link.textContent = 'Mobilni portal';
      if (label === 'mobile app') link.textContent = 'Mobile portal';
      if (label === 'vijesti') link.textContent = 'Poslovne vijesti';
      if (label === 'news') link.textContent = 'Business News';
      if (label === 'objave') link.textContent = 'Objave i analize';
      if (label === 'publications') link.textContent = 'Publications & Insights';
    });
  }

  function installFloats() {
    ['gnk-preview-home','gnk-preview-language','gnk-preview-whatsapp','gnk-preview-ai'].forEach(id => document.getElementById(id)?.remove());
    document.querySelectorAll('.gnk-global-float-home,.gnk-global-float-ai').forEach(node => node.remove());

    const home = document.createElement('a');
    home.id = 'gnk-preview-home';
    home.className = 'gnk-preview-float';
    home.href = english ? '/en/' : '/';
    home.setAttribute('aria-label',english ? 'Home' : 'Početna');
    home.textContent = '⌂';

    const language = document.createElement('a');
    language.id = 'gnk-preview-language';
    language.className = 'gnk-preview-float';
    language.href = counterpart();
    language.textContent = english ? 'HR' : 'EN';

    const whatsapp = document.createElement('a');
    whatsapp.id = 'gnk-preview-whatsapp';
    whatsapp.className = 'gnk-preview-float';
    whatsapp.href = 'https://wa.me/385915358365?text=' + encodeURIComponent(english ? 'Hello GNK ASG, I am contacting you through the corporate portal.' : 'Pozdrav GNK ASG, javljam se putem korporativnog portala.');
    whatsapp.target = '_blank';
    whatsapp.rel = 'noopener noreferrer';
    whatsapp.setAttribute('aria-label','WhatsApp');
    whatsapp.textContent = 'WA';

    const ai = document.createElement('a');
    ai.id = 'gnk-preview-ai';
    ai.className = 'gnk-preview-float';
    ai.href = english ? '/en/assistant/' : '/assistant/';
    ai.textContent = 'AI';

    document.body.append(home,language,ai,whatsapp);
  }

  function addDinamoLogo() {
    if (document.querySelector('.gnk-preview-group-logo')) return;
    const section = document.querySelector('#grupa,.group-section');
    if (!section) return;
    const heading = [...section.querySelectorAll('h1,h2,h3')].find(node => /gnk\s+dinamo\s+ltd/i.test(node.textContent || ''));
    const target = heading?.parentElement || section.querySelector('.section-head') || section;
    const image = document.createElement('img');
    image.className = 'gnk-preview-group-logo';
    image.src = '/assets/brand/gnk-dinamo-ltd-logo.png';
    image.alt = 'GNK DINAMO Ltd.';
    target.prepend(image);
  }

  function init() {
    normalizeLinks();
    installFloats();
    addDinamoLogo();
    [300,900,1800].forEach(delay => setTimeout(() => {
      normalizeLinks();
      installFloats();
      addDinamoLogo();
    },delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
