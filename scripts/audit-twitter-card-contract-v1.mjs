import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const ORIGIN = 'https://gnk-asg.hr';
const failures = [];
const stats = { checkedPages: 0, missingCard: 0, invalidCard: 0, missingImage: 0, invalidImageUrl: 0, imageCredentialLeak: 0, unstableImageUrl: 0, missingAlt: 0, missingTitle: 0, missingDescription: 0 };
const extract = (html, regex) => html.match(regex)?.[1]?.trim() || '';
const meta = (html, name) => extract(html, new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i')) || extract(html, new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["'][^>]*>`, 'i'));
const routeFile = route => path.join(PORTAL, route.replace(/^\\/+|\\/+$/g, ''), 'index.html');
const validateImageUrl = (route, image) => {
  let parsed;
  try { parsed = new URL(image); } catch {
    stats.invalidImageUrl++;
    failures.push(`${route}: twitter:image is not a valid absolute URL`);
    return;
  }
  if (parsed.protocol !== 'https:') {
    stats.invalidImageUrl++;
    failures.push(`${route}: twitter:image must use HTTPS`);
  }
  if (parsed.username || parsed.password) {
    stats.imageCredentialLeak++;
    failures.push(`${route}: twitter:image must not contain URL credentials`);
  }
  if (parsed.search || parsed.hash) {
    stats.unstableImageUrl++;
    failures.push(`${route}: twitter:image must use a stable URL without query or fragment`);
  }
  if (parsed.origin === ORIGIN) {
    const asset = path.join(PORTAL, decodeURIComponent(parsed.pathname).replace(/^\\/+/, ''));
    if (!fs.existsSync(asset) || !fs.statSync(asset).isFile()) {
      stats.invalidImageUrl++;
      failures.push(`${route}: same-origin twitter:image asset is missing: ${image}`);
    }
  }
};
if (!fs.existsSync(REGISTRY)) process.exit(1);
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
for (const item of Array.isArray(registry.items) ? registry.items : []) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) continue;
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  stats.checkedPages++;
  const card = meta(html, 'twitter:card');
  const image = meta(html, 'twitter:image');
  const alt = meta(html, 'twitter:image:alt');
  const title = meta(html, 'twitter:title');
  const description = meta(html, 'twitter:description');
  if (!card) { stats.missingCard++; failures.push(`${route}: missing twitter:card`); }
  else if (!['summary','summary_large_image'].includes(card.toLowerCase())) { stats.invalidCard++; failures.push(`${route}: unsupported twitter:card ${card}`); }
  if (!image) { stats.missingImage++; failures.push(`${route}: missing twitter:image`); }
  else validateImageUrl(route, image);
  if (!alt) { stats.missingAlt++; failures.push(`${route}: missing twitter:image:alt`); }
  if (!title) { stats.missingTitle++; failures.push(`${route}: missing twitter:title`); }
  if (!description) { stats.missingDescription++; failures.push(`${route}: missing twitter:description`); }
}
const report = { version: 'GNK_ASG_TWITTER_CARD_CONTRACT_V1', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'twitter-card-contract');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
