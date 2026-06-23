(() => {
  'use strict';

  const normalise = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const isEnglish = () => /\/en(?:\/|$)/.test(location.pathname);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));

  function isInstallDuplicate(link) {
    const text = normalise(link.textContent);
    const href = normalise(link.getAttribute('href'));
    const key = normalise(link.dataset.key || link.getAttribute('data-nav-key'));
    return key === 'install' ||
      ['install', 'install app', 'instaliraj', 'instaliraj aplikaciju'].includes(text) ||
      ['/instalacija/', '/install/', 'instalacija/', 'install/'].includes(href);
  }

  function isAutoEditor(link) {
    const text = normalise(link.textContent);
    const href = normalise(link.getAttribute('href'));
    const key = normalise(link.dataset.key || link.getAttribute('data-nav-key'));
    return key === 'auto-editor' || key === 'autoeditor' || text === 'auto editor' || href.includes('/auto-editor');
  }

  function isMediaKit(link) {
    const text = normalise(link.textContent);
    const href = normalise(link.getAttribute('href'));
    const key = normalise(link.dataset.key || link.getAttribute('data-nav-key'));
    return key === 'media' || key === 'media-kit' || text === 'media kit' || href.includes('/media-kit');
  }

  function injectPanelStyles() {
    if (document.getElementById('gnk-index-panel-style')) return;
    const style = document.createElement('style');
    style.id = 'gnk-index-panel-style';
    style.textContent = `
      #gnk-index-panel{position:fixed;inset:0;z-index:2147483000;display:none;align-items:flex-start;justify-content:center;padding:24px;background:rgba(1,6,14,.88);backdrop-filter:blur(14px);overflow:auto}
      #gnk-index-panel.open{display:flex}
      .gnk-index-panel-card{width:min(1120px,100%);margin:auto;background:linear-gradient(145deg,#0d2341,#050e1c);border:1px solid rgba(212,175,55,.48);border-radius:26px;box-shadow:0 30px 100px rgba(0,0,0,.62);color:#f7f9fc;overflow:hidden}
      .gnk-index-panel-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:14px;padding:18px 20px;background:rgba(4,13,26,.97);border-bottom:1px solid rgba(212,175,55,.28)}
      .gnk-index-panel-title{margin:0;font:700 clamp(1.8rem,5vw,3rem)/1 Georgia,serif;color:#fff}
      .gnk-index-panel-close{margin-left:auto;width:42px;height:42px;border-radius:50%;border:1px solid #d4af37;background:#071b36;color:#fff;font-size:23px;cursor:pointer}
      .gnk-index-panel-body{padding:22px}
      .gnk-index-panel-intro,.gnk-index-panel-status{color:#c2cede;line-height:1.65}
      .gnk-index-panel-actions{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}
      .gnk-index-panel-button{display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;border:1px solid #d4af37;border-radius:999px;background:#0a2b59;color:#fff;text-decoration:none;font-size:12px;font-weight:900;text-transform:uppercase;cursor:pointer}
      .gnk-index-panel-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:15px;margin-top:16px}
      .gnk-index-panel-item{padding:18px;border:1px solid rgba(212,175,55,.25);border-radius:19px;background:rgba(255,255,255,.035)}
      .gnk-index-panel-item h3{margin:0 0 10px;font:700 1.45rem/1.15 Georgia,serif;color:#fff}
      .gnk-index-panel-item p,.gnk-index-panel-item li{color:#c2cede;line-height:1.6}
      .gnk-index-panel-meta{color:#d4af37;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
      .gnk-index-panel-item details{margin-top:12px;padding-top:12px;border-top:1px solid rgba(212,175,55,.18)}
      .gnk-index-panel-item summary{color:#f2d36c;font-weight:900;cursor:pointer}
      body.gnk-index-panel-lock{overflow:hidden!important}
      @media(max-width:700px){#gnk-index-panel{padding:10px}.gnk-index-panel-card{border-radius:18px}.gnk-index-panel-head,.gnk-index-panel-body{padding:16px}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    injectPanelStyles();
    let panel = document.getElementById('gnk-index-panel');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'gnk-index-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.innerHTML = '<section class="gnk-index-panel-card"><header class="gnk-index-panel-head"><h2 class="gnk-index-panel-title"></h2><button class="gnk-index-panel-close" type="button" aria-label="Zatvori">×</button></header><div class="gnk-index-panel-body"></div></section>';
    panel.addEventListener('click', event => {
      if (event.target === panel || event.target.closest('.gnk-index-panel-close')) closePanel();
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closePanel(); });
    document.body.appendChild(panel);
    return panel;
  }

  function openPanel(title, html) {
    const panel = ensurePanel();
    panel.querySelector('.gnk-index-panel-title').textContent = title;
    panel.querySelector('.gnk-index-panel-body').innerHTML = html;
    panel.classList.add('open');
    document.body.classList.add('gnk-index-panel-lock');
    panel.querySelector('.gnk-index-panel-close').focus();
    return panel;
  }

  function closePanel() {
    const panel = document.getElementById('gnk-index-panel');
    if (panel) panel.classList.remove('open');
    document.body.classList.remove('gnk-index-panel-lock');
  }

  function renderMediaKit() {
    const en = isEnglish();
    const copy = en ? {
      title: 'Media Kit', intro: 'Official corporate facts, visual resources and media contact links for GNK ASG d.o.o. and GNK DINAMO Ltd.',
      visual: 'Open Visual Index', contact: 'Media contact', publications: 'Publications', company: 'GNK ASG d.o.o.', parent: 'GNK DINAMO Ltd.', resources: 'Visual resources', inquiries: 'Media inquiries'
    } : {
      title: 'Media Kit', intro: 'Službeni korporativni podatci, vizualni materijali i poveznice za medijske upite za GNK ASG d.o.o. i GNK DINAMO Ltd.',
      visual: 'Otvori Visual Index', contact: 'Kontakt za medije', publications: 'Objave', company: 'GNK ASG d.o.o.', parent: 'GNK DINAMO Ltd.', resources: 'Vizualni materijali', inquiries: 'Medijski upiti'
    };
    openPanel(copy.title, `
      <p class="gnk-index-panel-intro">${copy.intro}</p>
      <div class="gnk-index-panel-actions"><a class="gnk-index-panel-button" href="/visual-index/">${copy.visual}</a><a class="gnk-index-panel-button" href="${en ? '/en/contact/' : '/contact/'}">${copy.contact}</a><a class="gnk-index-panel-button" href="${en ? '/publications/' : '/objave/'}">${copy.publications}</a></div>
      <div class="gnk-index-panel-grid">
        <article class="gnk-index-panel-item"><h3>${copy.company}</h3><p>Zagrebačka cesta 130, Zagreb</p><p>OIB: 75227917632<br>MBS: 081512375<br>Direktor: Nermin Sefić</p></article>
        <article class="gnk-index-panel-item"><h3>${copy.parent}</h3><p>Boulder, Colorado, USA</p><p>Entity ID: 20238180649</p></article>
        <article class="gnk-index-panel-item"><h3>${copy.resources}</h3><p>${en ? 'Corporate marks, photographs and approved portal visuals are available through the Visual Index.' : 'Korporativne oznake, fotografije i odobreni vizuali portala dostupni su kroz Visual Index.'}</p></article>
        <article class="gnk-index-panel-item"><h3>${copy.inquiries}</h3><p>${en ? 'Use the public contact form for statements, fact checks or permission to use protected materials.' : 'Za izjave, provjeru činjenica ili dopuštenje za uporabu zaštićenih materijala koristite javnu kontaktnu formu.'}</p></article>
      </div>`);
  }

  async function renderAutoEditor() {
    const en = isEnglish();
    const copy = en ? {
      title: 'Auto Editor', intro: 'Public overview of content available in the structured GNK ASG Auto Editor feed.', loading: 'Loading Auto Editor feed…', empty: 'No Auto Editor entries are currently available.', open: 'Read full entry', error: 'The Auto Editor feed is currently unavailable.'
    } : {
      title: 'Auto Editor', intro: 'Javni pregled sadržaja dostupnog u strukturiranom GNK ASG Auto Editor feedu.', loading: 'Učitavanje Auto Editor feeda…', empty: 'Trenutačno nema dostupnih Auto Editor zapisa.', open: 'Pročitaj cijeli zapis', error: 'Auto Editor feed trenutačno nije dostupan.'
    };
    const panel = openPanel(copy.title, `<p class="gnk-index-panel-intro">${copy.intro}</p><p class="gnk-index-panel-status">${copy.loading}</p><div class="gnk-index-panel-grid"></div>`);
    const status = panel.querySelector('.gnk-index-panel-status');
    const grid = panel.querySelector('.gnk-index-panel-grid');
    try {
      const response = await fetch(`/data/auto-editor.json?cb=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const items = Array.isArray(payload) ? payload : (payload.articles || payload.items || []);
      status.textContent = en ? `Loaded ${items.length} entries.` : `Učitano zapisa: ${items.length}.`;
      grid.innerHTML = items.length ? items.map(item => {
        const body = (Array.isArray(item.body) ? item.body : String(item.body || '').split(/\n{2,}/)).filter(Boolean).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('');
        return `<article class="gnk-index-panel-item"><div class="gnk-index-panel-meta">${escapeHtml(item.slot || '')} ${item.entity || item.focus ? `· ${escapeHtml(item.entity || item.focus)}` : ''}</div><h3>${escapeHtml(item.title || item.titleHr || 'Auto Editor')}</h3><p>${escapeHtml(item.excerpt || item.summary || '')}</p><details><summary>${copy.open}</summary>${body}</details></article>`;
      }).join('') : `<article class="gnk-index-panel-item"><p>${copy.empty}</p></article>`;
    } catch (error) {
      status.textContent = `${copy.error} ${error.message}`;
      grid.innerHTML = '<article class="gnk-index-panel-item"><a class="gnk-index-panel-button" href="/data/auto-editor.json" target="_blank" rel="noopener">JSON feed</a></article>';
    }
  }

  function repairMenu() {
    const selectors = [
      '#gnk-asg-premium-menu a', '#gnk-asg-drawer-menu a', '.gnk-asg-final-menu a',
      '.gnk-asg-full-menu-v2 a', '.gnk-asg-rescue-menu a', 'a[href*="auto-editor"]', 'a[href*="media-kit"]'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(link => {
      if (isInstallDuplicate(link)) {
        link.remove();
        return;
      }
      if (isAutoEditor(link)) {
        link.href = '#auto-editor';
        link.textContent = 'Auto Editor';
        link.dataset.gnkPanel = 'auto-editor';
      } else if (isMediaKit(link)) {
        link.href = '#media-kit';
        link.textContent = 'Media Kit';
        link.dataset.gnkPanel = 'media-kit';
      }
    });
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-gnk-panel]');
    if (!link) return;
    event.preventDefault();
    if (link.dataset.gnkPanel === 'auto-editor') renderAutoEditor();
    if (link.dataset.gnkPanel === 'media-kit') renderMediaKit();
  });

  let scheduled = false;
  function scheduleRepair() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; repairMenu(); });
  }

  repairMenu();
  document.addEventListener('DOMContentLoaded', repairMenu, { once: true });
  window.addEventListener('load', repairMenu, { once: true });
  new MutationObserver(scheduleRepair).observe(document.documentElement, { childList: true, subtree: true });
  [250, 700, 1400, 2800].forEach(delay => setTimeout(repairMenu, delay));
})();
