// GNK ASG — Social Distribution Engine (dry-run ready; live posting activates
// once platform credentials are added as repo secrets).
//
// Svrha: automatski, barem 2x dnevno, uzima sadržaj iz AKTUAL/registryja i
// oblikuje ga po pravilima svake platforme (Facebook, Instagram, LinkedIn, X),
// s ispravnom duljinom teksta, hashtagovima, meta opisom i odabranom slikom.
// U dry-run modu (bez API ključeva) samo generira i sprema plan objava
// (JSON + čitljiv HTML pregled) — ništa se stvarno ne šalje dok se ne
// dodaju platform secrets, tada isti kod prelazi u live slanje.
//
// Izvori sadržaja (prioritet po slotu):
//   jutarnji slot  -> najnovija editorial objava (analiza/kolumna/komentar)
//   popodnevni slot -> AKTUAL vijest dana (featured) ILI World Topics analiza
//   uvijek: "Odobrio urednik: Nermin Sefić" u napomeni, nikad u samom postu
//   (to je uređivačka bilješka za log, ne javni tekst)
//
// Platform pravila (2026):
//   Facebook   : do ~63.000 znakova prakticno, ali optimalno 40-80 riječi + link + slika
//   Instagram  : caption do 2.200 znakova, prvih ~125 vidljivo bez "more"; do 30 hashtaga,
//                preporučeno 5-10; treba SLIKU (nema teksta-only objava)
//   LinkedIn   : do 3.000 znakova, optimalno 150-300 riječi za engagement; 3-5 hashtaga
//   X (Twitter): 280 znakova (standardni nalog); kratko + link + 1-3 hashtaga
//
// Stanje se čuva u apps/portal/data/social-distribution/ (plan, published, log)
// tako da nikad ne dupliciramo istu stavku na istoj platformi.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const SITE = 'https://gnk-asg.hr';
const DATA_DIR = 'apps/portal/data/social-distribution';
const PLAN_PATH = `${DATA_DIR}/plan.json`;
const STATE_PATH = `${DATA_DIR}/published.json`;
const LOG_PATH = `${DATA_DIR}/log.json`;

const read = (p, fallback) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; } };
const write = (p, obj) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(obj, null, 2) + '\n'); };
const writeText = (p, text) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); };

// ---------------------------------------------------------------------------
// Platform konfiguracija: limiti, ton, format. Mijenjati SAMO ovdje kad se
// pravila platforme promijene — sva logika ispod se na to oslanja.
// ---------------------------------------------------------------------------
const PLATFORMS = {
  facebook: {
    label: 'Facebook',
    maxChars: 8000,          // tehnički veće, ali dobra praksa: kratko iznad "See more"
    idealWords: [40, 90],
    hashtagCount: [3, 5],
    requiresImage: false,
    linkInline: true,        // link se ubacuje u tekst (FB ga i dalje sam pretvara u karticu)
    tone: 'topao, novinarski, s pitanjem ili pozivom na komentar na kraju',
  },
  instagram: {
    label: 'Instagram',
    maxChars: 2200,
    visibleChars: 125,       // koliko se vidi bez klika na "more"
    idealWords: [60, 150],
    hashtagCount: [8, 15],
    hashtagBlockSeparate: true, // hashtagovi idu u zaseban blok na kraju (norma na IG)
    requiresImage: true,
    linkInline: false,       // IG ne podržava klikabilne linkove u captionu -> "link u bio/komentaru"
    tone: 'vizualan, emotivan uvod u prvih 125 znakova, storytelling',
  },
  linkedin: {
    label: 'LinkedIn',
    maxChars: 3000,
    idealWords: [120, 300],
    hashtagCount: [3, 5],
    requiresImage: false,
    linkInline: true,
    tone: 'stručan, poslovni, s jasnom tezom u prve dvije rečenice (LinkedIn skraćuje rano)',
  },
  x: {
    label: 'X',
    maxChars: 280,
    idealWords: [15, 35],
    hashtagCount: [1, 2],
    requiresImage: false,
    linkInline: true,
    tone: 'sažeto, udarno, jedna glavna ideja',
  },
};

