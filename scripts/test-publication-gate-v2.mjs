import assert from 'node:assert/strict';
import { isPublished, publicationState, publishedItems } from './lib/publication-gate-v2.mjs';

const now = new Date('2026-08-14T12:00:00+02:00');
assert.equal(isPublished({path:'/past/',publishedAt:'2026-08-14T11:59:59+02:00'}, now), true);
assert.equal(isPublished({path:'/future/',publishedAt:'2026-08-14T12:00:01+02:00'}, now), false);
assert.equal(publicationState({path:'/future/',publishedAt:'2026-08-15T12:00:00+02:00'}, now), 'scheduled');
assert.equal(isPublished({path:'/held/',status:'held',publishedAt:'2026-08-01T00:00:00Z'}, now), false);
assert.deepEqual(publishedItems({items:[{path:'/past/'},{path:'/future/',publishedAt:'2026-08-15T00:00:00Z'}]}, now).map(x=>x.path), ['/past/']);
console.log('Publication Gate V2: PASS');
