function initPublicHub() {
  var anchor = document.getElementById('assistant');
  if (!anchor || document.getElementById('public-hub')) return;

  var english = /\/en(?:\/|$)/.test(window.location.pathname);
  var section = document.createElement('section');
  section.id = 'public-hub';
  section.className = 'public-hub';

  if (english) {
    section.innerHTML = '<div class="container"><div class="section-head"><div><p class="eyebrow">Public portal</p><h2>Key information in one place</h2></div><p>Direct access to current public content, projects, reports and the portal operating model.</p></div><div class="public-hub-grid"><article class="public-hub-card"><span>Newsroom</span><h3>News and official releases</h3><p>Latest public information, media content and official releases.</p><a href="/en/newsroom/">Open Newsroom</a></article><article class="public-hub-card"><span>Projects</span><h3>Active projects and development</h3><p>Overview of key initiatives and publicly released statuses.</p><a href="/en/projects/">Open projects</a></article><article class="public-hub-card"><span>THE CODE</span><h3>New York · 7 October 2026</h3><p>Central presentation and official overview of THE CODE event.</p><a href="/en/the-code/">Open THE CODE</a></article><article class="public-hub-card"><span>Reports</span><h3>Documents and releases</h3><p>Public overview of reports, summaries and corporate documents.</p><a href="/en/reports/">Open reports</a></article><article class="public-hub-card"><span>Workers</span><h3>Digital operating model</h3><p>Overview of technical and operational functions within the system.</p><a href="/workers/">Open workers</a></article><article class="public-hub-card"><span>About</span><h3>Group and corporate identity</h3><p>Story, structure, development and the publicly released Group framework.</p><a href="/en/about/">Open profile</a></article></div></div>';
  } else {
    section.innerHTML = '<div class="container"><div class="section-head"><div><p class="eyebrow">Javni portal</p><h2>Najvažnije informacije na jednom mjestu</h2></div><p>Izravne poveznice prema aktualnim javnim sadržajima, projektima, izvješćima i operativnom modelu portala.</p></div><div class="public-hub-grid"><article class="public-hub-card"><span>Newsroom</span><h3>Vijesti i službene objave</h3><p>Najnovije javne informacije, medijski sadržaji i službene objave.</p><a href="/newsroom/">Otvori Newsroom</a></article><article class="public-hub-card"><span>Projekti</span><h3>Aktivni projekti i razvoj</h3><p>Pregled ključnih inicijativa i javno objavljenih statusa.</p><a href="/projects/">Otvori projekte</a></article><article class="public-hub-card"><span>THE CODE</span><h3>New York · 7. listopada 2026.</h3><p>Središnja prezentacija i službeni pregled događaja THE CODE.</p><a href="/the-code/">Otvori THE CODE</a></article><article class="public-hub-card"><span>Izvješća</span><h3>Dokumenti i objave</h3><p>Javni pregled izvješća, sažetaka i korporativnih dokumenata.</p><a href="/reports/">Otvori izvješća</a></article><article class="public-hub-card"><span>Workeri</span><h3>Digitalni operativni model</h3><p>Pregled tehničkih i operativnih funkcija unutar sustava.</p><a href="/workers/">Otvori workere</a></article><article class="public-hub-card"><span>O nama</span><h3>Grupa i korporativni identitet</h3><p>Priča, struktura, razvoj i javno objavljeni okvir Grupe.</p><a href="/about/">Otvori profil</a></article></div></div>';
  }

  anchor.parentNode.insertBefore(section, anchor);

  var menu = document.getElementById('navLinks');
  if (menu && !menu.querySelector('a[href="#public-hub"]')) {
    var link = document.createElement('a');
    link.href = '#public-hub';
    link.textContent = english ? 'Public portal' : 'Javni portal';
    var reference = menu.querySelector('a[href="#assistant"]');
    menu.insertBefore(link, reference || null);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPublicHub, { once: true });
} else {
  initPublicHub();
}
