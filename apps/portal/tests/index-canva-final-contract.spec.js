const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const portalRoot = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(portalRoot, file), 'utf8');
const hr = read('index.html');
const en = read('en/index.html');
const bootstrap = read('assets/gallery-bootstrap.js');

const coreSectionIds = [
  'financials',
  'public-desk',
  'the-code',
  'posts-news',
  'media-application',
  'documents',
  'digital-workforce',
  'protected-entry'
];

function expectPublicIndex(html, lang) {
  assert.match(html, new RegExp(`<html lang='${lang}'`));
  for (const id of coreSectionIds) assert.match(html, new RegExp(`id='${id}'`), `${lang} missing ${id}`);
  assert.match(html, /GNK ASG d\.o\.o\./);
  assert.match(html, /GNK DINAMO Ltd\. Group/);
  assert.match(html, /THE CODE \/ 9/);
  assert.match(html, /PDF source \/ public financial summary/);
  assert.match(html, /src='\/the-code\/\?embed=1'/);
  assert.match(html, /href='\/downloads\//);
  assert.match(html, /href='\/admin-center\//);
  assert.doesNotMatch(html, /gnkAdminToken|operator-token|x-operator-token|Bearer\s+</i);
  assert.doesNotMatch(html, /api\/operator-send-mail|api\/admin-mail-send|test-send|bulk-send|campaign trigger/i);
}

test('HR public index satisfies Canva final contract shell', () => {
  expectPublicIndex(hr, 'hr');
  assert.match(hr, /Financije, projekti i objave/);
  assert.match(hr, /href='\/media-application\/\?lang=hr'/);
  assert.match(hr, /Zaštićeni ulaz/);
});

test('EN public index mirrors HR structure and protected separation', () => {
  expectPublicIndex(en, 'en');
  assert.match(en, /Financials, projects and posts/);
  assert.match(en, /href='\/media-application\/\?lang=en'/);
  assert.match(en, /Protected entry/);
});

test('HR and EN keep the same core section count', () => {
  const hrSections = coreSectionIds.filter(id => hr.includes(`id='${id}'`));
  const enSections = coreSectionIds.filter(id => en.includes(`id='${id}'`));
  assert.deepEqual(hrSections, enSections);
});

test('public bootstrap is data-only and safe for the public index', () => {
  assert.match(bootstrap, /path !== '\/' && path !== '\/en'/);
  assert.match(bootstrap, /public-operational-feed\.json/);
  assert.match(bootstrap, /public-conclusions\.json/);
  assert.match(bootstrap, /worker-results-3h\.json/);
  assert.match(bootstrap, /digital-workforce-directory-v1\.js/);
  assert.doesNotMatch(bootstrap, /operator-send-mail|admin-mail-send|mail-center|localStorage|sessionStorage|gnkAdminToken/i);
});
