(() => {
  'use strict';
  if (window.__GNK_ASG_GALLERY_BOOTSTRAP__) return;
  window.__GNK_ASG_GALLERY_BOOTSTRAP__ = true;

  const route = location.pathname.replace(/\/+$/, '') || '/';
  const isIndex = route === '/' || route === '/en';
  const PNG_ASG = '/assets/brand/media-kit/GNK_ASG_logo_gold_transparent.png';
  const PNG_DINAMO = '/assets/brand/media-kit/GNK_DINAMO_Ltd_logo_gold_transparent.png';
  const ready = fn => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn();

  function replaceSvgLogos() {
    document.querySelectorAll('img[src$=".svg"]').forEach(img => {
      const signature = `${img.getAttribute('src') || ''} ${img.getAttribute('alt') || ''}`.toLowerCase();
      img.dataset.visualApproved = 'true';
      img.src = signature.includes('dinamo') ? PNG_DINAMO : PNG_ASG;
    });
  }

  function ensureNavLinks() {
    const nav = document.querySelector('.top-nav, header .nav, nav[aria-label="Glavna navigacija"]');
    if (!nav) return;
    const has = href => [...nav.querySelectorAll('a')].some(a => a.getAttribute('href') === href);
    const make = (href, label) => { const a = document.createElement('a'); a.href = href; a.textContent = label; return a; };
    const media = [...nav.querySelectorAll('a')].find(a => /^\/media-application\/?/.test(a.getAttribute('href') || ''));
    if (!has('/the-code/')) nav.insertBefore(make('/the-code/', 'THE CODE'), media || null);
    if (!has('/objave/')) nav.insertBefore(make('/objave/', 'Objave'), media || null);
    if (!has('/public-operations/')) nav.insertBefore(make('/public-operations/', 'Operacije'), media || null);
    if (!has('/digital-workforce/directory/')) nav.insertBefore(make('/digital-workforce/directory/', 'Workeri'), media || null);
  }

  function installStyle() {
    if (document.getElementById('gnk-index-runtime-style-v2')) return;
    const style = document.createElement('style');
    style.id = 'gnk-index-runtime-style-v2';
    style.textContent = `
      .gnk-code-show,.gnk-routing{padding:22px 0 30px}.gnk-code-panel,.gnk-routing-panel{border:1px solid rgba(243,204,98,.32);border-radius:28px;background:radial-gradient(circle at 50% 0,rgba(243,204,98,.15),rgba(5,8,14,.96) 54%);box-shadow:0 28px 80px rgba(0,0,0,.42);overflow:hidden}.gnk-code-head,.gnk-routing-head{display:flex;align-items:end;justify-content:space-between;gap:18px;padding:20px 22px;border-bottom:1px solid rgba(255,255,255,.10)}.gnk-code-head h2,.gnk-routing-head h2{margin:.1rem 0 0;font:700 clamp(28px,4vw,48px)/.96 Georgia,serif}.gnk-code-head p,.gnk-routing-head p{margin:0;color:#aeb8c8;max-width:720px;line-height:1.5}.gnk-code-stage{position:relative;min-height:360px;background:#030508}.gnk-code-slide{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:center;padding:26px;opacity:0;pointer-events:none;transform:translateY(12px);transition:opacity .55s ease,transform .55s ease}.gnk-code-slide.is-active{opacity:1;pointer-events:auto;transform:none}.gnk-code-copy small,.gnk-routing-card code{display:block;color:#f3cc62;text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:900;margin-bottom:9px}.gnk-code-copy h3{font:700 clamp(30px,5vw,64px)/.9 Georgia,serif;margin:0;color:#fff}.gnk-code-copy p{color:#c9d2df;line-height:1.55;font-size:16px}.gnk-code-visual{border:1px solid rgba(243,204,98,.22);border-radius:22px;background:#04070d;min-height:245px;display:grid;place-items:center;text-align:center;padding:18px}.gnk-code-visual.light{background:#fff}.gnk-code-visual img{width:min(250px,78%);height:auto;filter:drop-shadow(0 28px 55px rgba(0,0,0,.55))}.gnk-code-big{font:700 clamp(34px,5vw,66px)/.92 Georgia,serif;color:#f3cc62;letter-spacing:.05em}.gnk-code-metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;width:100%}.gnk-code-metric{border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:13px;background:rgba(255,255,255,.045);text-align:left}.gnk-code-metric b{display:block;color:#ffe8a0;font-size:24px}.gnk-code-metric span{color:#aeb8c8;font-size:12px}.gnk-code-count{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:100%}.gnk-code-count div{border:1px solid rgba(243,204,98,.28);border-radius:15px;padding:13px 8px;background:rgba(243,204,98,.065)}.gnk-code-count b{display:block;color:#fff;font-size:32px}.gnk-code-count span{display:block;color:#aeb8c8;font-size:10px;text-transform:uppercase;letter-spacing:.12em}.gnk-code-controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:16px 22px;border-top:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.18)}.gnk-code-button,.gnk-routing-card a{border:1px solid rgba(255,255,255,.14);border-radius:999px;background:#080d16;color:#fff;padding:10px 13px;text-decoration:none;font-size:12px;font-weight:950;display:inline-flex}.gnk-code-button.gold{background:linear-gradient(135deg,#c99d35,#ffe08a);color:#06101f;border-color:#f3cc62}.gnk-code-status{margin-left:auto;color:#aeb8c8;font-size:12px}.gnk-code-progress{height:2px;background:rgba(255,255,255,.08)}.gnk-code-progress i{display:block;height:100%;width:0;background:#f3cc62;transition:width .2s linear}.gnk-routing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:18px}.gnk-routing-card{border:1px solid rgba(255,255,255,.10);border-radius:18px;background:rgba(255,255,255,.045);padding:16px;display:flex;flex-direction:column;gap:10px}.gnk-routing-card h3{margin:0;color:#fff;font:700 22px/1.05 Georgia,serif}.gnk-routing-card p{margin:0;color:#aeb8c8;line-height:1.48;font-size:14px}.gnk-routing-meta{display:flex;gap:7px;flex-wrap:wrap}.gnk-routing-meta span{border:1px solid rgba(243,204,98,.22);border-radius:999px;color:#ffe8a0;background:rgba(243,204,98,.07);padding:5px 8px;font-size:11px;font-weight:800}.gnk-routing-notice{margin:0 18px 18px;border:1px solid rgba(244,180,79,.42);border-radius:16px;background:rgba(244,180,79,.09);padding:13px;color:#ffe0a3;font-size:13px;line-height:1.5}@media(max-width:940px){.gnk-routing-grid{grid-template-columns:1fr 1fr}.gnk-code-head,.gnk-routing-head{display:block}.gnk-code-slide{grid-template-columns:1fr;min-height:520px}.gnk-code-stage{min-height:520px}.gnk-code-status{width:100%;margin-left:0}}@media(max-width:620px){.gnk-routing-grid,.gnk-code-metrics,.gnk-code-count{grid-template-columns:1fr}.gnk-code-slide{padding:18px;min-height:560px}.gnk-code-stage{min-height:560px}.gnk-code-head,.gnk-routing-head{padding:18px}.gnk-code-controls{padding:14px 18px}}
    `;
    document.head.appendChild(style);
  }

  function installCodeShow() {
    if (document.getElementById('gnk-index-code-show')) return;
    const hero = document.querySelector('#the-code.hero') || document.querySelector('main .hero') || document.querySelector('main');
    if (!hero) return;
    const section = document.createElement('section');
    section.id = 'gnk-index-code-show';
    section.className = 'wrap gnk-code-show';
    section.dataset.visualApproved = 'true';
    section.innerHTML = `<div class="gnk-code-panel"><div class="gnk-code-head"><div><p class="eyebrow">THE CODE front-page show</p><h2>THE CODE se vrti na naslovnici.</h2></div><p>HTML prezentacija je ugrađena u index. Puni link ostaje <a href="/the-code/">/the-code/</a>, a media prijava ostaje <a href="/media-application/?lang=en">/media-application/</a>.</p></div><div class="gnk-code-stage" aria-live="polite"><article class="gnk-code-slide is-active" data-code-slide><div class="gnk-code-copy"><small>Slide 1 · Origin</small><h3>Boulder → Zagreb → New York.</h3><p>THE CODE počinje kao arhitektura grupe i vodi prema New York aktivaciji.</p></div><div class="gnk-code-visual"><img data-visual-approved="true" src="${PNG_DINAMO}" alt="GNK DINAMO Ltd. Group logo"></div></article><article class="gnk-code-slide" data-code-slide><div class="gnk-code-copy"><small>Slide 2 · System</small><h3>Jedan kod. Više kompanija.</h3><p>Program povezuje akvizicijski proces, media workflow, financijske dokaze i operativne module.</p></div><div class="gnk-code-visual light"><img data-visual-approved="true" src="${PNG_ASG}" alt="GNK ASG d.o.o. logo"></div></article><article class="gnk-code-slide" data-code-slide><div class="gnk-code-copy"><small>Slide 3 · Evidence</small><h3>Brojke su vezane uz PDF dokaze.</h3><p>GNK ASG d.o.o. i GNK DINAMO Ltd. Group prikazani su odvojeno, s PDF poveznicama.</p></div><div class="gnk-code-visual"><div class="gnk-code-metrics"><div class="gnk-code-metric"><b>€504.0M</b><span>GNK ASG revenue 2025</span></div><div class="gnk-code-metric"><b>€4.70B</b><span>Group revenue 2025</span></div><div class="gnk-code-metric"><b>€982.5M</b><span>Group net profit</span></div><div class="gnk-code-metric"><b>PDF</b><span>evidence centre</span></div></div></div></article><article class="gnk-code-slide" data-code-slide><div class="gnk-code-copy"><small>Slide 4 · Network</small><h3>45 entiteta. 5 kontinenata.</h3><p>Javni prikaz razlikuje stvarno, planirano i u tijeku.</p></div><div class="gnk-code-visual"><div class="gnk-code-big">45 · 5<br>EARTH</div></div></article><article class="gnk-code-slide" data-code-slide><div class="gnk-code-copy"><small>Slide 5 · Media</small><h3>Redakcije ostaju na istom linku.</h3><p>Media application je stabilan ulaz za prijavu i akreditaciju.</p></div><div class="gnk-code-visual light"><img data-visual-approved="true" src="${PNG_DINAMO}" alt="GNK DINAMO Ltd. Group logo"></div></article><article class="gnk-code-slide" data-code-slide><div class="gnk-code-copy"><small>Final slide · Countdown</small><h3>Staje na odbrojavanju.</h3><p>Nakon rotacije show ostaje na zadnjoj THE CODE countdown stranici.</p></div><div class="gnk-code-visual"><div class="gnk-code-count"><div><b data-code-count="days">--</b><span>days</span></div><div><b data-code-count="hours">--</b><span>hours</span></div><div><b data-code-count="minutes">--</b><span>min</span></div><div><b data-code-count="seconds">--</b><span>sec</span></div></div></div></article></div><div class="gnk-code-progress"><i data-code-progress></i></div><div class="gnk-code-controls"><button class="gnk-code-button gold" type="button" data-code-play>▶ Pokreni THE CODE show</button><a class="gnk-code-button" href="/the-code/">Otvori puni THE CODE</a><a class="gnk-code-button" href="/media-application/?lang=en">Register newsroom</a><a class="gnk-code-button" href="/api/media-registration/memorandum.pdf">PDF memorandum</a><span class="gnk-code-status" data-code-status>Ready · HTML show</span></div></div>`;
    hero.after(section);

    const slides = [...section.querySelectorAll('[data-code-slide]')];
    const play = section.querySelector('[data-code-play]');
    const status = section.querySelector('[data-code-status]');
    const bar = section.querySelector('[data-code-progress]');
    const durations = [3600, 3900, 4200, 3900, 3900, 999999];
    let i = 0, timer = null, progressTimer = null, countdownTimer = null;
    const setSlide = next => { slides.forEach((slide, pos) => slide.classList.toggle('is-active', pos === next)); i = next; if (status) status.textContent = next === slides.length - 1 ? 'Countdown active · final slide' : `Slide ${next + 1} / ${slides.length}`; };
    const tickCountdown = () => { const diff = Math.max(0, new Date('2026-10-07T11:30:00-04:00') - new Date()); const put = (name, val) => { const el = section.querySelector(`[data-code-count="${name}"]`); if (el) el.textContent = String(Math.floor(val)).padStart(2, '0'); }; put('days', diff / 86400000); put('hours', (diff % 86400000) / 3600000); put('minutes', (diff % 3600000) / 60000); put('seconds', (diff % 60000) / 1000); };
    const animate = duration => { clearInterval(progressTimer); let elapsed = 0; if (bar) bar.style.width = '0%'; progressTimer = setInterval(() => { elapsed += 100; if (bar) bar.style.width = Math.min(100, elapsed / duration * 100) + '%'; if (elapsed >= duration) clearInterval(progressTimer); }, 100); };
    const finish = () => { clearTimeout(timer); clearInterval(progressTimer); clearInterval(countdownTimer); setSlide(slides.length - 1); tickCountdown(); countdownTimer = setInterval(tickCountdown, 1000); if (bar) bar.style.width = '100%'; if (play) { play.disabled = false; play.textContent = '↺ Ponovi THE CODE show'; } };
    const next = () => { if (i >= slides.length - 2) { finish(); return; } setSlide(i + 1); animate(durations[i]); timer = setTimeout(next, durations[i]); };
    const start = () => { clearTimeout(timer); clearInterval(progressTimer); clearInterval(countdownTimer); setSlide(0); if (play) { play.disabled = true; play.textContent = '▶ THE CODE se vrti'; } animate(durations[0]); timer = setTimeout(next, durations[0]); };
    play?.addEventListener('click', start);
    tickCountdown();
  }

  function installRouting() {
    if (document.getElementById('gnk-public-routing-v1')) return;
    const anchor = document.getElementById('workers') || document.getElementById('gnk-index-code-show') || document.querySelector('main');
    if (!anchor) return;
    const section = document.createElement('section');
    section.id = 'gnk-public-routing-v1';
    section.className = 'wrap gnk-routing';
    section.innerHTML = `<div class="gnk-routing-panel"><div class="gnk-routing-head"><div><p class="eyebrow">Worker routing & responsibility</p><h2>Šifre, uloge, projekti i javni smjerovi.</h2></div><p>Index vodi prema javnim centrima rada. Svaki smjer ima šifru workera, naziv uloge, projekt i status. Puni popis ide u javni directory; index prikazuje samo sažetak.</p></div><div class="gnk-routing-grid"><article class="gnk-routing-card"><code>GNK-WRK-HR-FIN-001</code><h3>Financijski rezultati</h3><p>Informativni prikaz FY2025 pokazatelja, povezan s PDF dokazima. Nije nova revizija, porezna prijava ni zamjena za službene izvještaje.</p><div class="gnk-routing-meta"><span>Finance Evidence</span><span>Financial & Document Center</span><span>public-workflow</span></div><a href="/financije/">Finance Cockpit</a><a href="/downloads/">PDF dokazi</a></article><article class="gnk-routing-card"><code>GNK-WRK-US-CODE-001</code><h3>THE CODE announcements</h3><p>Javne objave o THE CODE programu, New York aktivaciji, rokovima i službenim materijalima.</p><div class="gnk-routing-meta"><span>THE CODE Activation</span><span>THE CODE Intelligence</span><span>in-progress</span></div><a href="/the-code/">THE CODE</a><a href="/projects/">Projekti</a></article><article class="gnk-routing-card"><code>GNK-WRK-HR-OPS-001</code><h3>Sastanci i raspored</h3><p>Javni sažetak sastanaka, operativnih statusa i koordinacije. Privatni kalendar, tokeni i interni zadaci nisu javni.</p><div class="gnk-routing-meta"><span>Meeting Schedule</span><span>Public Operations</span><span>review</span></div><a href="/public-operations/">Public Operations</a><a href="/contact/">Kontakt</a></article><article class="gnk-routing-card"><code>GNK-WRK-HR-MEDIA-001</code><h3>Novinari i media prijave</h3><p>Prijave redakcija, akreditacije, newsroom intake i media identitet. Link ostaje isti.</p><div class="gnk-routing-meta"><span>Media Intake</span><span>Media Relations</span><span>public-workflow</span></div><a href="/media-application/?lang=en">Media application</a><a href="/media-kit/">Media Kit</a></article><article class="gnk-routing-card"><code>GNK-WRK-HR-PRESS-001</code><h3>Objave novinara i press objave</h3><p>Press materijali, javne vijesti, media announcements i odobreni novinarski kontekst.</p><div class="gnk-routing-meta"><span>Press Routing</span><span>Publications</span><span>review</span></div><a href="/objave/">Objave</a><a href="/news/">News</a></article><article class="gnk-routing-card"><code>GNK-WRK-HR-COMMENT-001</code><h3>Moje objave, komentari i analize</h3><p>Autorski komentari, javna očitovanja i analize idu odvojeno od vijesti i press materijala.</p><div class="gnk-routing-meta"><span>Executive Commentary</span><span>Editorial Routing</span><span>human-review</span></div><a href="/nermin-sefic/">Profil</a><a href="/objave/">Komentari / objave</a></article></div><div class="gnk-routing-notice"><strong>Napomena:</strong> ove šifre su javne radne uloge i workflow podjele. Ne predstavljaju popis zaposlenika. Financijski prikazi su informativni i moraju ostati vezani uz PDF dokumente i disclosure.</div></div>`;
    anchor.after(section);
  }

  function installIndex() {
    document.body?.classList.add('gnk-iq200-home');
    window.GNK_ASG_VISUAL_APPROVAL = { version: '2026-07-06-routing-v1', required: true, productionRule: 'Index uses PNG media-kit visuals and public role routing.' };
    document.querySelectorAll('#gnk-asg-premium-header,.gnk-v13-header').forEach(node => node.remove());
    installStyle();
    replaceSvgLogos();
    ensureNavLinks();
    installCodeShow();
    installRouting();
    const observer = new MutationObserver(() => { replaceSvgLogos(); ensureNavLinks(); installCodeShow(); installRouting(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
  }

  if (isIndex) {
    ready(installIndex);
    return;
  }

  const run = async () => {
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
  ready(run);
})();
