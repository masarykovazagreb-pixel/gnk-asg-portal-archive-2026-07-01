const DEFAULT_FALLBACK = 'https://gnk-asg.hr/assets/gnk-asg-social-card.png';

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(value) {
  return new Set(normalize(value).split(/\s+/).filter(token => token.length >= 3));
}

function sourceText(item) {
  return [
    item.id,
    item.category,
    item.title,
    item.alt,
    item.caption,
    item.description,
    ...(Array.isArray(item.topic) ? item.topic : []),
    ...(Array.isArray(item.keywords) ? item.keywords : [])
  ].filter(Boolean).join(' ');
}

function lastUsedAt(item, usageLog) {
  const match = usageLog
    .filter(entry => entry.imageId === item.id || entry.imageUrl === item.url || entry.imageUrl === item.src)
    .sort((a, b) => String(b.usedAt || '').localeCompare(String(a.usedAt || '')))[0];
  return match?.usedAt ? Date.parse(match.usedAt) : 0;
}

function recentlyUsed(item, usageLog, reuseDays) {
  const last = lastUsedAt(item, usageLog);
  if (!last) return false;
  return Date.now() - last < reuseDays * 24 * 60 * 60 * 1000;
}

function eligible(item, options) {
  const url = item.url || item.src;
  if (!url) return false;
  const generated = String(item.id || '').startsWith('img-');
  const statusOk = item.status === 'ready' || (!generated && options.allowLegacyGallery !== false);
  const flagOk = item.eligible === true || item.autoEditorEligible === true || (!generated && options.allowLegacyGallery !== false);
  const metadataOk = Boolean(item.alt && item.title && (item.caption || item.description));
  const widthOk = !item.width || Number(item.width) >= Number(options.minimumWidth || 1200);
  return statusOk && flagOk && metadataOk && widthOk;
}

function score(item, article) {
  const articleTokens = tokens([
    article.title,
    article.summary,
    article.category,
    ...(article.keywords || []),
    ...(article.topics || [])
  ].join(' '));
  const imageTokens = tokens(sourceText(item));
  let total = 0;
  for (const token of articleTokens) {
    if (imageTokens.has(token)) total += 8;
  }
  const articleCategory = normalize(article.category);
  const imageCategory = normalize(item.category);
  if (articleCategory && imageCategory && articleCategory === imageCategory) total += 45;
  if (articleCategory && normalize(sourceText(item)).includes(articleCategory)) total += 20;
  if (normalize(item.title).includes(normalize(article.title))) total += 12;
  return total;
}

export function mergeCatalogs(...catalogs) {
  const map = new Map();
  for (const catalog of catalogs.flat()) {
    const items = Array.isArray(catalog) ? catalog : catalog?.items || [];
    for (const item of items) {
      const key = item.id || item.url || item.src;
      if (key) map.set(key, { ...map.get(key), ...item });
    }
  }
  return [...map.values()];
}

export function selectEditorialImage(article, catalogs, options = {}) {
  const usageLog = Array.isArray(options.usageLog) ? options.usageLog : [];
  const reuseDays = Number(options.preventReuseDays || 7);
  const candidates = mergeCatalogs(catalogs)
    .filter(item => eligible(item, options))
    .map(item => ({
      item,
      score: score(item, article),
      lastUsed: lastUsedAt(item, usageLog),
      recent: recentlyUsed(item, usageLog, reuseDays)
    }))
    .sort((a, b) => {
      if (a.recent !== b.recent) return a.recent ? 1 : -1;
      if (b.score !== a.score) return b.score - a.score;
      if (a.lastUsed !== b.lastUsed) return a.lastUsed - b.lastUsed;
      return String(a.item.id || '').localeCompare(String(b.item.id || ''));
    });

  const selected = candidates[0]?.item;
  if (!selected) {
    return {
      id: 'gnk-asg-brand-fallback',
      url: options.fallback || DEFAULT_FALLBACK,
      src: options.fallback || DEFAULT_FALLBACK,
      title: 'GNK ASG',
      alt: `GNK ASG – ${article.title || article.category || 'korporativna objava'}`,
      caption: 'GNK ASG korporativni vizual.',
      credit: 'GNK ASG',
      width: 1200,
      height: 630,
      mimeType: 'image/png',
      fallback: true
    };
  }

  return {
    ...selected,
    url: selected.url || selected.src,
    src: selected.src || selected.url,
    caption: selected.caption || selected.description,
    credit: selected.credit || 'GNK ASG',
    fallback: false
  };
}

export function imageObjectSchema(image, articleUrl) {
  return {
    '@type': 'ImageObject',
    url: image.url || image.src,
    contentUrl: image.url || image.src,
    caption: image.caption || image.title,
    name: image.title,
    description: image.alt,
    creditText: image.credit || 'GNK ASG',
    width: image.width,
    height: image.height,
    representativeOfPage: true,
    acquireLicensePage: 'https://gnk-asg.hr/legal/',
    associatedArticle: articleUrl
  };
}
