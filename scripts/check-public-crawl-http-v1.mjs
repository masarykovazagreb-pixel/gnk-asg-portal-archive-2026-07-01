#!/usr/bin/env node
// Read-only production crawl availability smoke test.
// Usage: node scripts/check-public-crawl-http-v1.mjs
// Optional: CRAWL_BASE_URL=https://staging.example.com node scripts/check-public-crawl-http-v1.mjs
// Never use this to bypass authentication, WAF, or crawler protection.
const base = process.env.CRAWL_BASE_URL || 'https://gnk-asg.hr';
const paths = ['/', '/en/', '/gnk-aktual/', '/status/', '/en/status/', '/robots.txt', '/sitemap.xml', '/sitemap-index.xml'];
const expected = new Set([200]);
const agent = 'GNK-ASG-Public-Availability-Monitor/1.0 (+https://gnk-asg.hr/)';
let failed = 0;
for (const path of paths) {
  const url = new URL(path, base);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal, headers: { 'user-agent': agent, accept: 'text/html,application/xml,text/xml,text/plain;q=0.9,*/*;q=0.1' } });
    const type = (response.headers.get('content-type') || '').toLowerCase();
    const text = await response.text();
    const shouldBeMarkup = path === '/' || path.endsWith('/');
    const robotsOrSitemap = path === '/robots.txt' || path.endsWith('.xml');
    const noindex = shouldBeMarkup && (/<meta\\s+[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(text) || /noindex/i.test(response.headers.get('x-robots-tag') || ''));
    const unexpectedChallenge = shouldBeMarkup && /<title[^>]*>[^<]*(just a moment|attention required|access denied|error 404)[^<]*<\\/title>/i.test(text);
    const invalidPayload = shouldBeMarkup
      ? !type.includes('text/html') || !/<html[\s>]/i.test(text) || !/<\/html\s*>/i.test(text)
      : path === '/robots.txt' ? !/^(text\/plain|text\/html)/.test(type) || !/User-agent\s*:/i.test(text)
      : !(type.includes('xml') || type.includes('text/plain')) || !/<(?:\\?xml|urlset|sitemapindex|rss)[\\s>]/i.test(text);
    const failedCheck = !expected.has(response.status) || invalidPayload || noindex || unexpectedChallenge || response.url.replace(/\/$/, '') !== url.href.replace(/\/$/, '');
    if (failedCheck) failed++;
    console.log(JSON.stringify({ path, status: response.status, contentType: type, resolvedUrl: response.url, bytes: Buffer.byteLength(text), result: failedCheck ? 'FAIL' : 'PASS', reason: !expected.has(response.status) ? 'http-status' : invalidPayload ? 'content-type-or-invalid-payload' : noindex ? 'noindex-on-public-page' : unexpectedChallenge ? 'challenge-or-soft-error' : failedCheck ? 'unexpected-redirect' : undefined }));
  } catch (error) {
    failed++;
    console.log(JSON.stringify({ path, result: 'FAIL', reason: String(error?.cause?.code || error?.message || error) }));
  } finally {
    clearTimeout(timer);
  }
}
console.log(JSON.stringify({ summary: failed ? 'FAIL' : 'PASS', failed, total: paths.length, note: 'Generic monitor agent; Googlebot access still requires Google Search Console and server/WAF log verification.' }));
if (failed) process.exitCode = 1;
