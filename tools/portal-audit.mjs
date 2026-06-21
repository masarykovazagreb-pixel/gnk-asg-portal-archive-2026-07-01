#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(process.argv[2] || '.');
const PORTAL_ROOT = path.join(ROOT, 'apps', 'portal');
const OUT_DIR = path.resolve(process.argv[3] || path.join(ROOT, 'artifacts', 'portal-audit'));
const PUBLIC_ORIGIN = 'https://gnk-asg.hr';
const PRIVATE_PATH_RE = /(^|\/)(admin|operator|operator-dashboard|private|internal|preview|status|debug|test)(\/|$)/i;
const ARTICLE_PATH_RE = /(^|\/)(objave|publications)(\/|$)/i;
const GLOBAL_IMAGE_RE = /(logo|favicon|icon|manifest|social-card|og-default|placeholder|brand|avatar)/i;
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg']);
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.wrangler', '.cache', 'artifacts', 'reports']);

const state = {
  errors: [], warnings: [], notes: [], html: [], files: [], images: [], imageUsage: new Map(),
  canonicalUsage: new Map(), pageRoutes: new Map(), publicPages: [], privatePages: []
};

function rel(file) { return path.relative(ROOT, file).split(path.sep).join('/'); }
function portalRel(file) { return path.relative(PORTAL_ROOT, file).split(path.sep).join('/'); }
function issue(level, code, file, message, data = {}) {
  state[level].push({ code, file: file ? rel(file) : null, message, ...data });
}
function stripQueryHash(value) { return String(value || '').split('#')[0].split('?')[0]; }
function normalizeUrl(value) {
  try {
    const u = new URL(value, PUBLIC_ORIGIN);
    u.hash = '';
    if (u.hostname === 'www.gnk-asg.hr') u.hostname = 'gnk-asg.hr';
    if (u.pathname !== '/' && u.pathname.endsWith('/index.html')) u.pathname = u.pathname.slice(0, -10);
    if (u.pathname !== '/' && !path.posix.extname(u.pathname) && !u.pathname.endsWith('/')) u.pathname += '/';
    return u.toString();
  } catch { return String(value || '').trim(); }
}
function routeForHtml(file) {
  let r = '/' + portalRel(file).replace(/index\.html?$/i, '').replace(/\\/g, '/');
  r = r.replace(/\/+/g, '/');
  if (!r.endsWith('/') && !path.posix.extname(r)) r += '/';
  return r;
}
function getAttr(tag, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i');
  const m = tag.match(re); return m ? m[2].trim() : '';
}
function firstMatch(text, re) { const m = text.match(re); return m ? (m[1] || '').trim() : ''; }
function allMatches(text, re) { const out=[]; let m; while ((m = re.exec(text))) out.push(m); return out; }

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.well-known') continue;
    if (IGNORE_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else state.files.push(p);
  }
}
async function existsFile(p) { try { return (await fs.stat(p)).isFile(); } catch { return false; } }

