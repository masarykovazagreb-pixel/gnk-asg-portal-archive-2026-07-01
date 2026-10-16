import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isProtectedEditorialRoute } from './lib/editorial-route-protection-v1.mjs';

const protectedRoutes = [
  '/objave/spt-64-parametra-i-analize/',
  '/en/publications/spt-sports-performance-tracking-gnk-asg/',
  '/en/publications/managing-exporter-bank-guarantees/',
  '/objave/otvaranje-racuna-u-banci/',
  '/objave/racuni-u-banku/',
  '/objave/financiranje-bankama/',
  '/komentari/banke-i-transparentnost/',
  '/analize/bankovni-sustavi-i-likvidnost/',
  '/publications/bankovne-garancije-izvoznika/',
  '/objave/bankarska-regulativa/',
  '/objave/adria-bank/',
];
const allowedRoutes = [
  '/objave/transparentnost-podataka/',
  '/komentari/odgovornost-u-upravljanju/',
  '/objave/nonbanking-software-patterns/',
  '/analize/financial-accountability/',
];
for (const route of protectedRoutes) assert.equal(isProtectedEditorialRoute(route), true, `must preserve protected route: ${route}`);
for (const route of allowedRoutes) assert.equal(isProtectedEditorialRoute(route), false, `must not overblock unrelated route: ${route}`);

for (const file of [
  'scripts/apply-editorial-publication-completeness-v1.mjs',
  'scripts/audit-editorial-publication-completeness-v1.mjs',
  'scripts/generate-editorial-cover-assets-v1.mjs',
  'scripts/build-editorial-archive-listings-v1.mjs',
  'scripts/enforce-approved-author-markers-v1.mjs',
]) {
  const source = fs.readFileSync(file, 'utf8');
  if (file === 'scripts/enforce-approved-author-markers-v1.mjs') {
    assert.ok(source.includes("import { isProtectedEditorialRoute } from './lib/editorial-route-protection-v1.mjs'")
      && source.includes('if (isProtectedEditorialRoute(route))'), 'author markers must use the shared guard before mutating protected routes');
  } else {
    assert.ok(source.includes("isProtectedEditorialRoute as protectedPath"), `${file} must use the shared protected-route policy`);
  }
}
console.log(JSON.stringify({ ok: true, protectedRouteCases: protectedRoutes.length, allowedRouteCases: allowedRoutes.length, consumers: 5 }, null, 2));
