import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('apps/portal/data/seo-audit-report.json');
const BASE = 'https://gnk-asg.hr';

// Main sitemap pages get the full audit. Editorial (objave/komentari/analize)
// is spot-checked by count only, since those are individually reviewed
// separately and would make this report huge.
const SITEMAPS = ['sitemap.xml'];

function decode(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

function tag(html, pattern) {
  const m = html.match(pattern);
  return m ? decode(m[1]) : '';
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'GNK-ASG-SEO-Audit/1.0' },
      signal: controller.signal
    });
    return { ok: response.ok, status: response.status, text: response.ok ? await response.text() : '' };
  } catch (error) {
    return { ok: false, status: 0, text: '', error: String(error?.message || error) };
  } finally {
    clearTimeout(timer);
  }
}

async function auditPage(url) {
  const bustedUrl = url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now();
  const { ok, status, text: html, error } = await fetchText(bustedUrl);
  if (!ok) return { url, status, ok: false, error, issues: [`Stranica nije dostupna (HTTP ${status || 'greška'})`] };

  const title = tag(html, /<title[^>]*>([^<]*)<\/title>/i);
  const description = tag(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    || tag(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const canonical = tag(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i)
    || tag(html, /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i);
  const robots = tag(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i);
  const ogTitle = tag(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
  const ogDesc = tag(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i);
  const ogImage = tag(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i);
  const twitterCard = tag(html, /<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']*)["']/i);
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => decode(m[1].replace(/<[^>]+>/g, ' ')));
  const jsonLdCount = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>/gi)].length;
  const hreflangCount = [...html.matchAll(/hreflang=["']([^"']+)["']/gi)].length;
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)];
  const imgsNoAlt = imgs.filter(m => !/alt\s*=\s*["'][^"']+["']/i.test(m[0])).length;
  const textOnly = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = textOnly.split(' ').filter(Boolean).length;

  const issues = [];
  if (!title) issues.push('Nedostaje title');
  else if (title.length > 60) issues.push(`Title predugačak (${title.length} znakova, cilj 50-60)`);
  else if (title.length < 15) issues.push(`Title prekratak (${title.length} znakova)`);
  if (!description) issues.push('Nedostaje meta description');
  else if (description.length > 160) issues.push(`Description predugačak (${description.length} znakova, cilj 140-160)`);
  else if (description.length < 70) issues.push(`Description prekratak (${description.length} znakova)`);
  if (!canonical) issues.push('Nedostaje canonical');
  if (!h1s.length) issues.push('Nedostaje H1');
  else if (h1s.length > 1) issues.push(`Više H1 tagova (${h1s.length})`);
  if (!ogTitle) issues.push('Nedostaje og:title');
  if (!ogDesc) issues.push('Nedostaje og:description');
  if (!ogImage) issues.push('Nedostaje og:image');
  if (!twitterCard) issues.push('Nedostaje twitter:card');
  if (!jsonLdCount) issues.push('Nedostaje JSON-LD structured data');
  if (imgsNoAlt) issues.push(`${imgsNoAlt} slika bez alt atributa`);
  if (wordCount > 0 && wordCount < 150) issues.push(`Malo teksta (${wordCount} riječi, preporuka 150+)`);
  if (!robots) issues.push('Nedostaje meta robots (nije nužno greška, ali provjeriti namjeru)');

  return {
    url, status, ok: true,
    title, titleLen: title.length,
    description, descLen: description.length,
    canonical, robots,
    ogTitle: Boolean(ogTitle), ogDesc: Boolean(ogDesc), ogImage: Boolean(ogImage),
    twitterCard: Boolean(twitterCard),
    h1Count: h1s.length, h1: h1s.slice(0, 2),
    jsonLdCount, hreflangCount,
    imgCount: imgs.length, imgsNoAlt,
    wordCount,
    issues,
    score: Math.max(0, 100 - issues.length * 10)
  };
}

async function loadSitemapUrls() {
  const urls = [];
  for (const sitemap of SITEMAPS) {
    const { ok, text } = await fetchText(`${BASE}/${sitemap}?cb=${Date.now()}`);
    if (!ok) continue;
    const locs = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => decode(m[1]));
    urls.push(...locs);
  }
  return [...new Set(urls)];
}

async function main() {
  const startedAt = new Date().toISOString();
  const urls = await loadSitemapUrls();
  const pages = [];
  for (const url of urls) {
    pages.push(await auditPage(url));
  }

  const auditedOk = pages.filter(p => p.ok);
  const avgScore = auditedOk.length ? Math.round(auditedOk.reduce((sum, p) => sum + p.score, 0) / auditedOk.length) : 0;
  const totalIssues = auditedOk.reduce((sum, p) => sum + p.issues.length, 0);
  const worstPages = [...auditedOk].sort((a, b) => a.score - b.score).slice(0, 8).map(p => ({ url: p.url, score: p.score, issues: p.issues }));

  const report = {
    version: 'GNK_ASG_SEO_AUDIT_V1_20260722',
    generatedAt: startedAt,
    completedAt: new Date().toISOString(),
    sitemapSource: `${BASE}/sitemap.xml`,
    pagesAudited: pages.length,
    pagesOk: auditedOk.length,
    pagesFailed: pages.length - auditedOk.length,
    averageScore: avgScore,
    totalIssues,
    worstPages,
    pages
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, pagesAudited: pages.length, averageScore: avgScore, totalIssues }, null, 2));
}

await main();
