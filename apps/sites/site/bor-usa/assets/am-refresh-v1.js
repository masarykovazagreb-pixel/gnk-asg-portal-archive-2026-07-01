/* AKTUAL MEDIA — osvježavanje koje radi na svakoj stranici mreže.
 *
 * Zašto: svaka stranica je statična, pa posjetitelj nema način provjeriti je
 * li ono što gleda jučerašnje ili današnje. Ovaj modul ne mijenja sadržaj
 * (to bi lagalo), nego pokazuje dva mjerljiva podatka i nudi ponovno
 * učitavanje:
 *
 *   1. podatkovni dan — datum iz kojeg su brojke na stranici izračunate;
 *   2. koliko je stranica stara u pregledniku (od učitavanja).
 *
 * Pritom provjerava je li na poslužitelju novija verzija podataka
 * (`/data/network-counts-v1.json`) i, ako jest, nudi "Osvježi" umjesto da
 * tiho prikaže staro. Kad je kartica skrivena, ne šalje nijedan zahtjev.
 *
 * Nema ovisnosti, nema trećih strana, radi pod `script-src 'self'`.
 */
(function () {
  'use strict';
  var tag = document.querySelector('script[data-am-netday]');
  if (!tag) return;
  var dataDay = tag.getAttribute('data-am-netday') || '';
  var lang = (document.documentElement.lang || 'hr').slice(0, 2);
  var en = lang === 'en';
  var t = function (hr, eng) { return en ? eng : hr; };

  var label = function (day) {
    if (!day) return t('bez datuma', 'no date');
    var parts = String(day).slice(0, 10).split('-');
    if (parts.length !== 3) return day;
    return en
      ? Number(parts[2]) + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(parts[1]) - 1] + ' ' + parts[0]
      : Number(parts[2]) + '. ' + Number(parts[1]) + '. ' + parts[0] + '.';
  };

  var started = Date.now();

  var pill = document.createElement('aside');
  pill.className = 'am-refresh';
  pill.setAttribute('aria-live', 'polite');
  pill.innerHTML =
    '<span class="am-refresh-k">' + t('AKTUAL MEDIA · podaci', 'AKTUAL MEDIA · data') + '</span>' +
    '<b class="am-refresh-day">' + label(dataDay) + '</b>' +
    '<span class="am-refresh-age"></span>' +
    '<button type="button" class="am-refresh-btn">' + t('Osvježi', 'Refresh') + '</button>';

  var css = document.createElement('style');
  css.textContent =
    '.am-refresh{position:fixed;right:14px;bottom:14px;z-index:80;display:flex;align-items:center;gap:10px;' +
    'padding:8px 10px 8px 12px;border-radius:999px;border:1px solid rgba(233,198,108,.45);' +
    'background:rgba(6,14,26,.92);color:#eef3f8;font:600 11.5px/1 system-ui,-apple-system,"Segoe UI",sans-serif;' +
    'letter-spacing:.04em;box-shadow:0 10px 26px rgba(4,10,20,.35);backdrop-filter:blur(6px)}' +
    '.am-refresh-k{color:#e9c66c;font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:9.5px}' +
    '.am-refresh b{font-weight:800}' +
    '.am-refresh-age{color:#9fb0c6;font-weight:600}' +
    '.am-refresh-btn{appearance:none;border:1px solid rgba(233,198,108,.5);background:transparent;color:#e9c66c;' +
    'font:800 10px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;padding:6px 9px;border-radius:999px;cursor:pointer}' +
    '.am-refresh-btn:hover,.am-refresh-btn:focus-visible{background:#e9c66c;color:#0a1422}' +
    '.am-refresh[data-stale="1"]{border-color:#ff9f6e}' +
    '.am-refresh[data-stale="1"] .am-refresh-day{color:#ffb48a}' +
    '@media (max-width:620px){.am-refresh{left:10px;right:10px;bottom:10px;justify-content:center;font-size:10.5px}.am-refresh-k{display:none}}' +
    '@media print{.am-refresh{display:none}}';
  document.head.appendChild(css);

  var age = pill.querySelector('.am-refresh-age');
  var button = pill.querySelector('.am-refresh-btn');

  var paintAge = function () {
    var minutes = Math.round((Date.now() - started) / 60000);
    age.textContent = minutes < 1
      ? t('upravo učitano', 'just loaded')
      : t('otvoreno prije ' + (minutes < 60 ? minutes + ' min' : Math.round(minutes / 60) + ' h'),
        'open for ' + (minutes < 60 ? minutes + ' min' : Math.round(minutes / 60) + ' h'));
  };

  /* Provjera novijeg zapisa: samo kad je kartica vidljiva i samo jednom u
     15 minuta. Greška u mreži ne mijenja ništa na stranici. */
  var check = function () {
    if (document.hidden || !window.fetch) return;
    fetch('/data/network-counts-v1.json?ts=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        if (!data) return;
        pill.setAttribute('data-stale', data.dataDay && dataDay && data.dataDay > dataDay ? '1' : '0');
        if (data.dataDay && dataDay && data.dataDay > dataDay) {
          button.textContent = t('Noviji podaci · osvježi', 'Newer data · refresh');
        }
      })
      .catch(function () { /* tiho: starija stranica nije kvar */ });
  };

  button.addEventListener('click', function () {
    button.disabled = true;
    button.textContent = t('Osvježavam…', 'Refreshing…');
    window.location.reload();
  });

  var attach = function () {
    if (!pill.isConnected) document.body.appendChild(pill);
    paintAge();
  };
  if (document.body) attach();
  else document.addEventListener('DOMContentLoaded', attach);

  window.setInterval(paintAge, 60000);
  window.setTimeout(check, 1500);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
  window.addEventListener('online', check);
})();
