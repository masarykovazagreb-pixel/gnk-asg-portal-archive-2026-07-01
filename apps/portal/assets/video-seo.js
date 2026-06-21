(() => {
  if (window.__GNK_VIDEO_SEO__) return;
  window.__GNK_VIDEO_SEO__ = 1;

  function absoluteUrl(value) {
    try {
      return new URL(String(value || ''), window.location.origin).href;
    } catch {
      return '';
    }
  }

  function removeExisting() {
    document.querySelectorAll('script[data-gnk-video-object]').forEach(node => node.remove());
  }

  function addVideoObject(item, language) {
    if (!item?.uploaded || !item?.indexable) return;
    const title = language === 'en' ? item.titleEn : item.titleHr;
    const description = language === 'en' ? item.descriptionEn : item.descriptionHr;
    const graph = {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      '@id': `${window.location.href.split('#')[0]}#video-${item.id}`,
      name: title || 'GNK ASG video',
      description: description || title || 'GNK ASG video',
      thumbnailUrl: item.poster ? [absoluteUrl(item.poster)] : undefined,
      uploadDate: item.uploadDate || undefined,
      duration: item.duration || undefined,
      contentUrl: item.mp4Url ? absoluteUrl(item.mp4Url) : undefined,
      embedUrl: item.streamUrl ? absoluteUrl(item.streamUrl) : undefined,
      inLanguage: language === 'en' ? 'en' : 'hr'
    };

    Object.keys(graph).forEach(key => graph[key] === undefined && delete graph[key]);
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.gnkVideoObject = item.id;
    script.textContent = JSON.stringify(graph);
    document.head.appendChild(script);
  }

  async function apply(language = document.documentElement.lang || 'hr') {
    if (!window.GNKVideoCatalog) return [];
    const items = await window.GNKVideoCatalog.load();
    removeExisting();
    items.forEach(item => addVideoObject(item, language.toLowerCase().startsWith('en') ? 'en' : 'hr'));
    return items.filter(item => item.uploaded && item.indexable);
  }

  window.GNKVideoSEO = { apply };
})();
