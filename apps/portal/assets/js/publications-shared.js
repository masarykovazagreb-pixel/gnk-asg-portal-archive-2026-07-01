(() => {
  const root = document.getElementById('publication-grid');
  if (!root) return;

  const pageLanguage = document.body.dataset.publicationPage === 'en' ? 'en' : 'hr';
  const countNode = document.getElementById('publication-count');

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const absolute = value => {
    const text = String(value || '').trim();
    if (!text) return '';
    if (/^https?:\/\//i.test(text)) return text;
    return new URL(text, window.location.origin).href;
  };

  const dateValue = value => {
    const timestamp = Date.parse(value || '');
    return Number.isFinite(timestamp) ? timestamp : 0;
  };

  const normalizeStatic = item => ({
    ...item,
    kind: 'static',
    titleHr: item.titleHr || item.title,
    titleEn: item.titleEn || item.titleHr || item.title,
    summaryHr: item.summaryHr || item.summary,
    summaryEn: item.summaryEn || item.summaryHr || item.summary,
    hrUrl: item.hrUrl || item.originalUrl || item.url,
    enUrl: item.enUrl || item.originalUrl || item.url,
    canonical: item.canonical || absolute(item.hrUrl || item.originalUrl || item.url)
  });

  const normalizeAuto = item => ({
    ...item,
    id: item.id || `auto-${item.slug}`,
    language: item.sourceLang === 'en' ? 'EN' : 'HR',
    kind: 'auto',
    titleHr: item.titleHr || item.title,
    titleEn: item.titleEn || item.titleHr || item.title,
    summaryHr: item.summaryHr || item.summary,
    summaryEn: item.summaryEn || item.summaryHr || item.summary,
    hrUrl: item.hrUrl || `/objave/${item.slug}/`,
    enUrl: item.enUrl || `/publications/${item.slug}/`,
    canonical: item.canonical || absolute(`/objave/${item.slug}/`)
  });

  const fetchJson = async url => {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  };

  const validItem = item => Boolean(
    (item.titleHr || item.titleEn) &&
    (item.hrUrl || item.enUrl || item.canonical)
  );

  const dedupeKey = item => {
    const candidate = item.canonical || item.hrUrl || item.enUrl || item.slug || item.id || '';
    try {
      const url = new URL(candidate, window.location.origin);
      return url.pathname.replace(/\/+$/, '').toLowerCase() || '/';
    } catch {
      return String(candidate).trim().toLowerCase();
    }
  };

  const choosePreferred = (current, incoming) => {
    const currentDate = dateValue(current.publishedAt);
    const incomingDate = dateValue(incoming.publishedAt);
    if (incomingDate > currentDate) return incoming;
    if (incomingDate === currentDate && incoming.kind === 'auto' && current.kind !== 'auto') return incoming;
    return current;
  };

  const card = item => {
    const isEn = pageLanguage === 'en';
    const title = (isEn ? item.titleEn : item.titleHr) || item.titleHr || item.titleEn || 'GNK ASG';
    const summary = (isEn ? item.summaryEn : item.summaryHr) || item.summaryHr || item.summaryEn || '';
    const url = (isEn ? item.enUrl : item.hrUrl) || item.canonical || '/';
    const language = item.language || (isEn ? 'EN' : 'HR');
    const section = item.kind === 'auto'
      ? (isEn ? 'GNK ASG Auto Publication' : 'GNK ASG Auto objava')
      : (item.section || (isEn ? 'Publication' : 'Objava'));
    const action = isEn ? 'Open publication →' : 'Otvori objavu →';
    const words = isEn
      ? (item.wordCountEn || item.wordCount || item.wordCountHr)
      : (item.wordCountHr || item.wordCount || item.wordCountEn);
    const metaWords = words ? `<span>${esc(words)} ${isEn ? 'words' : 'riječi'}</span>` : '';
    const image = item.imageUrl
      ? `<a class="image-link" href="${esc(url)}"><img src="${esc(item.imageUrl)}" alt="${esc(item.imageAlt || title)}" loading="lazy" decoding="async"></a>`
      : '';

    return `<article class="card${image ? '' : ' card-without-image'}" data-language="${esc(language)}" data-search="${esc(`${title} ${summary} ${section}`.toLowerCase())}">
      ${image}
      <div class="card-body">
        <div class="meta"><span>${esc(language)}</span><span>${esc(section)}</span>${metaWords}<time datetime="${esc(item.publishedAt)}">${esc(String(item.publishedAt || '').slice(0, 10))}</time></div>
        <h2><a href="${esc(url)}">${esc(title)}</a></h2>
        <p>${esc(summary)}</p>
        <a class="open" href="${esc(url)}">${action}</a>
      </div>
    </article>`;
  };

  function bindCurrentFilters() {
    const search = document.getElementById('search');
    const buttons = [...document.querySelectorAll('[data-filter]')];
    if (!search || search.dataset.sharedPublicationsBound === 'true') return;

    search.dataset.sharedPublicationsBound = 'true';
    let filter = buttons.find(button => button.classList.contains('active'))?.dataset.filter || 'ALL';

    const apply = () => {
      const query = search.value.trim().toLowerCase();
      [...root.querySelectorAll('.card')].forEach(node => {
        const languageMatches = filter === 'ALL' || node.dataset.language === filter;
        const searchMatches = !query || String(node.dataset.search || '').includes(query);
        node.classList.toggle('hidden', !(languageMatches && searchMatches));
      });
    };

    search.addEventListener('input', apply);
    buttons.forEach(button => button.addEventListener('click', () => {
      filter = button.dataset.filter || 'ALL';
      buttons.forEach(item => item.classList.toggle('active', item === button));
      apply();
    }));
    apply();
  }

  const render = items => {
    const deduped = new Map();

    for (const item of items.filter(validItem)) {
      const key = dedupeKey(item);
      if (!key) continue;
      deduped.set(key, deduped.has(key) ? choosePreferred(deduped.get(key), item) : item);
    }

    const sorted = [...deduped.values()].sort((a, b) => dateValue(b.publishedAt) - dateValue(a.publishedAt));
    if (!sorted.length) {
      bindCurrentFilters();
      return;
    }

    root.innerHTML = sorted.map(card).join('');
    if (countNode) countNode.textContent = String(sorted.length);
    bindCurrentFilters();
    window.dispatchEvent(new CustomEvent('gnk-publications-rendered', {
      detail: { count: sorted.length, language: pageLanguage }
    }));
  };

  bindCurrentFilters();

  Promise.allSettled([
    fetchJson('/data/publications.json'),
    fetchJson('/data/publications-auto.json')
  ]).then(results => {
    const items = [];

    if (results[0].status === 'fulfilled' && Array.isArray(results[0].value.items)) {
      items.push(...results[0].value.items.map(normalizeStatic));
    }

    if (results[1].status === 'fulfilled' && Array.isArray(results[1].value.items)) {
      items.push(...results[1].value.items.map(normalizeAuto));
    }

    if (items.length) render(items);
  });
})();
