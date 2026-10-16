// Accessibility-first image metadata normalization.
// Only real Nermin portraits receive his name in alt text; logos and charts are
// described by their actual contents. Protected SPT/bank routes are skipped.
// Read-only by default. Pass --write from a reviewed workflow to apply changes.
import fs from 'node:fs';
import path from 'node:path';
import { isProtectedEditorialRoute } from './lib/editorial-route-protection-v1.mjs';

const ROOT = 'apps/portal';
const WRITE = process.argv.includes('--write');
const SKIP_ROOTS = new Set([
  'admin', 'admin-center', 'admin-login', 'control', 'automation-status',
  'webmail', 'mail-studio', 'campaign-mailer', 'email-status', 'worker-ops',
  'operator-dashboard', 'digital-headquarters', 'media-registration-admin',
  'podijeli', 'api', 'assets', 'data', '__preview', 'bank', 'spt',
]);
const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    let stat;
    try { stat = fs.statSync(file); } catch { continue; }
    if (stat.isDirectory()) {
      const relative = path.relative(ROOT, file).split(path.sep).join('/');
      const segments = relative.split('/');
      if ((segments[0] && SKIP_ROOTS.has(segments[0])) || (segments[0] === 'en' && segments[1] && SKIP_ROOTS.has(segments[1]))) continue;
      walk(file);
    } else if (name === 'index.html') files.push(file);
  }
})(ROOT);

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'))?.[2] || '';
const setAttr = (tag, name, value) => {
  const safe = esc(value);
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i');
  return pattern.test(tag)
    ? tag.replace(pattern, `${name}="${safe}"`)
    : tag.replace(/\s*\/?>$/, (end) => ` ${name}="${safe}"${end}`);
};
const removeAttr = (tag, name) => tag.replace(new RegExp(`\\s+${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'), '');

const stats = {
  mode: WRITE ? 'write' : 'check',
  scanned: files.length,
  protectedSkipped: 0,
  changed: 0,
  portraitsDescribed: 0,
  logosDescribed: 0,
  chartsDescribed: 0,
};
const changedPages = [];

for (const file of files) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  const route = `/${relative.replace(/index\.html$/i, '')}`;
  if (isProtectedEditorialRoute(route)) {
    stats.protectedSkipped++;
    continue;
  }
  let html = fs.readFileSync(file, 'utf8');
  const original = html;
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() || 'GNK ASG';
  const isEn = /<html\b[^>]*\blang=["']en(?:-[^"']*)?["']/i.test(html);

  const scriptBlocks = [];
  const masked = html.replace(/<script[\s\S]*?<\/script>/gi, (block) => {
    scriptBlocks.push(block);
    return `\u0000SCRIPT${scriptBlocks.length - 1}\u0000`;
  });
  let updated = masked.replace(/<img\b[^>]*>/gi, (originalTag) => {
    const src = attr(originalTag, 'src');
    const isPortrait = /\/assets\/people\/nermin-sefic\//i.test(src);
    const isLogo = /logo-gnk-asg/i.test(src);
    const isChart = /\/assets\/editorial\/world-topics\//i.test(src);
    if (!isPortrait && !isLogo && !isChart) return originalTag;

    let tag = originalTag;
    const currentAlt = attr(tag, 'alt');
    const genericAlt = /^(?:image|photo|picture|portrait|headshot|chart|logo)?\s*$/i.test(currentAlt);
    if (!currentAlt || genericAlt) {
      const value = isPortrait
        ? (isEn ? 'Nermin Sefić — GNK ASG director' : 'Nermin Sefić — direktor GNK ASG')
        : isLogo
          ? (isEn ? 'GNK ASG d.o.o. logo' : 'Logotip GNK ASG d.o.o.')
          : (isEn ? `Editorial data chart: ${title}` : `Urednički podatkovni grafikon: ${title}`);
      tag = setAttr(tag, 'alt', value);
      if (isPortrait) stats.portraitsDescribed++;
      else if (isLogo) stats.logosDescribed++;
      else stats.chartsDescribed++;
    } else if (isChart && /\s*[·—-]\s*Nermin Sefić\s*\/\s*GNK ASG\s*$/i.test(currentAlt)) {
      tag = setAttr(tag, 'alt', currentAlt.replace(/\s*[·—-]\s*Nermin Sefić\s*\/\s*GNK ASG\s*$/i, '').trim());
      stats.chartsDescribed++;
    }

    // Decorative titles add noise to assistive technology; leave existing accurate titles alone.
    const existingTitle = attr(tag, 'title');
    if (isChart && /nermin\s+sefi[cć]/i.test(existingTitle)) tag = removeAttr(tag, 'title');
    return tag;
  });
  html = updated.replace(/\u0000SCRIPT(\d+)\u0000/g, (_match, index) => scriptBlocks[Number(index)]);

  if (html !== original) {
    stats.changed++;
    changedPages.push(route);
    if (WRITE) fs.writeFileSync(file, html, 'utf8');
  }
}

console.log(JSON.stringify({ ...stats, changedPages: WRITE ? changedPages : changedPages.slice(0, 40) }, null, 2));
