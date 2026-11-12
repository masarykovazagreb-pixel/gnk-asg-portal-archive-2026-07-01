import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {externalStationSection} from '../apps/shared/aktual-external-stations-v1.mjs';

const verified = {hrvatska:'hrvatska',japan:'japan',kenija:'kenija',saudijska:'saudska',gvana:'gana',marsalovi:'maršalovi'};
test('verified cross-links use external station slugs and preserve local pages', () => {
  for (const [slug, external] of Object.entries(verified)) {
    const section = externalStationSection(slug);
    assert.ok(section.includes(`?country=${encodeURIComponent(external)}`));
    const page = readFileSync(`apps/portal/gnk-aktual/media/${slug}/index.html`, 'utf8');
    assert.equal(page.split(section).length, 2);
    assert.ok(page.includes('entity:v1'));
    assert.ok(page.includes('am-ribbon'));
    assert.ok(page.includes('author-band-v1.css'));
  }
});
test('unknown local slug links only to the central directory, never a guessed station', () => {
  for (const slug of ['gvajana', 'toString', '__proto__', '']) {
    const section = externalStationSection(slug);
    assert.ok(section.includes('href="https://j1hex9qg03f0-d.space-z.ai/"'));
    assert.ok(section.includes('još nije potvrđena'));
    assert.ok(!section.includes('?country='));
  }
});