// ---------------------------------------------------------------------------
// Uzimanje sadržaja: editorial registry (analize/kolumne/komentari/objave)
// + AKTUAL featured vijest + World Topics raspored kao izvori.
// ---------------------------------------------------------------------------
function loadSources() {
  const registry = read('apps/portal/data/editorial-registry.json', { items: [] });
  const news = read('apps/portal/data/news.json', []);
  const newsItems = Array.isArray(news) ? news : (news.items || news.news || []);
  const worldTopicsSchedule = read('apps/portal/data/aktual-world-topics-schedule.json', { schedule: [] });
  const worldMonitor = read('apps/portal/data/world-monitor.json', { categories: {} });
  const cibonaNews = read('apps/portal/data/cibona-news.json', { items: [] });
  const weather = read('apps/portal/data/weather-zagreb.json', {});
  const market = read('apps/portal/data/market.json', {});
  return { registry, newsItems, worldTopicsSchedule, worldMonitor, cibonaNews, weather, market };
}

function zagrebDate() {
  const d = new Date();
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zagreb' }).format(d);
}
function zagrebSlot() {
  const hour = parseInt(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zagreb', hour: '2-digit', hour12: false }).format(new Date()), 10);
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'digest';
}

function pickMorningItem(registry, state) {
  const items = (registry.items || [])
    .filter(x => x?.path && x?.url && !state.usedIds?.includes(x.path))
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  return items[0] || null;
}

function pickDigestItem(worldMonitor, cibonaNews, weather, market, state) {
  // Sastavlja dnevni digest iz World Monitor (besplatni izvori), Cibona,
  // vremena i tržišta — "posredna tablica" u čitljivom, skeniranom obliku
  // (ne HTML tablica, nego strukturiran sažetak pogodan za sve platforme).
  const today = zagrebDate();
  const digestId = `digest-${today}`;
  if (state.usedIds?.includes(digestId)) return null;

  const lines = [];
  const wmCats = worldMonitor?.categories || {};
  const eq = wmCats.natural?.seismology;
  if (eq?.state === 'live' && eq.items?.[0]) {
    lines.push({ label_hr: 'Potres', label_en: 'Earthquake', value: eq.items[0].title });
  }
  const econ = wmCats.economy?.economic;
  if (econ?.state === 'live' && econ.items?.[0]) {
    lines.push({ label_hr: 'Ekonomija', label_en: 'Economy', value: econ.items[0].title });
  }
  const conflicts = wmCats.geopolitical?.conflicts;
  if (conflicts?.state === 'live' && conflicts.items?.[0]) {
    lines.push({ label_hr: 'Svijet', label_en: 'World', value: conflicts.items[0].title });
  }
  const cibonaItem = (cibonaNews?.items || [])[0];
  if (cibonaItem) {
    lines.push({ label_hr: 'Cibona', label_en: 'Cibona', value: cibonaItem.title_hr });
  }
  if (weather?.state === 'live' && weather.current) {
    lines.push({ label_hr: 'Vrijeme u Zagrebu', label_en: 'Zagreb weather', value: `${Math.round(weather.current.temperature_c)}°C, ${weather.current.condition_hr}` });
  }
  const marketPairs = (market?.pairs || market?.rates || []);
  if (Array.isArray(marketPairs) && marketPairs.length) {
    const eurUsd = marketPairs.find(p => p.pair === 'EUR/USD' || p.symbol === 'EURUSD');
    if (eurUsd) lines.push({ label_hr: 'EUR/USD', label_en: 'EUR/USD', value: String(eurUsd.value || eurUsd.rate || '') });
  }

  if (lines.length < 2) return null; // premalo za smislen digest

  const description = lines.map(l => `${l.label_hr}: ${l.value}`).join(' · ');

  return {
    path: '/gnk-aktual/',
    url: `${SITE}/gnk-aktual/`,
    title: `AKTUAL dnevni pregled — ${today}`,
    description,
    image: null,
    hashtags: ['NerminSefic', 'GNKASG', 'GNKDINAMOLtd', 'AKTUALMedia'],
    language: 'hr',
    kind: 'digest',
    id: digestId,
  };
}

function pickAfternoonItem(newsItems, worldTopicsSchedule, state) {
  // Prefer today's World Topics analysis if scheduled and not yet used
  const today = zagrebDate();
  const wt = (worldTopicsSchedule.schedule || []).find(x => x.date === today);
  if (wt && !state.usedIds?.includes(wt.url_hr)) {
    return {
      path: wt.url_hr?.replace(SITE, '') || '',
      url: wt.url_hr,
      title: wt.title_hr,
      description: wt.summary_hr,
      image: wt.image,
      hashtags: ['NerminSefic', 'GNKASG', 'GNKDINAMOLtd', 'SvjetskeTeme'],
      language: 'hr',
      kind: 'world-topics',
    };
  }
  // Otherwise featured AKTUAL news item (highest-quality recent item with image)
  const candidates = (newsItems || [])
    .filter(x => x?.image && x?.summary && x.summary.length >= 80 && !state.usedIds?.includes(x.id))
    .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
  const top = candidates[0];
  if (!top) return null;
  return {
    path: top.share_url || '',
    url: `${SITE}${top.share_url || ''}`,
    title: top.title,
    description: top.summary,
    image: top.image,
    hashtags: ['NerminSefic', 'GNKASG', 'GNKDINAMOLtd', 'AKTUALMedia'],
    language: 'hr',
    kind: 'aktual-news',
    id: top.id,
  };
}

// ---------------------------------------------------------------------------
// Formatiranje teksta po platformi. Vraća { text, hashtagsLine, imageUrl, link }
// ---------------------------------------------------------------------------
function stripHtml(s) { return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
function truncateWords(s, maxChars) {
  if (s.length <= maxChars) return s;
  const cut = s.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > maxChars - 40 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}

function buildHashtags(baseTags, count) {
  const [min, max] = count;
  const pool = [...new Set(baseTags)];
  return pool.slice(0, max).map(t => '#' + t).join(' ');
}

function composePost(item, platformKey) {
  const cfg = PLATFORMS[platformKey];
  const title = stripHtml(item.title || '');
  const desc = stripHtml(item.description || '');
  const link = item.url || `${SITE}${item.path || ''}`;
  const hashtagsLine = buildHashtags(item.hashtags || ['NerminSefic', 'GNKASG'], cfg.hashtagCount);

  let bodyParts;
  if (platformKey === 'x') {
    // Naslov + kratki teaser, ostavi mjesta za link + 1-2 hashtaga
    const reserve = link.length + 1 + Math.min(2, hashtagsLine.split(' ').length) * 12 + 5;
    const headline = truncateWords(title, cfg.maxChars - reserve);
    bodyParts = [headline, link, hashtagsLine.split(' ').slice(0, 2).join(' ')];
  } else if (platformKey === 'instagram') {
    // Prvih 125 znakova = udarna rečenica; opis nakon; hashtagovi u zasebnom bloku
    const hook = truncateWords(title, cfg.visibleChars);
    const body = truncateWords(desc, cfg.maxChars - hook.length - hashtagsLine.length - 20);
    bodyParts = [hook, '', body, '', '(link u bio / komentaru)', '', '.', '.', '.', hashtagsLine];
  } else if (platformKey === 'linkedin') {
    const hook = title;
    const body = truncateWords(desc, cfg.maxChars - hook.length - link.length - hashtagsLine.length - 30);
    bodyParts = [hook, '', body, '', link, '', hashtagsLine];
  } else { // facebook
    const hook = title;
    const body = truncateWords(desc, cfg.maxChars - hook.length - link.length - hashtagsLine.length - 30);
    bodyParts = [hook, '', body, '', link, '', hashtagsLine];
  }
  const text = bodyParts.filter(l => l !== undefined).join('\n').trim();
  return {
    platform: platformKey,
    text,
    charCount: text.length,
    withinLimit: text.length <= cfg.maxChars,
    imageUrl: item.image ? (item.image.startsWith('http') ? item.image : `${SITE}${item.image}`) : null,
    link,
    requiresImage: cfg.requiresImage,
  };
}


// ---------------------------------------------------------------------------
// PLATFORM ADAPTERI — spremni predlošci, aktiviraju se dodavanjem tokena kao
// repo secrets i postavljanjem SOCIAL_LIVE=1. Svaka funkcija vraća
// { ok, id?, error? }. Pozivi se rade niže u glavnom LIVE bloku.
// ---------------------------------------------------------------------------
async function postToFacebook(post) {
  const token = process.env.FB_PAGE_TOKEN;
  if (!token) return { ok: false, error: 'FB_PAGE_TOKEN nije postavljen' };
  try {
    const pageId = process.env.FB_PAGE_ID; // ID stranice, ne osobnog profila
    const url = `https://graph.facebook.com/v21.0/${pageId}/feed`;
    const body = new URLSearchParams({ message: post.text, access_token: token });
    if (post.imageUrl) body.set('link', post.imageUrl); // FB sam generira preview karticu iz linka u tekstu
    const r = await fetch(url, { method: 'POST', body });
    const j = await r.json();
    return r.ok ? { ok: true, id: j.id } : { ok: false, error: JSON.stringify(j).slice(0, 300) };
  } catch (e) { return { ok: false, error: String(e?.message || e).slice(0, 300) }; }
}

async function postToInstagram(post) {
  const token = process.env.FB_PAGE_TOKEN; // IG Business koristi isti Meta token
  const igId = process.env.IG_BUSINESS_ID;
  if (!token || !igId) return { ok: false, error: 'FB_PAGE_TOKEN ili IG_BUSINESS_ID nije postavljen' };
  if (!post.imageUrl) return { ok: false, error: 'Instagram traži sliku, nema dostupne za ovu stavku' };
  try {
    // Korak 1: kreiraj media container
    const createUrl = `https://graph.facebook.com/v21.0/${igId}/media`;
    const createBody = new URLSearchParams({ image_url: post.imageUrl, caption: post.text, access_token: token });
    const createR = await fetch(createUrl, { method: 'POST', body: createBody });
    const createJ = await createR.json();
    if (!createR.ok) return { ok: false, error: JSON.stringify(createJ).slice(0, 300) };
    // Korak 2: objavi container
    const publishUrl = `https://graph.facebook.com/v21.0/${igId}/media_publish`;
    const publishBody = new URLSearchParams({ creation_id: createJ.id, access_token: token });
    const publishR = await fetch(publishUrl, { method: 'POST', body: publishBody });
    const publishJ = await publishR.json();
    return publishR.ok ? { ok: true, id: publishJ.id } : { ok: false, error: JSON.stringify(publishJ).slice(0, 300) };
  } catch (e) { return { ok: false, error: String(e?.message || e).slice(0, 300) }; }
}

async function postToLinkedIn(post) {
  const token = process.env.LINKEDIN_ORG_TOKEN;
  const orgUrn = process.env.LINKEDIN_ORG_URN; // npr. urn:li:organization:12345678
  if (!token || !orgUrn) return { ok: false, error: 'LINKEDIN_ORG_TOKEN ili LINKEDIN_ORG_URN nije postavljen' };
  try {
    const url = 'https://api.linkedin.com/v2/ugcPosts';
    const body = {
      author: orgUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: post.text },
          shareMediaCategory: post.imageUrl ? 'IMAGE' : 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    };
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0' },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, id: r.headers.get('x-restli-id') || j.id } : { ok: false, error: JSON.stringify(j).slice(0, 300) };
  } catch (e) { return { ok: false, error: String(e?.message || e).slice(0, 300) }; }
}

async function postToX(post) {
  const apiKey = process.env.X_API_KEY, apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN, accessSecret = process.env.X_ACCESS_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return { ok: false, error: 'X OAuth1 kredencijali nisu potpuni' };
  try {
    // OAuth 1.0a User Context potpisivanje — koristi se ugrađeni crypto, bez vanjske ovisnosti
    const crypto = await import('node:crypto');
    const url = 'https://api.twitter.com/2/tweets';
    const method = 'POST';
    const oauthParams = {
      oauth_consumer_key: apiKey,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: String(Math.floor(Date.now() / 1000)),
      oauth_token: accessToken,
      oauth_version: '1.0',
    };
    const paramString = Object.keys(oauthParams).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`).join('&');
    const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
    const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`;
    const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
    oauthParams.oauth_signature = signature;
    const authHeader = 'OAuth ' + Object.keys(oauthParams).sort().map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`).join(', ');
    const r = await fetch(url, {
      method,
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: post.text }),
    });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, id: j.data?.id } : { ok: false, error: JSON.stringify(j).slice(0, 300) };
  } catch (e) { return { ok: false, error: String(e?.message || e).slice(0, 300) }; }
}

const ADAPTERS = { facebook: postToFacebook, instagram: postToInstagram, linkedin: postToLinkedIn, x: postToX };

// ---------------------------------------------------------------------------
// Glavni tijek
// ---------------------------------------------------------------------------
const { registry, newsItems, worldTopicsSchedule, worldMonitor, cibonaNews, weather, market } = loadSources();
const state = read(STATE_PATH, { usedIds: [], history: [] });
const plan = read(PLAN_PATH, { generatedAt: null, slot: null, items: [] });
const log = read(LOG_PATH, { runs: [] });

const slot = zagrebSlot();
const item = slot === 'morning'
  ? pickMorningItem(registry, state)
  : slot === 'afternoon'
  ? pickAfternoonItem(newsItems, worldTopicsSchedule, state)
  : pickDigestItem(worldMonitor, cibonaNews, weather, market, state);

const runEntry = { at: new Date().toISOString(), slot, zagrebDate: zagrebDate() };

if (!item) {
  console.log(`Nema novog sadržaja za ${slot} slot — preskačem ovaj ciklus.`);
  runEntry.result = 'no-content';
  log.runs.unshift(runEntry);
  log.runs = log.runs.slice(0, 200);
  write(LOG_PATH, log);
  process.exit(0);
}

const posts = Object.keys(PLATFORMS).map(p => composePost(item, p));

const LIVE = process.env.SOCIAL_LIVE === '1'; // aktivira se tek kad postoje platform secrets
const results = [];
for (const post of posts) {
  if (LIVE) {
    const adapter = ADAPTERS[post.platform];
    const outcome = adapter ? await adapter(post) : { ok: false, error: 'nema adaptera' };
    results.push({ ...post, status: outcome.ok ? 'published' : 'failed', platformPostId: outcome.id || null, error: outcome.error || null });
  } else {
    results.push({ ...post, status: 'dry-run' });
  }
}

plan.generatedAt = new Date().toISOString();
plan.slot = slot;
plan.items = [{
  sourceKind: item.kind || 'editorial',
  sourceTitle: item.title,
  sourceUrl: item.url,
  editorApproved: 'Nermin Sefić',
  posts: results,
}, ...plan.items].slice(0, 60);
write(PLAN_PATH, plan);

// Mark as used so we never repeat the same source item across slots
state.usedIds = [...new Set([...(state.usedIds || []), item.path || item.id])].slice(-500);
state.history = [{ at: new Date().toISOString(), slot, title: item.title, url: item.url }, ...(state.history || [])].slice(0, 300);
write(STATE_PATH, state);

runEntry.result = LIVE ? 'live-pending-adapters' : 'dry-run-ok';
runEntry.item = { title: item.title, url: item.url, kind: item.kind || 'editorial' };
log.runs.unshift(runEntry);
log.runs = log.runs.slice(0, 200);
write(LOG_PATH, log);

// ---------------------------------------------------------------------------
// Čitljiv HTML pregled plana (za brzi ljudski uvid u ono što bi izašlo)
// ---------------------------------------------------------------------------
const previewRows = results.map(r => `
  <div style="border:1px solid #333;border-radius:8px;padding:14px;margin-bottom:14px">
    <div style="font-weight:700;margin-bottom:6px">${r.platform.toUpperCase()} ${r.withinLimit ? '✓' : '⚠ predugo'} — ${r.charCount} znakova</div>
    <pre style="white-space:pre-wrap;font-family:inherit;font-size:.88rem;margin:0">${r.text.replace(/</g, '&lt;')}</pre>
    ${r.imageUrl ? `<div style="margin-top:8px;font-size:.8rem;color:#8bd">slika: ${r.imageUrl}</div>` : (r.requiresImage ? '<div style="margin-top:8px;color:#f77;font-size:.8rem">⚠ platforma traži sliku, nema dostupne</div>' : '')}
  </div>`).join('');
const html = `<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Social Distribution — Plan (dry-run)</title><meta name="robots" content="noindex,nofollow">
<style>body{font:15px/1.5 system-ui,Arial,sans-serif;background:#0b0d10;color:#eee;max-width:820px;margin:2rem auto;padding:0 1rem}a{color:#8bd}</style></head><body>
<h1>Social Distribution — plan objava (dry-run)</h1>
<p>Slot: <strong>${slot === 'morning' ? 'jutarnji' : 'popodnevni'}</strong> · Generirano: ${plan.generatedAt}</p>
<h2>${(item.title || '').replace(/</g, '&lt;')}</h2>
<p><a href="${item.url}">${item.url}</a> · Odobrio urednik: Nermin Sefić</p>
${previewRows}
<p style="margin-top:24px;font-size:.8rem;color:#888">LIVE=${LIVE ? 'da' : 'ne (dry-run — postavi SOCIAL_LIVE=1 i adaptere kad credentiali budu dodani)'}</p>
</body></html>`;
writeText(`${DATA_DIR}/preview.html`, html);

console.log(JSON.stringify({
  slot,
  item: { title: item.title, url: item.url },
  live: LIVE,
  posts: results.map(r => ({ platform: r.platform, chars: r.charCount, withinLimit: r.withinLimit, hasImage: !!r.imageUrl })),
}, null, 2));
