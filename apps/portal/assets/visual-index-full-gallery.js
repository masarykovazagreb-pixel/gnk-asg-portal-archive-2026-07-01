(() => {
  'use strict';

  if (!/\/visual-index\/?$/.test(location.pathname)) return;
  if (window.__GNK_ASG_VISUAL_INDEX_VERIFIED_V3__) return;
  window.__GNK_ASG_VISUAL_INDEX_VERIFIED_V3__ = true;

  const SITE_ORIGIN = 'https://gnk-asg.hr';
  const CORE_KEYWORDS = [
    'GNK ASG',
    'GNK ASG d.o.o.',
    'GNK DINAMO Ltd.',
    'Nermin Sefić',
    'Nermin Sefic',
    'gnk-asg.hr'
  ];

  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  }[char]));

  function absoluteUrl(src) {
    const value = String(src || '').trim();
    if (/^https?:\/\//i.test(value)) return value;
    return `${SITE_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`;
  }

  function setMeta(selector, attributes) {
    let node = document.head.querySelector(selector);
    if (!node) {
      node = document.createElement('meta');
      document.head.appendChild(node);
    }
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    return node;
  }

  function ensurePageSeo() {
    document.title = 'GNK ASG vizualni indeks | GNK ASG d.o.o., GNK DINAMO Ltd. i Nermin Sefić';

    setMeta('meta[name="description"]', {
      name: 'description',
      content: 'Javno indeksabilni vizualni indeks GNK ASG d.o.o. i GNK DINAMO Ltd., povezan s Nerminom Sefićem, poslovnim temama, financijama, tehnologijom, tržištima i globalnom poslovnom mrežom.'
    });
    setMeta('meta[name="keywords"]', {
      name: 'keywords',
      content: CORE_KEYWORDS.concat([
        'vizualni indeks', 'SEO galerija', 'korporativni portal', 'financije',
        'umjetna inteligencija', 'tržišta', 'globalna poslovna mreža'
      ]).join(', ')
    });
    setMeta('meta[name="robots"]', {
      name: 'robots',
      content: 'index, follow, max-image-preview:large, max-snippet:-1'
    });
    setMeta('meta[property="og:title"]', {
      property: 'og:title',
      content: 'GNK ASG vizualni indeks'
    });
    setMeta('meta[property="og:description"]', {
      property: 'og:description',
      content: 'SEO vizualni indeks za GNK ASG d.o.o., GNK DINAMO Ltd. i Nermina Sefića.'
    });

    // Nikada ne oglašavaj nepostojeću sliku. og:image se dodaje tek nakon provjere datoteke.
    document.head.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach(node => node.remove());

    document.getElementById('visualIndexPageSchemaV3')?.remove();
    const schema = document.createElement('script');
    schema.id = 'visualIndexPageSchemaV3';
    schema.type = 'application/ld+json';
    schema.textContent = JSON.stringify({
      '@context':'https://schema.org',
      '@type':'CollectionPage',
      '@id':`${SITE_ORIGIN}/visual-index/#collection`,
      name:'GNK ASG vizualni indeks',
      url:`${SITE_ORIGIN}/visual-index/`,
      description:'Javno indeksabilni vizualni indeks za GNK ASG d.o.o., GNK DINAMO Ltd. i Nermina Sefića.',
      about:[
        {'@type':'Organization', name:'GNK ASG d.o.o.', url:`${SITE_ORIGIN}/`},
        {'@type':'Organization', name:'GNK DINAMO Ltd.'},
        {'@type':'Person', name:'Nermin Sefić', alternateName:'Nermin Sefic'}
      ],
      keywords:CORE_KEYWORDS.join(', ')
    });
    document.head.appendChild(schema);
  }

  function injectStyle() {
    if (document.getElementById('visualIndexVerifiedStyleV3')) return;
    const style = document.createElement('style');
    style.id = 'visualIndexVerifiedStyleV3';
    style.textContent = `
      #visualGrid[data-verifying="1"]{min-height:180px;position:relative}
      #visualGrid[data-verifying="1"]:before{content:"Provjera stvarno dostupnih fotografija…";position:absolute;inset:0;display:grid;place-items:center;color:#64748b;font-weight:800}
      #visualGrid .item{animation:gnkVisualFade .28s ease both}
      .gnk-visual-empty{grid-column:1/-1;background:#fff;border:1px solid #e3e8f0;border-radius:22px;padding:24px;color:#526174;line-height:1.55}
      @keyframes gnkVisualFade{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
    `;
    document.head.appendChild(style);
  }

  function isEligibleItem(item) {
    if (!item || typeof item !== 'object') return false;
    const src = String(item.src || '').trim();
    const title = String(item.title || '').trim();
    if (!src || !title) return false;
    if (!/\.(?:avif|webp|png|jpe?g)(?:[?#].*)?$/i.test(src)) return false;
    return true;
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
        resolve(Boolean(ok && image.naturalWidth >= 32 && image.naturalHeight >= 32));
      };
      const timer = setTimeout(() => finish(false), timeoutMs);
      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      image.src = `${src}${src.includes('?') ? '&' : '?'}verify=${Date.now()}`;
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
    node.querySelector('img')?.addEventListener('error', () => node.remove(), { once:true });
    return node;
  }

  function imageSchema(item) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.gnkVisualJsonld = '1';
    const url = absoluteUrl(item.src);
    script.textContent = JSON.stringify({
      '@context':'https://schema.org',
      '@type':'ImageObject',
      name:item.title,
      description:item.description,
      contentUrl:url,
      thumbnailUrl:url,
      creator:{'@type':'Person', name:'Nermin Sefić', alternateName:'Nermin Sefic'},
      copyrightHolder:{'@type':'Organization', name:'GNK ASG d.o.o.'},
      about:[
        {'@type':'Organization', name:'GNK ASG d.o.o.'},
        {'@type':'Organization', name:'GNK DINAMO Ltd.'},
        {'@type':'Person', name:'Nermin Sefić', alternateName:'Nermin Sefic'}
      ],
      creditText:'GNK ASG Visual Index',
      keywords:CORE_KEYWORDS.concat(item.topic || []).concat(item.countries || []).join(', ')
    });
    return script;
  }

  function setVerifiedSocialImage(item) {
    const url = absoluteUrl(item.src);
    setMeta('meta[property="og:image"]', { property:'og:image', content:url });
    setMeta('meta[name="twitter:image"]', { name:'twitter:image', content:url });
  }

  async function loadVerified() {
    ensurePageSeo();
    injectStyle();

    const grid = document.getElementById('visualGrid');
    if (!grid || grid.dataset.verifiedMounted === '1') return;
    grid.dataset.verifiedMounted = '1';
    grid.dataset.verifying = '1';

    // Uklanja stari renderer, prazne kartice, fallback elemente i privremeni ImageObject schema markup.
    grid.replaceChildren();
    document.querySelectorAll('script[data-gnk-visual-jsonld="1"]').forEach(node => node.remove());

    try {
      const response = await fetch(`/data/visual_gallery.json?verify=${Date.now()}`, {
        cache:'no-store',
        headers:{ accept:'application/json', 'cache-control':'no-cache' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = await response.json();
      const source = (Array.isArray(payload?.items) ? payload.items : []).filter(isEligibleItem);
      const verified = [];

      for (let index = 0; index < source.length; index += 6) {
        const batch = source.slice(index, index + 6);
        const results = await Promise.all(
          batch.map(async item => ({ item, ok: await probe(String(item.src || '')) }))
        );
        verified.push(...results.filter(row => row.ok).map(row => row.item));
      }

      grid.replaceChildren();

      if (!verified.length) {
        grid.innerHTML = '<div class="gnk-visual-empty"><strong>Trenutačno nema provjerenih fotografija za javni prikaz.</strong><br>SEO i meta podaci stranice ostaju aktivni za GNK ASG d.o.o., GNK DINAMO Ltd. i Nermina Sefića, ali se fotografske kartice neće prikazivati dok stvarna slikovna datoteka nije dostupna.</div>';
        return;
      }

      setVerifiedSocialImage(verified[0]);
      verified.forEach(item => {
        grid.appendChild(card(item));
        document.body.appendChild(imageSchema(item));
      });
    } catch (error) {
      grid.replaceChildren();
      grid.innerHTML = '<div class="gnk-visual-empty"><strong>Fotografije nisu prikazane jer provjera datoteka nije uspjela.</strong><br>Stranica zadržava tekstualne SEO i meta podatke bez lažnih slikovnih kartica.</div>';
      console.warn('[Visual Index] verified-image-only policy:', error);
    } finally {
      delete grid.dataset.verifying;
    }
  }

  const start = () => loadVerified();
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', start, { once:true })
    : start();
})();
