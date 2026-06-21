const READY_STATUSES = new Set(['ready', 'published', 'live']);
const PAGE_URL = 'https://gnk-asg.hr/videoteka/';

export async function handleVideoSitemap(env) {
  const items = await readUploadedVideos(env);
  if (!items.length) {
    return new Response(null, {
      status: 204,
      headers: sitemapHeaders()
    });
  }

  const urls = items.map(item => renderVideoEntry(item)).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ` +
    `xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">${urls}</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: sitemapHeaders()
  });
}

export async function readUploadedVideos(env) {
  const sources = await Promise.all([
    readJsonAsset(env, '/data/video-featured.json'),
    readJsonAsset(env, '/data/video-library-items.json')
  ]);

  const rawItems = [];
  const featured = sources[0];
  const library = sources[1];
  if (featured && typeof featured === 'object') rawItems.push(featured);
  if (Array.isArray(library?.items)) rawItems.push(...library.items);

  const seen = new Set();
  return rawItems
    .map(normaliseVideo)
    .filter(item => {
      if (!item.uploaded || !item.indexable || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
}

function normaliseVideo(item = {}, index = 0) {
  const status = clean(item.status).toLowerCase();
  const contentUrl = validUrl(item.mp4Url) ? absolute(item.mp4Url) : '';
  const playerUrl = validUrl(item.streamUrl) ? absolute(item.streamUrl) : '';
  const thumbnailUrl = validUrl(item.poster) ? absolute(item.poster) : '';
  const uploaded = READY_STATUSES.has(status) && Boolean(contentUrl || playerUrl);

  return {
    id: clean(item.id) || `video-${index + 1}`,
    title: clean(item.titleHr || item.title || item.titleEn) || 'GNK ASG video',
    description: clean(item.descriptionHr || item.description || item.descriptionEn) || 'GNK ASG video',
    thumbnailUrl,
    contentUrl,
    playerUrl,
    uploadDate: clean(item.uploadDate),
    duration: clean(item.duration),
    indexable: item.indexable !== false,
    uploaded
  };
}

function renderVideoEntry(item) {
  const video = [
    `<video:title>${escapeXml(item.title)}</video:title>`,
    `<video:description>${escapeXml(item.description)}</video:description>`,
    item.thumbnailUrl ? `<video:thumbnail_loc>${escapeXml(item.thumbnailUrl)}</video:thumbnail_loc>` : '',
    item.contentUrl ? `<video:content_loc>${escapeXml(item.contentUrl)}</video:content_loc>` : '',
    item.playerUrl ? `<video:player_loc>${escapeXml(item.playerUrl)}</video:player_loc>` : '',
    item.uploadDate ? `<video:publication_date>${escapeXml(item.uploadDate)}</video:publication_date>` : '',
    item.duration ? `<video:duration>${escapeXml(item.duration)}</video:duration>` : ''
  ].filter(Boolean).join('');

  return `<url><loc>${PAGE_URL}#video-${escapeXml(item.id)}</loc><video:video>${video}</video:video></url>`;
}

async function readJsonAsset(env, pathname) {
  if (!env.ASSETS) return null;
  const request = new Request(`https://preview.invalid${pathname}`);
  const response = await env.ASSETS.fetch(request);
  if (!response.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function sitemapHeaders() {
  return {
    'content-type': 'application/xml; charset=utf-8',
    'cache-control': 'no-store',
    'x-gnk-asg-preview': 'true',
    'x-gnk-asg-production-changed': 'false'
  };
}

function validUrl(value) {
  const text = clean(value);
  return Boolean(text && (/^https:\/\//i.test(text) || /^\//.test(text)));
}

function absolute(value) {
  return new URL(String(value), 'https://gnk-asg.hr').href;
}

function clean(value) {
  return String(value || '').trim();
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
