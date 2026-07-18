(() => {
  const isEnglish = () => /\/en(?:\/|$)/.test(location.pathname);

  const items = () => isEnglish()
    ? [
        ['Profile', '/en/#o-nama'],
        ['Financials', '/en/#financials'],
        ['Network', '/en/#grupa'],
        ['Digital Assets', '/en/#digital-assets'],
        ['Markets', '/en/markets/'],
        ['Publications', '/objave/'],
        ['Comments', '/komentari/'],
        ['Visual Index', '/visual-index/'],
        ['Sources', '/en/#publicSources'],
        ['Contact', '/en/contact/'],
        ['AI Desk', '/en/#assistant', 'desk-entry']
      ]
    : [
        ['Profil', '/#o-nama'],
        ['Financije', '/#financials'],
        ['Mreža', '/#grupa'],
        ['Digitalna imovina', '/#digital-assets'],
        ['Tržišta', '/trzista/'],
        ['Objave', '/objave/'],
        ['Komentari', '/komentari/'],
        ['Vizualni indeks', '/visual-index/'],
        ['Izvori', '/#publicSources'],
        ['Kontakt', '/kontakt/'],
        ['AI asistent', '/#assistant', 'desk-entry']
      ];

  function render() {
    const nav = document.getElementById('navLinks');
    if (!nav) return;

    nav.replaceChildren();
    nav.dataset.menuStable = '1';

    items().forEach(([label, href, className]) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = className === 'desk-entry' ? '✦ ' + label : label;
      if (className) link.className = className;
      nav.appendChild(link);
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', render)
    : render();

  window.addEventListener('gnk-language-change', render);
})();
