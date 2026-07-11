(() => {
  const isEnglish = () => /\/en(?:\/|$)/.test(location.pathname);

  const items = () => isEnglish()
    ? [
        ['Profile', '/en/#o-nama'],
        ['Financials', '/en/#financials'],
        ['Network', '/en/#grupa'],
        ['Markets', '/en/markets/'],
        ['Insights', '/en/insights/'],
        ['Sources', '/en/#publicSources'],
        ['Contact', '/en/contact/'],
        ['AI Desk', '/en/#assistant', 'desk-entry']
      ]
    : [
        ['Profil', '/#o-nama'],
        ['Financije', '/#financials'],
        ['Mreža', '/#grupa'],
        ['Tržišta', '/trzista/'],
        ['Objave', '/insights-hr/'],
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
