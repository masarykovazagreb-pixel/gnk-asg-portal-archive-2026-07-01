(() => {
  'use strict';
  if (window.__GNK_ASG_ADMIN_ONLY_MODULE_MAP_V3__) return;
  window.__GNK_ASG_ADMIN_ONLY_MODULE_MAP_V3__ = true;
  const routes = [
    ['mail-studio', 'Mail Studio', 'Pojedinačna pošta, potpisi, draftovi i pretinci', '/mail-studio/'],
    ['email-status', 'Status email poruka', 'Primatelj, pošiljatelj, predmet, vrijeme slanja i dostave, prvo i zadnje otvaranje, broj otvaranja te Message ID', '/email-status?source=all'],
    ['mail-tracker', 'Mail Tracker', 'Pregled readinessa, reda, statusa i audit zapisa bez slanja', '/mail-tracker/'],
    ['campaign-mailer', 'Campaign Mailer', 'Priprema kampanje, kontakti, HTML poruka, PDF privitak i red slanja', '/campaign-mailer/'],
    ['media-command', 'Media Command Center', 'Mediji, prijave, odobrenja i radni tokovi', '/media-command-center/'],
    ['media-login', 'Media login / application', 'Stari javni link za medije ostaje isti', '/media-application/?lang=en'],
    ['review', 'Review', 'Pregled prije javnih radnji', '/review/'],
    ['release', 'Deployment', 'Pregled statusa bez automatskog produkcijskog pokretanja', '/deployment/']
  ];
  const $ = id => document.getElementById(id);
  function openRoute(item) {
    const frame = $('moduleFrame');
    const workspace = $('workspacePanel');
    const overview = $('overviewPanel');
    if (!frame || !workspace || !overview) return;
    const url = new URL(item[3], location.origin);
    url.searchParams.set('embedded', '1');
    url.searchParams.set('hubmodule', item[0]);
    url.searchParams.set('admin', '1');
    overview.classList.remove('active');
    workspace.classList.add('active');
    frame.hidden = false;
    frame.src = url.pathname + url.search;
    const title = $('pageTitle');
    const desc = $('pageDescription');
    if (title) title.textContent = item[1];
    if (desc) desc.textContent = item[2];
    history.pushState({ module: item[0] }, '', `/admin-center/?adminModule=${encodeURIComponent(item[0])}`);
  }
  function mount() {
    const grid = $('priorityGrid');
    if (!grid || $('adminOnlyModuleMap')) return;
    const section = document.createElement('section');
    section.id = 'adminOnlyModuleMap';
    section.className = 'dashboard-section';
    section.innerHTML = '<div class="section-head"><div><p class="eyebrow">Admin-only map</p><h3>Mail, status, kampanja i mediji</h3><p>Operativne rute otvaraju se iz Admin Centera i ostaju iza sigurne prijave. Javni media login link ostaje isti.</p></div></div>';
    const cards = document.createElement('div');
    cards.className = 'priority-grid';
    routes.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'priority-card';
      button.innerHTML = `<span class="priority-icon">▣</span><span><strong>${item[1]}</strong><small>${item[2]}</small></span><span class="priority-arrow" aria-hidden="true">›</span>`;
      button.addEventListener('click', () => openRoute(item));
      cards.appendChild(button);
    });
    section.appendChild(cards);
    grid.parentElement.insertAdjacentElement('afterend', section);
    const requested = new URL(location.href).searchParams.get('adminModule');
    const match = routes.find(item => item[0] === requested);
    if (match) setTimeout(() => openRoute(match), 150);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();