(() => {
  if (window.__GNK_PREVIEW_CONTENT_FIXES__) return;
  window.__GNK_PREVIEW_CONTENT_FIXES__ = true;

  const path = location.pathname.toLowerCase();
  const isHome = ['/', '/index.html', '/en/', '/en/index.html'].includes(path);
  const english = path.startsWith('/en/');
  const replacements = new Map([
    ['Ä‡','ć'],['ÄŒ','Č'],['Ä','č'],['Å¡','š'],['Å ','Š'],['Å¾','ž'],['Å½','Ž'],['Ä‘','đ'],['Ä','Đ'],
    ['â€¦','…'],['â€”','—'],['â€“','–'],['â†’','→'],['Â·','·'],['Â','']
  ]);

  function repairText(root = document.body) {
    const walker = document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (node.parentElement?.closest('script,style,code,pre')) return;
      let value = node.nodeValue || '';
      replacements.forEach((correct,broken) => { value = value.split(broken).join(correct); });
      node.nodeValue = value;
    });
  }

  function effectiveBackground(element) {
    let node = element;
    while (node && node !== document.documentElement) {
      const value = getComputedStyle(node).backgroundColor;
      const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match && Number(match[4] ?? 1) > 0.18) return [Number(match[1]),Number(match[2]),Number(match[3])];
      node = node.parentElement;
    }
    return [5,13,25];
  }

  function luminance(rgb) {
    return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  }

  function repairContrast() {
    const selectors = [
      '#grupa','.group-section','.group-card','.group-overview','.group-overview-panel','.group-network-panel',
      '#visualGrid .item','.visual-grid .item','.gallery-card','.visual-card','.asset-card','.metric-card','.kpi-card',
      '.finance-card','.financial-card','.profile-board','.asg-market-card','.chartbox','.status-card','.hero'
    ].join(',');
    document.querySelectorAll(selectors).forEach(element => {
      const mode = luminance(effectiveBackground(element)) < 0.45 ? 'dark' : 'light';
      element.dataset.gnkContrast = mode;
    });
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  }

  async function getJson(url) {
    const response = await fetch(`${url}?cb=${Date.now()}`,{cache:'no-store'});
    if (!response.ok) throw new Error(String(response.status));
    return response.json();
  }

  async function addDiscovery() {
    if (!isHome || document.getElementById('gnk-preview-discovery')) return;
    const section = document.createElement('section');
    section.id = 'gnk-preview-discovery';
    section.className = 'gnk-preview-discovery';
    section.innerHTML = `<header><div><h2>${english?'Explore the GNK ASG portal':'Istražite GNK ASG portal'}</h2><p>${english?'Publications, business news, visual assets and group network in one place.':'Objave, poslovne vijesti, vizualni materijali i mreža grupe na jednom mjestu.'}</p></div></header><div class="gnk-preview-discovery-grid" id="gnk-preview-discovery-grid"></div>`;
    const anchor = document.querySelector('#grupa,.group-section,#financials,.financials') || document.querySelector('main');
    if (anchor?.parentNode) anchor.parentNode.insertBefore(section,anchor.nextSibling);
    else document.body.appendChild(section);

    const grid = section.querySelector('#gnk-preview-discovery-grid');
    const cards = [];
    try {
      const data = await getJson('/data/publications.json');
      const item = data.items?.[0];
      if (item) cards.push({type:english?'Publication':'Objava',title:english?(item.titleEn||item.title):(item.titleHr||item.title),url:english?(item.enUrl||'/publications/'):(item.hrUrl||'/objave/'),image:item.imageUrl});
    } catch {}
    try {
      const data = await getJson('/data/news.json');
      const list = Array.isArray(data) ? data : data.items || [];
      const item = list[0];
      if (item) cards.push({type:english?'Business News':'Poslovne vijesti',title:item.title,url:english?'/news/':'/vijesti/',image:'/assets/gnk-asg-social-card.png'});
    } catch {}
    try {
      const data = await getJson('/data/visual_gallery.json');
      const item = data.items?.[0];
      cards.push({type:english?'Visual Gallery':'Vizualna galerija',title:item?.title || 'GNK ASG Visual Gallery',url:'/visual-index/',image:item?.src || '/assets/gnk-asg-social-card.png'});
    } catch {}
    cards.push({type:english?'Group Network':'Mreža grupe',title:english?'33 existing companies and 12 planned positions':'33 postojeća društva i 12 planiranih pozicija',url:english?'/en/#grupa':'/#grupa',image:'/assets/brand/gnk-dinamo-ltd-logo.png'});
    grid.innerHTML = cards.slice(0,4).map(card => `<a class="gnk-preview-discovery-card" href="${esc(card.url)}"><img src="${esc(card.image)}" alt="${esc(card.title)}" loading="lazy"><div><small>${esc(card.type)}</small><strong>${esc(card.title)}</strong></div></a>`).join('');
  }

  function init() {
    repairText();
    repairContrast();
    addDiscovery();
    [350,1000,2200].forEach(delay => setTimeout(() => {
      repairText();
      repairContrast();
    },delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
