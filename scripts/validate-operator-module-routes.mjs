import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const config=JSON.parse(read('apps/portal/assets/data/operator-os-config.json'));
const modules=config.monitoredModules||[];

assert.ok(modules.length>=18,'Operator OS mora pratiti najmanje 18 odobrenih modula.');
assert.equal(new Set(modules.map(item=>item.id)).size,modules.length,'Module IDs moraju biti jedinstveni.');
assert.equal(new Set(modules.map(item=>item.route)).size,modules.length,'Module routes moraju biti jedinstvene.');

const gateway=read('workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v2.js');
const dynamicContracts={
  '/email-status/':[
    'isEmailStatusPath',
    'handleEmailStatusRequest',
    "path==='/email-status'",
    "path.startsWith('/email-status/')",
    'loginRedirect(request)'
  ]
};

for(const module of modules){
  assert.match(module.id,/^[a-z0-9-]+$/u,`Neispravan module ID: ${module.id}`);
  assert.match(module.route,/^\/(?:[a-z0-9-]+\/)+$/u,`Neispravna module ruta: ${module.route}`);
  if(module.delivery==='worker-dynamic-authenticated'){
    const required=dynamicContracts[module.route];
    assert.ok(required,`Nedokumentirana dinamička ruta: ${module.route}`);
    for(const token of required)assert.ok(gateway.includes(token),`${module.route} nema Worker dokaz: ${token}`);
    continue;
  }
  const folder=module.route.replace(/^\//,'').replace(/\/$/,'');
  const file=`apps/portal/${folder}/index.html`;
  assert.ok(exists(file),`${module.label} pokazuje na nepostojeću datoteku ${file}`);
  assert.ok(read(file).length>120,`${file} nema dovoljan sadržaj.`);
}

assert.ok(exists('apps/portal/media-center/index.html'),'Legacy /media-center/ compatibility ruta mora postojati.');
const mediaRedirect=read('apps/portal/media-center/index.html');
assert.ok(mediaRedirect.includes('/media-command-center/'),'Legacy Media Center mora voditi na aktivni Media Command Center.');

const originalCode=read('apps/portal/the-code/index.html');
for(const marker of ['THE CODE','Code activation · New York · 7 October 2026','Play · 6 slides','NOTHING<br>WILL EVER<br>BE THE SAME.']){
  assert.ok(originalCode.includes(marker),`Originalni THE CODE sadržaj mora ostati sačuvan: ${marker}`);
}
const intelligence=read('apps/portal/the-code/intelligence/index.html');
assert.ok(intelligence.includes('THE CODE Intelligence'),'THE CODE Intelligence landing mora postojati.');
assert.ok(intelligence.includes('does not replace the existing THE CODE presentation'),'THE CODE Intelligence mora sadržavati preservation disclosure.');

const publicMenu=read('apps/portal/assets/public-menu-v18.js');
assert.ok(publicMenu.includes('/the-code/intelligence/'),'Javni izbornik mora povezivati THE CODE Intelligence.');

const hub=read('apps/portal/enterprise/index.html');
for(const requiredRoute of ['/mission-control/','/design-review/','/strategy-performance/','/registry-center/','/deployment/','/mail-studio/','/media-center/']){
  assert.ok(hub.includes(requiredRoute),`Enterprise Hub nema ključnu rutu ${requiredRoute}`);
}

console.log(`OPERATOR_MODULE_ROUTE_CONTRACT_OK modules=${modules.length} dynamic=1 static=${modules.length-1} the_code=preserved`);
