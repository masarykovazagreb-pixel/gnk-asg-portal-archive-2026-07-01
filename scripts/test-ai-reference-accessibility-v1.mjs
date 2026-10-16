import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const pages = [
  { path: 'apps/portal/ai/index.html', locale: 'en', canonical: 'https://gnk-asg.hr/ai/' },
  { path: 'apps/portal/ai/hr/index.html', locale: 'hr', canonical: 'https://gnk-asg.hr/ai/hr/' },
];
const css = read('apps/portal/assets/ai-reference-v1.css');
const js = read('apps/portal/assets/ai-reference-ui-v1.js');
const sitemap = read('apps/portal/sitemap.xml');
const sitemapBuilder = read('scripts/generate-sitemaps.py');
const publicFacts = JSON.parse(read('apps/portal/ai-visibility/facts.json'));

const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)].map((match) => [match[1].toLowerCase(), match[3]]));
const metaContent = (html, nameOrProperty) => {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const values = attrs(match[0]);
    if (values.name === nameOrProperty || values.property === nameOrProperty) return values.content || null;
  }
  return null;
};
const textOnly = (html) => html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const hexColor = (cssText, name) => cssText.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
const linear = (value) => {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const channels = hex.slice(1).match(/../g).map((value) => parseInt(value, 16));
  return 0.2126 * linear(channels[0]) + 0.7152 * linear(channels[1]) + 0.0722 * linear(channels[2]);
};
const contrast = (foreground, background) => {
  const values = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (values[0] + 0.05) / (values[1] + 0.05);
};

assert(css.includes(':focus-visible'), 'visible keyboard focus styling is required');
assert(css.includes('@media(max-width:850px)') && css.includes('@media(max-width:600px)'), 'tablet and mobile layout breakpoints are required');
assert(css.includes('min-width:320px'), 'small mobile viewport support is required');
assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
assert.match(css, /animation-duration:\.01ms!important/);
assert.match(css, /transition-duration:\.01ms!important/);
for (const [foregroundName, foreground] of [
  ['--ai-text', hexColor(css, '--ai-text')],
  ['--ai-muted', hexColor(css, '--ai-muted')],
  ['--ai-blue', hexColor(css, '--ai-blue')],
  ['--ai-gold-strong', hexColor(css, '--ai-gold-strong')],
]) {
  assert(foreground, `${foregroundName} palette token must be defined`);
  for (const backgroundName of ['--ai-bg', '--ai-surface']) {
    const background = hexColor(css, backgroundName);
    assert(background, `${backgroundName} palette token must be defined`);
    assert(contrast(foreground, background) >= 4.5, `${foregroundName} on ${backgroundName} must meet 4.5:1 contrast; got ${contrast(foreground, background).toFixed(2)}:1`);
  }
}