function resolveLocalTarget(fromFile, raw, baseHref = '') {
  const clean = stripQueryHash(raw).trim();
  if (!clean || clean.startsWith('#') || /^(mailto:|tel:|data:|javascript:|blob:)/i.test(clean)) return null;
  try {
    const u = new URL(clean, baseHref ? new URL(baseHref, PUBLIC_ORIGIN) : new URL(routeForHtml(fromFile), PUBLIC_ORIGIN));
    if (!['gnk-asg.hr', 'www.gnk-asg.hr'].includes(u.hostname)) return null;
    let pathname = decodeURIComponent(u.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    return path.join(PORTAL_ROOT, pathname.replace(/^\//, ''));
  } catch { return null; }
}

async function inspectHtml(file) {
  const text = await fs.readFile(file, 'utf8');
  const fileRel = rel(file);
  const route = routeForHtml(file);
  const isPrivate = PRIVATE_PATH_RE.test(route);
  const title = firstMatch(text, /<title[^>]*>([\s\S]*?)<\/title>/i).replace(/<[^>]+>/g, '').trim();
  const metaTags = allMatches(text, /<meta\b[^>]*>/gi).map(x=>x[0]);
  const linkTags = allMatches(text, /<link\b[^>]*>/gi).map(x=>x[0]);
  const descriptionTag = metaTags.find(t=>/^description$/i.test(getAttr(t,'name')));
  const description = descriptionTag ? getAttr(descriptionTag, 'content') : '';
  const canonicalTag = linkTags.find(t=>/canonical/i.test(getAttr(t,'rel')));
  const canonical = canonicalTag ? normalizeUrl(getAttr(canonicalTag, 'href')) : '';
  const robotsTag = metaTags.find(t=>/^robots$/i.test(getAttr(t,'name')));
  const robots = robotsTag ? getAttr(robotsTag, 'content').toLowerCase() : '';
  const htmlLang = firstMatch(text, /<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i).toLowerCase();
  const baseHref = firstMatch(text, /<base\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i);
  const ids = allMatches(text, /\bid\s*=\s*(["'])(.*?)\1/gi).map(m=>m[2]).filter(Boolean);
  const duplicateIds = [...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
  const hreflangs = linkTags.filter(t=>/alternate/i.test(getAttr(t,'rel')) && getAttr(t,'hreflang')).map(t=>({lang:getAttr(t,'hreflang').toLowerCase(), href:normalizeUrl(getAttr(t,'href'))}));
  const jsonLdBlocks = allMatches(text, /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi).map(m=>m[1].trim());
  const refs = [];
  for (const m of allMatches(text, /<(a|link|script|img|source)\b[^>]*>/gi)) {
    const tag=m[0], kind=m[1].toLowerCase();
    const raw = getAttr(tag, kind==='a'||kind==='link' ? 'href' : 'src') || getAttr(tag,'srcset');
    if (!raw) continue;
    const values = kind==='source' && raw.includes(',') ? raw.split(',').map(v=>v.trim().split(/\s+/)[0]) : [raw];
    for (const value of values) refs.push({kind, value});
  }

  state.html.push({file:fileRel, route, lang:htmlLang, private:isPrivate, title, descriptionLength:description.length, canonical, hreflangs, jsonLdCount:jsonLdBlocks.length, duplicateIds});
  state.pageRoutes.set(route, fileRel);
  (isPrivate ? state.privatePages : state.publicPages).push(fileRel);

  if (!htmlLang) issue('errors','HTML_LANG_MISSING',file,'Missing html lang attribute.');
  if (!title) issue('errors','TITLE_MISSING',file,'Missing <title>.');
  else if (!isPrivate && (title.length < 25 || title.length > 75)) issue('warnings','TITLE_LENGTH',file,`Title length is ${title.length}; target 25-75.`,{value:title});
  if (!isPrivate && !description) issue('errors','META_DESCRIPTION_MISSING',file,'Public page is missing meta description.');
  else if (!isPrivate && (description.length < 80 || description.length > 180)) issue('warnings','META_DESCRIPTION_LENGTH',file,`Description length is ${description.length}; target 80-180.`);
  if (isPrivate && !robots.includes('noindex')) issue('errors','PRIVATE_NOINDEX_MISSING',file,'Private/admin page must include robots noindex.');
  if (!isPrivate && robots.includes('noindex')) issue('errors','PUBLIC_NOINDEX',file,'Public page unexpectedly includes noindex.');
  if (!isPrivate && !canonical) issue('errors','CANONICAL_MISSING',file,'Public page is missing canonical URL.');
  if (canonical) {
    if (!state.canonicalUsage.has(canonical)) state.canonicalUsage.set(canonical, []);
    state.canonicalUsage.get(canonical).push(fileRel);
  }
  if (!isPrivate && htmlLang.startsWith('hr') && !hreflangs.some(x=>x.lang==='hr')) issue('warnings','HREFLANG_HR_MISSING',file,'HR page has no hreflang=hr.');
  if (!isPrivate && htmlLang.startsWith('en') && !hreflangs.some(x=>x.lang==='en')) issue('warnings','HREFLANG_EN_MISSING',file,'EN page has no hreflang=en.');
  if (!isPrivate && !hreflangs.some(x=>x.lang==='x-default')) issue('warnings','HREFLANG_DEFAULT_MISSING',file,'Public page has no x-default hreflang.');
  if (duplicateIds.length) issue('errors','DUPLICATE_HTML_ID',file,`Duplicate HTML id(s): ${duplicateIds.join(', ')}`);
  if (!isPrivate && jsonLdBlocks.length===0) issue('warnings','SCHEMA_MISSING',file,'Public page has no JSON-LD schema.');
  for (const block of jsonLdBlocks) {
    try { JSON.parse(block); } catch (e) { issue('errors','SCHEMA_INVALID_JSON',file,`Invalid JSON-LD: ${e.message}`); }
  }

  const installMentions = (text.match(/\b(install|instaliraj|instalacija|pwa-install)\b/gi)||[]).length;
  if (installMentions > 8) issue('warnings','INSTALL_DUPLICATION_SIGNAL',file,`High install/PWA marker count: ${installMentions}.`);
  const aiFloatCount = (text.match(/id=["']gnk-asg-ai-help-float["']/gi)||[]).length;
  if (aiFloatCount > 1) issue('errors','AI_FLOAT_DUPLICATE',file,`AI floating button id appears ${aiFloatCount} times.`);
  const styleIdCount = (text.match(/<style\b[^>]*id=/gi)||[]).length;
  if (styleIdCount > 5) issue('warnings','INLINE_STYLE_LAYERING',file,`Page contains ${styleIdCount} separately identified inline style layers.`);
  if (/\n\s*<main[^>]*>\s*\n\s*<\/div>\s*<\/div>/i.test(text)) issue('errors','STRAY_CLOSING_TAGS_AFTER_MAIN',file,'Two closing div tags appear immediately after opening <main>, likely causing layout gaps.');

  for (const ref of refs) {
    const target = resolveLocalTarget(file, ref.value, baseHref);
    if (target && !(await existsFile(target))) {
      const altIndex = target.endsWith('.html') ? target : path.join(target,'index.html');
      if (!(await existsFile(altIndex))) issue('errors','BROKEN_LOCAL_REFERENCE',file,`Missing local target for ${ref.kind}: ${ref.value}`,{target:rel(target)});
    }
    if (ref.kind==='img' || ref.kind==='source' || /\.(png|jpe?g|webp|avif|gif|svg)(\?|#|$)/i.test(ref.value)) {
      const normalized = stripQueryHash(ref.value);
      if (!state.imageUsage.has(normalized)) state.imageUsage.set(normalized, []);
      state.imageUsage.get(normalized).push({file:fileRel, route});
    }
  }
}

function finishCrossChecks() {
  for (const [canonical, files] of state.canonicalUsage) {
    const publicFiles = files.filter(f=>state.publicPages.includes(f));
    if (publicFiles.length > 1) issue('errors','DUPLICATE_CANONICAL',null,`Canonical ${canonical} is used by ${publicFiles.length} public pages.`,{files:publicFiles});
  }
  for (const [img, uses] of state.imageUsage) {
    const articleUses = uses.filter(u=>ARTICLE_PATH_RE.test(u.route));
    const uniquePages = [...new Set(articleUses.map(u=>u.file))];
    if (uniquePages.length > 1 && !GLOBAL_IMAGE_RE.test(img)) issue('errors','ARTICLE_IMAGE_REUSE',null,`Article image is reused on ${uniquePages.length} pages: ${img}`,{files:uniquePages});
  }
  for (const p of state.html.filter(x=>!x.private)) {
    if (p.lang.startsWith('hr')) {
      const expected = p.route==='/' ? '/en/' : `/en${p.route}`.replace(/\/+/g,'/');
      if (!state.pageRoutes.has(expected) && !p.hreflangs.some(x=>x.lang==='en')) issue('warnings','HR_EN_PARITY_GAP',path.join(ROOT,p.file),`No obvious EN pair or hreflang=en for ${p.route}.`,{expected});
    }
  }
}

async function main() {
  if (!(await existsFile(path.join(PORTAL_ROOT,'index.html')))) throw new Error(`Portal root not found: ${PORTAL_ROOT}`);
  await walk(ROOT);
  state.images = state.files.filter(f=>IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase())).map(rel);
  const htmlFiles = state.files.filter(f=>['.html','.htm'].includes(path.extname(f).toLowerCase()) && f.startsWith(PORTAL_ROOT));
  for (const file of htmlFiles) await inspectHtml(file);
  finishCrossChecks();

  const registry = [...state.imageUsage.entries()].map(([image, uses])=>({image, useCount:uses.length, uses})).sort((a,b)=>b.useCount-a.useCount || a.image.localeCompare(b.image));
  const summary = {
    generatedAt:new Date().toISOString(), root:ROOT, portalRoot:rel(PORTAL_ROOT),
    counts:{files:state.files.length, html:state.html.length, publicPages:state.publicPages.length, privatePages:state.privatePages.length, repositoryImages:state.images.length, referencedImages:registry.length, errors:state.errors.length, warnings:state.warnings.length, notes:state.notes.length},
    pass:state.errors.length===0
  };
  const report = {summary, errors:state.errors, warnings:state.warnings, notes:state.notes, pages:state.html, repositoryImages:state.images, imageUsageRegistry:registry};
  await fs.mkdir(OUT_DIR,{recursive:true});
  await fs.writeFile(path.join(OUT_DIR,'portal-audit.json'),JSON.stringify(report,null,2)+'\n');
  await fs.writeFile(path.join(OUT_DIR,'image-usage-registry.json'),JSON.stringify(registry,null,2)+'\n');
  const md = [`# GNK ASG Portal Quality Gate`, '', `Generated: ${summary.generatedAt}`, '', `- Files: ${summary.counts.files}`, `- HTML pages: ${summary.counts.html}`, `- Public/private: ${summary.counts.publicPages}/${summary.counts.privatePages}`, `- Repository images: ${summary.counts.repositoryImages}`, `- Referenced images: ${summary.counts.referencedImages}`, `- Errors: ${summary.counts.errors}`, `- Warnings: ${summary.counts.warnings}`, `- Result: ${summary.pass ? 'PASS' : 'FAIL'}`, '', '## Errors', ...(state.errors.length ? state.errors.map(x=>`- **${x.code}**${x.file?` — \`${x.file}\``:''}: ${x.message}`) : ['- None']), '', '## Warnings', ...(state.warnings.length ? state.warnings.map(x=>`- **${x.code}**${x.file?` — \`${x.file}\``:''}: ${x.message}`) : ['- None']), ''].join('\n');
  await fs.writeFile(path.join(OUT_DIR,'portal-audit.md'),md);
  console.log(JSON.stringify(summary,null,2));
  process.exitCode = summary.pass ? 0 : 1;
}
main().catch(err=>{ console.error(err.stack||err); process.exitCode=2; });
