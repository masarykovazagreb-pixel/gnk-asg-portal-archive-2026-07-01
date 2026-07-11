(() => {
  'use strict';
  const KEYWORDS = {
    financije: ['financije','bilanca','prihod','profit','kapital','aktiva','obveze','financial','revenue','equity'],
    ai: ['ai','umjetna inteligencija','artificial intelligence','tehnologija','software','digitalne operacije'],
    trzista: ['tržište','trziste','burza','market','stocks','crypto','bitcoin','digitalna imovina','zlato','nafta'],
    global: ['global','zemlje','mreža','mreza','kanada','singapur','japan','brazil','uae','kina','australija'],
    sport: ['sport','stadion','infrastruktura','urbani razvoj','održivost'],
    kontakt: ['kontakt','whatsapp','komunikacija','poruka','email'],
    kartice: ['kartice','plaćanja','placanja','fintech','payment','card']
  };
  let manifest = null;
  async function load() {
    if (manifest) return manifest;
    try {
      const response = await fetch('/data/visual_gallery.json?v=' + Date.now(), {cache:'no-store'});
      manifest = response.ok ? await response.json() : {items:[]};
    } catch (_) { manifest = {items:[]}; }
    return manifest;
  }
  function score(item, text) {
    const hay = [item.id, item.title, item.alt, item.description, (item.topic || []).join(' '), (item.countries || []).join(' ')].join(' ').toLowerCase();
    let value = 0;
    Object.values(KEYWORDS).flat().forEach(word => { if (text.includes(word) && hay.includes(word)) value += 4; });
    String(text).split(/\W+/).filter(Boolean).forEach(word => { if (word.length > 3 && hay.includes(word)) value += 1; });
    return value;
  }
  async function pick(topicText) {
    const data = await load();
    const text = String(topicText || document.title || document.body.innerText.slice(0, 600)).toLowerCase();
    const items = Array.isArray(data.items) ? data.items : [];
    return items.map(item => ({item, value: score(item, text)})).sort((a,b) => b.value - a.value)[0]?.item || items[0] || null;
  }
  async function decorateArticle(root, topicText) {
    const item = await pick(topicText || root?.innerText || document.title);
    if (!item || !root || root.querySelector('.visual-gallery-topic-image')) return;
    const figure = document.createElement('figure');
    figure.className = 'visual-gallery-topic-image';
    figure.innerHTML = '<img src="' + item.src + '" alt="' + item.alt.replace(/"/g, '&quot;') + '" loading="lazy"><figcaption>' + item.title + ' · GNK ASG vizualni indeks</figcaption>';
    root.insertBefore(figure, root.firstChild);
  }
  window.GNK_VISUAL_GALLERY = {load, pick, decorateArticle};
})();
