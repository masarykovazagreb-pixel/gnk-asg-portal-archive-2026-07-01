(() => {
  'use strict';
  const VERSION = '20260529-standalone-control-01';
  const NEWS_LIMIT_MINUTES = 35;
  const MARKET_LIMIT_MINUTES = 20;
  let installPrompt = null;

  const $ = id => document.getElementById(id);
  const installButton = $('installButton');
  const installDescription = $('installDescription');
  const newsSignal = $('newsSignal');
  const marketSignal = $('marketSignal');
  const overallStatus = $('overallStatus');

  function dateLabel(value) {
    if (!value) return 'Nije dostupno';
    return new Date(value).toLocaleString('hr-HR');
  }
  function ageMinutes(value) {
    if (!value) return Infinity;
    const stamp = new Date(value).getTime();
    return Number.isFinite(stamp) ? Math.max(0, (Date.now() - stamp) / 60000) : Infinity;
  }
  function setSignal(node, text, state) {
    node.textContent = text;
    node.classList.remove('waiting', 'ok', 'warning');
    node.classList.add(state);
  }
  async function readJson(path) {
    const response = await fetch(path + '?control=' + VERSION + '&t=' + Date.now(), {cache:'no-store'});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  }
  async function refreshStatus() {
    $('checkedAt').textContent = 'Provjera u tijeku…';
    try {
      const [newsStatus, marketStatus] = await Promise.all([
        readJson('/data/update_status.json'),
        readJson('/data/fast_market_status.json')
      ]);
      const news = newsStatus.news || {};
      const newsFresh = ageMinutes(news.updated_at) <= NEWS_LIMIT_MINUTES && Array.isArray(news.errors) && news.errors.length === 0;
      const marketFresh = ageMinutes(marketStatus.updated_at) <= MARKET_LIMIT_MINUTES && marketStatus.status !== 'partial' && Array.isArray(marketStatus.errors) && marketStatus.errors.length === 0;

      $('newsTime').textContent = dateLabel(news.updated_at);
      $('marketTime').textContent = dateLabel(marketStatus.updated_at);
      $('newsInfo').textContent = news.public_items != null ? news.public_items + ' javnih stavki · ' + (news.archive_items || 0) + ' stavki u arhivi.' : 'Status vijesti nije dostupan.';
      const assetCount = marketStatus.digital_assets && marketStatus.digital_assets.coins != null ? marketStatus.digital_assets.coins : '—';
      $('marketInfo').textContent = assetCount + ' praćenih stavki u tržišnom prikazu.';
      setSignal(newsSignal, newsFresh ? 'AKTIVNO' : 'ZASTARJELO', newsFresh ? 'ok' : 'warning');
      setSignal(marketSignal, marketFresh ? 'AKTIVNO' : 'PROVJERITI', marketFresh ? 'ok' : 'warning');
      if (newsFresh && marketFresh) {
        setSignal(overallStatus, 'AUTOMATSKO AŽURIRANJE AKTIVNO', 'ok');
      } else if (!newsFresh) {
        setSignal(overallStatus, 'POKRENITE AŽURIRANJE VIJESTI', 'warning');
      } else {
        setSignal(overallStatus, 'TRŽIŠNE PODATKE TREBA PROVJERITI', 'warning');
      }
      $('checkedAt').textContent = 'Provjereno: ' + new Date().toLocaleString('hr-HR');
    } catch (error) {
      setSignal(newsSignal, 'NEDOSTUPNO', 'warning');
      setSignal(marketSignal, 'NEDOSTUPNO', 'warning');
      setSignal(overallStatus, 'STATUS NIJE MOGUĆE UČITATI', 'warning');
      $('checkedAt').textContent = 'Pokušajte ponovno kada imate internetsku vezu.';
    }
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
    installDescription.textContent = 'Instalirajte zasebnu kontrolu jednim pritiskom.';
  });
  installButton.addEventListener('click', async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      installButton.hidden = true;
      installDescription.textContent = 'Kontrola je instalirana ili je instalacija zatvorena.';
      return;
    }
    installDescription.textContent = 'U Chromeu otvorite izbornik ⋮ i odaberite „Instaliraj aplikaciju” ili „Dodaj na početni zaslon”.';
  });
  window.addEventListener('appinstalled', () => {
    installButton.hidden = true;
    installDescription.textContent = 'ASG Kontrola instalirana je kao zasebna ikona.';
  });
  $('checkButton').addEventListener('click', refreshStatus);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshStatus(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/kontrola-azuriranja/sw.js?v=' + VERSION).catch(() => {});
  refreshStatus();
  window.setInterval(refreshStatus, 5 * 60 * 1000);
})();
