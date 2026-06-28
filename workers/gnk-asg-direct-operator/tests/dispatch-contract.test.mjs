import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('dispatch contract',()=>{
  const entry=read('workers/gnk-asg-direct-operator/src/index-project50-v28-news-no-fallback.js');
  const dispatch=read('workers/gnk-asg-direct-operator/src/media-outreach-access-dispatch-v1.js');
  const store=read('workers/gnk-asg-direct-operator/src/media-access-code-store-v2.js');
  assert.ok(entry.includes('MEDIA_OUTREACH_RELEASE_APPROVED'));
  assert.ok(entry.includes('withRequiredEmailSignature'));
  assert.ok(dispatch.includes('media-access-code-store-v2.js'));
  assert.ok(dispatch.includes('queue_claim_lost'));
  assert.ok(dispatch.includes('STALE_PDF'));
  assert.ok(dispatch.includes('SENT_ACCESS_FAILED'));
  assert.ok(store.includes('DELIVERY_PENDING'));
  assert.ok(store.includes("status='ACTIVE'"));
  assert.ok(store.includes('DELIVERY_FAILED'));
  assert.ok(store.includes('code_hash'));
  assert.ok(store.includes('db.batch'));
});

test('production media release gates are not enabled in repository configuration',()=>{
  const wrangler=read('workers/gnk-asg-direct-operator/wrangler.toml');
  assert.doesNotMatch(wrangler,/^MEDIA_OUTREACH_LIVE\s*=\s*["']?(?:1|true|yes|on)["']?\s*$/im);
  assert.doesNotMatch(wrangler,/^MEDIA_OUTREACH_RELEASE_APPROVED\s*=\s*["']?(?:1|true|yes|on)["']?\s*$/im);
});
