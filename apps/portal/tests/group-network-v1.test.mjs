import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile(new URL('../data/public-group-network.json', import.meta.url), 'utf8'));

assert.equal(data.scope, 'public');
assert.equal(data.summary.entities, 45);
assert.equal(data.summary.operatingLocations, 33);
assert.equal(data.summary.dormantLocations, 12);
assert.ok(Array.isArray(data.nodes) && data.nodes.length > 0, 'Public network must contain published nodes');
assert.ok(Array.isArray(data.links), 'Public network links must be an array');

const ids = new Set();
const allowedNamedEntities = new Set(['GNK DINAMO Ltd.', 'GNK ASG d.o.o.']);
const prohibitedPublicTerms = /serbia|srbija|beograd|belgrade|omega holding|sports performance tracking|organa|aktual media/i;

for (const node of data.nodes) {
  assert.ok(node.id && node.code, 'Every node requires id and code');
  assert.ok(!ids.has(node.id), `Duplicate node id: ${node.id}`);
  ids.add(node.id);
  assert.ok(node.city && node.country, `Missing city/country for ${node.id}`);
  assert.ok(Number.isFinite(node.latitude) && node.latitude >= -90 && node.latitude <= 90, `Invalid latitude for ${node.id}`);
  assert.ok(Number.isFinite(node.longitude) && node.longitude >= -180 && node.longitude <= 180, `Invalid longitude for ${node.id}`);
  assert.ok(['operating', 'dormant', 'planned'].includes(node.status), `Invalid status for ${node.id}`);
  if (node.publicName) assert.ok(allowedNamedEntities.has(node.publicName), `Unapproved public entity name: ${node.publicName}`);
  assert.ok(!prohibitedPublicTerms.test(JSON.stringify(node)), `Prohibited public location/entity reference in ${node.id}`);
}

for (const link of data.links) {
  assert.ok(ids.has(link.from), `Unknown link source: ${link.from}`);
  assert.ok(ids.has(link.to), `Unknown link target: ${link.to}`);
  assert.notEqual(link.from, link.to, 'Self-links are not allowed');
}

console.log(`group-network-v1: ${data.nodes.length} published nodes, ${data.links.length} links, contract OK`);
