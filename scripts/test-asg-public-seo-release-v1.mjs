import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const icon = read('apps/portal/favicon.svg');
const home = read('apps/portal/index.html');
const profile = read('apps/portal/nermin-sefic/index.html');
const comments = read('apps/portal/komentari/index.html');
const robots = read('apps/portal/robots.txt');
const sitemap = read('apps/portal/sitemap.xml');
const seoGenerator = read('apps/portal/scripts/generate_seo.py');
const drafts = read('docs/editorial/nermin-sefic-20-komentara-nacrti-2026-11-06.md');

function exactlyOnce(text, literal, label) {
  assert.equal(text.split(literal).length - 1, 1, label);
}

assert.match(icon, /aria-label="ASG"/, 'Root favicon identifies the ASG brand');
assert.match(icon, /#b4162e/i, 'Root favicon has red ASG background');
assert.match(icon, />ASG</, 'Root favicon contains ASG lettering');

const iconUrl = 'https://gnk-asg.hr/favicon.svg?v=asg-red-20261107';
exactlyOnce(home, 'href="' + iconUrl + '"', 'Homepage red ASG favicon URL');
exactlyOnce(profile, 'href="' + iconUrl + '"', 'Profile red ASG favicon URL');
exactlyOnce(comments, 'href="/favicon.svg?v=asg-red-20261107"', 'Commentary red ASG favicon URL');

exactlyOnce(profile, 'href="../komentari/"', 'Profile links to author comments');
exactlyOnce(comments, '<link rel="author" href="https://gnk-asg.hr/nermin-sefic/">', 'Commentary author SEO link');
exactlyOnce(comments, 'href="/nermin-sefic/" rel="author"', 'Commentary displays the author profile link');
exactlyOnce(comments, '<title>Komentari Nermina Sefića | GNK ASG</title>', 'Commentary SEO title');
exactlyOnce(comments, '<meta property="og:title" content="Komentari Nermina Sefića | GNK ASG">', 'Commentary share title');

exactlyOnce(profile, '<link rel="canonical" href="https://gnk-asg.hr/nermin-sefic/">', 'Profile canonical');
exactlyOnce(comments, '<link rel="canonical" href="https://gnk-asg.hr/komentari/">', 'Commentary canonical');
exactlyOnce(sitemap, '<loc>https://gnk-asg.hr/nermin-sefic/</loc>', 'Profile present in main sitemap');
exactlyOnce(sitemap, '<loc>https://gnk-asg.hr/komentari/</loc>', 'Comments root present in main sitemap');
exactlyOnce(sitemap, '<loc>https://gnk-asg.hr/en/commentary/</loc>', 'English comments root present in main sitemap');

const protectedRoutes = [
  '/admin/', '/admin-center/', '/control/', '/automation-status/', '/webmail/',
  '/mail-studio/', '/campaign-mailer/', '/email-status/', '/worker-ops/',
  '/operator-dashboard/', '/digital-headquarters/', '/media-registration-admin/',
  '/podijeli/', '/api/'
];
const groups = robots.split(/(?=^User-agent: )/gm).filter(group => group.startsWith('User-agent: '));
assert.ok(groups.length >= 10, 'Expected general and named crawler groups');
for (const group of groups) {
  const name = group.split('\n', 1)[0];
  const directives = group.split(/^Sitemap: /m)[0].split(/\r?\n/);
  for (const route of protectedRoutes) {
    assert.ok(directives.includes('Disallow: ' + route), name + ' missing ' + route);
  }
}
assert.ok(robots.includes('Sitemap: https://gnk-asg.hr/sitemap.xml'));
assert.match(seoGenerator, /robots_policy = ROOT\/'robots.txt'/);
assert.doesNotMatch(seoGenerator, /\(ROOT\/'robots\.txt'\)\.write_text\(/,
  'SEO generator must not overwrite the reviewed robots policy');
assert.match(seoGenerator, /commentary_routes = \('komentari\/', 'en\/commentary\/'\)/);

const draftSections = [...drafts.matchAll(/^## ([0-9]{1,2})\.\s/gm)].map(m => Number(m[1]));
assert.deepEqual(draftSections, Array.from({length: 20}, (_, i) => i + 1),
  'Twenty draft sections must be preserved in the correct order');
assert.match(drafts, /STATUS:\s*NACRTI ZA AUTORSKU PROVJERU/);
assert.match(drafts, /nisu odobrene izjave/);

console.log('ASG public SEO release contract passed: favicon, reciprocal author links, canonical sitemaps, 14 restricted routes in ' +
  groups.length + ' crawler groups and 20 unapproved drafts.');
