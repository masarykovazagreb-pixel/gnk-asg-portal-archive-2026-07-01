(() => {
  'use strict';
  if (!/\/visual-index\/?$/.test(location.pathname)) return;
  if (window.__GNK_ASG_VISUAL_INDEX_VERIFIED_V2__) return;
  window.__GNK_ASG_VISUAL_INDEX_VERIFIED_V2__ = true;

  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[char]));

  function injectStyle() {
    if (document.getElementById('visualIndexVerifiedStyle')) return;
    const style = document.createElement('style');
    style.id = 'visualIndexVerifiedStyle';
    style.textContent = `
      #visualGrid[data-verifying="1"]{min-height:260px;position:relative}
      #visualGrid[data-verifying="1"]:before{content:"Provjera stvarnih fotografija…";position:absolute;inset:0;display:grid;place-items:center;color:#64748b;font-weight:800}
      #visualGrid .item{animation:gnkVisualFade .28s ease both}
      .gnk-visual-empty{grid-column:1/-1;background:#fff;border:1px solid #e3e8f0;border-radius:22px;padding:24px;color:#526174;line-height:1.55}
      @keyframes gnkVisualFade{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
    `;
    document.head.appendChild(style);
  }

  function probe(src, timeoutMs = 9000) {
    return new Promise(resolve => {
      const image = new Image();
      let finished = false;
      const finish = ok => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
        resolve(ok && image.naturalWidth >= 32 && image.naturalHeight >= 32);
      };
      const timer = setTimeout(() => finish(false), timeoutMs);
      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      image.src = `${src}${src.includes('?') ? '&' : '?'}cb=${Date.now()}`;
    });
  }

  function card(item) {
    const node = document.createElement('article');
    node.className = 'item';
    node.dataset.visualId = item.id || '';
    const topics = (Array.isArray(item.topic) ? item.topic : []).slice(0, 4);
    node.innerHTML = `
      <img src="${esc(item.src)}" alt="${esc(item.alt || item.title)}" loading="lazy" decoding="async">
      <div class="body">
        <h2>${esc(item.title)}</h2>
        <p>${esc(item.description)}</p>
        <div class="tags">${topics.map(topic => `<span>${esc(topic)}</span>`).join('')}</div>
      </div>`;
    const image = node.querySelector('img');
    image.addEventListener('error', () => node.remove(), { once:true });
    return node;
  }

  function jsonLd(item) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    const url = /^https?:\/\//i.test(String(item.src || '')) ? item.src : `https://gnk-asg.hr${item.src}`;
    script.textContent = JSON.stringify({
      '@context':'https://schema.org',
      '@type':'ImageObject',
      name:item.title,
      description:item.description,
      contentUrl:url,
      thumbnailUrl:url,
      creator:{'@type':'Person',name:'Nermin Sefić'},
      copyrightHolder:{'@type':'Organization',name:'GNK ASG d.o.o.'},
      creditText:'GNK ASG Visual Index',
      keywords:['GNK ASG','GNK ASG d.o.o.','GNK DINAMO Ltd.','Nermin Sefić','gnk-asg.hr'].concat(item.topic || []).concat(item.countries || []).join(', ')
    });
    return script;
  }

  async function loadVerified() {
    injectStyle();
    const grid = document.getElementById('visualGrid');
    if (!grid || grid.dataset.verifiedMounted === '1') return;
    grid.dataset.verifiedMounted = '1';
    grid.dataset.verifying = '1';

    document.querySelectorAll('script[data-gnk-visual-jsonld="1"]').forEach(node => node.remove());

    try {
      const response = await fetch(`/data/visual_gallery.json?cb=${Date.now()}`, {
        cache:'no-store',
        headers:{accept:'application/json','cache-control':'no-cache'}
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const source = Array.isArray(payload?.items) ? payload.items : [];
      const verified = [];

      for (let index = 0; index < source.length; index += 6) {
        const batch = source.slice(index, index + 6);
        const results = await Promise.all(batch.map(async item => ({ item, ok: await probe(String(item?.src || '')) })));
        verified.push(...results.filter(row => row.ok).map(row => row.item));
      }

      grid.replaceChildren();
      if (!verified.length) {
        grid.innerHTML = '<article class="gnk-visual-empty"><strong>Vizualna galerija trenutačno nema provjerenih fotografija.</strong><br>Prikazat će se samo stvarno dostupne slikovne datoteke nakon sljedeće sinkronizacije.</article>';
        return;
      }

      verified.forEach(item => {
        grid.appendChild(card(item));
        const schema = jsonLd(item);
        schema.dataset.gnkVisualJsonld = '1';
        document.body.appendChild(schema);
      });
    } catch {
      [...grid.querySelectorAll('.item')].forEach(item => {
        const image = item.querySelector('img');
        if (!image || !image.complete || image.naturalWidth < 32 || image.naturalHeight < 32) item.remove();
      });
      grid.querySelectorAll('.fallback,.visual-image-missing').forEach(node => node.closest('.item')?.remove());
    } finally {
      delete grid.dataset.verifying;
    }
  }

  const start = () => setTimeout(loadVerified, 250);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start, { once:true }) : start();
})();
