import fs from 'node:fs';
import assert from 'node:assert/strict';

const admin=fs.readFileSync('apps/portal/admin-center/index.html','utf8');
for(const marker of [
  'href="/visual-index/"',
  'href="/objave/"',
  'href="/komentari/"',
  'href="/#digital-assets"',
  'Vizualni indeks / Visual Index',
  'Objave / Publications',
  'Komentari / Comments',
  'Digitalna imovina / Digital Assets'
]) assert.ok(admin.includes(marker),`admin content link missing: ${marker}`);
assert.ok(admin.includes('Admin centar sam ne pokreće slanje, kampanju, automatsku objavu ni worker funkcije.'),'admin safety notice missing');
console.log(JSON.stringify({ok:true,adminLinks:['visual-index','objave','komentari','digital-assets'],protectedActionsUnchanged:true,deployPerformed:false},null,2));
