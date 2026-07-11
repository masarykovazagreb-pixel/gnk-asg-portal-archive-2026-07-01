(() => {
  'use strict';
  if (window.GNK_BPP_CARD_READY) return;
  window.GNK_BPP_CARD_READY = true;
  const BPP_URL = 'https://bpp.is/';
  const SHARE_URL = '/podijeli/bpp-kartica/';
  const english = () => document.documentElement.lang === 'en' || /\/en(?:\/|$)/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const copy = () => english() ? {
    overline:'SOFTWARE SOLUTION · BPP.IS', title:'Bitcoin Payment Processor',
    body:'Advanced crypto payment infrastructure with secure API integration.',
    tags:['Bitcoin','Real-time processing','Merchant dashboard','API integration'],
    note:'Developed by GNK ASG d.o.o. for the GNK DINAMO Ltd. group framework. GNK ASG d.o.o. does not operate the system or provide payment processor services through it.',
    open:'Open bpp.is', share:'Share', link:'Copy link', copied:'Copied'
  } : {
    overline:'PROGRAMSKO RJEŠENJE · BPP.IS', title:'Bitcoin Payment Processor',
    body:'Napredna infrastruktura kripto plaćanja sa sigurnom API integracijom.',
    tags:['Bitcoin','Obrada uživo','Merchant dashboard','API integracija'],
    note:'Razvio GNK ASG d.o.o. za poslovni okvir GNK DINAMO Ltd. grupe. GNK ASG d.o.o. ne upravlja sustavom niti pruža uslugu payment procesora.',
    open:'Otvori bpp.is', share:'Podijeli', link:'Kopiraj', copied:'Kopirano'
  };
  const absolute = path => new URL(path, location.origin).href;
  function host() { return document.querySelector('#digital-assets .container, #digitalna-imovina .container'); }
  function render() {
    const root = host();
    if (!root) return false;
    let panel = document.getElementById('bppPublicCard');
    if (!panel) { panel = document.createElement('article'); panel.className = 'bpp-public-card'; panel.id = 'bppPublicCard'; root.appendChild(panel); }
    const t = copy();
    panel.innerHTML = '<div class="bpp-public-copy"><span class="bpp-public-icon" aria-hidden="true">₿</span><div><small>' + t.overline + '</small><h3>' + t.title + '</h3><p>' + t.body + '</p></div></div><div class="bpp-public-meta"><div class="bpp-public-tags">' + t.tags.map(tag => '<span>' + tag + '</span>').join('') + '</div><p class="bpp-public-legal">' + t.note + '</p><div class="bpp-public-actions"><a class="bpp-public-source" href="' + BPP_URL + '" target="_blank" rel="noopener">' + t.open + ' ↗</a><button class="bpp-share-btn" type="button">' + t.share + '</button><button class="bpp-copy-btn" type="button">' + t.link + '</button></div></div>';
    panel.querySelector('.bpp-share-btn').onclick = async () => {
      const url = absolute(SHARE_URL);
      if (navigator.share) { try { await navigator.share({ title:t.title, text:t.note, url }); return; } catch (_) {} }
      window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url), '_blank', 'noopener');
    };
    panel.querySelector('.bpp-copy-btn').onclick = async event => {
      const button = event.currentTarget;
      try { await navigator.clipboard.writeText(absolute(SHARE_URL)); button.textContent = t.copied; setTimeout(() => { button.textContent = t.link; }, 1500); }
      catch (_) { window.prompt(t.link, absolute(SHARE_URL)); }
    };
    return true;
  }
  function init() {
    let attempts = 0;
    const timer = setInterval(() => { if (render() || ++attempts > 80) clearInterval(timer); }, 100);
    window.addEventListener('gnk-language-change', render);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();