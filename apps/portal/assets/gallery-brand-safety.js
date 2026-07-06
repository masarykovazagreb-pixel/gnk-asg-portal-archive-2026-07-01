(() => {
  'use strict';
  if (window.__GNK_ASG_GALLERY_BRAND_SAFETY__) return;
  window.__GNK_ASG_GALLERY_BRAND_SAFETY__ = true;

  const route = location.pathname.replace(/\/+$/, '') || '/';
  const isHr = (document.documentElement.lang || '').toLowerCase().startsWith('hr');

  function installIndexLogoGuard() {
    document.addEventListener('click', event => {
      const brand = event.target.closest?.('.brand-unit.right,.brand-unit.right *');
      if (!brand) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const top = document.getElementById('top');
      if (top) top.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, true);
  }

  function installCanonicalIndexLogos() {
    if (!document.getElementById('gnk-canonical-index-brand-style')) {
      const style = document.createElement('style');
      style.id = 'gnk-canonical-index-brand-style';
      style.textContent = `
        .brand-head .brand-logo{width:64px;height:64px;object-fit:contain;border-radius:12px;filter:drop-shadow(0 14px 28px rgba(0,0,0,.34))}
        .brand-head .state-pill.warn{border-color:rgba(255,216,117,.36);color:#ffd875}
        @media(max-width:860px){.brand-head .brand-logo{width:54px;height:54px}}
      `;
      document.head.appendChild(style);
    }

    const units = [...document.querySelectorAll('.brand-head .brand-unit')];
    const sources = [
      ['/assets/brand/official-gnk-asg-gold.svg','GNK ASG d.o.o.'],
      ['/assets/brand/official-gnk-dinamo-ltd-group-gold.svg','GNK DINAMO Ltd. Group']
    ];

    units.slice(0,2).forEach((unit,index) => {
      const [src,alt] = sources[index];
      let image = unit.querySelector('img.brand-logo');
      if (!image) {
        image = document.createElement('img');
        image.className = 'brand-logo';
        const legacy = unit.querySelector('svg.brand-mark,img.brand-mark');
        if (legacy) legacy.replaceWith(image);
        else unit.prepend(image);
      }
      image.src = src;
      image.alt = alt;
      image.width = 64;
      image.height = 64;
      image.decoding = 'async';
    });

    const rightCopy = document.querySelector('.brand-unit.right .brand-copy');
    if (rightCopy) {
      const strong = rightCopy.querySelector('strong');
      const span = rightCopy.querySelector('span');
      if (strong) strong.textContent = 'GNK DINAMO Ltd. Group';
      if (span) span.textContent = 'Enterprise Digital Platform';
    }

    const pills = [...document.querySelectorAll('.system-state .state-pill')];
    if (pills.length) {
      const review = pills[pills.length - 1];
      review.textContent = isHr ? 'Review grana' : 'Review branch';
      review.classList.add('warn');
    }
  }

  function installCodePlayFix() {
    if (document.querySelector('script[data-code-play-fix-v12]')) return;
    const script = document.createElement('script');
    script.src = '/assets/index-code-play-fix-v12.js?v=20260627-v12';
    script.defer = true;
    script.dataset.codePlayFixV12 = '';
    document.head.appendChild(script);
  }

  function installCodeHomepageFeature() {
    if (document.querySelector('[data-the-code-home-feature]')) return;
    const hero = document.querySelector('.hero');
    if (!hero) return;

    if (!document.getElementById('gnk-the-code-home-feature-style')) {
      const style = document.createElement('style');
      style.id = 'gnk-the-code-home-feature-style';
      style.textContent = `
        .gnk-code-feature{position:relative;overflow:hidden;margin:24px auto 0;padding:42px;border:1px solid rgba(210,173,100,.72);border-radius:22px;background:radial-gradient(circle at 88% 10%,rgba(42,91,143,.72),transparent 38%),linear-gradient(135deg,#030b18,#0b2445);color:#fff;box-shadow:0 24px 70px rgba(2,8,18,.25)}
        .gnk-code-feature:after{content:"";position:absolute;right:-90px;top:-140px;width:420px;height:420px;border:1px solid rgba(210,173,100,.25);border-radius:50%;box-shadow:0 0 0 42px rgba(210,173,100,.05),0 0 0 88px rgba(210,173,100,.035);pointer-events:none}
        .gnk-code-feature__inner{position:relative;z-index:1;max-width:940px}.gnk-code-feature .eyebrow{color:#e4c98f}.gnk-code-feature h2{max-width:900px;margin:8px 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:clamp(32px,5vw,60px);line-height:1.02;color:#fff}.gnk-code-feature p{max-width:850px;margin:0;color:#d8e4f4;font-size:17px;line-height:1.65}.gnk-code-feature__statement{margin-top:18px!important;color:#e4c98f!important;font-weight:800;letter-spacing:.02em}.gnk-code-feature .actions{margin-top:25px}.gnk-code-feature .btn{position:relative;z-index:2}
        @media(max-width:720px){.gnk-code-feature{margin:16px 10px 0;padding:28px 20px}.gnk-code-feature .actions{display:grid}.gnk-code-feature .btn{width:100%}}
      `;
      document.head.appendChild(style);
    }

    const section = document.createElement('section');
    section.className = 'section gnk-code-feature';
    section.dataset.theCodeHomeFeature = 'GNK_THE_CODE_HOME_FEATURE_20260702';
    section.setAttribute('aria-labelledby','gnk-code-feature-title');
    section.innerHTML = `
      <div class="gnk-code-feature__inner">
        <p class="eyebrow">THE CODE · NEW YORK · 7 OCTOBER 2026</p>
        <h2 id="gnk-code-feature-title">NOT AN EVENT. NOT A PRESENTATION. NOT ONE ACQUISITION.</h2>
        <p>A business architecture developed across decades is leaving secrecy and entering its public and operational phase. Multiple companies, markets, technologies and operating structures. One code. One activation.</p>
        <p class="gnk-code-feature__statement">WE ARE IN YOUR CAR. IN YOUR HOME. ON YOUR ROAD. HERE ON EARTH — WITH YOU.</p>
        <div class="actions">
          <a class="btn gold" href="/the-code/media-invitation/" target="_blank" rel="noopener">OPEN THE INTERACTIVE INVITATION</a>
          <a class="btn" href="/media-application/?lang=en" target="_blank" rel="noopener">REGISTER NEWSROOM</a>
          <a class="btn" href="/api/media-registration/memorandum.pdf" target="_blank" rel="noopener">OPEN MEMORANDUM</a>
        </div>
      </div>`;
    hero.insertAdjacentElement('afterend', section);
  }

  function installRecoveryAccess() {
    if (document.querySelector('[data-recovery-access]')) return;
    const hero = document.querySelector('[data-the-code-home-feature]') || document.querySelector('.hero');
    if (!hero) return;

    if (!document.getElementById('gnk-recovery-access-style')) {
      const style = document.createElement('style');
      style.id = 'gnk-recovery-access-style';
      style.textContent = `.gnk-recovery-access{margin:22px auto;padding:30px;border:1px solid rgba(255,216,117,.28);border-radius:22px;background:linear-gradient(135deg,rgba(255,216,117,.11),rgba(4,14,29,.92));color:#fff}.gnk-recovery-access__head{display:flex;justify-content:space-between;gap:18px;align-items:end;margin-bottom:18px}.gnk-recovery-access h2{margin:.25rem 0;color:#fff;font-size:clamp(28px,4vw,46px)}.gnk-recovery-access p{color:#c8d5e7;max-width:820px}.gnk-recovery-pill{border:1px solid rgba(255,216,117,.34);border-radius:999px;padding:8px 12px;color:#ffd875;font-size:12px;font-weight:900;white-space:nowrap}.gnk-recovery-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.gnk-recovery-card{display:block;min-height:125px;padding:17px;border:1px solid rgba(255,255,255,.12);border-radius:17px;background:rgba(255,255,255,.045);color:#fff;text-decoration:none}.gnk-recovery-card:hover,.gnk-recovery-card:focus{border-color:#ffd875;transform:translateY(-2px)}.gnk-recovery-card b{display:block;color:#ffd875;margin-bottom:7px}.gnk-recovery-card small{display:block;color:#c8d5e7;line-height:1.45}.gnk-recovery-note{margin-top:16px;padding:13px;border-left:4px solid #ffd875;background:rgba(0,0,0,.22);color:#e8eef7;font-size:13px}@media(max-width:900px){.gnk-recovery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.gnk-recovery-access__head{align-items:flex-start;flex-direction:column}}@media(max-width:560px){.gnk-recovery-grid{grid-template-columns:1fr}.gnk-recovery-access{margin:16px 10px;padding:22px 17px}}`;
      document.head.appendChild(style);
    }

    const copy = isHr ? {
      eyebrow:'RECOVERY PREVIEW · VIDLJIVI MODULI', title:'Portal više ne smije skrivati ono što postoji.', lead:'Izravni ulazi u javne podatke i zaštićene Enterprise module. Brojke su označene kao review podaci dok runtime i browser testovi ne potvrde operativno stanje.', review:'REVIEW-ONLY', note:'Produkcija, DNS, tajne i slanje poruka ostaju zaključani. Zaštićene rute moraju tražiti prijavu.',
      cards:[['Projektni centar','19 projektnih zapisa · zaštićeni pregled','/enterprise/project-center/'],['Digital Workforce','1.537 generiranih operativnih profila','/digital-workforce/directory/'],['Objave','Odobreni tekstovi i javni arhiv','/objave/'],['Vijesti','Javni news dataset i kartice','/vijesti/'],['Dokumenti','Odobreni dokumenti i preuzimanja','/downloads/'],['Enterprise','Zaštićeni operativni portal','/enterprise/'],['Media Kit','Press materijali i službeni resursi','/media-kit/'],['Brand pregled','Službeni logotipi na review površini','/brand-review/']]
    } : {
      eyebrow:'RECOVERY PREVIEW · VISIBLE MODULES', title:'The portal must no longer hide what already exists.', lead:'Direct access to public data and protected Enterprise modules. Counts remain review-labelled until runtime and browser tests prove operational state.', review:'REVIEW-ONLY', note:'Production, DNS, secrets and message delivery remain locked. Protected routes must require authentication.',
      cards:[['Project Center','19 portfolio records · protected review','/enterprise/project-center/'],['Digital Workforce','1,537 generated operational profiles','/digital-workforce/directory/'],['Publications','Approved texts and public archive','/publications/'],['News','Public news dataset and cards','/news/'],['Documents','Approved documents and downloads','/downloads/'],['Enterprise','Protected operating portal','/enterprise/'],['Media Kit','Press materials and official resources','/media-kit/'],['Brand review','Official logos on a review surface','/brand-review/']]
    };

    const section = document.createElement('section');
    section.className = 'section gnk-recovery-access';
    section.dataset.recoveryAccess = 'GNK_RECOVERY_ACCESS_20260706';
    section.innerHTML = `<div class="gnk-recovery-access__head"><div><p class="eyebrow">${copy.eyebrow}</p><h2>${copy.title}</h2><p>${copy.lead}</p></div><span class="gnk-recovery-pill">${copy.review}</span></div><div class="gnk-recovery-grid">${copy.cards.map(([title,description,href]) => `<a class="gnk-recovery-card" href="${href}"><b>${title}</b><small>${description}</small></a>`).join('')}</div><div class="gnk-recovery-note">${copy.note}</div>`;
    hero.insertAdjacentElement('afterend', section);
  }

  function fixPublicationCounters() {
    const grid = document.querySelector('.grid[aria-label="Objave"],.grid[aria-label="Publications"]');
    if (!grid) return;
    const count = grid.querySelectorAll('article.card').length;
    const firstStat = document.querySelector('.stats .stat strong');
    if (firstStat && count > 0) firstStat.textContent = String(count);
  }

  function installNewsRuntime() {
    const grid = document.getElementById('newsGrid');
    if (!grid || grid.dataset.recoveryRuntime === '1') return;
    grid.dataset.recoveryRuntime = '1';

    if (!document.getElementById('gnk-news-runtime-recovery-style')) {
      const style = document.createElement('style');
      style.id = 'gnk-news-runtime-recovery-style';
      style.textContent = `.news-card{display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:20px;background:rgba(255,255,255,.045);color:inherit;text-decoration:none}.news-card img{width:100%;aspect-ratio:16/10;object-fit:cover;background:#101827}.news-card__body{padding:17px}.news-card small{display:block;margin-bottom:8px;opacity:.78}.news-card h2{font-size:1.08rem;line-height:1.25;margin:.1rem 0 .55rem}.news-card p{font-size:.92rem;line-height:1.5;opacity:.86}.news-card__open{margin-top:auto;color:#d6ae5c;font-weight:800}.news-status strong{color:#d6ae5c}`;
      document.head.appendChild(style);
    }

    const status = document.getElementById('newsStatus');
    const esc = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const formatDate = value => {
      try { return new Intl.DateTimeFormat(isHr ? 'hr-HR' : 'en-GB', { dateStyle:'medium', timeStyle:'short' }).format(new Date(value)); }
      catch (_) { return value || ''; }
    };
    const render = items => {
      const usable = items.filter(item => item && item.title && item.url && item.summary && item.source).slice(0,12);
      if (!usable.length) {
        grid.innerHTML = `<article class="news-card"><div class="news-card__body"><h2>${isHr ? 'Nema potvrđenih vijesti za prikaz.' : 'No verified news available for display.'}</h2><p>${isHr ? 'Dataset nije prazan uvjet za modul: treba stvarni izvor, naslov, sažetak i URL.' : 'A non-empty dataset is not enough: the module requires a real source, title, summary and URL.'}</p></div></article>`;
        if (status) status.textContent = isHr ? '0 provjerenih vijesti' : '0 verified news';
        return;
      }
      grid.innerHTML = usable.map(item => `<a class="news-card" href="${esc(item.url)}" target="_blank" rel="noopener"><img src="${esc(item.image || '/assets/gnk-asg-social-card.png')}" alt="${esc(item.title)}" loading="lazy" decoding="async"><div class="news-card__body"><small>${esc(item.source)} · ${esc(item.category || item.region || 'News')} · ${esc(formatDate(item.published_at || item.publishedAt))}</small><h2>${esc(item.title)}</h2><p>${esc(item.summary).slice(0,220)}${String(item.summary).length > 220 ? '…' : ''}</p><span class="news-card__open">${isHr ? 'Otvori izvor →' : 'Open source →'}</span></div></a>`).join('');
      if (status) status.innerHTML = isHr ? `Prikazano <strong>${usable.length}</strong> provjerenih vijesti iz javnog dataseta.` : `Showing <strong>${usable.length}</strong> verified news items from the public dataset.`;
    };

    fetch('/data/news.json?recovery=20260706', { cache:'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error(`HTTP_${response.status}`)))
      .then(payload => render(Array.isArray(payload) ? payload : (payload.items || [])))
      .catch(() => { if (status) status.textContent = isHr ? 'Vijesti se ne mogu učitati u ovom previewu.' : 'News cannot be loaded in this preview.'; });
  }

  if (route === '/' || route === '/en') {
    const startIndex = () => {
      installIndexLogoGuard();
      installCanonicalIndexLogos();
      installCodePlayFix();
      installCodeHomepageFeature();
      installRecoveryAccess();
      [300,900,1800].forEach(delay => setTimeout(() => { installCanonicalIndexLogos(); installCodeHomepageFeature(); installRecoveryAccess(); }, delay));
    };
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded',startIndex,{once:true}) : startIndex();
    window.GNK_ASG_BRAND_SAFETY = { version: '2026-07-06-recovery-index-brand-and-access', prohibited: () => false, check: () => {} };
    return;
  }

  if (route === '/news' || route === '/vijesti') {
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded',installNewsRuntime,{once:true}) : installNewsRuntime();
  }

  if (route === '/publications' || route === '/objave') {
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded',fixPublicationCounters,{once:true}) : fixPublicationCounters();
  }

  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

  function signature(node) {
    if (!node) return '';
    return norm([node.getAttribute?.('src'), node.getAttribute?.('srcset'), node.currentSrc, node.getAttribute?.('alt'), node.getAttribute?.('title'), node.getAttribute?.('aria-label'), node.id, node.className, node.getAttribute?.('style')].filter(Boolean).join(' '));
  }

  function prohibited(valueOrNode) {
    const value = typeof valueOrNode === 'string' ? norm(valueOrNode) : signature(valueOrNode);
    if (!value.includes('dinamo')) return false;
    const company = /\b(gnk dinamo ltd|dinamo ltd|colorado|boulder|corporate|company|business|poslovn)\b/.test(value);
    const footballClub = /\b(dinamo zagreb|gnk dinamo zagreb|nk dinamo|football club|nogometni klub|maksimir|stadion maksimir)\b/.test(value);
    const emblem = /\b(logo|grb|crest|badge|emblem|shield|club mark|club logo|klupski znak)\b/.test(value);
    return footballClub || (emblem && !company);
  }

  function check(root = document) {
    root.querySelectorAll?.('img,source').forEach(node => {
      if (!prohibited(node)) return;
      const wrapper = node.closest?.('.gnk-gallery-auto-image,.image-link,figure,picture');
      node.hidden = true;
      node.removeAttribute('src');
      node.removeAttribute('srcset');
      if (wrapper) wrapper.hidden = true;
    });

    root.querySelectorAll?.('[style*="background"],[data-image],[data-background]').forEach(node => {
      const value = [node.getAttribute('style'),node.getAttribute('data-image'),node.getAttribute('data-background'),node.getAttribute('title'),node.getAttribute('aria-label')].filter(Boolean).join(' ');
      if (!prohibited(value)) return;
      node.style.removeProperty('background-image');
      node.removeAttribute('data-image');
      node.removeAttribute('data-background');
    });
  }

  window.GNK_ASG_BRAND_SAFETY = { version:'2026-07-06-v5-recovery-public-runtime-ci-restored', prohibited, check };

  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === 1) check(node); }));
  });

  const start = () => { check(document); observer.observe(document.documentElement,{childList:true,subtree:true}); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded',start,{once:true}) : start();
})();
