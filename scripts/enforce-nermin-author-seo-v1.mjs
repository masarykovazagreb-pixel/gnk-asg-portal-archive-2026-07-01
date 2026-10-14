#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const PORTAL = 'apps/portal';
const ROOT = `${PORTAL}/gnk-aktual/kolumne`;
const REGISTRY = `${PORTAL}/data/editorial-registry.json`;
const WRITE = process.argv.includes('--write');
const PERSON = 'https://gnk-asg.hr/nermin-sefic/';
const PERSON_ID = 'https://gnk-asg.hr/nermin-sefic/#person';
const AUTHOR_MARK = '<p class="article-author-mark" data-author-mark="nermin-sefic">#NerminSefić #NerminSefic</p>';

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(file, out);
    else if (ent.isFile() && ent.name === 'index.html') out.push(file);
  }
  return out;
}
function cleanKeywords(html) {
  return html.replace(/<meta\s+name=["']keywords["']\s+content=["']([^"']*)["']\s*\/?>/gi, (full, content) => {
    const kept = String(content).split(',').map((value) => value.trim()).filter(Boolean)
      .filter((value) => !/(?:nermin|sefi[cć])/i.test(value));
    return kept.length ? `<meta name="keywords" content="${kept.join(', ')}">` : '';
  });
}
function normalizeAuthorMarks(html) {
  html = html.replace(/<p[^>]*class=["'][^"']*(?:article-author-mark|author-hashtags)[^"']*["'][^>]*>[^<]*(?:#NerminSefić|#NerminSefic|#SefićNermin|#SeficNermin)[^<]*<\/p>/gi, '');
  if (html.includes('</article>')) return html.replace('</article>', `${AUTHOR_MARK}</article>`);
  if (html.includes('</main>')) return html.replace('</main>', `${AUTHOR_MARK}</main>`);
  return html + AUTHOR_MARK;
}
function addRelAuthor(html) {
  if (/<link\s+rel=["']author["']/i.test(html)) return html;
  const canonical = html.match(/<link\s+rel=["']canonical["'][^>]*>/i);
  if (canonical) return html.replace(canonical[0], `${canonical[0]}<link rel="author" href="${PERSON}">`);
  return html.replace('</head>', `<link rel="author" href="${PERSON}"></head>`);
}
function strengthenSchema(html) {
  return html.replace(/"author"\s*:\s*\{\s*"@type"\s*:\s*"Person"\s*,\s*"name"\s*:\s*"Nermin Sefić"\s*\}/g,
    `"author":{"@type":"Person","@id":"${PERSON_ID}","name":"Nermin Sefić","url":"${PERSON}"}`);
}
function visibleNerminByline(html) {
  return [...html.matchAll(/<(?:div|p|span|aside)\b[^>]*class=["'][^"']*\b(?:article-meta|meta-row|meta|byline|author-box|author-box-name|author-name|article-author|oznaka)\b[^"']*["'][^>]*>[\s\S]*?<\/(?:div|p|span|aside)>/gi)]
    .some((match) => !/\bclass=["'][^"']*\beditorial-author-inline\b/i.test(match[0])
      && /nermin\s+sefi[cć]/i.test(match[0].replace(/<[^>]+>/g, ' ')));
}
function routeFor(file) {
  const relative = path.relative(PORTAL, file).split(path.sep).join('/');
  return `/${relative.replace(/index\.html$/i, '')}`;
}

if (!fs.existsSync(REGISTRY)) throw new Error(`Missing canonical editorial registry: ${REGISTRY}`);
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const verifiedRoutes = new Set((registry.items || [])
  .filter((item) => item.type === 'kolumna' && item.language === 'hr' && item.status === 'published'
    && item.author === 'Nermin Sefić' && item.authorSchemaVerified === true)
  .map((item) => item.path));
const files = walk(ROOT);
const report = {
  version: 'NERMIN_AUTHOR_SEO_V1',
  scanned: files.length,
  eligible: 0,
  skippedUnverified: 0,
  changed: 0,
  changedPages: [],
  skippedPages: [],
  violations: [],
};
for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  if (!/<meta\s+name=["']author["']\s+content=["']Nermin Sefić["']/i.test(original)) continue;
  const route = routeFor(file);
  if (!verifiedRoutes.has(route)) {
    report.skippedUnverified++;
    report.skippedPages.push({ route, reason: 'not a published canonical column with registry-verified visible Nermin byline and Person schema' });
    continue;
  }
  if (!visibleNerminByline(original)) {
    report.violations.push(`${route}: registry-verified Nermin authorship has no visible byline; page was not modified.`);
    continue;
  }
  report.eligible++;
  let html = original;
  html = cleanKeywords(html);
  html = addRelAuthor(html);
  html = strengthenSchema(html);
  html = normalizeAuthorMarks(html);
  const authorKeyword = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']*)["']/i);
  if (authorKeyword && /(?:nermin|sefi[cć])/i.test(authorKeyword[1])) report.violations.push(`${route}: author remains in meta keywords`);
  const marks = [...html.matchAll(/data-author-mark=["']nermin-sefic["']/g)].length;
  if (marks !== 1) report.violations.push(`${route}: expected exactly one canonical author mark, found ${marks}`);
  if (!html.includes(`rel="author" href="${PERSON}"`)) report.violations.push(`${route}: rel=author missing`);
  if (html !== original) {
    report.changed++;
    report.changedPages.push(route);
    if (WRITE) fs.writeFileSync(file, html);
  }
}
console.log(JSON.stringify({ ...report, write: WRITE }, null, 2));
if (report.violations.length) process.exit(1);
