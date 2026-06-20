(() => {
  'use strict';
  const isEn = () => /\/en\/?$/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  function render() {
    const card = document.querySelector('#grupa .group-card:first-child');
    if (!card) return;
    const facts = card.querySelectorAll('.fact');
    const last = facts[facts.length - 1];
    if (last) {
      const dt = last.querySelector('dt');
      const dd = last.querySelector('dd');
      if (dt) dt.textContent = isEn() ? 'Companies in the group' : 'Broj društava u grupi';
      if (dd) dd.textContent = isEn() ? '33, including GNK DINAMO Ltd.' : '33, uključujući GNK DINAMO Ltd.';
    }
    const intro = document.querySelector('#grupa .section-head > p');
    if (intro) intro.textContent = isEn()
      ? 'GNK ASG d.o.o. is included in the GNK DINAMO Ltd. group presentation. The group network displays 33 existing companies, including the Boulder headquarters, and 12 planned expansion positions for 2026.'
      : 'GNK ASG d.o.o. uključen je u grupni prikaz GNK DINAMO Ltd. Mreža grupe prikazuje 33 postojeća društva, uključujući središte u Boulderu, te 12 planiranih pozicija širenja za 2026.';
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', render) : render();
  window.addEventListener('gnk-language-change', render);
})();
