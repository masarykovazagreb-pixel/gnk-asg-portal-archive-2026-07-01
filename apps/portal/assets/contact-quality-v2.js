(() => {
  'use strict';
  if (window.__GNK_ASG_CONTACT_V2__) return;
  window.__GNK_ASG_CONTACT_V2__ = true;

  const install = () => {
    const form = document.getElementById('f') || document.getElementById('contactForm');
    const card = form?.closest('.card');
    if (!form || !card || card.dataset.contactV2 === '1') return;
    card.dataset.contactV2 = '1';
    document.body.classList.add('gnk-contact-v2');

    ['gnk-asg-fixed-menu-patch-style','gnk-asg-fixed-menu-patch-script','gnk-asg-global-float-home-ai-v1-style','gnk-asg-global-float-home-ai-v1-script'].forEach(id => document.getElementById(id)?.remove());
    document.querySelectorAll('.gnk-global-float-home,.gnk-global-float-ai').forEach(node => node.remove());

    const oldTitle = card.querySelector(':scope > h1');
    const oldHome = card.querySelector(':scope > a[href="/"]');
    const output = document.getElementById('out');
    oldTitle?.remove();
    oldHome?.remove();

    const hero = document.createElement('section');
    hero.className = 'gnk-contact-hero';
    hero.innerHTML = `<div><p class="eyebrow">GNK ASG Communications Desk</p><h1>Kontakt i sigurna komunikacija</h1><p>Jedinstvena kontaktna točka za GNK ASG d.o.o. i povezane korporativne upite. Odaberite odjel, unesite podatke i po potrebi priložite PDF dokument.</p><div class="gnk-contact-hero-actions"><a href="#gnk-contact-form">Pošalji upit</a><a href="/downloads/">PDF centar</a><a href="/en/contact/">English</a></div></div><aside class="gnk-contact-status"><b>Kontaktni sustav aktivan</b><span>Poruka se usmjerava odabranom odjelu. Nakon uspješnog zaprimanja sačuvajte prikazani evidencijski podatak.</span></aside>`;

    const formCard = document.createElement('section');
    formCard.className = 'gnk-contact-form-card';
    formCard.id = 'gnk-contact-form';
    formCard.innerHTML = '<h2>Pošaljite poruku</h2><p class="gnk-contact-lead">Sigurni obrazac za opće, medijske, pravne, privatnosne, IT i korporativne upite. PDF prilog nije obavezan.</p>';
    formCard.appendChild(form);
    if (output) form.appendChild(output);

    const aside = document.createElement('aside');
    aside.className = 'gnk-contact-aside';
    aside.innerHTML = `<p class="eyebrow">Odjeli i kanali</p><article class="gnk-contact-department"><b>Opći kontakt</b><a href="mailto:contact@gnk-asg.hr">contact@gnk-asg.hr</a><small>Usmjeravanje upita i komunikacija putem portala.</small></article><article class="gnk-contact-department"><b>Mediji</b><a href="mailto:media@gnk-asg.hr">media@gnk-asg.hr</a><small>Media kit, vizualni materijali i provjera činjenica.</small></article><article class="gnk-contact-department"><b>Pravni i compliance</b><a href="mailto:legal@gnk-asg.hr">legal@gnk-asg.hr</a><small>Formalni zahtjevi, pravni upiti i usklađenost.</small></article><article class="gnk-contact-department"><b>Privatnost</b><a href="mailto:privacy@gnk-asg.hr">privacy@gnk-asg.hr</a><small>Zaštita podataka i prava ispitanika.</small></article><article class="gnk-contact-department"><b>IT podrška</b><a href="mailto:it@gnk-asg.hr">it@gnk-asg.hr</a><small>Tehnički problemi portala i digitalnih modula.</small></article><div class="gnk-contact-aside-note"><strong>GNK ASG d.o.o.</strong><br>Zagrebačka cesta 130, Zagreb<br>OIB: 75227917632 · MBS: 081512375<br><br>Hrvatski i engleski korporativni Media Kit dostupni su u PDF i Download centru.</div>`;

    card.replaceChildren(hero,formCard,aside);

    const metaDescription = document.querySelector('meta[name="description"]') || document.head.appendChild(document.createElement('meta'));
    metaDescription.name = 'description';
    metaDescription.content = 'Sigurna kontakt forma GNK ASG d.o.o. za opće, medijske, pravne, privatnosne, IT i korporativne upite, uz mogućnost PDF priloga.';
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = 'https://gnk-asg.hr/contact/';
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
