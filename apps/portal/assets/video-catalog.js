(() => {
  if (window.__GNK_VIDEO_CATALOG__) return;
  window.__GNK_VIDEO_CATALOG__ = 1;

  const READY_STATUSES = new Set(['ready', 'published', 'live']);

  function clean(value) {
    return String(value || '').trim();
  }

  function validAssetUrl(value) {
    const url = clean(value);
    return Boolean(url && (/^https:\/\//i.test(url) || /^\//.test(url)));
  }

  function isUploaded(item = {}) {
    const status = clean(item.status).toLowerCase();
    return READY_STATUSES.has(status) && (validAssetUrl(item.mp4Url) || validAssetUrl(item.streamUrl));
  }

  function normalise(item = {}, index = 0) {
    const contentUrl = validAssetUrl(item.mp4Url) ? clean(item.mp4Url) : '';
    const embedUrl = validAssetUrl(item.streamUrl) ? clean(item.streamUrl) : '';
    const uploaded = isUploaded(item);
    return {
      id: clean(item.id) || `video-${index + 1}`,
      status: clean(item.status).toLowerCase() || 'draft',
      featured: item.featured === true,
      indexable: uploaded && item.indexable !== false,
      uploaded,
      titleHr: clean(item.titleHr || item.title),
      titleEn: clean(item.titleEn || item.titleHr || item.title),
      descriptionHr: clean(item.descriptionHr || item.description),
      descriptionEn: clean(item.descriptionEn || item.descriptionHr || item.description),
      duration: clean(item.duration),
      uploadDate: clean(item.uploadDate),
      poster: validAssetUrl(item.poster) ? clean(item.poster) : '',
      mp4Url: contentUrl,
      streamUrl: embedUrl
    };
  }

  async function loadJson(url) {
    const response = await fetch(`${url}?cb=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function load() {
    const items = [];
    try {
      const featured = await loadJson('/data/video-featured.json');
      if (featured && typeof featured === 'object') items.push(featured);
    } catch {}

    try {
      const library = await loadJson('/data/video-library-items.json');
      if (Array.isArray(library?.items)) items.push(...library.items);
    } catch {}

    const seen = new Set();
    return items
      .map(normalise)
      .filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .sort((left, right) => Number(right.featured) - Number(left.featured));
  }

  window.GNKVideoCatalog = { load, normalise, isUploaded, validAssetUrl };
})();
