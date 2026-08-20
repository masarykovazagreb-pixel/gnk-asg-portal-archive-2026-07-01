import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const config=JSON.parse(read('apps/portal/assets/data/operator-os-config.json'));
const modules=config.monitoredModules||[];
const routeUrl=route=>new URL(route,'https://review.gnk-asg.local');

assert.ok(modules.length>=18,'Operator OS mora pratiti najmanje 18 odobrenih modula.');
assert.equal(new Set(modules.map(item=>item.id)).size,modules.length,'Module IDs moraju biti jedinstveni.');
assert.equal(new Set(modules.map(item=>item.route)).size,modules.length,'Module routes moraju biti jedinstvene.');

const allowedRisk=new Set(['low','medium','high','critical']);
for(const module of modules){
  assert.ok(allowedRisk.has(module.risk),`Neispravan risk za ${module.id}: ${module.risk}`);
  assert.equal(typeof module.approvalRequired,'boolean',`approvalRequired mora biti boolean za ${module.id}`);
}

const gateway=read('workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v2.js');
const mailFacade=read('workers/gnk-asg-direct-operator/src/mail-studio-extension-v4.js');
const authLayer=read('workers/gnk-asg-direct-operator/src/index-unified-auth-v14.js');
const runtime=read('workers/gnk-asg-direct-operator/src/index-enterprise-projects-runtime-v1.js');
const dynamicContracts={
  '/email-status/':{source:gateway,required:['isEmailStatusPath','handleEmailStatusRequest',"path==='/email-status'","path.startsWith('/email-status/')",'loginRedirect(request)']},
  '/mail-studio/':{source:`${gateway}\n${mailFacade}\n${authLayer}`,required:["from './mail-studio-extension-v4.js'","PUBLIC_PREFIX='/api/mail-center/sync'","INTERNAL_PREFIX='/api/mail-sync'",'handleMailSyncCenter','gnk-mail-sync-center-ui',"path.startsWith('/api/mail-center/')","'/mail-studio'"]}
};

let dynamicCount=0;
for(const module of modules){
  assert.match(module.id,/^[a-z0-9-]+$/u,`Neispravan module ID: ${module.id}`);
  const parsed=routeUrl(module.route),routePath=parsed.pathname;
  assert.equal(parsed.origin,'https://review.gnk-asg.local',`Module ruta mora biti same-origin: ${module.route}`);
  assert.match(routePath,/^\/(?:[a-z0-9-]+\/)+$/u,`Neispravan module pathname: ${module.route}`);
  for(const key of parsed.searchParams.keys())assert.match(key,/^[a-z][a-z0-9-]*$/u,`Neispravan query ključ u ${module.route}`);
  if(['worker-dynamic-authenticated','worker-native-authenticated'].includes(module.delivery)){
    const contract=dynamicContracts[routePath];
    assert.ok(contract,`Nedokumentirana dinamička ruta: ${module.route}`);
    for(const token of contract.required)assert.ok(contract.source.includes(token),`${module.route} nema Worker dokaz: ${token}`);
    dynamicCount++;
    continue;
  }
  const folder=routePath.replace(/^\//,'').replace(/\/$/,'');
  const file=`apps/portal/${folder}/index.html`;
  assert.ok(exists(file),`${module.label} pokazuje na nepostojeću datoteku ${file}`);
  assert.ok(read(file).length>120,`${file} nema dovoljan sadržaj.`);
}

const headquarters=read('apps/portal/digital-headquarters/index.html');
assert.ok(headquarters.includes('noindex,nofollow,noarchive'),'Digital Headquarters mora ostati noindex/nofollow/noarchive.');
const navigation=`${headquarters}\n${runtime}`;
const criticalRoutes=[
  '/admin-center/',
  '/operator-dashboard/',
  '/worker-ops/',
  '/digital-workforce/',
  '/mail-studio/',
  '/media-registration-admin/',
  '/email-status/'
];
for(const requiredRoute of criticalRoutes){
  assert.ok(navigation.includes(requiredRoute),`Aktivni Digital Headquarters nema ključnu rutu ${requiredRoute}`);
  assert.ok(modules.some(module=>routeUrl(module.route).pathname===requiredRoute),`Operator OS registry ne prati ključnu rutu ${requiredRoute}`);
}
for(const nestedRoute of ['/admin-center/workers/','/admin-center/news-publication/','/admin-center/contacts/','/admin-center/pdf/']){
  assert.ok(headquarters.includes(nestedRoute),`Digital Headquarters nema zaštićeni ulaz ${nestedRoute}`);
}
assert.ok(runtime.includes('x-robots-tag'),'Protected runtime mora postaviti noindex header.');

console.log(`OPERATOR_MODULE_ROUTE_CONTRACT_OK modules=${modules.length} dynamic=${dynamicCount} static=${modules.length-dynamicCount}`);
