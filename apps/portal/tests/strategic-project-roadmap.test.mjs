import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const roadmap = JSON.parse(await readFile(new URL('../data/strategic-project-roadmap.json', import.meta.url), 'utf8'));

assert.equal(roadmap.scope, 'public');
assert.equal(roadmap.summary.projects, 9);
assert.equal(roadmap.projects.length, 9);
assert.equal(new Set(roadmap.projects.map(project => project.id)).size, 9);
assert.deepEqual(roadmap.projects.map(project => project.number), [1,2,3,4,5,6,7,8,9]);

const tracks = new Set(roadmap.tracks.map(track => track.id));
assert.equal(tracks.size, roadmap.summary.implementationTracks);

for (const project of roadmap.projects) {
  assert.ok(tracks.has(project.track), `Unknown track: ${project.track}`);
  assert.ok(project.titleHr && project.titleEn, `Missing bilingual title: ${project.id}`);
  assert.ok(project.objectiveHr && project.objectiveEn, `Missing bilingual objective: ${project.id}`);
  assert.ok(Array.isArray(project.nextGates) && project.nextGates.length > 0, `Missing next gates: ${project.id}`);
  assert.ok(Array.isArray(project.riskClasses) && project.riskClasses.length > 0, `Missing risk classes: ${project.id}`);
  assert.ok(project.publicStatus, `Missing public status: ${project.id}`);
}

const announced = roadmap.projects.filter(project => project.publicStatus === 'announced');
assert.equal(announced.length, roadmap.summary.publiclyAnnounced);
assert.equal(announced[0].id, 'the-code-acquisition-integration');
assert.ok(Date.parse(announced[0].officialReveal), 'THE CODE reveal time must be parseable');

const forbiddenCompletionClaims = /completed|operationally ready|regulatory approval granted|financing secured/i;
assert.ok(!forbiddenCompletionClaims.test(JSON.stringify(roadmap)), 'Roadmap must not imply unverified completion');

console.log('strategic-project-roadmap: 9 projects, bilingual content and implementation gates OK');
