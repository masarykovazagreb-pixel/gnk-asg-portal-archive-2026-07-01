import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const routeUrl=route=>new URL(route,'https://review.gnk-asg.local');

const gateway=read('workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v2.js');
const mailFacade=read('workers/gnk-asg-direct-operator/src/mail-studio-extension-v4.js');
const authLayer=read('workers/gnk-asg-direct-operator/src/index-unified-auth-v14.js');
const runtime=read('workers/gnk-asg-direct-operator/src/index-enterprise-projects-runtime-v1.js');

// The protected UI list in the deployed auth layer is the canonical operator-route inventory.
// Do not depend on the removed legacy operator-os-config.json, which contained simulated status data.
const uiMatch=authLayer.match(/const UI=\[(.*?)\];/s);
assert.ok(uiMatch,'Auth layer nema canonical UI inventory.');
const routes=[...uiMatch[1].matchAll(/'([^']+)'/g)].map(match=>`${match[1].replace(/\/+$/,'')}/`);
assert.ok(routes.length>0,'Canonical UI inventory je prazan.');
assert.equal(new Set(routes).size,routes.length,'Canonical UI routes moraju biti jedinstvene.');
for(const required of ['/admin-center/','/operator-dashboard/','/enterprise/','/mission-control/','/editorial-operations/','/registry-center/','/deployment/','/mobile-admin/','/seo/','/design-review/','/strategy-performance/']){
  assert.ok(routes.includes(required),`Canonical auth inventory nema ključnu rutu ${required}`);
}

const dynamicContracts={
  '/email-status/':{source:gateway,required:['isEmailStatusPath','handleEmailStatusRequest',"path==='/email-status'","path.startsWith('/email-status/')",'loginRedirect(request)']},
  '/mail-studio/':{source:`${gateway}\n${mailFacade}\n${authLayer}`,required:["from './mail-studio-extension-v4.js'","PUBLIC_PREFIX='/api/mail-center/sync'","INTERNAL_PREFIX='/api/mail-sync'",'handleMailSyncCenter','gnk-mail-sync-center-ui',"path.startsWith('/api/mail-center/')","'/mail-studio'"]}
};

let dynamicCount=0;
let staticCount=0;
for(const route of routes){
  const parsed=routeUrl(route),routePath=parsed.pathname;
  assert.equal(parsed.origin,'https://review.gnk-asg.local',`Operator ruta mora biti same-origin: ${route}`);
  assert.match(routePath,/^\/(?:[a-z0-9-]+\/)+$/u,`Neispravan operator pathname: ${route}`);

  const dynamic=dynamicContracts[routePath];
  if(dynamic){
    for(const token of dynamic.required)assert.ok(dynamic.source.includes(token),`${route} nema Worker dokaz: ${token}`);
    dynamicCount++;
    continue;
  }

  const folder=routePath.replace(/^\//,'').replace(/\/$/,'');
  const file=`apps/portal/${folder}/index.html`;
  assert.ok(exists(file),`Canonical auth ruta ${route} pokazuje na nepostojeću datoteku ${file}; ako je ruta Worker-native, dodaj eksplicitni dynamic contract.`);
  assert.ok(read(file).length>120,`${file} nema dovoljan sadržaj.`);
  staticCount++;
}

const hub=read('apps/portal/enterprise/index.html');
const navigation=`${hub}\n${runtime}`;
for(const requiredRoute of ['/mission-control/','/design-review/','/strategy-performance/','/registry-center/','/deployment/','/mail-studio/'])assert.ok(navigation.includes(requiredRoute),`Enterprise runtime nema ključnu rutu ${requiredRoute}`);
for(const requiredRoute of ['/enterprise/project-center/','/editorial-operations/'])assert.ok(navigation.includes(requiredRoute),`Enterprise runtime nema novu operativnu rutu ${requiredRoute}`);
assert.ok(runtime.includes('x-robots-tag'),'Protected runtime mora postaviti noindex header.');

console.log(`OPERATOR_MODULE_ROUTE_CONTRACT_OK canonical=${routes.length} dynamic=${dynamicCount} static=${staticCount}`);
