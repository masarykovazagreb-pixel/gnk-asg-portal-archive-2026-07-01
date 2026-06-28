import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('Admin Center loads the read-only public SEO health panel',()=>{
  const html=read('apps/portal/admin-center/index.html');
  const script=read('apps/portal/assets/admin-public-seo-health-v1.js');
  assert.match(html,/admin-public-seo-health-v1\.js\?v=20260628-v1/);
  for(const route of ['/api/media-command-center/applications?limit=1','/api/media-access/admin/list','/objave/','/publications/','/sitemap-objave.xml','/image-sitemap-objave.xml','/vijesti/','/news/'])assert.ok(script.includes(route),route);
  assert.doesNotMatch(script,/method\s*:\s*['"]POST['"]/i);
});
