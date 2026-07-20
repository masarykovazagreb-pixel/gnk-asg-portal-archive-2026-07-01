(() => {
  'use strict';
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const read = async (url) => {
    const r = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store', headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error(`${url}:${r.status}`);
    return r.json();
  };

  async function run() {
    const mount = document.getElementById('editorialFeedGrid');
    if (!mount) return;
    try {
      const [manifest, gallery] = await Promise.all([
        read('/data/editorial-plan/manifest.json'),
        read('/data/visual_gallery.json'),
      ]);
      const svgItems = (gallery.items || []).filter((item) => /\.svg$/i.test(item.src || ''));
      const hashSeed = (seed) => {
        let h = 0;
        for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        return h;
      };
      const pickImage = (seed) => (svgItems.length ? svgItems[hashSeed(seed) % svgItems.length] : null);

      const packages = (manifest.packages || [])
        .filter((p) => p.status === 'published')
        .sort((a, b) => Date.parse(b.publishedAt || b.publishAt || 0) - Date.parse(a.publishedAt || a.publishAt || 0));

      const rows = [];
      for (const pkg of packages) {
        for (const file of pkg.files || []) {
          try {
            const items = await read(`/data/editorial-plan/${file}`);
            for (const item of Array.isArray(items) ? items : []) {
              if (item.type === 'objava' || item.type === 'komentar') {
                rows.push({ ...item, publishedAt: pkg.publishedAt || pkg.publishAt });
              }
            }
          } catch (_) {}
        }
      }

      const seen = new Set();
      const unique = rows.filter((r) => (seen.has(r.slug) ? false : (seen.add(r.slug), true)));
      unique.sort((a, b) => Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0));
      const top = unique.slice(0, 6);

      if (!top.length) {
        mount.innerHTML = '';
        return;
      }

      mount.innerHTML = top
        .map((item) => {
          const section = item.type === 'objava' ? 'objave' : 'komentari';
          const label = item.type === 'objava' ? 'Objava' : 'Komentar';
          const img = pickImage(item.slug);
          const imgTag = img ? `<img class="editorial-feed-image" src="${esc(img.src)}" alt="${esc(item.title)} — GNK ASG" loading="lazy">` : '';
          return `<article class="editorial-feed-card">${imgTag}<span class="meta">${esc(label)}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary || item.description || '')}</p><a href="/${section}/${esc(item.slug)}/">Pročitaj →</a></article>`;
        })
        .join('');
    } catch (_) {
      mount.innerHTML = '';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
