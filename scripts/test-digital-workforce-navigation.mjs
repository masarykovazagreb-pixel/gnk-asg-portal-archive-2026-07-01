import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync('apps/portal/assets/app.js', 'utf8');
const entry = fs.readFileSync('apps/portal/assets/digital-workforce-entry-v1.js', 'utf8');
const publicPage = fs.readFileSync('apps/portal/digital-workforce/index.html', 'utf8');
const operator = fs.readFileSync('apps/portal/operator-dashboard/index.html', 'utf8');

assert.match(app, /digital-workforce-entry-v1\.js/);
assert.match(entry, /\/digital-workforce\//);
assert.match(entry, /Digitalna radna snaga/);
assert.match(entry, /Digital Workforce/);
assert.match(entry, /\.admin-page \.nav-links/);
assert.match(entry, /\/editor-desk\//);

assert.match(publicPage, /<title>Digitalna radna snaga/);
assert.match(publicPage, /\/api\/public\/digital-workforce\/health/);
assert.match(publicPage, /href="\/editor-desk\/"/);
assert.match(publicPage, /href="\/workers\/"/);

assert.match(operator, /href="\/digital-workforce\/"/);
assert.match(operator, /href="\/editor-desk\/"/);
assert.match(operator, /Digitalna radna snaga/);
assert.match(operator, /Editor Desk/);
assert.match(operator, /data-ops-session/);

console.log(JSON.stringify({
  ok: true,
  publicEntry: '/digital-workforce/',
  adminEntry: '/operator-dashboard/',
  editorDesk: '/editor-desk/',
  workers: '/workers/',
  protectedOperatorSession: true
}, null, 2));
