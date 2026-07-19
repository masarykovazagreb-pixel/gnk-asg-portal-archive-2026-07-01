import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js','utf8');
const writer=fs.readFileSync('workers/gnk-asg-ai-newsroom-writer/src/index.js','utf8');
const images=fs.readFileSync('workers/gnk-asg-direct-operator/src/dynamic-editorial-image-v1.js','utf8');
const entrypoint=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js','utf8');

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

assert.match(source,/const DAILY_POST_LIMIT=10;/);
assert.match(source,/const DAILY_COMMENTARY_LIMIT=3;/);
assert.match(source,/const PUBLICATION_BATCH_LIMIT=13;/);
assert.match(source,/async function publishedCategoryCounts\(store,published\)/);
assert.match(source,/post\.category==='commentary'/);
assert.match(source,/isCommentary&&counts\.commentaries>=DAILY_COMMENTARY_LIMIT/);
assert.match(source,/!isCommentary&&counts\.posts>=DAILY_POST_LIMIT/);
assert.match(source,/if\(isCommentary\)counts\.commentaries\+=1;else counts\.posts\+=1/);
assert.doesNotMatch(source,/const day=today\(\),published=.*?,max=13/);

assert.match(writer,/const DAILY_NEWS=10;/);
assert.match(writer,/const DAILY_COMMENTARIES=3;/);
assert.match(writer,/category:commentary\?'commentary':categoryOf\(topic\)/);
assert.match(writer,/NEWSROOM_AUTOMATION_TOKEN/);
assert.match(writer,/newsroom_service_authorization_not_configured/);
assert.match(writer,/\/assets\/editorial\/generated\//);
assert.doesNotMatch(writer,/gnk-gold-logo|logo-gnk-asg/);
assert.match(writer,/result\.ok=result\.prepared===DAILY_TOTAL/);
assert.match(images,/DYNAMIC_EDITORIAL_IMAGES_V1/);
assert.match(images,/image\/svg\+xml/);
assert.match(images,/max-age=31536000, immutable/);
assert.match(entrypoint,/serveDynamicEditorialImage/);
assert.match(entrypoint,/DYNAMIC_EDITORIAL_IMAGE_VERSION/);

console.log(JSON.stringify({ok:true,images:'local-approved-unique-dynamic',seo:'per-post',dailyLimits:{posts:10,commentaries:3,batch:13},writer:'fail-closed-service-auth',primaryEntity:'Nermin Sefić'},null,2));
