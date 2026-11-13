import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const shared = ['business-u-svijetu-manjih-marzi.html','digitalni-portal-mediji-i-osobni-kredibilitet.html','ekonomija-i-cijena-vremena.html','index.html','kapital-prati-povjerenje.html','nikkei-225-i-povjerenje-u-japan.html','poduzetnistvo-u-globalnoj-neizvjesnosti.html','svjetska-ekonomija-i-lokalni-poduzetnik.html','vrijednost-kapital-dokumentacija-povjerenje.html'];
const sections = [
 ['apps/portal/autorske-objave', 'hr', [...shared, 'hrvatski-softver-izvoz-nevidljivi-lider.html']],
 ['apps/portal/en/autorske-objave', 'en', [...shared, 'ai-governance-us-eu-china.html','critical-minerals-energy-transition.html','demographic-reshuffling-global-economy.html','global-debt-cheap-money.html','supply-chains-deglobalization.html']]
];
test('author archive pages provide a localized keyboard skip to the main landmark', () => {
 for (const [dir, lang, files] of sections) for (const name of files) {
  const file=path.join(dir,name), html=fs.readFileSync(file,'utf8');
  const label=lang==='hr'?'Preskoči na sadržaj':'Skip to content';
  assert.match(html,new RegExp(`<html\\s+lang="${lang}"`),file);
  assert.match(html,/<link\b[^>]*href="\/assets\/am-design-v1\.css(?:\?[^"\s]*)?"[^>]*data-am-design="v1"[^>]*>/,file);
  assert.ok(html.includes(`<body><a class="skip" href="#authorContent">${label}</a>`),file);
  assert.match(html,/<main id="authorContent" tabindex="-1"(?: class="(?:wrap|editorial-wrap article)")?>/,file);
  assert.equal((html.match(/id="authorContent"/g)||[]).length,1,file);
 }
});
