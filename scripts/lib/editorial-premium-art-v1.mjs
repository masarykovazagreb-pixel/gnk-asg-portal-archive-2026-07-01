import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const PREMIUM_CONFIG = 'apps/portal/data/editorial-premium-art.json';
const SITE_ROOT = path.resolve('apps/portal');
const REQUIRED_VERSION = 'GNK_ASG_PREMIUM_EDITORIAL_ART_V1';
const WEBP_WIDTH = 1200;
const WEBP_HEIGHT = 630;

function assertSafeAsset(value) {
  if (typeof value !== 'string' || !/^\/assets\/editorial\/[a-zA-Z0-9_/-]+\.svg$/.test(value) || value.includes('..')) {
    throw new Error('Premium artwork must be an explicitly reviewed local editorial SVG');
  }
  const resolved = path.resolve(SITE_ROOT, value.slice(1));
  if (!resolved.startsWith(SITE_ROOT + path.sep)) throw new Error('Premium source escaped portal root');
  const real = fs.realpathSync(resolved);
  if (!real.startsWith(SITE_ROOT + path.sep)) throw new Error('Premium source points outside portal root');
  return real;
}

export function loadPremiumArtwork() {
  const config = JSON.parse(fs.readFileSync(PREMIUM_CONFIG, 'utf8'));
  if (config.version !== REQUIRED_VERSION || !Array.isArray(config.items)) throw new Error('Invalid premium editorial artwork config');
  const mapped = new Map();
  for (const item of config.items) {
    if (!/^\/(komentari|objave|analize|en\/commentary|en\/publications|en\/analyses)\/[a-z0-9-]+\/$/.test(item.route) ||
      mapped.has(item.route)) throw new Error('Invalid or duplicate premium editorial route');
    if (item.rightsReviewed !== true || item.topicalRelevanceReviewed !== true ||
      !item.title || !item.alt || !item.creator || !item.rights || !item.editorialCheck ||
      item.imageType !== 'conceptual-illustration' || item.width < 1600 || item.height < 900) {
      throw new Error('Premium artwork lacks explicit rights, relevance, dimension or provenance review: ' + item.route);
    }
    const localFile = assertSafeAsset(item.source);
    const bytes = fs.readFileSync(localFile);
    if (bytes.length < 1000 || bytes.length > 4_000_000) throw new Error('Premium SVG has invalid size: ' + item.route);
    const svg = bytes.toString('utf8');
    if (!/<svg\b/i.test(svg) || !/viewBox="0 0 1600 900"/.test(svg) ||
      /<\s*(?:script|foreignObject|iframe|image)\b/i.test(svg) ||
      /(?:xlink:href|href)\s*=\s*["'](?:https?:|data:|\/\/)/i.test(svg) ||
      /url\(\s*["']?https?:/i.test(svg)) {
      throw new Error('Premium SVG failed safety or resolution controls: ' + item.route);
    }
    mapped.set(item.route, {
      ...item,
      absoluteSource:localFile,
      sha256:createHash('sha256').update(bytes).digest('hex'),
    });
  }
  return mapped;
}

export function writePremiumWebp(item, target) {
  fs.mkdirSync(path.dirname(target), {recursive:true});
  const args = [
    '-background','#0a1825','-density','150',item.absoluteSource,
    '-resize',`${WEBP_WIDTH}x${WEBP_HEIGHT}^`,
    '-gravity','center','-extent',`${WEBP_WIDTH}x${WEBP_HEIGHT}`,
    '-colorspace','sRGB','-strip','-quality','94','-define','webp:method=6',
    `webp:${target}`
  ];
  const result = spawnSync('convert',args,{encoding:'utf8',maxBuffer:4*1024*1024});
  if (result.error || result.status !== 0) throw new Error('Premium WebP rendering failed: ' + (result.error?.message || result.stderr || result.stdout || result.status));
  const bytes=fs.readFileSync(target);
  if (bytes.length < 2000 || bytes.subarray(0,4).toString('ascii')!=='RIFF' ||
      bytes.subarray(8,12).toString('ascii')!=='WEBP') throw new Error('Rendered premium WebP failed format check');
  const check=spawnSync('identify',['-format','%wx%h',target],{encoding:'utf8'});
  if(check.status!==0 || check.stdout.trim()!==`${WEBP_WIDTH}x${WEBP_HEIGHT}`) throw new Error('Rendered premium WebP has invalid dimensions');
  return target;
}
