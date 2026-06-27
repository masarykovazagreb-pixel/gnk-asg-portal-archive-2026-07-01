(() => {
  'use strict';
  if (window.__GNK_ASG_ADMIN_OPERATIONS_V1__) return;
  window.__GNK_ASG_ADMIN_OPERATIONS_V1__ = true;

  const endpoints = {
    media: '/api/media-command-center/status',
    kit: '/data/media-kit-manifest-v1.json',
    application: '/api/media-application/config',
    portal: '/data/portal-version.json'
  };
  const state = { data: {}, refreshed: null };
  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  };

  async function read(url) {
    try {
      const target = new URL(url, location.origin);
      target.searchParams.set('cb', Date.now());
      const response = await fetch(target, { credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' } });
      const data = await response.json().catch(() => null);
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      return { ok: false, status: 0, error: String(error?.message || error) };
    }
  }

  function daysUntil(value) {
    return Math.max(0, Math.ceil((Date.parse(value) - Date.now()) / 86400000));
  }

  function count(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  function card(label, value, detail, primary = false) {
    const item = make('article', `ops-score-card${primary ? ' primary' : ''}`);
    item.append(make('small', '', label), make('strong', '', value), make('span', '', detail));
    if (primary) {
      const progress = make('div', 'ops-progress');
      const bar = make('i');
      bar.style.width = value;
      progress.appendChild(bar);
      item.appendChild(progress);
    }
    return item;
  }

  function gate(label, detail, kind, value) {
    const item = make('article', `ops-gate ${kind}`);
    item.append(make('span', 'ops-gate-dot'));
    const copy = make('div');
    copy.append(make('strong', '', label), make('small', '', detail));
    item.append(copy, make('b', '', value));
    return item;
  }

  function action(label, detail, href, icon) {
    const link = make('a', 'ops-action');
    link.href = href;
    link.append(make('i', '', icon), make('strong', '', label), make('span', '', detail));
    return link;
  }

  function render() {
    const mediaResponse = state.data.media || {};
    const media = mediaResponse.data || {};
    const kit = state.data.kit?.data || null;
    const readiness = media.readiness || {};
    const bindings = media.bindings || {};
    const applications = media.applications || {};
    const totalApplications = count(applications.total);
    const approvedApplications = count(applications.approved);
    const readyApplications = count(applications.ready);
    const incompleteApplications = count(applications.incomplete);
    const lateApplications = count(applications.late);
    const checks = [
      state.data.portal?.ok,
      Boolean(kit?.version),
      state.data.application?.ok,
      Boolean(bindings.d1),
      Boolean(bindings.r2),
      Boolean(bindings.email)
    ];
    const score = Math.round(checks.filter(Boolean).length / checks.length * 100);
    const content = document.getElementById('opsContent');
    if (!content) return;
    content.className = '';

    const scores = make('div', 'ops-score-grid');
    scores.append(
      card('Operativna spremnost', `${score}%`, score >= 90 ? 'Sustav je spreman za završnu operativnu fazu.' : 'Potrebne su ciljane završne provjere.', true),
      card('Media kontakti', `${count(readiness.ready)}/${count(media.contacts?.total)}`, 'Operativno spremni / ukupno'),
      card('Prijave', String(totalApplications), `${approvedApplications} odobreno · ${readyApplications} spremno za provjeru`),
      card('Rok prijave', `${daysUntil('2026-07-20T21:59:59Z')} d`, '20. srpnja 2026.'),
      card('New York', `${daysUntil('2026-10-07T15:30:00Z')} d`, '7. listopada 2026. · 11:30')
    );

    const layout = make('div', 'ops-layout');
    const gatesPanel = make('section', 'ops-panel');
    const gatesHead = make('div', 'ops-panel-head');
    const gatesCopy = make('div');
    gatesCopy.append(make('h4', '', 'Produkcijski i poslovni gateovi'), make('p', '', 'Kontrolni uvjeti prije završne aktivacije.'));
    gatesHead.appendChild(gatesCopy);
    const gates = make('div', 'ops-gates');
    gates.append(
      gate('Javni portal', state.data.portal?.ok ? 'Verzijski endpoint odgovara.' : 'Endpoint nije dostupan.', state.data.portal?.ok ? 'ok' : 'bad', state.data.portal?.ok ? 'SPREMNO' : 'GREŠKA'),
      gate('Media Kit Center', kit?.version ? `${kit.kits?.length || 0} profesionalna paketa.` : 'Manifest nije dostupan.', kit?.version ? 'ok' : 'bad', kit?.version ? 'OBJAVLJENO' : 'NEDOSTAJE'),
      gate('Prijavno sučelje', state.data.application?.ok ? 'Human-only odluka i putna pravila aktivni.' : 'Konfiguracija nije dostupna.', state.data.application?.ok ? 'ok' : 'bad', state.data.application?.ok ? 'AKTIVNO' : 'GREŠKA'),
      gate('Prijavni red', mediaResponse.ok ? `${readyApplications} spremno · ${incompleteApplications} nepotpuno · ${lateApplications} zakašnjelo.` : 'Status prijava nije dostupan.', mediaResponse.ok ? 'ok' : 'bad', mediaResponse.ok ? `${totalApplications} UKUPNO` : 'GREŠKA'),
      gate('Podaci i dokumenti', bindings.d1 && bindings.r2 ? 'D1 i R2 su povezani.' : 'Provjerite D1/R2.', bindings.d1 && bindings.r2 ? 'ok' : 'bad', bindings.d1 && bindings.r2 ? 'SPREMNO' : 'PROVJERA'),
      gate('Produkcijsko slanje', media.live ? 'LIVE način je uključen.' : 'Sigurno zaključano do odobrenja.', media.live ? 'warn' : 'ok', media.live ? 'LIVE' : 'ZAKLJUČANO')
    );
    gatesPanel.append(gatesHead, gates);

    const actionsPanel = make('section', 'ops-panel');
    const actionHead = make('div', 'ops-panel-head');
    const actionCopy = make('div');
    actionCopy.append(make('h4', '', 'Brze operativne radnje'), make('p', '', 'Najkraći put do današnjih ključnih zadataka.'));
    actionHead.appendChild(actionCopy);
    const actions = make('div', 'ops-actions');
    actions.append(
      action('Media Kit Center', 'Službeni press resursi i vizuali.', '/media-kit-2026/', '◆'),
      action('Mediji i prijave', 'Kontakti, odluke i kampanja.', '/media-command-center/', '◎'),
      action('Mail Studio', 'Pošiljatelji, potpisi i privici.', '/mail-studio/', '✉'),
      action('Dokumenti', 'PDF objava i evidencija.', '/pdf-publisher/', '▤')
    );
    actionsPanel.append(actionHead, actions);
    layout.append(gatesPanel, actionsPanel);

    const foot = make('div', 'ops-foot');
    foot.append(
      make('span', '', `Zadnje osvježavanje: ${state.refreshed?.toLocaleTimeString('hr-HR') || '—'}`),
      make('span', '', 'Automatska provjera: svakih 30 min'),
      make('span', '', `Prijave: ${totalApplications} ukupno · ${approvedApplications} odobreno`),
      make('span', '', `Media Kit: ${kit?.version || 'NEDOSTUPAN'}`)
    );
    content.replaceChildren(scores, layout, foot);
  }

  async function load() {
    const button = document.getElementById('opsRefresh');
    if (button) { button.disabled = true; button.textContent = 'Provjera…'; }
    const pairs = await Promise.all(Object.entries(endpoints).map(async ([key, url]) => [key, await read(url)]));
    state.data = Object.fromEntries(pairs);
    state.refreshed = new Date();
    render();
    if (button) { button.disabled = false; button.textContent = 'Osvježi operativni pregled'; }
  }

  function install() {
    if (document.getElementById('operationsCockpit')) return;
    const overview = document.getElementById('overview');
    if (!overview) return;
    const section = make('section', 'ops-cockpit');
    section.id = 'operationsCockpit';
    const head = make('div', 'ops-head');
    const copy = make('div');
    copy.append(make('p', 'eyebrow', 'EXECUTIVE OPERATIONS COCKPIT'), make('h3', '', 'Mediji, prijave, sadržaj i produkcijska spremnost na jednom mjestu'), make('p', '', 'Dashboard povezuje javni portal, Media Kit Center, prijave redakcija, dokumente i sigurnosne zaštite.'));
    const refresh = make('button', 'ops-refresh', 'Osvježi operativni pregled');
    refresh.id = 'opsRefresh'; refresh.type = 'button'; refresh.addEventListener('click', load);
    head.append(copy, refresh);
    const content = make('div', 'ops-skeleton', 'Učitavanje operativnih podataka…'); content.id = 'opsContent';
    section.append(head, content);
    const priority = overview.querySelector('.dashboard-section');
    priority ? overview.insertBefore(section, priority) : overview.appendChild(section);
    load();
    setInterval(load, 30 * 60 * 1000);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', install, { once: true }) : install();
})();