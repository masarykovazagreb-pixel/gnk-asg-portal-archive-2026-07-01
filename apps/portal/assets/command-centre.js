(() => {
  'use strict';
  const S = { network:null, market:null, stable:null, status:null, config:null, observer:false };
  const $ = id => document.getElementById(id);
  const en = () => document.documentElement.lang === 'en' || /\/en\/?$/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const c = () => en() ? {
    deskEye:'Desktop Intelligence Monitor', deskTitle:'Command Centre', deskText:'Operational view of verified portal datasets, markets and global group infrastructure.',
    ai:'Connected AI', aiLive:'AI available', public:'Public-data mode', market:'Market cycle', five:'5-minute data', news:'News cycle', hour:'Hourly update', network:'Group network', nodes:'45 locations',
    crypto:'Digital-asset snapshot', jumpMarket:'Open Market Monitor', jumpNetwork:'Open Global Network', jumpDocs:'Open Documents', updated:'Last data timestamp',
    ops:'Network operations view', locate:'Locate entity', selected:'Selected focus', direct:'Live routing display', hq:'HQ Boulder', expansion:'Expansion', outside:'Outside Europe', active:'Existing',
    globe:'Global command view', full:'Full screen', exit:'Close full screen'
  } : {
    deskEye:'Desktop Intelligence Monitor', deskTitle:'Command Centre', deskText:'Operativni pregled provjerenih skupova podataka portala, tržišta i globalne infrastrukture grupe.',
    ai:'Povezani AI', aiLive:'AI dostupan', public:'Javni podatci', market:'Tržišni ciklus', five:'Podatci 5 min', news:'Ciklus vijesti', hour:'Satno ažuriranje', network:'Mreža grupe', nodes:'45 lokacija',
    crypto:'Sažetak digitalne imovine', jumpMarket:'Otvori Market Monitor', jumpNetwork:'Otvori globalnu mrežu', jumpDocs:'Otvori dokumente', updated:'Zadnji podatkovni zapis',
    ops:'Operativni prikaz mreže', locate:'Pronađi društvo', selected:'Odabrani fokus', direct:'Prikaz aktivnih veza', hq:'HQ Boulder', expansion:'Širenje', outside:'Izvan Europe', active:'Postojeća',
    globe:'Globalni upravljački prikaz', full:'Puni zaslon', exit:'Zatvori puni zaslon'
  };
  async function json(path) { try { const r = await fetch(path + '?v=' + Date.now(), {cache:'no-store'}); return r.ok ? await r.json() : null; } catch (_) { return null; } }
  function money(value, currency) { return value == null ? '—' : new Intl.NumberFormat(en() ? 'en-GB' : 'hr-HR', {style:'currency', currency:currency || 'USD', maximumFractionDigits:2}).format(Number(value)); }
  function change(value) { const n = Number(value || 0); return `<b class="${n >= 0 ? 'up' : 'down'}">${n >= 0 ? '+' : ''}${n.toFixed(2)}%</b>`; }
  function stamp(value) { if (!value) return '—'; try { return new Date(value).toLocaleString(en() ? 'en-GB' : 'hr-HR'); } catch (_) { return value; } }
  function nodes() { return S.network ? [S.network.center].concat(S.network.nodes || []) : []; }
  function nodeName(node) { if (!node) return '—'; return node.id === 'boulder' ? node.name : (en() ? node.name_en : node.name_hr); }
  function nodePlace(node) { if (!node) return ''; return node.id === 'boulder' ? node.place : (en() ? node.place_en : node.place_hr); }
  function currentSelection() {
    const selected = document.querySelector('#networkSvg .network-node.selected');
    const id = selected && selected.dataset.nodeId ? selected.dataset.nodeId : 'boulder';
    return nodes().find(node => node.id === id) || (S.network && S.network.center);
  }
  function scrollToSection(selector) { const target = document.querySelector(selector); if (target) target.scrollIntoView({behavior:'smooth', block:'start'}); }
  function deskMonitor() {
    const shell = document.querySelector('.intelligence-shell');
    if (!shell) return false;
    let panel = $('deskCommandMonitor');
    if (!panel) { panel = document.createElement('aside'); panel.id = 'deskCommandMonitor'; panel.className = 'desk-command-monitor'; shell.appendChild(panel); }
    const T = c();
    const coinRows = (S.market && S.market.coins || []).slice(0, 3);
    const isAiActive = !!(S.config && S.config.enabled);
    const marketUpdated = S.market && S.market.updated_at;
    panel.innerHTML = `<div class="command-head"><p class="eyebrow">${esc(T.deskEye)}</p><h3>${esc(T.deskTitle)}</h3><p>${esc(T.deskText)}</p></div>
      <div class="command-live"><span>${esc(isAiActive ? T.aiLive : T.public)}</span><span>${esc(T.market)} · ${esc(T.five)}</span></div>
      <div class="command-cards"><div class="command-card"><small>${esc(T.ai)}</small><strong>${esc(isAiActive ? T.aiLive : T.public)}</strong><em>Puter / Gemini</em></div><div class="command-card"><small>${esc(T.news)}</small><strong>${esc(T.hour)}</strong><em>${esc(T.updated)}</em></div><div class="command-card"><small>${esc(T.network)}</small><strong>${esc(T.nodes)}</strong><em>33 + 12</em></div><div class="command-card"><small>${esc(T.market)}</small><strong>${esc(T.five)}</strong><em>${esc(stamp(marketUpdated))}</em></div></div>
      <div class="command-market"><h4>${esc(T.crypto)}</h4>${coinRows.map(coin => `<div class="command-market-row"><span>${esc(coin.symbol)}</span><strong>${money(coin.prices && coin.prices.usd, 'USD')} ${change(coin.changes_24h && coin.changes_24h.usd)}</strong></div>`).join('') || '<div class="command-market-row"><span>—</span><strong>—</strong></div>'}</div>
      <div class="command-actions"><button type="button" data-command-jump="#digital-assets">${esc(T.jumpMarket)} →</button><button type="button" data-command-jump="#global-network">${esc(T.jumpNetwork)} →</button><button type="button" data-command-jump="#dokumenti">${esc(T.jumpDocs)} →</button></div>
      <div class="command-foot">${esc(T.updated)}: ${esc(stamp(marketUpdated))}</div>`;
    panel.querySelectorAll('[data-command-jump]').forEach(button => button.addEventListener('click', () => scrollToSection(button.dataset.commandJump)));
    return true;
  }
  function annotateNodes() {
    const groups = Array.from(document.querySelectorAll('#networkSvg .network-node'));
    const list = nodes();
    groups.forEach((group, index) => { if (list[index]) group.dataset.nodeId = list[index].id; });
  }
  function chooseNode(id) {
    const mode = document.querySelector('[data-globe-mode="2d"]');
    if (mode && !mode.classList.contains('active')) mode.click();
    const all = document.querySelector('#global-network [data-filter="all"]');
    if (all && !all.classList.contains('active')) all.click();
    window.setTimeout(() => {
      annotateNodes();
      const safeId = window.CSS && CSS.escape ? CSS.escape(id) : id.replace(/[^a-zA-Z0-9_-]/g, '');
      const node = document.querySelector(`#networkSvg .network-node[data-node-id="${safeId}"]`);
      if (node) {
        node.dispatchEvent(new MouseEvent('click', {bubbles:true}));
        const canvas = document.querySelector('#global-network .network-canvas');
        if (canvas) { canvas.classList.add('located'); window.setTimeout(() => canvas.classList.remove('located'), 1400); }
        syncSelection();
      }
    }, 40);
  }
  function networkDeck() {
    const host = document.querySelector('#global-network .network-shell');
    if (!host || !S.network) return false;
    let deck = $('networkCommandDeck');
    const chosen = $('networkEntitySelect') ? $('networkEntitySelect').value : 'boulder';
    if (!deck) {
      deck = document.createElement('div');
      deck.id = 'networkCommandDeck';
      deck.className = 'network-command-deck';
      const reference = host.querySelector('.globe-toolbar') || host.querySelector('.network-layout');
      host.insertBefore(deck, reference);
    }
    const T = c();
    const options = nodes().map(node => `<option value="${esc(node.id)}"${node.id === chosen ? ' selected' : ''}>${esc(nodeName(node))} · ${esc(nodePlace(node))}</option>`).join('');
    deck.innerHTML = `<div class="network-command-title"><small>2D / 3D · ${esc(T.ops)}</small><strong>GNK DINAMO Ltd. · 45 LOCATIONS</strong><span>${esc(T.direct)}</span></div>
      <div class="network-locate"><select id="networkEntitySelect" aria-label="${esc(T.locate)}">${options}</select><button id="networkEntityGo" type="button">${esc(T.locate)}</button></div>
      <div class="network-shortcuts"><button type="button" data-net-shortcut="boulder">${esc(T.hq)}</button><button type="button" data-net-filter="active">${esc(T.active)}</button><button type="button" data-net-filter="planned">${esc(T.expansion)}</button><button type="button" data-net-filter="outside">${esc(T.outside)}</button></div>
      <div class="network-focus-status"><span>${esc(T.selected)}:</span><strong id="networkSelectedName">GNK DINAMO Ltd.</strong><span id="networkSelectedPlace">Boulder, Colorado, USA</span><span class="route-pill">● ${esc(T.direct)}</span></div>`;
    $('networkEntityGo').addEventListener('click', () => chooseNode($('networkEntitySelect').value));
    deck.querySelector('[data-net-shortcut="boulder"]').addEventListener('click', () => chooseNode('boulder'));
    deck.querySelectorAll('[data-net-filter]').forEach(button => button.addEventListener('click', () => {
      const target = document.querySelector(`#global-network [data-filter="${button.dataset.netFilter}"]`);
      if (target) target.click();
    }));
    annotateNodes();
    syncSelection();
    watchSelection();
    return true;
  }
  function syncSelection() {
    annotateNodes();
    const node = currentSelection();
    if (!node) return;
    const name = nodeName(node), place = nodePlace(node);
    const n = $('networkSelectedName'), p = $('networkSelectedPlace'), gn = $('globeSelectedName'), gp = $('globeSelectedPlace');
    if (n) n.textContent = name;
    if (p) p.textContent = place;
    if (gn) gn.textContent = name;
    if (gp) gp.textContent = place;
  }
  function watchSelection() {
    if (S.observer) return;
    const svg = $('networkSvg'), detail = $('networkDetail');
    if (!svg || !detail) return;
    const observer = new MutationObserver(() => { annotateNodes(); syncSelection(); });
    observer.observe(svg, {childList:true, subtree:true});
    observer.observe(detail, {childList:true, subtree:true});
    S.observer = true;
  }
  function fullscreen(panel, button) {
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => panel.classList.remove('gnk-expanded')); return; }
    if (panel.requestFullscreen) { panel.requestFullscreen().catch(() => panel.classList.toggle('gnk-expanded')); return; }
    panel.classList.toggle('gnk-expanded');
    button.textContent = panel.classList.contains('gnk-expanded') ? c().exit : c().full;
  }
  function globeHud() {
    const panel = document.querySelector('.globe-panel');
    const toolbar = document.querySelector('.globe-tools');
    if (!panel || !toolbar || !S.network) return false;
    if (!$('globeCommandHud')) {
      const hud = document.createElement('div');
      hud.id = 'globeCommandHud';
      hud.className = 'globe-command-hud';
      panel.appendChild(hud);
    }
    const T = c(), node = currentSelection() || S.network.center;
    $('globeCommandHud').innerHTML = `<div class="globe-selected"><small>3D · ${esc(T.globe)}</small><strong id="globeSelectedName">${esc(nodeName(node))}</strong><span id="globeSelectedPlace">${esc(nodePlace(node))}</span></div><div class="globe-hud-stats"><span>33 ACTIVE</span><span>12 EXPANSION</span><span>HQ · BOULDER</span></div>`;
    let full = $('globeFullscreen');
    if (!full) {
      full = document.createElement('button');
      full.id = 'globeFullscreen';
      full.type = 'button';
      full.className = 'globe-btn globe-fullscreen';
      toolbar.appendChild(full);
      full.addEventListener('click', () => fullscreen(panel, full));
      document.addEventListener('fullscreenchange', () => { full.textContent = document.fullscreenElement ? c().exit : c().full; });
    }
    full.textContent = document.fullscreenElement ? T.exit : T.full;
    syncSelection();
    return true;
  }
  function render() { deskMonitor(); networkDeck(); globeHud(); }
  async function refresh() {
    const results = await Promise.all([json('data/group_network.json'), json('data/market.json'), json('data/stablecoins.json'), json('data/update_status.json'), json('data/desk_public_config.json')]);
    S.network = results[0] || S.network;
    S.market = results[1] || S.market;
    S.stable = results[2] || S.stable;
    S.status = results[3] || S.status;
    S.config = results[4] || S.config;
    render();
  }
  function init() {
    refresh();
    let tries = 0;
    const boot = window.setInterval(() => { render(); if (++tries > 100 || ($('deskCommandMonitor') && $('networkCommandDeck') && $('globeCommandHud'))) window.clearInterval(boot); }, 90);
    window.setInterval(refresh, 300000);
    window.addEventListener('gnk-language-change', render);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
