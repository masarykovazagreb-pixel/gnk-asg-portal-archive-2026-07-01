import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const srcRoot=path.resolve(import.meta.dirname,'../src');
const appRoot=path.resolve(import.meta.dirname,'../../..');

function read(file){return fs.readFileSync(file,'utf8');}

function activeGraph(entry){
  const visited=new Set();
  const visit=file=>{
    const resolved=path.resolve(file);
    if(visited.has(resolved)||!fs.existsSync(resolved))return;
    visited.add(resolved);
    const source=read(resolved);
    for(const match of source.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g)){
      let target=path.resolve(path.dirname(resolved),match[1]);
      if(!path.extname(target))target+='.js';
      visit(target);
    }
  };
  visit(path.join(srcRoot,entry));
  return visited;
}

test('active Worker import graph contains the existing Media Command Center backend',()=>{
  const graph=activeGraph('index-project50-v31-mail-inbox.js');
  const names=[...graph].map(file=>path.basename(file));
  assert.ok(names.includes('index-media-command-center-v21.js'),'active graph does not include Media Command Center v21');
  const combined=[...graph].map(read).join('\n');
  assert.match(combined,/\/api\/media-command-center\/status/);
  assert.match(combined,/\/api\/media-command-center\/campaigns/);
  assert.match(combined,/\/api\/media-command-center\/recipients/);
});

test('active backend graph contains the controlled media access dispatch service',()=>{
  const graph=activeGraph('index-project50-v31-mail-inbox.js');
  const combined=[...graph].map(read).join('\n');
  assert.match(combined,/media-outreach-access-dispatch-v1/);
  assert.match(combined,/handleMediaAccessDispatch/);
  assert.match(combined,/MEDIA_OUTREACH_LIVE/);
  assert.match(combined,/dispatch-queue|queue-approved/);
});

test('Mail Studio exposes media sending only through the existing command center panel',()=>{
  const panel=read(path.join(appRoot,'apps/portal/assets/mail-studio-media-panel-v1.js'));
  const adminLock=read(path.join(appRoot,'apps/portal/assets/admin-center-mail-only-v1.js'));
  assert.match(panel,/\/media-command-center\/\?embedded=1&source=mail-studio/);
  assert.doesNotMatch(panel,/\/api\/media-outreach\/dispatch|\/api\/admin-mail-send/);
  assert.match(adminLock,/dataset\.module!=='mail'/);
  assert.doesNotMatch(adminLock,/media-command-center/);
});
