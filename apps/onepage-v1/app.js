(() => {
  'use strict';

  const app = document.getElementById('app');
  const state = { config: null, lang: 'hr' };
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const localized = value => value && typeof value === 'object' && !Array.isArray(value) ? (value[state.lang] ?? value.hr ?? value.en ?? '') : (value ?? '');
  const targetLink = target => String(target || '').startsWith('#') ? target : `#${target}`;

  function applyTheme(config) {
    const root = document.documentElement;
    if (config.theme?.gold) root.style.setProperty('--gold', config.theme.gold);
    if (config.theme?.goldHighlight) root.style.setProperty('--gold-hi', config.theme.goldHighlight);
    if (config.theme?.blue) root.style.setProperty('--blue', config.theme.blue);
  }

  function rows(items = []) {
    return `<ul class="data-list">${items.map(item => `<li class="data-row"><small>${escapeHtml(localized(item.label))}</small><strong>${escapeHtml(localized(item.value))}</strong></li>`).join('')}</ul>`;
  }

  function sectionHead(eyebrow, heading, intro) {
    return `<div class="section-head"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2>${escapeHtml(localized(heading))}</h2></div><p>${escapeHtml(localized(intro))}</p></div>`;
  }

  function render() {
    const c = state.config;
    document.documentElement.lang = state.lang;
    document.title = `${c.brand.primary} · ${c.brand.secondary}`;

    app.innerHTML = `
      <header class="site-header" data-header>
        <a class="brand" href="#home" aria-label="${escapeHtml(c.brand.primary)}">
          <span class="brand-mark" aria-hidden="true">G</span>
          <span class="brand-copy"><strong>${escapeHtml(c.brand.primary)}</strong><span>${escapeHtml(c.brand.secondary)}</span></span>
        </a>
        <nav class="nav" aria-label="${state.lang === 'en' ? 'Main navigation' : 'Glavna navigacija'}">
          ${c.navigation.map(item => `<a href="#${escapeHtml(item.id)}">${escapeHtml(localized(item))}</a>`).join('')}
        </nav>
        <div class="header-actions">
          <button class="lang-toggle" type="button" data-language>${state.lang === 'hr' ? 'EN' : 'HR'}</button>
          <button class="menu-toggle" type="button" data-menu aria-label="${state.lang === 'en' ? 'Open menu' : 'Otvori izbornik'}">☰</button>
        </div>
      </header>

      <main id="content">
        <section class="section hero" id="home">
          <div class="hero-copy">
            <p class="eyebrow">${escapeHtml(localized(c.hero.eyebrow))}</p>
            <h1>${escapeHtml(localized(c.hero.title))}<span>${escapeHtml(localized(c.hero.titleAccent))}</span></h1>
            <p class="hero-lead">${escapeHtml(localized(c.hero.lead))}</p>
            <div class="actions">
              <a class="button primary" href="${targetLink(c.hero.primaryAction.target)}">${escapeHtml(localized(c.hero.primaryAction))}</a>
              <a class="button" href="${targetLink(c.hero.secondaryAction.target)}">${escapeHtml(localized(c.hero.secondaryAction))}</a>
            </div>
          </div>
          <div class="hero-visual" data-visual-slot="${escapeHtml(c.hero.visualSlot)}">
            <div class="visual-slot"><strong>${escapeHtml(c.hero.visualSlot)}</strong><span>${state.lang === 'en' ? 'Visual is disabled until the exact asset and crop are approved.' : 'Vizual je isključen dok se ne odobre točan asset i crop.'}</span></div>
          </div>
        </section>

        <div class="stat-strip">${c.stats.map(item => `<article class="stat"><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(localized(item))}</span></article>`).join('')}</div>

        <section class="section" id="profile">
          ${sectionHead(state.lang === 'en' ? 'Group' : 'Grupa', c.profile.heading, c.profile.intro)}
          <div class="card-grid">${c.profile.companies.map(company => `<article class="card"><h3>${escapeHtml(company.name)}</h3>${rows(company.items)}</article>`).join('')}</div>
        </section>

        <section class="section" id="finance">
          ${sectionHead('FY', c.finance.heading, c.finance.intro)}
          <div class="finance-grid">${c.finance.companies.map(company => `<article class="card"><h3>${escapeHtml(company.name)}</h3><div class="metric-grid">${company.metrics.map(metric => `<div class="metric"><small>${escapeHtml(localized(metric.label))}</small><strong>${escapeHtml(localized(metric.value))}</strong></div>`).join('')}</div></article>`).join('')}</div>
        </section>

        <section class="section" id="network">
          ${sectionHead(state.lang === 'en' ? 'International' : 'Međunarodno', c.network.heading, c.network.intro)}
          <div class="network-layout">
            <div class="network-map" data-visual-slot="${escapeHtml(c.network.visualSlot)}"><div class="network-orbit" aria-hidden="true"></div><div class="visual-slot"><strong>${escapeHtml(c.network.visualSlot)}</strong><span>${state.lang === 'en' ? 'Approved global network visual will be placed here.' : 'Ovdje će biti postavljen odobreni vizual globalne mreže.'}</span></div></div>
            <div class="location-list">${c.network.locations.map(location => `<div class="location"><strong>${escapeHtml(location.city)}</strong><small>${escapeHtml(localized(location.status))}</small></div>`).join('')}</div>
          </div>
        </section>

        <section class="section" id="code">
          ${sectionHead('New York · 07.10.2026.', c.code.heading, c.code.intro)}
          <div class="code-frame"><iframe title="THE CODE" src="${escapeHtml(c.settings.codeUrl)}" loading="lazy" allow="fullscreen"></iframe></div>
        </section>

        <section class="section" id="news">
          ${sectionHead('Intelligence', c.news.heading, c.news.intro)}
          <div class="news-grid">${c.news.items.map(item => `<article class="news-card"><small>${escapeHtml(localized(item.category))}</small><h3>${escapeHtml(localized(item.title))}</h3><p>${escapeHtml(localized(item.summary))}</p><a class="button" href="${escapeHtml(item.url)}">${state.lang === 'en' ? 'Open' : 'Otvori'}</a></article>`).join('')}</div>
        </section>

        <section class="section" id="publications">
          ${sectionHead(state.lang === 'en' ? 'Documents' : 'Dokumenti', c.publications.heading, c.publications.intro)}
          <div class="publication-grid">${c.publications.items.map(item => `<article class="publication-card"><small>${escapeHtml(item.type)}</small><h3>${escapeHtml(localized(item.title))}</h3><p>${escapeHtml(localized(item.summary))}</p><a class="button" href="${escapeHtml(item.url)}"${String(item.url).startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${state.lang === 'en' ? 'Open' : 'Otvori'}</a></article>`).join('')}</div>
        </section>

        <section class="section" id="tools">
          ${sectionHead(state.lang === 'en' ? 'Access' : 'Pristup', c.tools.heading, c.tools.intro)}
          <div class="tools-grid">${c.tools.items.map(item => `<article class="tool-card"><b>${escapeHtml(localized(item.name))}</b><p>${escapeHtml(localized(item.description))}</p><a class="button" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${state.lang === 'en' ? 'Open tool' : 'Otvori alat'}</a></article>`).join('')}</div>
        </section>

        <section class="section" id="contact">
          ${sectionHead(state.lang === 'en' ? 'Direct' : 'Izravno', c.contact.heading, c.contact.intro)}
          <div class="contact-layout">
            <article class="contact-copy"><h3>${escapeHtml(c.brand.primary)}</h3><p>${escapeHtml(c.contact.address)}</p><p><a href="mailto:${escapeHtml(c.contact.email)}">${escapeHtml(c.contact.email)}</a></p></article>
            <form class="contact-form" data-contact novalidate>
              <div class="field"><label for="name">${escapeHtml(localized(c.contact.fields.name))}</label><input id="name" name="name" autocomplete="name" required></div>
              <div class="field"><label for="email">${escapeHtml(localized(c.contact.fields.email))}</label><input id="email" name="email" type="email" autocomplete="email" required></div>
              <div class="field full"><label for="subject">${escapeHtml(localized(c.contact.fields.subject))}</label><input id="subject" name="subject" required></div>
              <div class="field full"><label for="message">${escapeHtml(localized(c.contact.fields.message))}</label><textarea id="message" name="message" required></textarea></div>
              <div class="field full"><button class="button primary" type="submit">${escapeHtml(localized(c.contact.fields.send))}</button></div>
              <div class="form-status" role="status" data-form-status></div>
            </form>
          </div>
        </section>
      </main>

      <footer class="footer"><span>${escapeHtml(c.footer.copyright)}</span><span>${escapeHtml(localized(c.footer.note))} · <a href="#home">${state.lang === 'en' ? 'Top' : 'Na vrh'}</a></span></footer>
    `;

    bindEvents();
  }

  function bindEvents() {
    const header = app.querySelector('[data-header]');
    app.querySelector('[data-language]')?.addEventListener('click', () => {
      state.lang = state.lang === 'hr' ? 'en' : 'hr';
      localStorage.setItem('gnk-onepage-language', state.lang);
      render();
    });
    app.querySelector('[data-menu]')?.addEventListener('click', () => header?.classList.toggle('menu-open'));
    app.querySelectorAll('.nav a').forEach(link => link.addEventListener('click', () => header?.classList.remove('menu-open')));
    app.querySelector('[data-contact]')?.addEventListener('submit', submitContact);
  }

  async function submitContact(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const status = form.querySelector('[data-form-status]');
    const button = form.querySelector('button[type="submit"]');
    const fields = state.config.contact.fields;
    if (!form.reportValidity()) return;
    const payload = Object.fromEntries(new FormData(form).entries());
    status.textContent = localized(fields.sending);
    button.disabled = true;
    try {
      const response = await fetch(state.config.settings.contactEndpoint, {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      status.textContent = localized(fields.success);
      form.reset();
    } catch (_) {
      status.innerHTML = `${escapeHtml(localized(fields.error))} <a href="mailto:${escapeHtml(state.config.contact.email)}">${escapeHtml(state.config.contact.email)}</a>`;
    } finally {
      button.disabled = false;
    }
  }

  async function start() {
    try {
      const response = await fetch('./site.config.json', {cache:'no-store'});
      if (!response.ok) throw new Error(`CONFIG_HTTP_${response.status}`);
      state.config = await response.json();
      state.lang = localStorage.getItem('gnk-onepage-language') || state.config.settings.defaultLanguage || 'hr';
      if (!['hr','en'].includes(state.lang)) state.lang = 'hr';
      applyTheme(state.config);
      render();
    } catch (error) {
      app.innerHTML = `<div class="error-box"><h1>Portal configuration error</h1><p>Konfiguracija se nije mogla učitati.</p><code>${escapeHtml(error?.message || error)}</code></div>`;
    }
  }

  start();
})();
