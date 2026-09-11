import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const failures = [];
const findings = [];

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, 'i'))?.[1]?.trim() || '';
const routeFromFile = file => {
  const rel = path.relative(PORTAL, path.dirname(file)).split(path.sep).join('/');
  return rel ? `/${rel}/` : '/';
};
const indexable = html => !/(?:^|[,\s])noindex(?:$|[,\s])/i.test(
  html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1] || ''
);
const norm = s => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function walk(dir) {
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    if (e.name.startsWith('.') || ['data', 'assets', '_headers'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.isFile() && e.name === 'index.html') {
      const html = fs.readFileSync(full, 'utf8');
      if (!indexable(html)) continue;
      const route = routeFromFile(full);
      const pageText = norm(html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
      for (const m of html.matchAll(/<img\b[^>]*data-entity=["'][^"']+["'][^>]*>/gi)) {
        const tag = m[0];
        const entity = attr(tag, 'data-entity');
        const alt = attr(tag, 'alt');
        const entityN = norm(entity);
        const altN = norm(alt);
        const pageHasEntity = entityN && pageText.includes(entityN);
        const altHasEntity = entityN && altN.includes(entityN);
        findings.push({route, entity, alt, pageHasEntity, altHasEntity});
        if (!entityN) failures.push(`${route}: data-entity image has empty entity`);
        if (entityN && !pageHasEntity) failures.push(`${route}: image entity is not supported by visible page context: ${entity}`);
        if (entityN && !altHasEntity) failures.push(`${route}: image alt does not identify declared entity: ${entity}`);
      }
    }
  }
}

if (!fs.existsSync(PORTAL)) {
  console.error(`Portal missing: ${PORTAL}`);
  process.exit(1);
}
walk(PORTAL);
const report = {
  version: 'GNK_ASG_PUBLIC_IMAGE_ENTITY_CONTEXT_V1',
  evidenceSemantics: 'ONLY_EXPLICIT_DATA_ENTITY; no entity inference from pixels or filenames',
  ok: failures.length === 0,
  checked: findings.length,
  failures,
  findings
};
const out = path.join(ROOT, 'artifacts', 'public-image-entity-context');
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
