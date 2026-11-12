import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFeed } from '../apps/region/engine/feed.mjs';
import { KANAL_DESIGN_V2_CSS as css } from '../apps/region/engine/kanal-design-v2.mjs';

const feed = (image) => `<?xml version="1.0"?><rss><channel><item><title>Sample news</title><link>https://example.org/story</link><description>Publisher summary.</description><pubDate>Wed, 11 Nov 2026 12:00:00 GMT</pubDate><media:thumbnail url="${image}"/></item></channel></rss>`;
test('extensionless CDN image URL is omitted until the restricted proxy can serve it', () => {
  const [item] = parseFeed(feed('https://images.example.org/resize/800?id=135'), { base:'https://example.org/feed.xml' });
  assert.equal(item.image, '');
});
test('publisher image with extension remains supported', () => {
  const [item] = parseFeed(feed('https://images.example.org/news/photo.webp'), { base:'https://example.org/feed.xml' });
  assert.equal(item.image, 'https://images.example.org/news/photo.webp');
});
test('script, SVG and HTML endpoints are not accepted as photos', () => {
  for (const path of ['/logo.svg', '/article.html', '/app.js', '/story.json']) {
    const [item] = parseFeed(feed('https://images.example.org'+path), { base:'https://example.org/feed.xml' });
    assert.equal(item.image, '', path);
  }
});
test('homepage shows more RSS-derived stories as lazy-loaded image cards', () => {
  const builder=readFileSync(new URL('../apps/region/engine/build.mjs', import.meta.url),'utf8');
  assert.match(builder, /const more = items\.slice\(13, 45\)/);
  assert.match(builder, /const moreCards = more\.slice\(0, 12\)/);
  assert.match(builder, /class="grid grid--more"/);
  assert.match(builder, /moreCards\.map\(\(i\) => card\(channel, strings, i\)\)/);
  assert.match(builder, /loading="\$\{lead \? 'eager' : 'lazy'\}"/);
});
test('editorial CSS covers desktop, tablet, mobile and reduced-motion', () => {
  for(const selector of ['.intro--hero', '.ed-logo', '.leadgrid', '.cardmedia', '.grid', '.cardtitle', '.eds-img', '@media(max-width:760px)', '@media(max-width:520px)', 'prefers-reduced-motion']) {
    assert.ok(css.includes(selector), selector);
  }
  assert.match(css,/object-fit:cover/);
});
test('unified red and gold favicon is generated from canonical brand asset', () => {
  const icon = readFileSync(new URL('../apps/shared/brand/favicon.svg', import.meta.url), 'utf8');
  assert.match(icon, /#b4162e/i);
  assert.match(icon, /#d4af37/i);
  const builder=readFileSync(new URL('../apps/region/engine/build.mjs', import.meta.url),'utf8');
  assert.match(builder,/FAVICON_SVG/);
  assert.match(builder,/writeFileSync\(join\(dir, 'assets', 'favicon.svg'\), favicon\(\)\)/);
});
