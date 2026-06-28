import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [indexJs,contactHr,contactEn,contactCss,adminPrimary,adminPriority]=await Promise.all([
  read('apps/portal/assets/index-public-v7.js'),
  read('apps/portal/contact/index.html'),
  read('apps/portal/en/contact/index.html'),
  read('apps/portal/assets/contact-quality-v2.css'),
  read('apps/portal/assets/admin-command-center-primary-v1.js'),
  read('apps/portal/assets/admin-minimum-priority-v1.js')
]);

for(const marker of ["['#the-code','THE CODE']","['#financije','Financije']","['#mreza','Mreža']","['/trzista/','Tržišta']","['/contact/','Kontakt']","['/admin-center/','Admin']","['/en/','EN','lang']"]){
  assert.ok(indexJs.includes(marker),`Nedostaje HR index marker: ${marker}`);
}
for(const marker of ["['#financials','Financials']","['#network','Network']","['/markets/','Markets']","['/en/contact/','Contact']","['/','HR','lang']"]){
  assert.ok(indexJs.includes(marker),`Nedostaje EN index marker: ${marker}`);
}
assert.ok(!indexJs.includes("['/operator-dashboard/','Admin']"),'Index ne smije koristiti stari Admin ulaz.');

for(const html of [contactHr,contactEn]){
  assert.ok(html.includes('/api/contact-submit'),'Kontakt mora koristiti jedinstveni kontakt API.');
  assert.ok(html.includes('contact-quality-v2.css?v=20260628-v5'),'Kontakt mora koristiti potvrđeni V5 dizajn.');
  assert.ok(html.includes('type="file" accept="application/pdf"'),'Kontakt mora zadržati PDF prilog.');
  assert.ok(html.includes('name="consent"'),'Kontakt mora zadržati privolu.');
}
assert.ok(contactHr.includes('href="/en/contact/"'),'HR kontakt mora voditi na EN kontakt.');
assert.ok(contactEn.includes('href="/contact/"'),'EN kontakt mora voditi na HR kontakt.');
assert.ok(contactCss.includes('#fffdf8')&&contactCss.includes('--contact-champagne'),'Kontakt mora biti bijelo-champagne.');
assert.ok(contactCss.includes('overflow-x:hidden'),'Mobilni kontakt mora blokirati horizontalni overflow.');

assert.ok(adminPrimary.includes('/assets/admin-minimum-priority-v1.js?v=20260628-v1'),'Admin mora učitati prioritetni sloj.');
assert.ok(adminPrimary.includes('data-open="mail"'),'Glavna Admin akcija mora otvarati Mail Studio.');
assert.ok(adminPriority.includes("const ORDER=['overview','mail','media','operator'"),'Admin redoslijed mora biti pregled, Mail Studio, Media Center, Operator.');
assert.ok(adminPriority.includes("mail:{label:'Mail Studio'"),'Mail Studio naziv mora biti eksplicitan.');
assert.ok(adminPriority.includes("media:{label:'Media Center'"),'Media Center naziv mora biti eksplicitan.');

console.log('MINIMUM INDEX + CONTACT + ADMIN: PASS');
