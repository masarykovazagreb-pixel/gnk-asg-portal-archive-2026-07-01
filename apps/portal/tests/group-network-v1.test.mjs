import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';

const data = JSON.parse(await readFile(new URL('../data/public-group-network.json', import.meta.url), 'utf8'));

assert.equal(data.scope, 'public');
assert.equal(data.summary.entities, 45);
assert.equal(data.summary.operatingLocations, 45);
assert.equal(data.summary.dormantLocations, 0);
assert.ok(Array.isArray(data.nodes) && data.nodes.length > 0, 'Public network must contain published nodes');
assert.ok(Array.isArray(data.links), 'Public network links must be an array');

const ids = new Set();
const allowedNamedEntities = new Set(['GNK DINAMO Ltd.', 'GNK ASG d.o.o.']);
const allowedStatuses = new Set(['operating', 'dormant', 'planned', 'establishing', 'narrative']);
const prohibitedPublicTerms = /serbia|srbija|beograd|belgrade|omega holding|sports performance tracking|organa|aktual media/i;

for (const node of data.nodes) {
  assert.ok(node.id && node.code, 'Every node requires id and code');
  assert.ok(!ids.has(node.id), `Duplicate node id: ${node.id}`);
  ids.add(node.id);
  assert.ok(node.city && node.country, `Missing city/country for ${node.id}`);
  assert.ok(Number.isFinite(node.latitude) && node.latitude >= -90 && node.latitude <= 90, `Invalid latitude for ${node.id}`);
  assert.ok(Number.isFinite(node.longitude) && node.longitude >= -180 && node.longitude <= 180, `Invalid longitude for ${node.id}`);
  assert.ok(allowedStatuses.has(node.status), `Invalid status for ${node.id}`);
  if (node.publicName) assert.ok(allowedNamedEntities.has(node.publicName), `Unapproved public entity name: ${node.publicName}`);
  assert.ok(!prohibitedPublicTerms.test(JSON.stringify(node)), `Prohibited public location/entity reference in ${node.id}`);
}

for (const link of data.links) {
  assert.ok(ids.has(link.from), `Unknown link source: ${link.from}`);
  assert.ok(ids.has(link.to), `Unknown link target: ${link.to}`);
  assert.notEqual(link.from, link.to, 'Self-links are not allowed');
}

const sharedHome=await readFile(new URL('../assets/digital-headquarters-v1.js',import.meta.url),'utf8');
const homeCss=await readFile(new URL('../assets/digital-headquarters-home-v2.css',import.meta.url),'utf8');
const homeJs=await readFile(new URL('../assets/digital-headquarters-home-v2.js',import.meta.url),'utf8');
const emailDashboard=await readFile(new URL('../assets/email-status-dashboard-v2.js',import.meta.url),'utf8');
const emailFallback=await readFile(new URL('../email-status/index.html',import.meta.url),'utf8');
const adminModuleMap=await readFile(new URL('../assets/admin-only-module-map-v1.js',import.meta.url),'utf8');

assert.match(sharedHome,/digital-headquarters-home-v2\.css/,'home-only premium CSS must be loaded from the shared runtime');
assert.match(sharedHome,/digital-headquarters-home-v2\.js/,'home-only premium JavaScript must be loaded from the shared runtime');
assert.match(sharedHome,/path==='\/'\|\|path==='\/en'/,'premium home layer must remain limited to HR and EN home routes');
assert.match(homeCss,/body\.dhq-home/,'premium styling must be scoped to home pages');
assert.match(homeCss,/#network/,'the home layer must explicitly preserve the network section boundary');
assert.match(homeCss,/prefers-reduced-motion/,'premium motion must respect reduced-motion preferences');
assert.match(homeJs,/IntersectionObserver/,'home reveal effects must be progressive and viewport based');
assert.match(homeJs,/document\.querySelectorAll\('\.dhq-frame'\)/,'THE CODE frame overlay must be anchored to the frame panel');

assert.match(emailDashboard,/GNK_ASG_EMAIL_STATUS_DASHBOARD_V3/,'protected Email Status must use the visually adapted classic dashboard');
assert.match(emailDashboard,/Poslano/,'classic delivery semantics must remain Croatian and operator friendly');
assert.match(emailFallback,/GNK_ASG_EMAIL_STATUS_CLASSIC_FALLBACK_V1_20260710/,'static fallback must match the classic dashboard contract');
for(const field of ['Primatelj','Predmet','Poslano','Isporučeno','Prvo otvaranje','Zadnje otvaranje','Otvaranja','Message ID']){
  assert.ok(emailFallback.includes(field),`classic Email Status fallback missing ${field}`);
}
assert.match(adminModuleMap,/Status email poruka/,'Admin Center must expose the protected classic Email Status module');
assert.match(adminModuleMap,/Message ID/,'Admin Email Status description must reflect available classic fields');
for(const source of [emailFallback,adminModuleMap]){
  assert.ok(!/Potvrda primitka|receipt_confirmed_at|recipient_confirmed_at/i.test(source),'experimental receipt-confirmation language must not remain in the classic Email Status surfaces');
}

for (const [label,source] of [
  ['shared Digital Headquarters runtime',sharedHome],
  ['premium home runtime',homeJs],
  ['classic Email Status enhancer',emailDashboard],
  ['Admin-only module map',adminModuleMap]
]) {
  assert.doesNotThrow(()=>new Script(source,{filename:label}),`${label} must parse as JavaScript`);
}
const inlineScripts=[...emailFallback.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1].trim()).filter(Boolean);
assert.ok(inlineScripts.length>0,'classic Email Status fallback must contain its runtime');
inlineScripts.forEach((source,index)=>assert.doesNotThrow(()=>new Script(source,{filename:`email-status-inline-${index+1}.js`}),`Email Status inline runtime ${index+1} must parse`));

await import('./public-surface-cleanliness.test.mjs');

console.log(`group-network-v1: ${data.nodes.length} published nodes, ${data.links.length} links; public surface, premium home and classic Email Status assets locked`);
