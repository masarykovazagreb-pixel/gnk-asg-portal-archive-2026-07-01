// GNK_ASG_NEWSROOM_RSS_V1
// Generira /newsroom/feed.xml iz postojećeg /data/news.json.
// Zaseban, read-only modul - ne mijenja news-auto-publication logiku
// niti postojeći news-live prikaz. Poziva se ili kao mali Worker route,
// ili kao build-step koji piše statični feed.xml u apps/portal/newsroom/.

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
}

function toRfc822(iso) {
  const d = new Date(iso);
  return isNaN(d) ? new Date().toUTCString() : d.toUTCString();
}

function buildRss(articles, opts) {
  const { siteUrl = 'https://gnk-asg.hr', title = 'GNK ASG Newsroom', description = 'Korporativne objave, provjereni izvori i uređivane vijesti GNK DINAMO Ltd. Group i GNK ASG d.o.o.', lang = 'hr' } = opts || {};
  const items = articles.slice(0, 30).map(a => `
    <item>
      <title>${esc(a.title)}</title>
      <link>${esc(a.url || siteUrl)}</link>
      <guid isPermaLink="false">${esc(a.id || a.url || a.title)}</guid>
      <pubDate>${toRfc822(a.published_at || a.publishedAt)}</pubDate>
      <source url="${esc(siteUrl)}">${esc(a.source || 'GNK ASG Newsroom')}</source>
      <description>${esc(a.summary || '')}</description>
    </item>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(title)}</title>
    <link>${esc(siteUrl)}/newsroom/</link>
    <atom:link href="${esc(siteUrl)}/newsroom/feed.xml" rel="self" type="application/rss+xml"/>
    <description>${esc(description)}</description>
    <language>${esc(lang)}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;
}

// --- Worker route varijanta (preporučeno: /newsroom/feed.xml) ---
export async function handleNewsroomFeed(request, env) {
  const url = new URL(request.url);
  const lang = url.pathname.startsWith('/en/') ? 'en' : 'hr';
  const dataRes = await fetch(new URL('/data/news.json', url.origin));
  if (!dataRes.ok) return new Response('news data unavailable', { status: 502 });
  const articles = await dataRes.json();
  const xml = buildRss(Array.isArray(articles) ? articles : [], {
    siteUrl: url.origin,
    title: lang === 'en' ? 'GNK ASG Newsroom' : 'GNK ASG Newsroom',
    description: lang === 'en'
      ? 'Corporate publishing, verified sources and edited news from GNK DINAMO Ltd. Group and GNK ASG d.o.o.'
      : 'Korporativne objave, provjereni izvori i uređivane vijesti GNK DINAMO Ltd. Group i GNK ASG d.o.o.',
    lang
  });
  return new Response(xml, {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=900' }
  });
}

export function isNewsroomFeedPath(path) {
  return path === '/newsroom/feed.xml' || path === '/en/newsroom/feed.xml';
}
