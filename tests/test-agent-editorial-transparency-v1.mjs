#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AI_DISCLOSURE } from '../apps/agents/lib/policy-v1.mjs';

for (const lang of ['hr', 'en']) {
  assert.match(AI_DISCLOSURE[lang], /AGENT-KONTROLA-001/);
  assert.match(AI_DISCLOSURE[lang], lang === 'hr' ? /nije ljudska provjera/i : /not human fact-checking/i);
  assert.doesNotMatch(AI_DISCLOSURE[lang], lang === 'hr' ? /Objavu je odobrio/ : /publication was approved/i);
}
const publish = readFileSync(new URL('../scripts/publish-agent-reviews-v1.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(publish, /direktor GNK ASG d\.o\.o\.|director of GNK ASG d\.o\.o\./);
assert.match(publish, /Automatski provjerio: AI kontrolni agent/);
assert.match(publish, /Automatically checked by: AI control agent/);
const workflow = readFileSync(new URL('../.github/workflows/agent-editorial-daily.yml', import.meta.url), 'utf8');
assert.match(workflow, /NOT DEPLOYED BY THIS WORKFLOW/);
assert.match(workflow, /contents: read/);
console.log('PASS: AI status, attribution, draft-only workflow transparency');
