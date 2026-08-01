(() => {
  'use strict';

  if (window.__GNK_SEO_KNOWLEDGE_GRAPH_V1__) return;
  window.__GNK_SEO_KNOWLEDGE_GRAPH_V1__ = true;

  const CONFIG_URL = '/data/seo-knowledge-graph-v1.json';
  const REGISTRY_URL = '/data/editorial-registry.json';

  const normalisePath = (value) => {
    try {
      const path = new URL(value, window.location.origin).pathname;
      const clean = path.replace(/\/+$/, '') || '/';
      return clean === '/' ? '/' : `${clean}/`;
    } catch (_) {
      return '/';
    }
  };

  const normaliseText = (value) => String(value || '')
    .toLocaleLowerCase('hr')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const tokens = (value) => new Set(
    normaliseText(value).split(/\s+/).filter((token) => token.length >= 3)
  );

  const overlapCount = (left, right) => {
    let count = 0;
    left.forEach((token) => { if (right.has(token)) count += 1; });
    return count;
  };

  const language = () => {
    const lang = String(document.documentElement.lang || '').toLowerCase();
    return lang.startsWith('en') || window.location.pathname.startsWith('/en/') ? 'en' : 'hr';
  };

  const protectedPath = (path, config) =>
    (config.protectedPrefixes || []).some((prefix) => path.startsWith(prefix));

  const canonicalPath = () => normalisePath(
    document.querySelector('link[rel="canonical"]')?.href || window.location.href
  );

  const collectionFor = (item, config, lang) => {
    const collection = config.collections?.[item?.type];
    if (!collection) return null;
    return {
      href: lang === 'en' ? collection.en : collection.hr,
      label: lang === 'en' ? collection.labelEn : collection.labelHr
    };
  };

  const pillarMatches = (text, config) => {
    const haystack = normaliseText(text);
    return (config.pillars || []).map((pillar) => {
      const score = (pillar.aliases || []).reduce((total, alias) => {
        const needle = normaliseText(alias);
        return total + (needle && haystack.includes(needle)
          ? Math.max(1, needle.split(/\s+/).length)
          : 0);
      }, 0);
      return { pillar, score };
    }).filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.pillar.id.localeCompare(b.pillar.id));
  };

  const itemText = (item) => [
    item?.title,
    item?.description,
    ...(Array.isArray(item?.keywords) ? item.keywords : [])
  ].join(' ');

  const chooseRelated = (current, items, config, lang) => {
    const currentTokens = tokens(itemText(current));
    const currentPillars = new Set(
      pillarMatches(itemText(current), config).map((entry) => entry.pillar.id)
    );

    return items
      .filter((item) => item?.path && item?.title)
      .filter((item) => normalisePath(item.path) !== normalisePath(current.path))
      .filter((item) => String(item.lang || 'hr').toLowerCase() === lang)
      .filter((item) => !protectedPath(normalisePath(item.path), config))
      .map((item) => {
        const candidatePillars = new Set(
          pillarMatches(itemText(item), config).map((entry) => entry.pillar.id)
        );
        let sharedPillars = 0;
        currentPillars.forEach((pillar) => {
          if (candidatePillars.has(pillar)) sharedPillars += 1;
        });
        const score =
          overlapCount(currentTokens, tokens(itemText(item))) * 2 +
          sharedPillars * 6 +
          (item.type === current.type ? 3 : 0) +
          (item.collection && item.collection === current.collection ? 2 : 0);
        return { item, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) =>
        b.score - a.score ||
        String(b.item.publishedAt || '').localeCompare(String(a.item.publishedAt || '')) ||
        String(a.item.title).localeCompare(String(b.item.title))
      )
      .slice(0, Number(config.defaultRelatedCount || 6))
      .map((entry) => entry.item);
  };

  const appendJsonLd = (payload, marker) => {
    if (document.querySelector(`script[data-gnk-seo-graph="${marker}"]`)) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.gnkSeoGraph = marker;
    script.textContent = JSON.stringify(payload);
    document.head.appendChild(script);
  };

  const renderBreadcrumbs = (current, config, lang) => {
    const main = document.querySelector('main.article, main.editorial-wrap.article');
    const header = main?.querySelector('.article-header');
    if (!main || !header || main.querySelector('.gnk-seo-breadcrumbs')) return [];

    const home = { href: lang === 'en' ? '/en/' : '/', label: lang === 'en' ? 'Home' : 'Početna' };
    const collection = collectionFor(current, config, lang);
    const bestPillarEntry = pillarMatches(itemText(current), config)[0];
    const bestPillar = bestPillarEntry ? {
      href: lang === 'en' ? bestPillarEntry.pillar.en : bestPillarEntry.pillar.hr,
      label: lang === 'en' ? bestPillarEntry.pillar.labelEn : bestPillarEntry.pillar.labelHr
    } : null;

    const crumbs = [home];
    if (bestPillar && normalisePath(bestPillar.href) !== normalisePath(home.href)) crumbs.push(bestPillar);
    if (collection && !crumbs.some((crumb) => normalisePath(crumb.href) === normalisePath(collection.href))) {
      crumbs.push(collection);
    }
    crumbs.push({ href: current.path, label: current.title, current: true });

    const nav = document.createElement('nav');
    nav.className = 'gnk-seo-breadcrumbs';
    nav.setAttribute('aria-label', lang === 'en' ? 'Breadcrumbs' : 'Navigacijska putanja');
    const list = document.createElement('ol');

    crumbs.forEach((crumb) => {
      const li = document.createElement('li');
      if (crumb.current) {
        const span = document.createElement('span');
        span.textContent = crumb.label;
        span.setAttribute('aria-current', 'page');
        li.appendChild(span);
      } else {
        const link = document.createElement('a');
        link.href = crumb.href;
        link.textContent = crumb.label;
        li.appendChild(link);
      }
      list.appendChild(li);
    });

    nav.appendChild(list);
    main.insertBefore(nav, header);
    return crumbs;
  };

  const renderRelated = (related, lang) => {
    if (!related.length) return;
    const main = document.querySelector('main.article, main.editorial-wrap.article');
    const back = main?.querySelector('.article-back');
    const body = main?.querySelector('.article-body');
    if (!main || !body || main.querySelector('.gnk-seo-related')) return;

    const section = document.createElement('section');
    section.className = 'gnk-seo-related';
    section.setAttribute('aria-labelledby', 'gnk-seo-related-title');

    const heading = document.createElement('h2');
    heading.id = 'gnk-seo-related-title';
    heading.textContent = lang === 'en' ? 'Related content' : 'Povezani sadržaj';

    const grid = document.createElement('div');
    grid.className = 'gnk-seo-related-grid';

    related.forEach((item) => {
      const article = document.createElement('article');
      const link = document.createElement('a');
      const title = document.createElement('h3');
      const description = document.createElement('p');
      link.href = item.path;
      title.textContent = item.title;
      description.textContent = item.description || (lang === 'en'
        ? 'Open the related GNK ASG publication.'
        : 'Otvorite povezani sadržaj GNK ASG-a.');
      link.append(title, description);
      article.appendChild(link);
      grid.appendChild(article);
    });

    section.append(heading, grid);
    if (back) main.insertBefore(section, back);
    else main.appendChild(section);
  };

  const boot = async () => {
    const main = document.querySelector('main.article, main.editorial-wrap.article');
    if (!main) return;

    const path = canonicalPath();
    try {
      const [configResponse, registryResponse] = await Promise.all([
        fetch(`${CONFIG_URL}?v=20260801`, { cache: 'no-store' }),
        fetch(`${REGISTRY_URL}?v=20260801`, { cache: 'no-store' })
      ]);
      if (!configResponse.ok || !registryResponse.ok) return;
      const [config, registry] = await Promise.all([configResponse.json(), registryResponse.json()]);
      if (protectedPath(path, config)) return;

      const lang = language();
      const items = Array.isArray(registry.items) ? registry.items : [];
      const current = items.find((item) => normalisePath(item.path) === path) || {
        path,
        title: document.querySelector('h1')?.textContent?.trim() || document.title,
        description: document.querySelector('meta[name="description"]')?.content || '',
        keywords: (document.querySelector('meta[name="keywords"]')?.content || '').split(','),
        type: path.includes('/komentari/') || path.includes('/commentary/') ? 'komentar'
          : path.includes('/analize/') || path.includes('/analyses/') ? 'analiza'
          : path.includes('/kolumne/') || path.includes('/columns/') ? 'kolumna'
          : 'objava',
        lang
      };

      const crumbs = renderBreadcrumbs(current, config, lang);
      const related = chooseRelated(current, items, config, lang);
      renderRelated(related, lang);

      if (crumbs.length) {
        appendJsonLd({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: crumbs.map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: crumb.label,
            item: new URL(crumb.href, config.site).href
          }))
        }, 'breadcrumbs');
      }

      if (related.length) {
        appendJsonLd({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: lang === 'en' ? 'Related GNK ASG content' : 'Povezani sadržaj GNK ASG-a',
          itemListElement: related.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: new URL(item.path, config.site).href,
            name: item.title
          }))
        }, 'related');
      }

      main.dataset.gnkSeoKnowledgeGraph = 'v1';
    } catch (_) {
      // Progressive enhancement: existing content remains usable if data loading fails.
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
