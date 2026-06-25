(() => {
  'use strict';
  if (window.__GNK_ASG_GROUP_BRAND_ROTATOR_V1__) return;
  window.__GNK_ASG_GROUP_BRAND_ROTATOR_V1__ = true;

  const route = location.pathname.replace(/\/+$/, '') || '/';
  if (!['/', '/en'].includes(route)) return;

  const english = document.documentElement.lang === 'en';
  const slides = [
    {
      id:'gnk-asg',
      src:'/assets/brand/gnk-asg-network-banner-2026.webp',
      alt: english ? 'GNK ASG global network, advanced sports and governance' : 'GNK ASG globalna mreža, napredni sport i upravljanje',
      title:'GNK ASG',
      subtitle: english ? 'Global Network · Advanced Sports & Governance' : 'Globalna mreža · Napredni sport i upravljanje'
    },
    {
      id:'gnk-dinamo',
      src:'/assets/brand/gnk-dinamo-new-york-2026.webp',
      alt: english ? 'GNK DINAMO Ltd. global business network, New York 7 October 2026' : 'GNK DINAMO Ltd. globalna poslovna mreža, New York 7.10.2026.',
      title:'GNK DINAMO Ltd.',
      subtitle:'New York · 7.10.2026.'
    }
  ];

  const ROTATION_MS = 10000;
  let current = 0;
  let timer = null;
  let paused = false;

  function injectStyle() {
    if (document.getElementById('gnk-group-brand-rotator-style')) return;
    const style = document.createElement('style');
    style.id = 'gnk-group-brand-rotator-style';
    style.textContent = `
      #gnk-group-brand-rotator{position:relative;margin-top:18px;min-height:260px;border:1px solid rgba(215,170,60,.28);border-radius:18px;overflow:hidden;background:#020b16;box-shadow:0 18px 44px rgba(0,0,0,.26),inset 0 1px 0 rgba(255,255,255,.03)}
      #gnk-group-brand-rotator .gnk-brand-slide{position:absolute;inset:0;opacity:0;transform:scale(1.025);transition:opacity .75s ease,transform 5s ease;pointer-events:none}
      #gnk-group-brand-rotator .gnk-brand-slide.is-active{opacity:1;transform:scale(1);pointer-events:auto;z-index:2}
      #gnk-group-brand-rotator picture,#gnk-group-brand-rotator img{display:block;width:100%;height:100%}
      #gnk-group-brand-rotator img{object-fit:cover;object-position:center center}
      #gnk-group-brand-rotator .gnk-brand-overlay{position:absolute;inset:auto 0 0;padding:36px 16px 14px;background:linear-gradient(180deg,transparent,rgba(2,8,18,.86));color:#fff}
      #gnk-group-brand-rotator .gnk-brand-overlay strong{display:block;font-size:13px;letter-spacing:.045em}
      #gnk-group-brand-rotator .gnk-brand-overlay span{display:block;margin-top:4px;color:#d7aa3c;font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
      #gnk-group-brand-rotator .gnk-brand-controls{position:absolute;left:50%;bottom:12px;z-index:5;display:flex;gap:7px;transform:translateX(-50%)}
      #gnk-group-brand-rotator .gnk-brand-controls button{width:8px;height:8px;padding:0;border:1px solid rgba(255,224,138,.65);border-radius:50%;background:rgba(2,8,18,.6);cursor:pointer;box-shadow:0 0 0 3px rgba(2,8,18,.45)}
      #gnk-group-brand-rotator .gnk-brand-controls button.is-active{background:#ffe08a;box-shadow:0 0 12px rgba(255,224,138,.75)}
      #gnk-group-brand-rotator .gnk-brand-progress{position:absolute;left:0;right:0;bottom:0;z-index:6;height:2px;background:rgba(255,255,255,.05)}
      #gnk-group-brand-rotator .gnk-brand-progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#2b8fe6,#d7aa3c,#31d47c)}
      #gnk-group-brand-rotator .gnk-brand-progress i.is-running{animation:gnkBrandProgress ${ROTATION_MS}ms linear forwards}
      @keyframes gnkBrandProgress{from{width:0}to{width:100%}}
      @media(max-width:760px){#gnk-group-brand-rotator{min-height:205px;border-radius:14px}#gnk-group-brand-rotator .gnk-brand-overlay{padding:30px 12px 12px}}
      @media(prefers-reduced-motion:reduce){#gnk-group-brand-rotator .gnk-brand-slide{transition:none;transform:none}#gnk-group-brand-rotator .gnk-brand-progress i{animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  function probe(src) {
    return new Promise(resolve => {
      const image = new Image();
      let done = false;
      const finish = ok => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        resolve(ok && image.naturalWidth > 300 && image.naturalHeight > 150);
      };
      const timeout = setTimeout(() => finish(false), 8000);
      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      image.src = `${src}?cb=${Date.now()}`;
    });
  }

  function addSchemas(items) {
    document.querySelectorAll('script[data-gnk-brand-banner-schema]').forEach(node => node.remove());
    items.forEach(item => {
      const schema = document.createElement('script');
      schema.type = 'application/ld+json';
      schema.dataset.gnkBrandBannerSchema = item.id;
      schema.textContent = JSON.stringify({
        '@context':'https://schema.org',
        '@type':'ImageObject',
        name:item.title,
        description:item.subtitle,
        contentUrl:`https://gnk-asg.hr${item.src}`,
        thumbnailUrl:`https://gnk-asg.hr${item.src}`,
        creator:{'@type':'Person',name:'Nermin Sefić'},
        copyrightHolder:{'@type':'Organization',name:item.id === 'gnk-asg' ? 'GNK ASG d.o.o.' : 'GNK DINAMO Ltd.'},
        creditText:'GNK ASG Visual Index',
        keywords:item.id === 'gnk-asg' ? 'GNK ASG, GNK ASG d.o.o., Nermin Sefić, global network, advanced sports, governance' : 'GNK DINAMO Ltd., Nermin Sefić, New York, 7.10.2026, global business network'
      });
      document.body.appendChild(schema);
    });
  }

  function setActive(index, restart = true) {
    const root = document.getElementById('gnk-group-brand-rotator');
    if (!root) return;
    const slideNodes = [...root.querySelectorAll('.gnk-brand-slide')];
    const dotNodes = [...root.querySelectorAll('.gnk-brand-controls button')];
    current = ((index % slideNodes.length) + slideNodes.length) % slideNodes.length;
    slideNodes.forEach((node, position) => {
      const active = position === current;
      node.classList.toggle('is-active', active);
      node.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    dotNodes.forEach((node, position) => {
      node.classList.toggle('is-active', position === current);
      node.setAttribute('aria-current', position === current ? 'true' : 'false');
    });
    const progress = root.querySelector('.gnk-brand-progress i');
    if (progress) {
      progress.classList.remove('is-running');
      void progress.offsetWidth;
      if (!paused) progress.classList.add('is-running');
    }
    if (restart) restartTimer();
  }

  function restartTimer() {
    clearInterval(timer);
    if (paused) return;
    timer = setInterval(() => setActive(current + 1, false), ROTATION_MS);
  }

  function mount(items) {
    const host = document.querySelector('#mreza-grupe .locations');
    const list = host?.querySelector('#locationList');
    if (!host || !list || !items.length) return;
    document.getElementById('gnk-group-brand-rotator')?.remove();

    const root = document.createElement('section');
    root.id = 'gnk-group-brand-rotator';
    root.setAttribute('aria-label', english ? 'GNK ASG and GNK DINAMO Ltd. brand presentation' : 'Brand prezentacija GNK ASG i GNK DINAMO Ltd.');
    root.innerHTML = `
      ${items.map((item,index) => `<figure class="gnk-brand-slide${index===0?' is-active':''}" data-brand="${item.id}" aria-hidden="${index===0?'false':'true'}"><img src="${item.src}" alt="${item.alt}" loading="eager" decoding="async"><figcaption class="gnk-brand-overlay"><strong>${item.title}</strong><span>${item.subtitle}</span></figcaption></figure>`).join('')}
      <div class="gnk-brand-controls" aria-label="${english?'Select image':'Odaberi sliku'}">${items.map((item,index) => `<button type="button" class="${index===0?'is-active':''}" data-index="${index}" aria-label="${item.title}" aria-current="${index===0?'true':'false'}"></button>`).join('')}</div>
      <div class="gnk-brand-progress" aria-hidden="true"><i></i></div>`;
    list.after(root);

    root.querySelectorAll('.gnk-brand-controls button').forEach(button => button.addEventListener('click', () => setActive(Number(button.dataset.index || 0))));
    root.addEventListener('mouseenter', () => { paused = true; clearInterval(timer); root.querySelector('.gnk-brand-progress i')?.classList.remove('is-running'); });
    root.addEventListener('mouseleave', () => { paused = document.hidden; setActive(current); });
    root.addEventListener('focusin', () => { paused = true; clearInterval(timer); });
    root.addEventListener('focusout', () => { paused = document.hidden; setActive(current); });
    addSchemas(items);
    setActive(0);
  }

  async function boot() {
    injectStyle();
    if (document.getElementById('gnk-group-brand-rotator')) return;
    const checks = await Promise.all(slides.map(async item => ({item,ok:await probe(item.src)})));
    const available = checks.filter(row => row.ok).map(row => row.item);
    mount(available);
  }

  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (!paused) setActive(current);
    else clearInterval(timer);
  });
  window.addEventListener('pagehide', () => clearInterval(timer), {once:true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  [600,1800,4000].forEach(delay => setTimeout(boot,delay));
})();
