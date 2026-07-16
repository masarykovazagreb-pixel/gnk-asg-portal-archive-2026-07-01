import fs from 'node:fs';
import assert from 'node:assert/strict';

const production=fs.readFileSync('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml','utf8');
const review=fs.readFileSync('workers/gnk-asg-direct-operator/wrangler.review-direct-operator.toml','utf8');

assert.match(production,/PUBLIC_ENVIRONMENT = "production-direct-operator"/);
assert.match(production,/MAIL_AUTO_REPLY_LIVE = "true"/);
assert.match(production,/MAIL_STUDIO_LIVE = "true"/);
assert.match(production,/MAIL_MANUAL_LIVE = "true"/);
assert.doesNotMatch(production,/PUBLIC_ENVIRONMENT = "review-direct-operator"/);

assert.match(review,/PUBLIC_ENVIRONMENT = "review-direct-operator"/);
assert.match(review,/MAIL_AUTO_REPLY_LIVE = "false"/);
assert.match(review,/MAIL_STUDIO_LIVE = "false"/);
assert.match(review,/MAIL_MANUAL_LIVE = "false"/);

console.log(JSON.stringify({ok:true,productionEnvironment:true,reviewFailClosed:true,mailSent:false},null,2));
