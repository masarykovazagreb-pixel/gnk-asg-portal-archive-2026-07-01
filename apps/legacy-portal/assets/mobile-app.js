(() => {
  'use strict';
  let installPrompt = null;
  const language = () => window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en' ? 'en' : 'hr';
  const installed = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  const copy = {
    hr: {
      title: 'Instaliraj GNK ASG aplikaciju', note: 'Najjednostavnije preko Google Chromea', action: 'Instaliraj u Chromeu', help: 'Upute', installed: 'Aplikacija je instalirana',
      sheetTitle: 'Instalacija preko Chromea', ready: 'Pritisnite gumb ispod i Chrome će ponuditi instalaciju aplikacije na početni zaslon.',
      android: 'Android: otvorite portal u Chromeu i pritisnite „Instaliraj u Chromeu”. Ako se gumb ne pojavi, u Chrome izborniku odaberite „Instaliraj aplikaciju” ili „Dodaj na početni zaslon”.',
      desktop: 'Računalo: otvorite portal u Chromeu. U adresnoj traci kliknite ikonu za instalaciju ili ovdje pritisnite „Instaliraj u Chromeu”.',
      iphone: 'iPhone: instalaciju napravite u Safariju: Dijeli → Dodaj na početni zaslon → Dodaj. Chrome na iPhoneu ne prikazuje isti instalacijski prozor.',
      unavailable: 'Chrome još nije ponudio izravnu instalaciju. Otvorite Chrome izbornik i odaberite „Instaliraj aplikaciju” ili „Dodaj na početni zaslon”.',
      close: 'Zatvori', nav: ['Početna', 'Tržišta', 'Vijesti', 'AI Desk', 'Instaliraj']
    },
    en: {
      title: 'Install the GNK ASG app', note: 'Simplest through Google Chrome', action: 'Install in Chrome', help: 'Instructions', installed: 'App installed',
      sheetTitle: 'Install through Chrome', ready: 'Press the button below and Chrome will offer app installation on your device.',
      android: 'Android: open the portal in Chrome and press “Install in Chrome”. If the button is not available, select “Install app” or “Add to Home screen” from the Chrome menu.',
      desktop: 'Computer: open the portal in Chrome. Click the install icon in the address bar or press “Install in Chrome” here.',
      iphone: 'iPhone: install from Safari: Share → Add to Home Screen → Add. Chrome on iPhone does not show the same installation prompt.',
      unavailable: 'Chrome has not offered direct installation yet. Open the Chrome menu and choose “Install app” or “Add to Home screen”.',
      close: 'Close', nav: ['Home', 'Markets', 'News', 'AI Desk', 'Install']
    }
  };
  function t() { return copy[language()]; }
  function promptInstall() {
    if (installed()) return;
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.finally(() => { installPrompt = null; });
      return;
    }
    showInstructions(true);
  }
  function showInstructions(noPrompt) {
    const c = t();
    const sheet = document.getElementById('installSheet');
    if (!sheet) return;
    const primary = ios() ? c.iphone : (noPrompt ? c.unavailable : c.ready);
    sheet.querySelector('.install-primary').textContent = primary;
    sheet.classList.add('open');
  }
  function renderBanner() {
    const c = t();
    const banner = document.querySelector('.app-install-banner');
    if (!banner) return;
    banner.innerHTML = '<div class="app-install-copy"><div class="app-install-icon">↓</div><div><strong>' + c.title + '</strong><span>' + (installed() ? c.installed : c.note) + '</span></div></div><div class="app-install-actions"><button class="app-install-btn" type="button">' + (installed() ? c.installed : c.action) + '</button><button class="app-help-btn" type="button">' + c.help + '</button></div>';
    const installButton = banner.querySelector('.app-install-btn');
    installButton.disabled = installed();
    installButton.onclick = promptInstall;
    banner.querySelector('.app-help-btn').onclick = () => showInstructions(false);
  }
  function renderSheet() {
    const c = t();
    const sheet = document.getElementById('installSheet');
    if (!sheet) return;
    sheet.innerHTML = '<section class="app-sheet-card" role="dialog" aria-modal="true"><div class="app-sheet-head"><h3>' + c.sheetTitle + '</h3><button class="app-sheet-close" type="button" aria-label="' + c.close + '">×</button></div><p class="install-primary">' + c.ready + '</p><div class="install-steps"><div class="install-step"><b>1</b><div><strong>Android / Chrome</strong><span>' + c.android + '</span></div></div><div class="install-step"><b>2</b><div><strong>Windows / macOS / Chrome</strong><span>' + c.desktop + '</span></div></div><div class="install-step"><b>3</b><div><strong>iPhone / Safari</strong><span>' + c.iphone + '</span></div></div></div><button class="install-link" type="button">' + c.action + '</button></section>';
    sheet.querySelector('.app-sheet-close').onclick = () => sheet.classList.remove('open');
    sheet.querySelector('.install-link').onclick = promptInstall;
  }
  function renderDock() {
    const c = t();
    const dock = document.querySelector('.mobile-dock');
    if (!dock) return;
    dock.innerHTML = '<a href="#top"><i>⌂</i><span>' + c.nav[0] + '</span></a><a href="#digital-assets"><i>◈</i><span>' + c.nav[1] + '</span></a><a href="#news"><i>▤</i><span>' + c.nav[2] + '</span></a><a class="primary" href="#assistant"><i>✦</i><span>' + c.nav[3] + '</span></a><button type="button"><i>↓</i><span>' + c.nav[4] + '</span></button>';
    dock.querySelector('button').onclick = promptInstall;
  }
  function init() {
    const actions = document.querySelector('.hero-actions');
    if (!actions) return;
    const banner = document.createElement('div'); banner.className = 'app-install-banner'; actions.insertAdjacentElement('afterend', banner);
    const sheet = document.createElement('div'); sheet.className = 'app-sheet'; sheet.id = 'installSheet'; document.body.appendChild(sheet);
    sheet.addEventListener('click', event => { if (event.target === sheet) sheet.classList.remove('open'); });
    const dock = document.createElement('nav'); dock.className = 'mobile-dock'; document.body.appendChild(dock);
    renderBanner(); renderSheet(); renderDock();
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; renderBanner(); });
    window.addEventListener('appinstalled', () => { installPrompt = null; renderBanner(); document.getElementById('installSheet')?.classList.remove('open'); });
    window.addEventListener('gnk-language-change', () => { renderBanner(); renderSheet(); renderDock(); });
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
