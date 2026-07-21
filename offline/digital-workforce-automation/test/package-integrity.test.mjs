import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePackage } from '../src/validate-package.mjs';

test('offline package contract remains internally consistent', async () => {
  const result = await validatePackage();
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.errors.length, 0);
  assert.ok(result.checked.requiredFiles >= 10);
  assert.ok(result.checked.agents >= 6);
  assert.ok(result.checked.projects >= 1);
  assert.ok(result.checked.publicationWindows >= 1);
});