for (const page of pages) {
  const html = read(page.path);
  assert.match(html, new RegExp(`<html lang="${page.locale}"`));
  const canonicalTag = html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i)?.[0];
  assert(canonicalTag, 'canonical URL is required');
  assert.equal(attrs(canonicalTag).href, page.canonical);
  assert.equal(metaContent(html, 'og:url'), page.canonical, 'Open Graph URL must match canonical');
  assert(metaContent(html, 'description'), 'a page-specific meta description is required');
  assert(metaContent(html, 'og:title') && metaContent(html, 'og:description'));
  assert(html.includes('type="application/ld+json"'), 'Schema.org structured data is required');
  assert.equal([...html.matchAll(/<h1\b/gi)].length, 1, 'one primary page heading is required');
  const headingLevels = [...html.matchAll(/<h([1-6])\b/gi)].map((match) => Number(match[1]));
  for (let index = 1; index < headingLevels.length; index += 1) {
    assert(headingLevels[index] <= headingLevels[index - 1] + 1, `heading levels must not skip from h${headingLevels[index - 1]} to h${headingLevels[index]}`);
  }
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const image = attrs(match[0]);
    assert(Object.hasOwn(image, 'alt'), 'every image must declare alt text (empty only for decorative images)');
    if (!image.alt.trim()) {
      const prefix = html.slice(0, match.index);
      const anchorStart = prefix.lastIndexOf('<a ');
      const anchorEnd = prefix.lastIndexOf('</a>');
      assert(anchorStart > anchorEnd, 'empty-alt images must be decorative and inside an accessible link');
      const anchorOpen = html.slice(anchorStart, html.indexOf('>', anchorStart) + 1);
      assert(attrs(anchorOpen)['aria-label'], 'decorative logo links need an accessible name');
    }
  }
  for (const match of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)) {
    const attributes = attrs(match[0].slice(0, match[0].indexOf('>') + 1));
    const inner = match[1];
    const imageAlt = [...inner.matchAll(/<img\b[^>]*>/gi)].map((image) => attrs(image[0]).alt || '').join(' ');
    assert(attributes['aria-label'] || attributes.title || textOnly(inner) || imageAlt, 'links require an accessible name');
  }
  for (const match of html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)) {
    const attributes = attrs(match[0].slice(0, match[0].indexOf('>') + 1));
    assert(attributes.type === 'button', 'page buttons must explicitly declare their type');
    assert(attributes['aria-label'] || textOnly(match[1]), 'buttons require an accessible name');
  }
  assert(html.includes('data-ai-review-status') && html.includes('data-ai-fact-copy-status'));
  assert(html.includes('data-ai-review-history-list'));
  assert(html.includes('aria-live="polite"'));
  const jsonLd = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  assert(jsonLd.length >= 1);
  const parsedSchemas = jsonLd.map((script) => JSON.parse(script[1]));
  const nodes = parsedSchemas.flatMap((schema) => Array.isArray(schema['@graph']) ? schema['@graph'] : [schema]);
  const webPages = nodes.filter((node) => node['@type'] === 'WebPage');
  assert.equal(webPages.length, 1, 'exactly one WebPage node is expected');
  assert.equal(webPages[0].url, page.canonical);
  assert.equal(webPages[0].inLanguage, page.locale);
  assert.equal(webPages[0].publisher?.['@id'], 'https://gnk-asg.hr/#gnk-asg');
  assert.equal(webPages[0].author, undefined, 'editor metadata must not imply authorship');
}

assert(read(pages[0].path).includes('hreflang="hr" href="https://gnk-asg.hr/ai/hr/"'));
assert(read(pages[1].path).includes('hreflang="en" href="https://gnk-asg.hr/ai/"'));
assert(sitemap.includes('<loc>https://gnk-asg.hr/ai/</loc>'));
assert(sitemap.includes('<loc>https://gnk-asg.hr/ai/hr/</loc>'));
assert(sitemap.includes('hreflang="hr" href="https://gnk-asg.hr/ai/hr/"'));
assert(sitemap.includes('hreflang="en" href="https://gnk-asg.hr/ai/"'));
assert(sitemap.includes('hreflang="x-default" href="https://gnk-asg.hr/ai/"'));
assert(sitemapBuilder.includes('if put in ("/ai/", "/ai/hr/")'), 'sitemap generation must preserve the custom English/Croatian AI-route pairing');
assert(sitemapBuilder.includes('x_default_url = BASE_URL + "/ai/"'), 'sitemap x-default must match the page-level English default');
assert(publicFacts.facts.length > 0 && publicFacts.facts.every((fact) => fact.source.startsWith('https://')));
assert.match(js, /navigator\.clipboard\.writeText\(citation\)/, 'citations must be copied only through the user-triggered copy control');
assert.match(js, /copyButton\.addEventListener\('click'/, 'copy action must be user initiated');
assert.match(js, /copyButton\.type = 'button'/, 'dynamic citation controls must not submit forms');
assert.match(js, /copyButton\.setAttribute\('aria-label'/, 'dynamic citation controls need an accessible name');
assert.doesNotMatch(js, /fetch\(\s*["']https?:\/\//i, 'browser code must not call external services directly');
assert.doesNotMatch(js, /api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com/i, 'no external AI-service endpoint may be present');
assert.match(js, /credentials:\s*'omit'/);
console.log('Public AI reference accessibility, contrast, keyboard, mobile, motion, citations and locale SEO: PASS');
