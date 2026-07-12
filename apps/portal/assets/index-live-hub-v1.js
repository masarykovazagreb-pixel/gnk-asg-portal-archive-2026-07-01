document.addEventListener('DOMContentLoaded', function () {
  var anchor = document.getElementById('assistant');
  if (!anchor || document.getElementById('public-hub')) return;

  var section = document.createElement('section');
  section.id = 'public-hub';
  section.className = 'public-hub';
  section.innerHTML = '<div class="container"><div class="section-head"><div><p class="eyebrow">Javni portal</p><h2>Najvažnije informacije na jednom mjestu</h2></div><p>Izravne poveznice prema aktualnim javnim sadržajima, projektima, izvješćima i operativnom modelu portala.</p></div><div class="public-hub-grid"><article class="public-hub-card"><span>Newsroom</span><h3>Vijesti i službene objave</h3><p>Najnovije javne informacije, medijski sadržaji i službene objave.</p><a href="/newsroom/">Otvori Newsroom</a></article><article class="public-hub-card"><span>Projekti</span><h3>Aktivni projekti i razvoj</h3><p>Pregled ključnih inicijativa i javno objavljenih statusa.</p><a href="/projects/">Otvori projekte</a></article><article class="public-hub-card"><span>THE CODE</span><h3>New York · 7. listopada 2026.</h3><p>Središnja prezentacija i službeni pregled događaja THE CODE.</p><a href="/the-code/">Otvori THE CODE</a></article><article class="public-hub-card"><span>Izvješća</span><h3>Dokumenti i objave</h3><p>Javni pregled izvješća, sažetaka i korporativnih dokumenata.</p><a href="/reports/">Otvori izvješća</a></article><article class="public-hub-card"><span>Workeri</span><h3>Digitalni operativni model</h3><p>Pregled tehničkih i operativnih funkcija unutar sustava.</p><a href="/workers/">Otvori workere</a></article><article class="public-hub-card"><span>O nama</span><h3>Grupa i korporativni identitet</h3><p>Priča, struktura, razvoj i javno objavljeni okvir Grupe.</p><a href="/about/">Otvori profil</a></article></div></div>';

  anchor.parentNode.insertBefore(section, anchor);

  var menu = document.getElementById('navLinks');
  if (menu && !menu.querySelector('a[href="#public-hub"]')) {
    var link = document.createElement('a');
    link.href = '#public-hub';
    link.textContent = 'Javni portal';
    menu.insertBefore(link, menu.querySelector('a[href="#assistant"]'));
  }
});
