(() => {
  if (window.__GNK_ASG_PORTAL_UI_REPAIR_V1__) return;
  window.__GNK_ASG_PORTAL_UI_REPAIR_V1__ = true;

  const path = location.pathname.toLowerCase();
  const isEn = path.startsWith('/en/') || path.startsWith('/news/') || path.startsWith('/markets/') || path.startsWith('/publications/');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const q = id => document.getElementById(id);

  function markPage() {
    if (/\/platforme\/bpp\/|\/platforms\/bpp\//.test(path)) document.body.classList.add('gnk-page-bpp');
    if (/^\/(objave|publications)\//.test(path)) document.body.classList.add('gnk-page-publications');
    if (/^\/(vijesti|news)\//.test(path)) document.body.classList.add('gnk-page-news');
    if (path.startsWith('/mail-studio-pro/')) document.body.classList.add('gnk-page-mail');
    if (path.startsWith('/mail-studio-pro/campaign/')) document.body.classList.add('gnk-page-campaign');
  }

  function linkPath(anchor) {
    try { return new URL(anchor.href, location.origin).pathname.replace(/\/+$/, '/') || '/'; }
    catch { return ''; }
  }

  function removeDuplicateAppItem() {
    document.querySelectorAll('#gnk-asg-premium-menu,#gnk-asg-drawer-menu,.gnk-asg-final-menu,nav').forEach(nav => {
      const appLinks = [...nav.querySelectorAll('a')].filter(link => linkPath(link) === '/app/');
      const installExists = [...nav.querySelectorAll('a,button')].some(node => /instal|install/i.test(String(node.textContent || '')));
      if (installExists) appLinks.forEach(link => link.remove());
      else if (appLinks.length > 1) appLinks.slice(1).forEach(link => link.remove());
    });
  }

  function ensureFloats() {
    const hasHome = q('gnk-asg-float-home') || document.querySelector('.gnk-global-float-home,.gnk-functional-fallback-home');
    const hasAi = q('gnk-asg-float-ai') || document.querySelector('.gnk-global-float-ai,.gnk-functional-fallback-ai');
    if (!hasHome) {
      const home = document.createElement('a');
      home.className = 'gnk-functional-fallback-home';
      home.href = isEn ? '/en/' : '/';
      home.setAttribute('aria-label', isEn ? 'Home' : 'Početna');
      home.textContent = '⌂';
      document.body.appendChild(home);
    }
    if (!hasAi) {
      const ai = document.createElement('a');
      ai.className = 'gnk-functional-fallback-ai';
      ai.href = isEn ? '/en/assistant/' : '/assistant/';
      ai.setAttribute('aria-label', isEn ? 'AI Help' : 'AI Pomoć');
      ai.textContent = isEn ? 'AI Help' : 'AI Pomoć';
      document.body.appendChild(ai);
    }
  }

  function extractItems(data) {
    if (Array.isArray(data)) return data;
    for (const key of ['items','articles','publications','news','data']) if (Array.isArray(data?.[key])) return data[key];
    return [];
  }

  function normalise(item, type) {
    const title = item?.title || item?.name || item?.headline || '';
    if (!title) return null;
    let url = item?.url || item?.href || item?.publicUrl || item?.canonical || '';
    if (!url && item?.slug) url = `${type === 'news' ? (isEn ? '/news/' : '/vijesti/') : (isEn ? '/publications/' : '/objave/')}${item.slug}/`;
    return {
      title:String(title),
      summary:String(item?.summary || item?.excerpt || item?.description || item?.snippet || '').slice(0,280),
      image:String(item?.image || item?.imageUrl || item?.featuredImage || '/assets/gnk-asg-social-card.png'),
      url:url || (type === 'news' ? (isEn ? '/news/' : '/vijesti/') : (isEn ? '/publications/' : '/objave/'))
    };
  }

  async function loadThree() {
    const rows = [];
    for (const [url,type] of [['/data/publications.json','publication'],['/api/publications','publication'],['/data/news.json','news']]) {
      try {
        const response = await fetch(`${url}?cb=${Date.now()}`,{cache:'no-store'});
        if (!response.ok) continue;
        extractItems(await response.json()).forEach(item => {
          const row = normalise(item,type);
          if (row && !rows.some(existing => existing.title === row.title)) rows.push(row);
        });
      } catch {}
      if (rows.length >= 3) break;
    }
    return rows.slice(0,3);
  }

  async function addHomepageShowcase() {
    if (!['/','/index.html','/en/','/en/index.html'].includes(path) || q('gnk-functional-home-showcase')) return;
    const main = document.querySelector('main') || document.body;
    const section = document.createElement('section');
    section.id = 'gnk-functional-home-showcase';
    section.className = 'gnk-functional-home-showcase';
    section.innerHTML = `<div class="gnk-functional-home-poster"><img src="/assets/gnk-asg-social-card.png" alt="GNK ASG"><div><small>${isEn?'GNK ASG corporate portal':'GNK ASG korporativni portal'}</small><h2>${isEn?'Business, technology and communication in one system.':'Poslovanje, tehnologija i komunikacija u jednom sustavu.'}</h2><p>${isEn?'GNK ASG d.o.o. and GNK DINAMO Ltd. connect corporate information, publications, markets, AI and secure communication.':'GNK ASG d.o.o. i GNK DINAMO Ltd. povezuju korporativne informacije, objave, tržišta, AI i sigurnu komunikaciju.'}</p></div></div><div class="gnk-functional-home-rotator"><div class="gnk-functional-home-slides"></div><div class="gnk-functional-home-dots"></div></div>`;
    const spotlight = q('gnk-asg-premium-spotlight');
    if (spotlight?.nextSibling) spotlight.parentNode.insertBefore(section,spotlight.nextSibling);
    else main.prepend(section);

    let items = await loadThree();
    if (!items.length) items = [
      {title:isEn?'Publications and insights':'Objave i analize',summary:isEn?'Corporate analysis, sources and conclusions.':'Korporativne analize, izvori i zaključci.',image:'/assets/gnk-asg-social-card.png',url:isEn?'/publications/':'/objave/'},
      {title:isEn?'Business news':'Poslovne vijesti',summary:isEn?'Current business and technology sources.':'Aktualni poslovni i tehnološki izvori.',image:'/assets/gnk-asg-email-logo-final.png',url:isEn?'/news/':'/vijesti/'},
      {title:'BPP',summary:isEn?'Digital payment infrastructure platform.':'Platforma digitalne platne infrastrukture.',image:'/assets/gnk-asg-social-card.png',url:isEn?'/en/platforms/bpp/':'/platforme/bpp/'}
    ];
    const slides = section.querySelector('.gnk-functional-home-slides');
    const dots = section.querySelector('.gnk-functional-home-dots');
    slides.innerHTML = items.map((item,index) => `<article class="${index===0?'active':''}" data-slide="${index}"><img src="${esc(item.image)}" alt="${esc(item.title)}"><div><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p><a href="${esc(item.url)}">${isEn?'Open':'Otvori'} →</a></div></article>`).join('');
    dots.innerHTML = items.map((_,index) => `<button type="button" class="${index===0?'active':''}" data-dot="${index}" aria-label="${index+1}"></button>`).join('');
    let active = 0;
    const show = index => {
      active = index % items.length;
      section.querySelectorAll('[data-slide]').forEach(node => node.classList.toggle('active',Number(node.dataset.slide)===active));
      section.querySelectorAll('[data-dot]').forEach(node => node.classList.toggle('active',Number(node.dataset.dot)===active));
    };
    section.querySelectorAll('[data-dot]').forEach(button => button.addEventListener('click',() => show(Number(button.dataset.dot))));
    if (items.length > 1) setInterval(() => show(active + 1),6500);
  }

  function improveMailItems() {
    if (!path.startsWith('/mail-studio-pro/')) return;
    const list = q('mailList');
    if (!list) return;
    const apply = () => list.querySelectorAll('.mail-item').forEach(item => {
      if (item.dataset.gnkKeyboard === '1') return;
      item.dataset.gnkKeyboard = '1';
      item.tabIndex = 0;
      item.setAttribute('role','button');
      item.addEventListener('keydown',event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); item.click(); }
      });
    });
    new MutationObserver(apply).observe(list,{childList:true,subtree:true});
    apply();
  }

  function init() {
    markPage();
    removeDuplicateAppItem();
    ensureFloats();
    addHomepageShowcase();
    improveMailItems();
    [350,1000,2500].forEach(delay => setTimeout(() => {
      markPage();
      removeDuplicateAppItem();
      ensureFloats();
      improveMailItems();
    },delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
