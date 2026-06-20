(() => {
  'use strict';
  const isEn = () => document.documentElement.lang === 'en' || /\/en\/?$/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  let data = null;
  let current = 'boulder';
  const name = node => node.id === 'boulder' ? node.name : (isEn() ? node.name_en : node.name_hr);
  const place = node => node.id === 'boulder' ? node.place : (isEn() ? node.place_en : node.place_hr);
  const list = () => data ? [data.center].concat(data.nodes || []) : [];
  function findFromDetail() {
    const title = document.querySelector('#networkDetail h4')?.textContent.trim();
    if (!title || !data) return null;
    return list().find(node => name(node) === title) || null;
  }
  function render(node) {
    if (!node) return;
    current = node.id;
    const selected = document.getElementById('networkEntitySelect');
    if (selected && selected.querySelector('option[value="' + node.id + '"]')) selected.value = node.id;
    [['networkSelectedName', name(node)], ['networkSelectedPlace', place(node)], ['globeSelectedName', name(node)], ['globeSelectedPlace', place(node)]].forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
    const deck = document.getElementById('networkCommandDeck');
    if (deck) deck.dataset.focus = node.status || 'active';
  }
  function bind() {
    const detail = document.getElementById('networkDetail');
    if (!detail || detail.dataset.selectionSync) return false;
    detail.dataset.selectionSync = '1';
    const observer = new MutationObserver(() => render(findFromDetail()));
    observer.observe(detail, {childList:true, subtree:true, characterData:true});
    render(findFromDetail() || (data && data.center));
    return true;
  }
  async function init() {
    try {
      const response = await fetch('data/group_network.json?v=' + Date.now(), {cache:'no-store'});
      if (response.ok) data = await response.json();
    } catch (_) {}
    let tries = 0;
    const timer = setInterval(() => { if (bind() || ++tries > 120) clearInterval(timer); }, 75);
    window.addEventListener('gnk-language-change', () => render(list().find(node => node.id === current) || (data && data.center)));
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
