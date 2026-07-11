(() => {
  'use strict';
  if (window.__GNK_ASG_EMAIL_STATUS_DASHBOARD_V3__) return;
  window.__GNK_ASG_EMAIL_STATUS_DASHBOARD_V3__ = true;

  const params = new URLSearchParams(location.search);
  const allowedSources = new Set(['all', 'mail-studio', 'campaign-mailer', 'media-center', 'auto-reply']);
  const requestedSource = params.get('source') || 'all';
  const source = allowedSources.has(requestedSource) ? requestedSource : 'all';
  const query = (params.get('search') || '').slice(0, 150);
  const dateFilter = params.get('date') === 'today' ? 'today' : 'all';
  const candidate = params.get('from') || '';
  const from = candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '';
  const labels = {
    'mail-studio': 'Mail Studio',
    'campaign-mailer': 'Campaign Mailer',
    'media-center': 'Media Center',
    'auto-reply': 'Automatski odgovori',
    all: 'svi sustavi'
  };
  const statusLabels = {
    SUBMITTING: 'Priprema',
    ACCEPTED: 'Poslano',
    DEFERRED: 'Odgođeno',
    DELIVERED: 'Isporučeno',
    OPENED: 'Otvoreno / viđeno',
    BOUNCED: 'Odbijeno',
    REJECTED: 'Blokirano',
    FAILED: 'Neuspješno',
    UNKNOWN: 'Nepoznato'
  };

  const nativeFetch = window.fetch.bind(window);
  if (dateFilter === 'today') {
    window.fetch = (input, init) => {
      try {
        if (typeof input === 'string' || input instanceof URL) {
          const url = new URL(String(input), location.origin);
          if (url.origin === location.origin && url.pathname === '/api/email-status/records') {
            url.searchParams.set('date', 'today');
            input = url.pathname + url.search;
          }
        }
      } catch {}
      return nativeFetch(input, init);
    };
  }

  const style = document.createElement('style');
  style.textContent = `
    :root{color-scheme:dark!important;background:#050814!important;color:#f8fafc!important}
    body{min-height:100vh;background:radial-gradient(circle at 15% -10%,#203b67 0,#07101f 38%,#02040a 100%)!important;color:#f8fafc!important}
    .wrap{max-width:1500px!important;padding:24px!important}
    .top{align-items:flex-start!important;padding:18px 20px;border:1px solid rgba(214,173,79,.28);border-radius:22px;background:linear-gradient(180deg,rgba(16,26,49,.96),rgba(8,13,28,.96));box-shadow:0 18px 45px rgba(0,0,0,.24)}
    .top h1{color:#f0cc6a!important;font:700 clamp(28px,4vw,46px)/1.05 Georgia,serif!important;letter-spacing:-.02em}
    .top .muted,.muted{color:#aab4c7!important}
    .gnk-status-brand{display:flex;align-items:center;gap:14px}
    .gnk-status-brand img{width:86px;max-height:54px;object-fit:contain;padding:6px;border-radius:14px;background:rgba(255,255,255,.96);border:1px solid rgba(214,173,79,.38)}
    .card{background:linear-gradient(180deg,rgba(16,26,49,.96),rgba(8,13,28,.96))!important;border:1px solid rgba(214,173,79,.24)!important;box-shadow:0 14px 36px rgba(0,0,0,.18)!important;color:#f8fafc!important}
    .stats{gap:10px!important}.stat b{color:#f8fafc!important;margin-top:7px}
    .controls{gap:8px!important}.controls input,.controls select{background:#f8fafc!important;color:#07101f!important;border-color:rgba(214,173,79,.48)!important}
    button,.gnk-status-action{border:1px solid rgba(214,173,79,.36)!important;border-radius:999px!important;background:rgba(255,255,255,.07)!important;color:#fff!important;font-weight:900!important;text-decoration:none!important;padding:10px 13px!important;cursor:pointer!important}
    #sync,#load,.gnk-status-action.primary{background:linear-gradient(135deg,#b98b2d,#f4d37a)!important;color:#07101f!important;border-color:#d8ad4f!important}
    .table{border:1px solid rgba(255,255,255,.08);border-radius:16px;background:rgba(255,255,255,.025)}
    table{min-width:1180px!important}th{position:sticky;top:0;z-index:1;background:#101a31!important;color:#f0cc6a!important;border-color:rgba(255,255,255,.08)!important}td{color:#f8fafc!important;border-color:rgba(255,255,255,.08)!important}tbody tr:hover{background:rgba(240,204,106,.045)}
    .badge{border:1px solid rgba(255,255,255,.12)}
    .gnk-status-help{margin:14px 0;padding:14px 16px;border:1px solid rgba(96,165,250,.30);border-radius:14px;background:rgba(96,165,250,.08);color:#dbeafe;font:500 13px/1.55 Inter,Arial,sans-serif}
    .gnk-status-help strong{color:#fff}.gnk-status-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.gnk-status-note{margin-top:8px;color:#aab4c7;font-size:12px}
    @media(max-width:700px){.wrap{padding:12px!important}.top{padding:15px!important}.gnk-status-brand img{width:66px}.gnk-status-actions{display:grid;grid-template-columns:1fr 1fr}.gnk-status-action{text-align:center}.stats{grid-template-columns:1fr 1fr!important}}
  `;
  document.head.append(style);

  const translate = () => {
    document.querySelectorAll('td,th,option,button,span,strong,div').forEach(node => {
      if (node.children.length) return;
      const text = (node.textContent || '').trim();
      if (statusLabels[text]) node.textContent = statusLabels[text];
    });
  };

  const boot = () => {
    document.documentElement.lang = 'hr';
    const select = document.querySelector('#source');
    const search = document.querySelector('#search');
    const load = document.querySelector('#load');
    const title = document.querySelector('h1');
    const top = document.querySelector('.top') || title?.parentElement;

    if (select) select.value = source;
    if (search && query) search.value = query;
    const baseTitle = source === 'all' ? 'Status svih email poruka' : `Status poruka — ${labels[source]}`;
    if (title) title.textContent = dateFilter === 'today' ? `Današnje poruke — ${labels[source]}` : baseTitle;
    document.title = `${title?.textContent || 'Status email poruka'} | GNK ASG`;

    if (top && title && !document.querySelector('.gnk-status-brand')) {
      const titleBox = title.parentElement;
      const brand = document.createElement('div');
      brand.className = 'gnk-status-brand';
      const logo = document.createElement('img');
      logo.src = '/assets/brand/media-kit/GNK_ASG_logo_gold_transparent.png';
      logo.alt = 'GNK ASG';
      titleBox.parentElement.insertBefore(brand, titleBox);
      brand.append(logo, titleBox);
    }

    if (top && !document.querySelector('.gnk-status-help')) {
      const help = document.createElement('div');
      help.className = 'gnk-status-help';
      help.innerHTML = '<strong>Kako čitati statuse:</strong> Poslano znači da je pružatelj preuzeo poruku. Isporučeno znači da ju je prihvatio poslužitelj primatelja. Otvoreno je signal tracking slike i nije apsolutni dokaz čitanja.';

      const actions = document.createElement('div');
      actions.className = 'gnk-status-actions';

      const admin = document.createElement('a');
      admin.className = 'gnk-status-action';
      admin.href = '/admin-center/';
      admin.textContent = 'Admin Center';
      actions.append(admin);

      const studio = document.createElement('a');
      studio.className = 'gnk-status-action';
      studio.href = '/mail-studio/';
      studio.textContent = 'Mail Studio';
      actions.append(studio);

      const toggle = document.createElement('a');
      toggle.className = 'gnk-status-action';
      const url = new URL(location.href);
      if (dateFilter === 'today') {
        url.searchParams.delete('date');
        toggle.textContent = 'Prikaži sve datume';
      } else {
        url.searchParams.set('date', 'today');
        toggle.textContent = 'Samo današnje poruke';
      }
      toggle.href = url.pathname + url.search;
      actions.append(toggle);

      if (from) {
        const back = document.createElement('a');
        back.className = 'gnk-status-action';
        back.href = from;
        back.textContent = 'Natrag u aplikaciju';
        actions.append(back);
      }

      const note = document.createElement('div');
      note.className = 'gnk-status-note';
      if (dateFilter === 'today') note.textContent = 'Prikaz od 00:00 do 24:00 prema vremenskoj zoni Europe/Zagreb.';
      top.insertAdjacentElement('afterend', help);
      help.insertAdjacentElement('afterend', actions);
      actions.insertAdjacentElement('afterend', note);
    }

    load?.click();
    translate();
    new MutationObserver(translate).observe(document.body, { subtree: true, childList: true });
  };

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();