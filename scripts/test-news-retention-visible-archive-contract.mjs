import assert from 'node:assert/strict';
import {
  VISIBLE_LIMIT,
  ARCHIVE_CAP,
  PRUNE_OLDEST,
  TOTAL_RETENTION_CAP,
  applyRetentionPolicy
} from '../workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js';

assert.equal(VISIBLE_LIMIT,100);
assert.equal(ARCHIVE_CAP,2000);
assert.equal(PRUNE_OLDEST,1000);
assert.equal(TOTAL_RETENTION_CAP,2100);

const below=applyRetentionPolicy(Array.from({length:2099},(_,i)=>`id-${i}`));
assert.equal(below.queue.length,2099);
assert.equal(below.visibleCount,100);
assert.equal(below.archiveCount,1999);
assert.equal(below.removed.length,0);

const atThreshold=applyRetentionPolicy(Array.from({length:2100},(_,i)=>`id-${i}`));
assert.equal(atThreshold.queue.length,1100);
assert.equal(atThreshold.visibleCount,100);
assert.equal(atThreshold.archiveCount,1000);
assert.equal(atThreshold.removed.length,1000);
assert.equal(atThreshold.queue[0],'id-0');
assert.equal(atThreshold.queue.at(-1),'id-1099');
assert.equal(atThreshold.removed[0],'id-1100');
assert.equal(atThreshold.removed.at(-1),'id-2099');

const deduped=applyRetentionPolicy(['newest','middle','newest','oldest']);
assert.deepEqual(deduped.queue,['newest','middle','oldest']);

console.log(JSON.stringify({
  ok:true,
  visible:VISIBLE_LIMIT,
  archive:ARCHIVE_CAP,
  totalThreshold:TOTAL_RETENTION_CAP,
  pruneOldest:PRUNE_OLDEST
},null,2));
