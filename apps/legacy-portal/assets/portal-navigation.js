(() => {
  const isEnglish = () => /\/en(?:\/|$)/.test(location.pathname);
  const labels = () => isEnglish()
    ? {
        profile: 'Profile', finance: 'Financials', network: 'Network', markets: 'Markets',
        insights: 'Insights', sources: 'Sources', contact: 'Contact', desk: 'AI Desk'
      }
    : {
        profile: 'Profil', finance: 'Financije', network: 'Mreža', markets: 'Tržišta',
        insights: 'Objave', sources: 'Izvori', contact: 'Kontakt', desk: 'AI asistent'
      };

  function render() {
    const nav = document.getElementById('navLinks');
    if (!nav) return;
    nav.querySelectorAll(':scope > a').forEach(link => link.classList.add('legacy-nav-item'));
    let box = nav.querySelector('.portal-navigation');
    if (!box) {
      box = document.createElement('div');
      box.className = 'portal-navigation';
      nav.appendChild(box);
    }
    const en = isEnglish();
    const t = labels();
    const homeUrl = en ? '/en/' : '/';
    const marketUrl = en ? '/en/markets/' : '/trzista/';
    const insightsUrl = en ? '/en/insights/' : '/insights-hr/';
    const contactUrl = en ? '/en/contact/' : '/kontakt/';
    const profileUrl = homeUrl + '#o-nama';
    const financeUrl = homeUrl + '#financials';
    const networkUrl = homeUrl + '#grupa';
    const sourcesUrl = homeUrl + '#publicSources';
    const deskUrl = homeUrl + '#assistant';
    box.innerHTML =
      '<a href="' + profileUrl + '">' + t.profile + '</a>' +
      '<a href="' + financeUrl + '">' + t.finance + '</a>' +
      '<a href="' + networkUrl + '">' + t.network + '</a>' +
      '<a href="' + marketUrl + '">' + t.markets + '</a>' +
      '<a href="' + insightsUrl + '">' + t.insights + '</a>' +
      '<a href="' + sourcesUrl + '">' + t.sources + '</a>' +
      '<a href="' + contactUrl + '">' + t.contact + '</a>' +
      '<a class="desk-entry" href="' + deskUrl + '">✦ ' + t.desk + '</a>';
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', render) : render();
  window.addEventListener('gnk-language-change', render);
})();
