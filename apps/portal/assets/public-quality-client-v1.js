(() => {
  'use strict';
  if (window.__GNK_ASG_PUBLIC_QUALITY_CLIENT_V3__) return;
  window.__GNK_ASG_PUBLIC_QUALITY_CLIENT_V1__ = true;
  window.__GNK_ASG_PUBLIC_QUALITY_CLIENT_V2__ = true;
  window.__GNK_ASG_PUBLIC_QUALITY_CLIENT_V3__ = true;

  const path = location.pathname.toLowerCase();
  const excluded = ['/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center','/auto-editor'];
  if (excluded.some(prefix => path === prefix || path.startsWith(prefix + '/'))) return;

  const english = path === '/en' || path.startsWith('/en/') || path.startsWith('/markets') || path.startsWith('/news') || path.startsWith('/publications') || path.startsWith('/automation-status');
  const broken = /(?:\uFFFD|Γö|Γò|├|╕|╛|Ã.|Â.|â€|Å.|Ä.)/;
  const hardBroken = /(?:\uFFFD|Γö|Γò|├|╕|╛)/;
  const nonstandardHr = /\b(?:ko će|zvanično|akcioni plan|u oblasti|kompanije su|investirali su|trenutno realiziraju|komesar|preduzetnik|preduzetništvo|uspeh|uspešno|veštine|efikasne metode|privatni biznis|musk izgubi status trilijunarca|spuštaju se na zemlju s udarcem|trilionarski status)\b/i;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character]));

  function score(value) {
    const found = String(value || '').match(/(?:\uFFFD|Γö|Γò|├|╕|╛|Ã.|Â.|â€|Å.|Ä.)/g);
    return found ? found.length : 0;
  }

  function repair(value) {
    let output = String(value ?? '').normalize('NFC');
    if (!broken.test(output)) return output;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const chars = [...output];
        if (!chars.every(character => character.charCodeAt(0) <= 255)) break;
        const bytes = Uint8Array.from(chars.map(character => character.charCodeAt(0)));
        const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        if (score(decoded) < score(output)) output = decoded;
        else break;
      } catch { break; }
    }
    const replacements = [
      ['â€™','’'],['â€˜','‘'],['â€œ','“'],['â€','”'],['â€“','–'],['â€”','—'],['â€¦','…'],
      ['Â ',' '],['Â',''],['Ä','č'],['Ä‡','ć'],['Å¡','š'],['Å¾','ž'],['Ä‘','đ'],
      ['PoÄetna','Početna'],['TrÅ¾iÅ¡ta','Tržišta'],['RuÄno','Ručno'],['osvjeÅ¾i','osvježi'],
      ['UÄitavanje','Učitavanje'],['tehniÄki','tehnički'],['toÄke','točke'],['sljedeÄ‡a','sljedeća'],
      ['pomoÄ‡','pomoć'],['sadrÅ¾aj','sadržaj'],['izvjeÅ¡taj','izvještaj'],['aÅ¾urirano','ažurirano']
    ];
    for (const [bad, good] of replacements) output = output.split(bad).join(good);
    return output.normalize('NFC');
  }

  function repairDom(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|CODE|PRE)$/i.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return broken.test(node.nodeValue || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const fixed = repair(node.nodeValue || '');
      if (!hardBroken.test(fixed)) node.nodeValue = fixed;
    });
  }

  function englishHeading(value) {
    const content = ` ${String(value || '').toLowerCase()} `;
    const en = (content.match(/\b(?:the|and|as|over|ahead|government|global|business|power|project|status|says|seeks|hits|breaks|ground|loses|renewable|energy|technology)\b/g) || []).length;
    const hr = (content.match(/\b(?:i|je|su|za|na|od|koji|kako|tržište|poslovanje|projekt|vlada|razvoj|energija|tehnologija)\b/g) || []).length;
    return en >= 2 && hr === 0;
  }

  function invalidCroatian(content, title) {
    return hardBroken.test(content) || englishHeading(title) || nonstandardHr.test(content);
  }

  function qualityMessage(croatian) {
    const section = document.createElement('section');
    section.className = 'gnk-quality-empty';
    section.innerHTML = croatian
      ? '<h2>Objava prolazi kontrolu kvalitete</h2><p>Ovaj tekst nije javno prikazan jer nije zadovoljio jezična, tehnička ili urednička pravila portala.</p><a href="/objave/">Povratak na provjerene objave</a>'
      : '<h2>Publication under quality review</h2><p>This article is not publicly displayed because it did not pass the language, technical or editorial rules.</p><a href="/publications/">Return to verified publications</a>';
    return section;
  }

  function filterCroatianArticles() {
    const listHr = path === '/objave' || path === '/objave/' || path.startsWith('/objave/');
    if (!listHr) return;
    let removed = false;
    document.querySelectorAll('main article').forEach(article => {
      const heading = article.querySelector('h1,h2,h3')?.textContent || '';
      const content = article.textContent || '';
      if (invalidCroatian(content, heading)) {
        article.remove();
        removed = true;
      }
    });
    const grid = document.querySelector('.grid,.publication-grid');
    if (grid && !grid.querySelector('article') && !grid.querySelector('.gnk-quality-empty')) grid.appendChild(qualityMessage(true));
    if (removed) document.documentElement.dataset.gnkQualityFiltered = 'true';
  }

  const dateText = value => {
    const date = new Date(value || '');
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(english ? 'en-GB' : 'hr-HR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zagreb'
    }).format(date);
  };

  async function renderEnglishPublications() {
    if (!(path === '/publications' || path === '/publications/' || path.startsWith('/publications/'))) return;
    if (document.documentElement.dataset.gnkEnglishPublications === 'done') return;
    document.documentElement.dataset.gnkEnglishPublications = 'loading';
    try {
      const response = await fetch(`/data/auto-editor.json?cb=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const items = (Array.isArray(payload) ? payload : (payload.items || payload.articles || []))
        .filter(item => String(item.titleEn || '').trim().length > 8 && String(item.summaryEn || item.bodyEn || '').trim().length > 30);
      const slug = path.replace(/^\/publications\/?/, '').replace(/\/$/, '');
      const main = document.querySelector('main');
      if (!main) return;

      if (slug) {
        const item = items.find(entry => String(entry.slug || entry.id || '').toLowerCase() === slug.toLowerCase());
        if (!item) return;
        const image = item.image || item.imageUrl || item.heroImage || '';
        main.innerHTML = `<article class="gnk-en-publication-detail"><p class="gnk-publication-back"><a href="/publications/">← Publications</a></p><p class="gnk-publication-meta">${esc(item.categoryEn || item.category || 'Business')} · ${esc(dateText(item.publishedAt || item.date))}</p><h1>${esc(item.titleEn)}</h1>${image ? `<img src="${esc(image)}" alt="${esc(item.imageAltEn || item.titleEn)}" loading="eager">` : ''}<p class="gnk-publication-lead">${esc(item.summaryEn || '')}</p><div class="gnk-publication-body">${esc(item.bodyEn || item.contentEn || '').replace(/\n/g, '<br>')}</div>${Array.isArray(item.sources) && item.sources.length ? `<section class="gnk-publication-sources"><h2>Sources</h2>${item.sources.map(source => `<a href="${esc(source.url || '')}" target="_blank" rel="noopener">${esc(source.name || source.title || source.url || 'Source')}</a>`).join('')}</section>` : ''}</article>`;
        document.title = `${item.titleEn} | GNK ASG`;
        setMeta('description', item.summaryEn || 'GNK ASG publication.');
        setCanonical(`/publications/${encodeURIComponent(slug)}/`);
      } else {
        main.innerHTML = `<section class="gnk-en-publications"><p class="eyebrow">GNK ASG Intelligence Desk</p><h1>Publications and analyses</h1><p class="gnk-publications-intro">Verified English-language corporate, business, market, technology and sports-economy analyses.</p><div class="gnk-en-publication-grid">${items.map(item => {
          const slugValue = item.slug || item.id || '';
          const image = item.image || item.imageUrl || item.heroImage || '';
          return `<article>${image ? `<img src="${esc(image)}" alt="${esc(item.imageAltEn || item.titleEn)}" loading="lazy">` : ''}<div><p class="gnk-publication-meta">${esc(item.categoryEn || item.category || 'Business')} · ${esc(dateText(item.publishedAt || item.date))}</p><h2>${esc(item.titleEn)}</h2><p>${esc(item.summaryEn || '')}</p><a href="/publications/${encodeURIComponent(slugValue)}/">Open publication</a></div></article>`;
        }).join('') || '<article><div><h2>No verified English publications are currently available.</h2></div></article>'}</div></section>`;
        document.title = 'Publications and analyses | GNK ASG';
        setMeta('description', 'Verified English-language publications and analyses by GNK ASG Intelligence Desk.');
        setCanonical('/publications/');
      }
      document.documentElement.lang = 'en';
      document.documentElement.dataset.gnkEnglishPublications = 'done';
    } catch (_) {
      document.documentElement.dataset.gnkEnglishPublications = 'error';
    }
  }

  function renderEnglishLegal() {
    if (!(path === '/en/legal' || path === '/en/legal/')) return;
    if (document.documentElement.dataset.gnkEnglishLegal === 'done') return;
    const main = document.querySelector('main');
    if (!main) return;
    main.innerHTML = `<section class="gnk-legal-en"><p class="eyebrow">GNK ASG legal information</p><h1>Legal notice, terms of use and privacy</h1><p>These provisions apply to the public corporate portal of GNK ASG d.o.o. and the public information presented in connection with GNK DINAMO Ltd.</p><article><h2>1. Informational purpose</h2><p>The portal provides corporate information, publications, market indicators, documents, visual materials and public communication tools. Content is provided for general informational purposes and does not constitute legal, tax, investment or financial advice.</p></article><article><h2>2. Market and financial data</h2><p>Market prices and indicators may be delayed, cached or supplied as snapshots. Users should verify information with the identified primary source before making a decision.</p></article><article><h2>3. Intellectual property</h2><p>Text, graphics, logos, photographs, software interfaces and other original materials are protected by applicable intellectual-property rules unless a different source or licence is expressly stated.</p></article><article><h2>4. Privacy and personal data</h2><p>Personal data submitted through the contact form is processed only for handling the request, maintaining necessary records and meeting applicable legal obligations. Data is not sold to advertisers.</p></article><article><h2>5. Cookies and technical records</h2><p>The portal may use essential technical storage, security records and aggregated analytics necessary for operation, protection and service improvement.</p></article><article><h2>6. External links</h2><p>External links are provided for source verification or convenience. GNK ASG does not control third-party websites and is not responsible for their content or availability.</p></article><article><h2>7. Contact</h2><p>Questions concerning privacy, legal notices or the use of portal material may be submitted through the official <a href="/en/contact/">contact form</a>.</p></article></section>`;
    document.documentElement.lang = 'en';
    document.title = 'Legal notice and privacy | GNK ASG';
    setMeta('description', 'Legal notice, terms of use, privacy and market-data disclaimer for the GNK ASG corporate portal.');
    setCanonical('/en/legal/');
    document.documentElement.dataset.gnkEnglishLegal = 'done';
  }

  function setMeta(name, content) {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  function setCanonical(route) {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = new URL(route, location.origin).href;
  }

  function patchSeo() {
    const definitions = {
      '/markets/': ['Markets | GNK ASG', 'Current market, digital-asset, foreign-exchange and commodity information from GNK ASG.'],
      '/assistant/': ['AI assistance | GNK ASG', 'Public GNK ASG AI assistance for navigating portal information and documents.'],
      '/en/assistant/': ['AI assistance | GNK ASG', 'Public GNK ASG AI assistance for navigating portal information and documents.'],
      '/legal/': ['Pravne obavijesti i privatnost | GNK ASG', 'Uvjeti korištenja, privatnost, GDPR i pravne obavijesti korporativnog portala GNK ASG.'],
      '/app/': ['GNK ASG aplikacija', 'Javna GNK ASG web aplikacija i funkcionalni pristup korporativnom portalu.']
    };
    const match = definitions[path];
    if (match) {
      document.title = match[0];
      setMeta('description', match[1]);
      setCanonical(path);
    }
    const main = document.querySelector('main');
    if (main && !main.querySelector('h1')) {
      const first = main.querySelector('h2,h3');
      if (first) {
        const h1 = document.createElement('h1');
        h1.textContent = first.textContent;
        h1.className = 'gnk-generated-h1';
        first.replaceWith(h1);
      }
    }
    document.querySelectorAll('img').forEach(image => {
      if (!image.alt.trim()) image.alt = english ? 'GNK ASG visual material' : 'GNK ASG vizualni materijal';
    });
  }

  function dedupeAssets() {
    const seen = new Set();
    document.querySelectorAll('link[rel="stylesheet"][href],script[src]').forEach(element => {
      let key;
      try { key = `${element.tagName}:${new URL(element.href || element.src, location.origin).pathname}`; } catch { return; }
      if (seen.has(key)) element.remove();
      else seen.add(key);
    });
    const ids = new Set();
    document.querySelectorAll('[id]').forEach(element => {
      if (ids.has(element.id) && /repair|functional|ui/i.test(element.id)) element.removeAttribute('id');
      else ids.add(element.id);
    });
  }

  function dedupeFloatingControls() {
    const candidates = [...document.querySelectorAll('a,button,div')].filter(element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (style.position !== 'fixed' || rect.width < 30 || rect.height < 30) return false;
      const marker = `${element.id} ${element.className} ${element.textContent} ${element.getAttribute('aria-label') || ''}`.toLowerCase();
      return /ai|assistant|chat|home|početna/.test(marker);
    });
    const keep = new Map();
    candidates.forEach(element => {
      const marker = `${element.id} ${element.className} ${element.textContent} ${element.getAttribute('aria-label') || ''}`.toLowerCase();
      const group = /home|početna/.test(marker) ? 'home' : 'ai';
      if (!keep.has(group)) keep.set(group, element);
      else if (!keep.get(group).contains(element) && !element.contains(keep.get(group))) element.classList.add('gnk-hidden-floating-duplicate');
    });
  }

  function patchMarketChart() {
    if (!(path === '/trzista' || path === '/trzista/' || path === '/markets' || path === '/markets/')) return;
    document.querySelectorAll('canvas').forEach(canvas => {
      canvas.style.minHeight = '260px';
      canvas.style.width = '100%';
      canvas.parentElement?.classList.add('gnk-chart-container');
    });
    setTimeout(() => {
      document.querySelectorAll('.chartbox,.chart-card,.gnk-chart-container').forEach(container => {
        const canvas = container.querySelector('canvas');
        if (canvas && canvas.getBoundingClientRect().height < 80 && !container.querySelector('.gnk-chart-fallback')) {
          const message = document.createElement('p');
          message.className = 'gnk-chart-fallback';
          message.textContent = english ? 'Historical chart data is temporarily unavailable.' : 'Povijesni podaci grafikona trenutačno nisu dostupni.';
          container.appendChild(message);
        }
      });
    }, 2500);
  }

  function paginateNews() {
    if (!(path === '/vijesti' || path === '/vijesti/' || path === '/news' || path === '/news/')) return;
    if (document.getElementById('gnk-load-more-news')) return;
    const cards = [...document.querySelectorAll('main article,.news-card,.news-item-card')].filter(card => !card.closest('header,footer,nav'));
    if (cards.length <= 24) return;
    cards.slice(24).forEach(card => card.classList.add('gnk-news-hidden'));
    const button = document.createElement('button');
    button.id = 'gnk-load-more-news';
    button.type = 'button';
    button.textContent = english ? 'Load more news' : 'Učitaj još vijesti';
    button.addEventListener('click', () => {
      const hidden = cards.filter(card => card.classList.contains('gnk-news-hidden')).slice(0, 24);
      hidden.forEach(card => card.classList.remove('gnk-news-hidden'));
      if (!cards.some(card => card.classList.contains('gnk-news-hidden'))) button.remove();
    });
    (cards[cards.length - 1].parentElement || document.querySelector('main'))?.appendChild(button);
  }

  function patchMenu() {
    const menu = document.getElementById('gnk-asg-premium-menu');
    if (!menu) return;
    if (english) menu.querySelectorAll('a').forEach(link => { if (/ai help/i.test(link.textContent || '')) link.href = '/en/assistant/'; });
    const statusUrl = english ? '/automation-status/' : '/status-automatizacije/';
    if (![...menu.querySelectorAll('a,form')].some(item => {
      try { return new URL(item.href || item.action, location.origin).pathname === statusUrl; } catch { return false; }
    })) {
      const link = document.createElement('a');
      link.href = statusUrl;
      link.textContent = 'Status';
      menu.appendChild(link);
    }
  }

  function installStyle() {
    if (document.getElementById('gnk-quality-client-style')) return;
    const style = document.createElement('style');
    style.id = 'gnk-quality-client-style';
    style.textContent = `
      .gnk-quality-empty{padding:22px;border:1px solid rgba(212,175,55,.35);border-radius:16px;background:#0d2340;color:#dce5f1;line-height:1.65}.gnk-quality-empty h2{color:#fff}.gnk-quality-empty a{color:#ffe08a;font-weight:900;text-decoration:none}
      .gnk-hidden-floating-duplicate,.gnk-news-hidden{display:none!important}.gnk-chart-container{min-height:280px}.gnk-chart-container canvas{min-height:260px!important}.gnk-chart-fallback{padding:18px;color:#aab7c9;text-align:center}
      #gnk-load-more-news{display:block;margin:24px auto;padding:12px 18px;border:1px solid #d7aa3c;border-radius:999px;background:#0b294e;color:#fff;font-weight:900;cursor:pointer}
      .gnk-en-publications,.gnk-en-publication-detail,.gnk-legal-en{max-width:1240px;margin:0 auto;padding:34px 18px 90px;color:#eef4fb}.gnk-en-publications>h1,.gnk-en-publication-detail>h1,.gnk-legal-en>h1{font-size:clamp(34px,5vw,62px);line-height:1.04;color:#fff}.gnk-publications-intro,.gnk-publication-lead{max-width:850px;color:#b7c4d5;font-size:18px;line-height:1.7}.gnk-en-publication-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:28px}.gnk-en-publication-grid article,.gnk-legal-en article{overflow:hidden;border:1px solid rgba(215,170,60,.28);border-radius:20px;background:#07172a}.gnk-en-publication-grid article img{width:100%;aspect-ratio:16/9;object-fit:cover}.gnk-en-publication-grid article>div,.gnk-legal-en article{padding:20px}.gnk-en-publication-grid h2{font-size:21px}.gnk-en-publication-grid p,.gnk-legal-en p{color:#b7c4d5;line-height:1.65}.gnk-en-publication-grid a,.gnk-legal-en a,.gnk-publication-back a,.gnk-publication-sources a{color:#ffe08a;font-weight:900;text-decoration:none}.gnk-publication-meta{color:#d7aa3c!important;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.gnk-en-publication-detail img{width:100%;max-height:560px;object-fit:cover;border-radius:24px}.gnk-publication-body{font-size:18px;line-height:1.78;color:#e5edf6}.gnk-publication-sources{margin-top:32px;padding-top:20px;border-top:1px solid rgba(215,170,60,.25)}.gnk-publication-sources a{display:block;margin:8px 0}
      @media(max-width:900px){.gnk-en-publication-grid{grid-template-columns:1fr}.gnk-en-publications,.gnk-en-publication-detail,.gnk-legal-en{padding-inline:14px}.gnk-chart-container{min-height:240px}.gnk-chart-container canvas{min-height:220px!important}}
    `;
    document.head.appendChild(style);
  }

  let running = false;
  function run() {
    if (running) return;
    running = true;
    try {
      installStyle();
      repairDom();
      filterCroatianArticles();
      renderEnglishLegal();
      patchSeo();
      dedupeAssets();
      dedupeFloatingControls();
      patchMarketChart();
      paginateNews();
      patchMenu();
      renderEnglishPublications();
    } finally { running = false; }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  window.addEventListener('load', run, { once: true });
  [180,700,1600,3200].forEach(delay => setTimeout(run, delay));

  let queued = false;
  new MutationObserver(() => {
    if (queued || running) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; run(); });
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
})();
