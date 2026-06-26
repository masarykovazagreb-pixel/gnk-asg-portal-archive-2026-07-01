(() => {
  const grid = document.querySelector('[data-insights-grid]');
  if (!grid) return;
  const latestAction = document.querySelector('[data-latest-insight]');

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  }

  async function loadGallery() {
    if (window.GNK_ASG_GALLERY) return window.GNK_ASG_GALLERY;
    await new Promise((resolve,reject) => {
      const script=document.createElement('script');
      script.src='/assets/gallery-engine.js?v=20260626-v2';
      script.onload=resolve;
      script.onerror=reject;
      document.head.appendChild(script);
    }).catch(() => {});
    return window.GNK_ASG_GALLERY || null;
  }

  async function render(items) {
    const published = items.filter(item => item.status === 'published');
    if (!published.length) return;
    const gallery=await loadGallery();
    const rows=[];
    for (let index=0; index<published.length; index+=1) {
      const item=published[index];
      const small=[item.date,item.category].filter(Boolean).join(' · ');
      const title=escapeHtml(item.title);
      const summary=escapeHtml(item.summary);
      const url=escapeHtml(item.url);
      const action=item.language === 'en' ? 'Open publication →' : 'Otvori objavu →';
      const visual=gallery ? await gallery.select(`${item.title} ${item.summary} ${item.category}`,{category:item.category,offset:index}) : null;
      const image=visual ? `<div class="gnk-gallery-auto-image"><img src="${escapeHtml(visual.src)}" alt="${escapeHtml(visual.alt)}" loading="lazy" decoding="async"></div>` : '';
      rows.push('<article class="insight-card">'+image+
        '<small>'+escapeHtml(small)+'</small>'+
        '<h2>'+title+'</h2>'+
        '<p>'+summary+'</p>'+
        '<a href="'+url+'">'+action+'</a>'+
      '</article>');
    }
    grid.innerHTML=rows.join('');
    if (latestAction && published[0]?.url) latestAction.href=published[0].url;
    gallery?.apply(grid).catch(() => {});
  }

  fetch('/data/insights.json?v='+Date.now(),{cache:'no-store'})
    .then(response => response.ok ? response.json() : null)
    .then(data => { if (data && Array.isArray(data.items)) render(data.items); })
    .catch(() => {});
})();
