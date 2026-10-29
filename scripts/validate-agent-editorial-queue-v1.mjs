#!/usr/bin/env node
// Validator reda agenata: svaka objava s statusom approved-by-agent mora biti
// odobrena od AI kontrolnog agenta i mora ponovno proći sva pravila. Odbijene
// objave moraju imati razloge. Nijedna objava ne smije tvrditi ljudsko odobrenje.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reviewDraft } from '../apps/agents/control-agent-v1.mjs';
import { APPROVER_ID, SCHEMA } from '../apps/agents/lib/policy-v1.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = resolve(process.env.AGENT_OUT || join(ROOT, 'artifacts', 'agent-editorial'));
const errors = [];
const report = { dir: DIR, queues: 0, approved: 0, rejected: 0 };

if (!existsSync(DIR)) {
  errors.push(`nema direktorija reda: ${DIR}`);
} else {
  const files = readdirSync(DIR).filter((f) => /^queue-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  report.queues = files.length;
  if (!files.length) errors.push('nema nijednog reda objava (queue-YYYY-MM-DD.json)');
  for (const f of files) {
    const queue = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
    if (queue.schema !== SCHEMA) errors.push(`${f}: neočekivana shema ${queue.schema}`);
    if (queue.governance?.approver !== APPROVER_ID) errors.push(`${f}: approver mora biti ${APPROVER_ID}`);
    if (queue.governance?.human_editorial_gate) errors.push(`${f}: ljudska kontrola ne smije biti u ovom redu`);
    for (const d of queue.items || []) {
      const r = d.review;
      if (!r) { errors.push(`${f}/${d.id}: nema odluke kontrolnog agenta`); continue; }
      if (r.reviewed_by !== APPROVER_ID) errors.push(`${f}/${d.id}: odluku nije donio ${APPROVER_ID}`);
      if (d.status === 'approved-by-agent') {
        report.approved++;
        if (r.decision !== 'approved') errors.push(`${f}/${d.id}: status approved, a odluka ${r.decision}`);
        const again = reviewDraft({ ...d, status: 'draft' }, { now: new Date(r.reviewed_at) });
        if (again.decision !== 'approved') errors.push(`${f}/${d.id}: ponovna provjera pada: ${again.reasons.join('; ')}`);
      } else if (d.status === 'rejected') {
        report.rejected++;
        if (!r.reasons?.length) errors.push(`${f}/${d.id}: odbijena objava bez razloga`);
      } else {
        errors.push(`${f}/${d.id}: nedozvoljen status ${d.status}`);
      }
    }
  }
}

report.ok = errors.length === 0;
report.errors = errors;
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
