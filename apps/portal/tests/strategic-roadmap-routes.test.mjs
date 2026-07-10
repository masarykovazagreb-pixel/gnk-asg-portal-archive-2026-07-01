import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [hrPage, enPage, script, style, sitemap, roadmap] = await Promise.all([
  read('projects/roadmap/index.html'),
  read('en/projects/roadmap/index.html'),
  read('assets/strategic-project-roadmap-v1.js'),
  read('assets/strategic-project-roadmap-v1.css'),
  read('sitemap.xml'),
  read('data/strategic-project-roadmap.json')
]);

assert.match(hrPage, /lang="hr"/);
assert.match(enPage, /lang="en"/);
assert.match(hrPage, /data-strategic-roadmap-mount/);
assert.match(enPage, /data-strategic-roadmap-mount/);
assert.match(hrPage, /strategic-project-roadmap-v1\.js/);
assert.match(enPage, /strategic-project-roadmap-v1\.js/);
assert.match(hrPage, /strategic-project-roadmap-v1\.css/);
assert.match(enPage, /strategic-project-roadmap-v1\.css/);
assert.match(hrPage, /hreflang="en"[^>]+\/en\/projects\/roadmap\//);
assert.match(enPage, /hreflang="hr"[^>]+\/projects\/roadmap\//);

assert.match(script, /GNKStrategicRoadmap/);
assert.match(script, /strategic-project-roadmap\.json/);
assert.match(script, /AbortController/);
assert.match(script, /aria-pressed/);
assert.match(style, /prefers-reduced-motion/);
assert.match(style, /@media\(max-width:680px\)/);

assert.match(sitemap, /<loc>https:\/\/www\.gnk-asg\.hr\/projects\/roadmap\/<\/loc>/);
assert.match(sitemap, /<loc>https:\/\/www\.gnk-asg\.hr\/en\/projects\/roadmap\/<\/loc>/);

const data = JSON.parse(roadmap);
assert.equal(data.projects.length, 9);
assert.equal(data.tracks.length, 5);

console.log('strategic-roadmap-routes: HR/EN pages, assets, accessibility and sitemap OK');
