(() => {
  if (window.__GNK_BUSINESS_NEWS_RECOVERY_V18__) return;
  window.__GNK_BUSINESS_NEWS_RECOVERY_V18__ = true;

  const root = document.getElementById('newsGrid');
  const status = document.getElementById('newsStatus');
  if (!root || !status) return;

  const en = document.body.dataset.language === 'en';
  const locale = en ? 'en-GB' : 'hr-HR';
  const PUBLIC_LIMIT = 60;
  const MINIMUM_VISIBLE = 12;
  const FALLBACK_IMAGE = '/assets/gnk-asg-social-card.png';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const labels = {
    loading: en ? 'Loading review-approved news…' : 'Učitavanje review vijesti…',
    open: en ? 'Open source' : 'Otvori izvor',
    updated: en ? 'Last verification' : 'Zadnja provjera',
    items: en ? 'visible items' : 'vidljivih zapisa',
    business: en ? 'Business / world' : 'Poslovno / svijet',
    sports: en ? 'Sports' : 'Sport',
    review: en ? 'review fallback' : 'review fallback'
  };

  const recoveryFallback = [
    {id:'gnk-recovery-portal-20260706',title:en?'Recovery Preview V1 exposes visible module access':'Recovery Preview V1 otvara vidljive module portala',summary:en?'The review branch exposes direct access to Project Center, Digital Workforce, publications, news, documents, Enterprise, Media Kit and Brand Review without touching production.':'Review grana izlaže izravne ulaze u Project Center, Digital Workforce, objave, vijesti, dokumente, Enterprise, Media Kit i Brand Review bez diranja produkcije.',source:'GNK ASG Review Desk',category:'business',url:'/#quick-access',image:FALLBACK_IMAGE,publishedAt:new Date().toISOString()},
    {id:'gnk-code-new-york-20261007',title:en?'THE CODE remains the central public activation track':'THE CODE ostaje središnja javna aktivacijska linija',summary:en?'The homepage keeps the New York activation pathway visible while preserving confidentiality before formal transaction and identity disclosure.':'Početna stranica zadržava vidljiv put prema aktivaciji u New Yorku, uz čuvanje povjerljivosti prije službene objave transakcija i identiteta društava.',source:'THE CODE Media Desk',category:'business',url:'/the-code/media-invitation/',image:FALLBACK_IMAGE,publishedAt:new Date().toISOString()},
    {id:'gnk-sports-systems-review',title:en?'Sports systems and performance tracking are separated from business news':'Sportski sustavi i performance tracking odvojeni su od poslovnih vijesti',summary:en?'Sports content is labelled separately from business and world items so the portal does not mix strategic business updates with sports monitoring.':'Sportski sadržaj označava se odvojeno od poslovnih i svjetskih zapisa kako portal ne bi miješao strateške poslovne objave sa sportskim praćenjem.',source:'GNK ASG Sports Operations',category:'sports',url:'/enterprise/project-center/',image:FALLBACK_IMAGE,publishedAt:new Date().toISOString()}
  ];

  function ts(value) { const parsed = Date.parse(value || ''); return Number.isFinite(parsed) ? parsed : 0; }
  function fmt(value) { return value ? new Intl.DateTimeFormat(locale,{timeZone:'Europe/Zagreb',dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) : (en ? 'unknown' : 'nepoznato'); }
  function valid(value) { try { const url = new URL(String(value || ''), location.origin); return ['http:','https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }
  function image(value) { return valid(value) || (String(value || '').startsWith('data:image/') ? value : FALLBACK_IMAGE); }
  function listFrom(payload) { return Array.isArray(payload) ? payload : (Array.isArray(payload?.items) ? payload.items : []); }

  async function getJson(path) {
    const response = await fetch(`${path}?cb=${Date.now()}`, {cache:'no-store',headers:{accept:'application/json'}});
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
  }

  function normalize(feeds) {
    const seen = new Set();
    const items = [];
    feeds.forEach(payload => listFrom(payload).slice(0,500).forEach(item => {
      const url = valid(item?.url || item?.link || item?.articleUrl || item?.sourceUrl || item?.share_url);
      const title = String(item?.title || item?.titleHr || item?.titleEn || '').replace(/\s+/g,' ').trim();
      const summary = String(item?.summary || item?.summaryHr || item?.summaryEn || item?.description || item?.text || item?.excerpt || '').replace(/\s+/g,' ').trim();
      const source = String(item?.source || item?.sourceTitle || item?.region || item?.category || 'GNK ASG').replace(/\s+/g,' ').trim();
      const category = String(item?.group || item?.category || item?.region || 'business').toLowerCase();
      const strict = item?.verified === true || item?.verification;
      if (strict && !(item?.verified === true && item?.verification?.article?.ok === true && item?.verification?.image?.ok === true)) return;
      if (!url || !title || summary.length < 30 || !source) return;
      const key = String(item?.id || url).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      items.push({...item,url,image:image(item?.image || item?.imageUrl || item?.image_url || item?.thumbnail || item?.thumbnailUrl),title,summary,source,group:category.includes('sport')?'sports':'business',publishedAt:item?.publishedAt || item?.published_at || item?.date || '',imageAlt:String(item?.imageAlt || title)});
    }));
    items.sort((a,b) => ts(b.publishedAt) - ts(a.publishedAt));
    const newest = Math.max(...items.map(item => ts(item.publishedAt)), Date.now());
    return {items:items.slice(0,PUBLIC_LIMIT),newest};
  }

  function card(item,index) {
    const meta = `${item.group === 'sports' ? labels.sports : labels.business} · ${item.source} · ${fmt(ts(item.publishedAt))}`;
    return `<article class="news-card" id="verified-news-${index}" data-verified-news="1" data-news-group="${esc(item.group)}"><img src="${esc(item.image)}" alt="${esc(item.imageAlt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-news-image><div class="news-card__body"><small>${esc(meta)}</small><h2>${esc(item.title)}</h2><p>${esc(item.summary)}</p><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer external">${labels.open} →</a></div></article>`;
  }

  function visibleStatus(feed, fallbackActive) {
    const visible = root.querySelectorAll('.news-card[data-verified-news="1"]').length;
    const sports = root.querySelectorAll('.news-card[data-news-group="sports"]').length;
    const business = visible - sports;
    const state = visible >= MINIMUM_VISIBLE ? 'LIVE' : 'REVIEW';
    status.dataset.status = visible >= MINIMUM_VISIBLE ? 'live' : 'delayed';
    status.innerHTML = `<strong>${state}</strong> · ${labels.updated}: ${esc(fmt(feed.newest))} · ${visible} ${labels.items} · ${business} ${labels.business} · ${sports} ${labels.sports}${fallbackActive ? ' · ' + labels.review : ''}`;
  }

  async function load() {
    status.textContent = labels.loading;
    let fallbackActive = false;
    let feed = {items:[], newest:Date.now()};
    try {
      const primary = await getJson('/data/news.json');
      let archive = [];
      try { archive = await getJson('/data/news_archive.json'); } catch (_) {}
      feed = normalize([primary, archive]);
    } catch (_) {}
    if (feed.items.length < MINIMUM_VISIBLE) {
      const extra = normalize([recoveryFallback]);
      feed = {items:[...feed.items, ...extra.items].slice(0,PUBLIC_LIMIT), newest:Math.max(feed.newest, extra.newest)};
      fallbackActive = true;
    }
    root.innerHTML = feed.items.map(card).join('');
    root.querySelectorAll('[data-news-image]').forEach(img => img.addEventListener('error', () => { img.src = FALLBACK_IMAGE; }, {once:true}));
    visibleStatus(feed, fallbackActive);
  }

  load();
})();
