(() => {
  'use strict';
  if (window.__GNK_ASG_GALLERY_BOOTSTRAP__) return;
  window.__GNK_ASG_GALLERY_BOOTSTRAP__ = true;

  const route = location.pathname.replace(/\/+$/, '') || '/';
  const isIndex = route === '/' || route === '/en';
  const PNG_ASG = '/assets/brand/media-kit/GNK_ASG_logo_gold_transparent.png';
  const PNG_DINAMO = '/assets/brand/media-kit/GNK_DINAMO_Ltd_logo_gold_transparent.png';
  const EMAIL_STATUS = 'https://gnk-asg-direct-operator.beckuphome.workers.dev/email-status?source=all&from=%2Fcampaign-mailer%2F&date=today';
  const PDF_MEMO = '/api/media-registration/memorandum.pdf';
  const ready = fn => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn();

  const esc = value => String(value).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const link = (href, label, gold = false) => `<a class="gnk-runtime-btn${gold ? ' gold' : ''}" href="${esc(href)}"${/^https?:/i.test(href) ? ' rel="noopener"' : ''}>${esc(label)}</a>`;

  const projects = [
    ['PLANNED / FEASIBILITY', 'Međunarodne bolnice, sportska medicina i rehabilitacija', 'zdravstvo'],
    ['REVIEW / DEVELOPMENT', 'Sportski sustavi, performance tracking i sportska oprema', 'sport i tehnologija'],
    ['POSTOJEĆA TEHNOLOŠKA OSNOVA / MEĐUNARODNO ŠIRENJE', 'Bankarski, payment i digital exchange softver', 'FinTech'],
    ['PRE-LAUNCH / REGULATORNA I TEHNIČKA ANALIZA', 'Stablecoin i digitalni instrument povezan sa zlatom', 'digitalna imovina'],
    ['PLANNED / FEASIBILITY', 'Međunarodno sveučilište u SAD-u i još tri države', 'obrazovanje'],
    ['PLANNED / MARKET STUDY', 'Organska proteinska hrana i jestiva ulja', 'hrana'],
    ['PLANNED / SITE SELECTION', 'Tvornice i međunarodna industrijska proizvodnja', 'industrija'],
    ['PLANNED / DUE DILIGENCE', 'Nafta, derivati i energetska trgovina', 'energija'],
    ['JAVNO NAJAVLJENO / OGRANIČENA OBJAVA DO AKTIVACIJE', 'THE CODE – povezivanje više međunarodnih kompanija', 'grupna transformacija']
  ];

  const routes = [
    ['GNK-WRK-HR-FIN-001', 'Financijski rezultati / PDF dokazi', 'Informativni management-finance prikaz povezan s PDF dokazima.', ['/financije/', 'Finance'], ['/downloads/', 'PDF dokazi']],
    ['GNK-WRK-US-CODE-001', 'THE CODE announcements', 'Objave, countdown, PDF memorandum i javni materijali THE CODE programa.', ['/the-code/', 'THE CODE']],
    ['GNK-WRK-HR-OPS-001', 'Sastanci, odluke, raspored', 'Javne operacije, zapisnici i dopušteni statusi bez internih tajni.', ['/public-operations/', 'Public Operations']],
    ['GNK-WRK-HR-MEDIA-001', 'Novinari i media prijave', 'Newsroom intake i akreditacije. Ruta se ne mijenja.', ['/media-application/', 'Media application'], ['/media-application/?lang=en', 'EN form']],
    ['GNK-WRK-HR-PRESS-001', 'Press objave i materijali', 'Press releases, media kit i službeni novinarski materijali.', ['/objave/', 'Objave'], ['/media-kit/', 'Media Kit']],
    ['GNK-WRK-HR-COMMENT-001', 'Objave, komentari i analize Nermina Sefića', 'Autorski komentari odvojeni su od vijesti i press materijala.', ['/nermin-sefic/', 'Profil'], ['/autorske-objave/', 'Autorske objave']],
    ['GNK-WRK-HR-AI-001', 'Public AI Navigation', 'Javno usmjeravanje po portalu bez pravnih, investicijskih, medicinskih ili obvezujućih odluka.', ['/assistant/', 'AI pomoć']],
    ['GNK-WRK-HR-AI-002', 'Editorial AI Draft', 'Priprema nacrta; svaki tekst ide na odobrenje Nermina Sefića kao direktora, UBO-a i glavnog urednika.', ['/auto-editor/', 'Auto Editor']]
  ];

  function installStyle() {
    if (document.getElementById('gnk-index-runtime-style-v3')) return;
    const style = document.createElement('style');
    style.id = 'gnk-index-runtime-style-v3';
    style.textContent = `
      .gnk-runtime-section,.gnk-routing,.gnk-code-show{padding:30px 0}.gnk-runtime-panel,.gnk-routing-panel,.gnk-code-panel{border:1px solid rgba(243,204,98,.3);border-radius:28px;background:radial-gradient(circle at 50% 0,rgba(243,204,98,.15),rgba(5,8,14,.96) 54%);box-shadow:0 28px 80px rgba(0,0,0,.42);overflow:hidden}.gnk-runtime-head,.gnk-routing-head,.gnk-code-head{display:flex;align-items:end;justify-content:space-between;gap:18px;padding:20px 22px;border-bottom:1px solid rgba(255,255,255,.10)}.gnk-runtime-head h2,.gnk-routing-head h2,.gnk-code-head h2{margin:.1rem 0 0;font:700 clamp(28px,4vw,48px)/.96 Georgia,serif;color:#fff}.gnk-runtime-head p,.gnk-routing-head p,.gnk-code-head p{margin:0;color:#aeb8c8;max-width:780px;line-height:1.5}.gnk-runtime-grid,.gnk-routing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:18px}.gnk-runtime-card,.gnk-routing-card{border:1px solid rgba(255,255,255,.10);border-radius:18px;background:rgba(255,255,255,.045);padding:16px;display:flex;flex-direction:column;gap:10px}.gnk-runtime-card.feature,.gnk-routing-card.feature{border-color:rgba(243,204,98,.45);background:rgba(243,204,98,.06)}.gnk-runtime-card h3,.gnk-routing-card h3{margin:0;color:#fff;font:700 22px/1.05 Georgia,serif}.gnk-runtime-card p,.gnk-routing-card p,.gnk-runtime-card li{margin:0;color:#aeb8c8;line-height:1.48;font-size:14px}.gnk-runtime-card ul{margin:0;padding-left:18px}.gnk-runtime-status,.gnk-routing-card code{display:inline-flex;align-self:flex-start;border:1px solid rgba(243,204,98,.28);border-radius:999px;color:#ffe8a0;background:rgba(243,204,98,.075);padding:6px 9px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.gnk-runtime-notice,.gnk-routing-notice{margin:0 18px 18px;border:1px solid rgba(244,180,79,.42);border-radius:16px;background:rgba(244,180,79,.09);padding:13px;color:#ffe0a3;font-size:13px;line-height:1.5}.gnk-runtime-actions,.gnk-code-controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.gnk-runtime-btn,.gnk-code-button,.gnk-routing-card a{border:1px solid rgba(255,255,255,.14);border-radius:999px;background:#080d16;color:#fff;padding:10px 13px;text-decoration:none;font-size:12px;font-weight:950;display:inline-flex}.gnk-runtime-btn.gold,.gnk-code-button.gold{background:linear-gradient(135deg,#c99d35,#ffe08a);color:#06101f;border-color:#f3cc62}.gnk-code-stage{position:relative;min-height:380px;background:#030508}.gnk-code-slide{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:center;padding:26px;opacity:0;pointer-events:none;transform:translateY(12px);transition:opacity .55s ease,transform .55s ease}.gnk-code-slide.is-active{opacity:1;pointer-events:auto;transform:none}.gnk-code-copy small{display:block;color:#f3cc62;text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:900;margin-bottom:9px}.gnk-code-copy h3{font:700 clamp(30px,5vw,62px)/.9 Georgia,serif;margin:0;color:#fff}.gnk-code-copy p{color:#c9d2df;line-height:1.55;font-size:16px}.gnk-code-visual{border:1px solid rgba(243,204,98,.22);border-radius:22px;background:#04070d;min-height:250px;display:grid;place-items:center;text-align:center;padding:18px}.gnk-code-visual.light{background:#fff}.gnk-code-visual img{width:min(250px,78%);height:auto;filter:drop-shadow(0 28px 55px rgba(0,0,0,.55))}.gnk-code-count{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:100%}.gnk-code-count div{border:1px solid rgba(243,204,98,.28);border-radius:15px;padding:13px 8px;background:rgba(243,204,98,.065)}.gnk-code-count b{display:block;color:#fff;font-size:32px}.gnk-code-count span{display:block;color:#aeb8c8;font-size:10px;text-transform:uppercase;letter-spacing:.12em}.gnk-code-controls{padding:16px 22px;border-top:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.18)}.gnk-code-status{margin-left:auto;color:#aeb8c8;font-size:12px}.gnk-code-progress{height:2px;background:rgba(255,255,255,.08)}.gnk-code-progress i{display:block;height:100%;width:0;background:#f3cc62;transition:width .2s linear}@media(max-width:980px){.gnk-runtime-grid,.gnk-routing-grid{grid-template-columns:1fr 1fr}.gnk-code-slide{grid-template-columns:1fr;min-height:540px}.gnk-code-stage{min-height:540px}}@media(max-width:640px){.gnk-runtime-grid,.gnk-routing-grid,.gnk-code-count{grid-template-columns:1fr}.gnk-code-slide{padding:18px;min-height:600px}.gnk-code-stage{min-height:600px}.gnk-code-status{width:100%;margin-left:0}}`;
    document.head.appendChild(style);
  }

  function replaceSvgLogos() {
    document.querySelectorAll('img[src$=".svg"], img[src*="official-gnk"], img[src*="logo-gnk-asg.svg"]').forEach(img => {
      const sig = `${img.getAttribute('src') || ''} ${img.getAttribute('alt') || ''}`.toLowerCase();
      img.dataset.visualApproved = 'true';
      img.src = sig.includes('dinamo') ? PNG_DINAMO : PNG_ASG;
    });
  }

  function cleanRiskPhrases() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const fixes = [[/9 projekata u tijeku/gi, '9 projekata u pripremi / razvoju / provjeri'], [/projekata u tijeku/gi, 'projekata u pripremi, razvoju, provjeri ili ograničenoj objavi']];
    let node;
    while ((node = walker.nextNode())) {
      let value = node.nodeValue;
      fixes.forEach(([from, to]) => { value = value.replace(from, to); });
      if (value !== node.nodeValue) node.nodeValue = value;
    }
  }

  function ensureNavLinks() {
    const nav = document.querySelector('.top-nav, header .nav, nav[aria-label="Glavna navigacija"], nav');
    if (!nav) return;
    const has = href => [...nav.querySelectorAll('a')].some(a => (a.getAttribute('href') || '') === href);
    [['/the-code/', 'THE CODE'], ['/media-application/', 'Media'], ['/objave/', 'Objave'], ['/public-operations/', 'Operacije'], ['/financije/', 'Financije'], ['/downloads/', 'Downloads'], [EMAIL_STATUS, 'Email status']].forEach(([href, label]) => {
      if (has(href)) return;
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      if (/^https?:/i.test(href)) a.rel = 'noopener';
      nav.appendChild(a);
    });
  }

  function wireShow(root = document) {
    const slides = [...root.querySelectorAll('[data-code-slide]')];
    if (!slides.length || root.dataset?.codeWired === 'true') return;
    if (root.dataset) root.dataset.codeWired = 'true';
    const play = root.querySelector('[data-code-play]');
    const status = root.querySelector('[data-code-status]');
    const bar = root.querySelector('[data-code-progress]');
    const durations = [3600, 3900, 4200, 3900, 3900, 999999];
    let i = 0, timer = null, progressTimer = null, countdownTimer = null;
    const setSlide = next => { slides.forEach((slide, pos) => slide.classList.toggle('is-active', pos === next)); i = next; if (status) status.textContent = next === slides.length - 1 ? 'Countdown active · final slide' : `Slide ${next + 1} / ${slides.length}`; };
    const tickCountdown = () => { const diff = Math.max(0, new Date('2026-10-07T11:30:00-04:00') - new Date()); const put = (name, val) => { const el = root.querySelector(`[data-code-count="${name}"]`); if (el) el.textContent = String(Math.floor(val)).padStart(2, '0'); }; put('days', diff / 86400000); put('hours', (diff % 86400000) / 3600000); put('minutes', (diff % 3600000) / 60000); put('seconds', (diff % 60000) / 1000); };
    const animate = duration => { clearInterval(progressTimer); let elapsed = 0; if (bar) bar.style.width = '0%'; progressTimer = setInterval(() => { elapsed += 100; if (bar) bar.style.width = `${Math.min(100, elapsed / duration * 100)}%`; if (elapsed >= duration) clearInterval(progressTimer); }, 100); };
    const finish = () => { clearTimeout(timer); clearInterval(progressTimer); clearInterval(countdownTimer); setSlide(slides.length - 1); tickCountdown(); countdownTimer = setInterval(tickCountdown, 1000); if (bar) bar.style.width = '100%'; if (play) { play.disabled = false; play.textContent = '↺ Ponovi THE CODE show'; } };
    const next = () => { if (i >= slides.length - 2) { finish(); return; } setSlide(i + 1); animate(durations[i]); timer = setTimeout(next, durations[i]); };
    const start = () => { clearTimeout(timer); clearInterval(progressTimer); clearInterval(countdownTimer); setSlide(0); if (play) { play.disabled = true; play.textContent = '▶ THE CODE se vrti'; } animate(durations[0]); timer = setTimeout(next, durations[0]); };
    play?.addEventListener('click', start);
    tickCountdown();
  }

  function installCodeShow() {
    if (document.getElementById('gnk-index-code-show')) { wireShow(document.getElementById('gnk-index-code-show')); return; }
    const hero = document.querySelector('#the-code.hero, main .hero, main section, main');
    if (!hero) return;
    const section = document.createElement('section');
    section.id = 'gnk-index-code-show';
    section.className = 'wrap gnk-code-show';
    section.dataset.visualApproved = 'true';
    section.innerHTML = `<div class="gnk-code-panel"><div class="gnk-code-head"><div><p class="eyebrow">THE CODE front-page show</p><h2>HTML THE CODE show ugrađen je u index.</h2></div><p>Nije iframe. Rotacija se zaustavlja na zadnjem slideu s countdownom. Puni link ostaje <a href="/the-code/">/the-code/</a>, a media prijava ostaje <a href="/media-application/">/media-application/</a>.</p></div><div class="gnk-code-stage"><article class="gnk-code-slide is-active" data-code-slide><div class="gnk-code-copy"><small>Slide 1 · Origin</small><h3>Boulder → Zagreb → New York.</h3><p>THE CODE je javno najavljeni program grupne transformacije i povezivanja više međunarodnih kompanija.</p></div><div class="gnk-code-visual"><img src="${PNG_DINAMO}" alt="GNK DINAMO Ltd. Group logo"></div></article><article class="gnk-code-slide" data-code-slide><div class="gnk-code-copy"><small>Slide 2 · Existing base</small><h3>Postojeća tehnološka osnova.</h3><p>Bankarski, payment i digital exchange softver prikazuje se kao postojeća tehnološka osnova i međunarodno širenje.</p></div><div class="gnk-code-visual light"><img src="${PNG_ASG}" alt="GNK ASG d.o.o. logo"></div></article><article class="gnk-code-slide" data-code-slide><div class="gnk-code-copy"><small>Slide 3 · Portfolio</small><h3>Devet projekata, devet statusa.</h3><p>Planirano, feasibility, review, development, pre-launch, regulatorna analiza, site selection, due diligence i ograničena javna objava nisu isto.</p></div><div class="gnk-code-visual"><div class="gnk-code-count"><div><b>9</b><span>programa</span></div><div><b>0</b><span>završenih tvrdnji</span></div><div><b>PDF</b><span>dokazi</span></div><div><b>AI</b><span>pomoćno</span></div></div></div></article><article class="gnk-code-slide" data-code-slide><div class="gnk-code-copy"><small>Slide 4 · Governance</small><h3>AI ne odlučuje.</h3><p>Public AI Navigation usmjerava korisnike, a Editorial AI Draft priprema nacrte. Objavljuje se tek nakon ljudskog odobrenja.</p></div><div class="gnk-code-visual"><div style="font:700 56px/1 Georgia,serif;color:#f3cc62">AI 001 · 002</div></div></article><article class="gnk-code-slide" data-code-slide><div class="gnk-code-copy"><small>Slide 5 · Media</small><h3>Newsroom ostaje na istoj ruti.</h3><p>/media-application/ i /media-application/?lang=en ostaju službeni ulazi za redakcije.</p></div><div class="gnk-code-visual light"><img src="${PNG_DINAMO}" alt="GNK DINAMO Ltd. Group logo"></div></article><article class="gnk-code-slide" data-code-slide><div class="gnk-code-copy"><small>Final slide · Countdown</small><h3>Staje na odbrojavanju.</h3><p>Zadnji slide ne nastavlja u beskonačnu rotaciju.</p></div><div class="gnk-code-visual"><div class="gnk-code-count"><div><b data-code-count="days">--</b><span>days</span></div><div><b data-code-count="hours">--</b><span>hours</span></div><div><b data-code-count="minutes">--</b><span>min</span></div><div><b data-code-count="seconds">--</b><span>sec</span></div></div></div></article></div><div class="gnk-code-progress"><i data-code-progress></i></div><div class="gnk-code-controls"><button class="gnk-code-button gold" type="button" data-code-play>▶ Pokreni / ponovi show</button>${link('/the-code/', 'Otvori puni THE CODE')}${link('/media-application/?lang=en', 'Register newsroom')}${link(PDF_MEMO, 'PDF memorandum')}<span class="gnk-code-status" data-code-status>Ready · HTML show</span></div></div>`;
    hero.after(section);
    wireShow(section);
  }

  function installPortfolio() {
    const current = document.querySelector('#projects');
    if (current?.dataset?.gnkProjectPortfolioV2 === 'true') return;
    if (current && /u tijeku/i.test(current.textContent || '')) current.remove();
    const anchor = document.getElementById('gnk-index-code-show') || document.querySelector('main .hero') || document.querySelector('main');
    if (!anchor) return;
    const cards = projects.map(([status, title, sector], index) => `<article class="gnk-runtime-card${/POSTOJEĆA|JAVNO/.test(status) ? ' feature' : ''}"><span class="gnk-runtime-status">${esc(status)}</span><h3>${index + 1} · ${esc(title)}</h3><p>Sektor: ${esc(sector)}.</p><ul><li>status se prikazuje kao javno-siguran operativni opis;</li><li>nije tvrdnja o dovršenoj investiciji.</li></ul></article>`).join('');
    const section = document.createElement('section');
    section.className = 'wrap gnk-runtime-section';
    section.id = 'projects';
    section.dataset.gnkProjectPortfolioV2 = 'true';
    section.innerHTML = `<div class="gnk-runtime-panel"><div class="gnk-runtime-head"><div><p class="eyebrow">Project portfolio · public-safe status</p><h2>Devet međunarodnih investicijskih projekata u pripremi, razvoju, provjeri ili ograničenoj javnoj objavi.</h2></div><p>Ovo nije priča o devet završenih investicija. Ovo je prijelaz iz dokazivog softverskog i međunarodnog poslovanja prema devet velikih sektorskih programa.</p></div><div class="gnk-runtime-grid">${cards}</div><div class="gnk-runtime-notice"><strong>Disclosure:</strong> Hrvatska nije ciljno tržište investicijskog portfelja. Jasno se razlikuje što postoji danas, što je u razvoju, što čeka regulatornu odluku, što je planirano i što će biti objavljeno kroz THE CODE.</div></div>`;
    anchor.after(section);
  }

  function installAiModules() {
    if (document.getElementById('ai-modules')) return;
    const anchor = document.getElementById('projects') || document.getElementById('gnk-index-code-show') || document.querySelector('main');
    if (!anchor) return;
    const section = document.createElement('section');
    section.className = 'wrap gnk-runtime-section';
    section.id = 'ai-modules';
    section.innerHTML = `<div class="gnk-runtime-panel"><div class="gnk-runtime-head"><div><p class="eyebrow">AI governance</p><h2>AI moduli su pomoćni operativni alati.</h2></div><p>Nermin Sefić ostaje direktor / UBO / glavni urednik u okviru javne prezentacije i odobrenja sadržaja. AI ne odlučuje i ne objavljuje samostalno.</p></div><div class="gnk-runtime-grid"><article class="gnk-runtime-card feature"><span class="gnk-runtime-status">GNK-WRK-HR-AI-001</span><h3>Public AI Navigation</h3><p>Javno usmjeravanje po portalu, projektima, dokumentima, media prijavi, financijama i objavama.</p><ul><li>ne daje pravne, investicijske, medicinske ili obvezujuće odluke;</li><li>služi za navigaciju i sažetak javnih ruta.</li></ul><div class="gnk-runtime-actions">${link('/assistant/', 'Javni AI chat', true)}${link('/downloads/', 'Dokumenti')}</div></article><article class="gnk-runtime-card feature"><span class="gnk-runtime-status">GNK-WRK-HR-AI-002</span><h3>Editorial AI Draft</h3><p>Priprema nacrta objava, komentara, press materijala, odluka i sažetaka.</p><ul><li>svaki tekst ide na odobrenje Nermina Sefića;</li><li>AI ne objavljuje bez odobrenja.</li></ul><div class="gnk-runtime-actions">${link('/auto-editor/', 'Auto Editor', true)}${link('/objave/', 'Objave')}</div></article></div><div class="gnk-runtime-notice"><strong>Kontrola:</strong> odluke, zapisnici, sastanci, objave, komentari i press materijali moraju imati jasne rute i ljudsko odobrenje.</div></div>`;
    anchor.after(section);
  }

  function installRouting() {
    if (document.getElementById('gnk-public-routing-v1')) return;
    const anchor = document.getElementById('ai-modules') || document.getElementById('projects') || document.getElementById('gnk-index-code-show') || document.querySelector('main');
    if (!anchor) return;
    const cards = routes.map(route => {
      const [code, title, desc, ...buttons] = route;
      return `<article class="gnk-routing-card"><code>${esc(code)}</code><h3>${esc(title)}</h3><p>${esc(desc)}</p><div class="gnk-runtime-actions">${buttons.map(([href, label], i) => link(href, label, i === 0)).join('')}</div></article>`;
    }).join('');
    const section = document.createElement('section');
    section.id = 'gnk-public-routing-v1';
    section.className = 'wrap gnk-routing';
    section.innerHTML = `<div class="gnk-routing-panel"><div class="gnk-routing-head"><div><p class="eyebrow">Worker routing & responsibility</p><h2>Jasne rute za javne operacije.</h2></div><p>Workeri su workflow uloge, ne popis zaposlenika. Financijski prikazi su informativni i vezani uz PDF dokumente.</p></div><div class="gnk-routing-grid">${cards}</div><div class="gnk-routing-notice"><strong>Napomena:</strong> AI ne odlučuje umjesto direktora i ne objavljuje bez odobrenja. Media prijava ostaje na /media-application/.</div></div>`;
    anchor.after(section);
  }

  function installOperator() {
    if (document.getElementById('gnk-operator-email-status')) return;
    const anchor = document.getElementById('gnk-public-routing-v1') || document.getElementById('ai-modules') || document.querySelector('main');
    if (!anchor) return;
    const section = document.createElement('section');
    section.id = 'gnk-operator-email-status';
    section.className = 'wrap gnk-runtime-section';
    section.innerHTML = `<div class="gnk-runtime-panel"><div class="gnk-runtime-head"><div><p class="eyebrow">Admin / operator routes</p><h2>Email status i campaign dashboard.</h2></div><p>Direktni operator status za campaign mailer ostaje odvojen od javnih press i finance tvrdnji.</p></div><div class="gnk-runtime-grid"><article class="gnk-runtime-card feature"><span class="gnk-runtime-status">operator route</span><h3>Email Status Dashboard</h3><p>Status za source=all, from=/campaign-mailer/, date=today.</p><div class="gnk-runtime-actions">${link(EMAIL_STATUS, 'Otvori email status', true)}${link('/admin/', 'Admin')}${link('/campaign-mailer/', 'Campaign mailer')}</div></article><article class="gnk-runtime-card"><span class="gnk-runtime-status">safe mode</span><h3>Bez masovnog slanja iz indexa</h3><p>Index samo povezuje dashboard. Slanje ostaje kontrolirani operator workflow.</p></article></div></div>`;
    anchor.after(section);
  }

  function installIndex() {
    document.body?.classList.add('gnk-iq200-home');
    window.GNK_ASG_VISUAL_APPROVAL = { version: '2026-07-06-projects-ai-runtime-v3', required: true, productionRule: 'Index uses PNG media-kit visuals, conservative project statuses, AI governance and operator routing.' };
    document.querySelectorAll('#gnk-asg-premium-header,.gnk-v13-header').forEach(node => node.remove());
    installStyle();
    replaceSvgLogos();
    cleanRiskPhrases();
    ensureNavLinks();
    installCodeShow();
    installPortfolio();
    installAiModules();
    installRouting();
    installOperator();
    const observer = new MutationObserver(() => { replaceSvgLogos(); cleanRiskPhrases(); ensureNavLinks(); wireShow(document); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
  }

  if (isIndex) {
    ready(installIndex);
    return;
  }

  const runGallery = async () => {
    if (!window.GNK_ASG_GALLERY) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/assets/gallery-engine.js?v=20260626-v2';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      }).catch(() => {});
    }
    if (window.GNK_ASG_GALLERY && !/\/visual-index\/?$/.test(location.pathname)) window.GNK_ASG_GALLERY.apply(document).catch(() => {});
  };
  ready(runGallery);
})();
