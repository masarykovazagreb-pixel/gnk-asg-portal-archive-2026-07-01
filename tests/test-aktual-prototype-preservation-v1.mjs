#!/usr/bin/env node
/* AKTUAL MEDIA: user-requested legacy prototype promotion is immutable
 * until an explicit separate change request. The new SIGNAL radar is
 * additive and must never delete, replace or silently redirect the
 * experimental product's own links, modal, promo figures or external URL.
 */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
const ROOT=resolve(import.meta.dirname,'..');
const read=path=>readFileSync(resolve(ROOT,path),'utf8');
const page=read('apps/portal/gnk-aktual/index.html');
const generator=read('apps/region/engine/world-external-promo-v1.mjs');
const originalDomain=['j1hex9qg03f0-d','.space-z.ai'].join('');
const links=page.split(originalDomain).length-1;
assert.equal(links,14,'all fourteen prototype links and promotion redirects must be preserved');
assert(generator.includes(originalDomain),'canonical promo generator must keep prototype URL');
assert(page.includes('<!-- AKTUAL-WORLD-PREVIEW:START -->'),'experimental-world preview missing');
assert(page.includes('<!-- AM-WORLD-PROMO:START -->'),'original world takeover missing');
assert(page.includes('<!-- AM-WORLD-GATEWAY:START -->'),'original world gateway missing');
assert(page.includes('201 zemlja'),'user-approved 201-country claim changed');
assert(page.includes('435 izvora'),'user-approved 435-source claim changed');
assert(page.includes('24/7'),'user-approved 24/7 promotion changed');
assert(page.includes('href="https://'+originalDomain+'/'),'world promotion no longer links to prototype');
assert(generator.includes('applyWorldPreview'),'canonical homepage writer lost prototype promotion');
const regionBuild=read('apps/region/engine/build.mjs');
assert(regionBuild.includes("write('signal/index.html'"),'17-city SIGNAL is missing as additive radar');
assert(regionBuild.includes('buildSignalHub();'),'first-party additional hub missing');
console.log(JSON.stringify({status:'pass',prototypeLinks:links,promoIntact:true,nativeSignalAdditive:true,figuresPreserved:['201 countries','435 sources','24/7']}));
