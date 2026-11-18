import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const registry=JSON.parse(readFileSync('apps/portal/data/world-countries-v1.json','utf8'));
test('201 English country editions are reproduced deterministically',()=>{
 const temp=mkdtempSync(join(tmpdir(),'aktual-en-'));
 try {
  const run=spawnSync(process.execPath,['scripts/build-aktual-world-en-v1.mjs'],{encoding:'utf8',env:{...process.env,AKTUAL_EN_OUT:temp}});
  assert.equal(run.status,0,run.stderr);
  assert.equal(readdirSync(temp,{withFileTypes:true}).filter(x=>x.isDirectory()).length,201);
  const html=readFileSync(join(temp,'hrvatska','index.html'),'utf8');
  const japan=readFileSync(join(temp,'japan','index.html'),'utf8');
  assert.match(html,/<html lang="en">/);
  assert.match(html,/<link rel="canonical" href="https:\/\/gnk-asg.hr\/en\/gnk-aktual\/media\/hrvatska\/">/);
  assert.match(html,/hreflang="hr"/);
  assert.match(html,/href="\/en\/radio\/"/);
  assert.match(html,/Nermin Sefić/);
  assert.match(japan,/Japan/);
  assert.doesNotMatch(html,/"@type":"NewsArticle"/);
  assert.match(html,/External publishers|external publishers|Independent external publisher/);
  const sitemap=readFileSync(join(temp,'sitemap.xml'),'utf8');
  assert.match(sitemap,/<urlset/);
  assert.ok(!sitemap.includes('https://price.download'));
  const check=spawnSync(process.execPath,['scripts/build-aktual-world-en-v1.mjs','--check'],{encoding:'utf8',env:{...process.env,AKTUAL_EN_OUT:temp}});
  assert.equal(check.status,0,check.stderr);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
test('committed EN pages match generator (no missing public directory)',()=>{
 const run=spawnSync(process.execPath,['scripts/build-aktual-world-en-v1.mjs','--check'],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
});
