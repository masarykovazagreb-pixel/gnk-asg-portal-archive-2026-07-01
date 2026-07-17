import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js','utf8');

assert.match(source,/APPROVED_IMAGE_PREFIX='\/assets\/'/);
assert.match(source,/image_required/);
assert.match(source,/image_must_be_local_asset/);
assert.match(source,/duplicate_image/);
assert.match(source,/seoTitle/);
assert.match(source,/metaDescription/);
assert.match(source,/canonicalUrl/);
assert.match(source,/author:\s*'Nermin Sefić'/);
assert.match(source,/publisher:\s*'GNK ASG d\.o\.o\.'/);
assert.match(source,/relatedOrganization:\s*'GNK Dinamo Ltd\.'/);
assert.match(source,/imageAlt/);
assert.match(source,/imageTitle/);
assert.match(source,/imageCaption/);
assert.match(source,/imageObject/);
assert.doesNotMatch(source,/\|\|'\/assets\/logo-gnk-asg-canonical\.svg'/);

console.log(JSON.stringify({ok:true,images:'local-approved-unique',seo:'per-post',primaryEntity:'Nermin Sefić'},null,2));
