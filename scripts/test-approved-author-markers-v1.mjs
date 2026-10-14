import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gnk-approved-author-markers-'));
const write = (relative, content) => {
  const file = path.join(temp, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
};
const route = slug => `https://gnk-asg.hr/objave/${slug}/`;
const page = slug => `<!doctype html><html><head>
<link rel="canonical" href="${route(slug)}">
<meta name="keywords" content="topic, Nermin Sefić">
</head><body><main><p class="article-hashtags">#GNKASG #Topic #NerminSefić</p></main></body></html>`;

try {
  const paths = {
    verified: 'apps/portal/objave/verified-author/index.html',
    unverified: 'apps/portal/objave/syndicated-report/index.html',
    spt: 'apps/portal/objave/spt-protected/index.html',
    bank: 'apps/portal/objave/bank-account-protected/index.html',
  };
  const originalProtected = {
    spt: page('spt-protected'),
    bank: page('bank-account-protected'),
  };
  write(paths.verified, page('verified-author'));
  write(paths.unverified, page('syndicated-report'));
  write(paths.spt, originalProtected.spt);
  write(paths.bank, originalProtected.bank);
  write('apps/portal/data/approved_mentions.json', JSON.stringify({
    approved_scope: 'all_articles_with_author_box',
    approved_urls: [route('verified-author'), route('syndicated-report'), route('spt-protected'), route('bank-account-protected')],
    approved_items: [],
  }, null, 2));
  write('apps/portal/data/editorial-registry.json', JSON.stringify({ items: [
    {
      path: '/objave/verified-author/', author: 'Nermin Sefić', authorSchemaVerified: true,
      authorAttributionBasis: 'visible-editorial-byline-and-person-schema',
    },
    { path: '/objave/syndicated-report/', author: null, authorSchemaVerified: false, authorAttributionBasis: null },
    {
      path: '/objave/spt-protected/', author: 'Nermin Sefić', authorSchemaVerified: true,
      authorAttributionBasis: 'visible-editorial-byline-and-person-schema',
    },
    {
      path: '/objave/bank-account-protected/', author: 'Nermin Sefić', authorSchemaVerified: true,
      authorAttributionBasis: 'visible-editorial-byline-and-person-schema',
    },
  ] }, null, 2));
  write('scripts/enforce-approved-author-markers-v1.mjs', fs.readFileSync('scripts/enforce-approved-author-markers-v1.mjs', 'utf8'));
  write('scripts/lib/editorial-route-protection-v1.mjs', fs.readFileSync('scripts/lib/editorial-route-protection-v1.mjs', 'utf8'));

  const result = spawnSync(process.execPath, ['scripts/enforce-approved-author-markers-v1.mjs'], {
    cwd: temp, encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const verified = fs.readFileSync(path.join(temp, paths.verified), 'utf8');
  assert.match(verified, /class="article-hashtags">#GNKASG #NerminSefić #NerminSefic #Topic/u);
  assert.doesNotMatch(verified, /<meta name="keywords" content="[^"]*Nermin/u);

  const syndicated = fs.readFileSync(path.join(temp, paths.unverified), 'utf8');
  assert.match(syndicated, /class="article-hashtags">#GNKASG #Topic/u);
  assert.doesNotMatch(syndicated, /#NerminSefić|#NerminSefic|<meta name="keywords" content="[^"]*Nermin/u);

  assert.equal(fs.readFileSync(path.join(temp, paths.spt), 'utf8'), originalProtected.spt, 'SPT pages must remain byte-identical');
  assert.equal(fs.readFileSync(path.join(temp, paths.bank), 'utf8'), originalProtected.bank, 'bank pages must remain byte-identical');

  const summary = JSON.parse(result.stdout);
  assert.equal(summary.approved_and_verified_nermin_urls, 1);
  assert.equal(summary.protected_routes_skipped, 2);
  console.log(JSON.stringify({
    ok: true,
    verifiedAuthorshipOnly: true,
    syndicatedUnverifiedNotMarked: true,
    protectedRoutesUntouched: true,
  }, null, 2));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
