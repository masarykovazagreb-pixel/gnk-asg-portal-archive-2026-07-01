(() => {
  'use strict';
  if (window.__GNK_ASG_GALLERY_BRAND_SAFETY__) return;
  window.__GNK_ASG_GALLERY_BRAND_SAFETY__ = true;

  const route = location.pathname.replace(/\/+$/, '') || '/';

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
        .gnk-code-feature__inner{position:relative;z-index:1;max-width:940px}
        .gnk-code-feature .eyebrow{color:#e4c98f}
        .gnk-code-feature h2{max-width:900px;margin:8px 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:clamp(32px,5vw,60px);line-height:1.02;color:#fff}
        .gnk-code-feature p{max-width:850px;margin:0;color:#d8e4f4;font-size:17px;line-height:1.65}
        .gnk-code-feature__statement{margin-top:18px;color:#e4c98f!important;font-weight:800;letter-spacing:.02em}
        .gnk-code-feature .actions{margin-top:25px}
        .gnk-code-feature .btn{position:relative;z-index:2}
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

  if (route === '/' || route === '/en') {
    const startIndex = () => {
      installIndexLogoGuard();
      installCodePlayFix();
      installCodeHomepageFeature();
      [300,900,1800].forEach(delay => setTimeout(installCodeHomepageFeature, delay));
    };
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded',startIndex,{once:true})
      : startIndex();
    window.GNK_ASG_BRAND_SAFETY = {
      version: '2026-07-02-index-code-interactive-feature',
      prohibited: () => false,
      check: () => {}
    };
    return;
  }

  const norm = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  function signature(node) {
    if (!node) return '';
    return norm([
      node.getAttribute?.('src'), node.getAttribute?.('srcset'), node.currentSrc,
      node.getAttribute?.('alt'), node.getAttribute?.('title'),
      node.getAttribute?.('aria-label'), node.id, node.className,
      node.getAttribute?.('style')
    ].filter(Boolean).join(' '));
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

  window.GNK_ASG_BRAND_SAFETY = { version:'2026-06-26-v2', prohibited, check };

  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === 1) check(node);
    }));
  });

  const start = () => {
    check(document);
    observer.observe(document.documentElement,{childList:true,subtree:true});
  };

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded',start,{once:true})
    : start();
})();
