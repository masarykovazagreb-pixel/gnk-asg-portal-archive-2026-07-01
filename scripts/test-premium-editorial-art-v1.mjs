import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { loadPremiumArtwork, writePremiumWebp } from './lib/editorial-premium-art-v1.mjs';

const items=loadPremiumArtwork();
assert.ok(items.size>0,'At least one reviewed original visual is required');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'aktual-premium-'));
try {
  for (const [route,visual] of items) {
    assert.ok(visual.rightsReviewed && visual.topicalRelevanceReviewed,'Artwork requires actual provenance and relevance');
    const target=path.join(scratch,'verified.webp');
    writePremiumWebp(visual,target);
    const data=fs.readFileSync(target);
    assert.ok(data.length>=2000 && data.length<=2_000_000,'Premium 1200x630 WebP must be reasonably optimized');
    const result=spawnSync('identify',['-format','%wx%h %[channels]',target],{encoding:'utf8'});
    assert.equal(result.status,0);
    assert.match(result.stdout,/^1200x630 /);
    console.log(JSON.stringify({route,source:visual.source,sourceSha256:visual.sha256,format:'WebP',size:data.length,pixels:'1200x630',rightsReviewed:true,visualContext:'conceptual-not-documentary'}));
  }
} finally {
  fs.rmSync(scratch,{recursive:true,force:true});
}
