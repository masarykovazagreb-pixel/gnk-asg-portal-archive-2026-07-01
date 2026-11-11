#!/usr/bin/env node
// Read a single reviewed agent queue, prepare unapproved editorial handoff data.
// Never invents source verification, rights, human approval or publication.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA, APPROVER_ID } from '../lib/policy-v1.mjs';

export function preparePacket(queue, sourceSha) {
  if (!/^[0-9a-f]{40}$/.test(sourceSha || '')) throw Error('Full source SHA required');
  if (!queue || queue.schema !== SCHEMA || !Array.isArray(queue.items) || queue.governance?.approver !== APPROVER_ID) throw Error('Invalid reviewed queue');
  const ids = new Set();
  const candidates = queue.items.map(item => {
    if (!item || typeof item.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) || ids.has(item.id)) throw Error('Invalid or duplicate item id');
    ids.add(item.id);
    if (!['approved-by-agent', 'rejected'].includes(item.status) || item.review?.reviewed_by !== APPROVER_ID || !Array.isArray(item.items) || !item.hr || !item.en) throw Error(`Unreviewed or malformed item: ${item.id}`);
    if (item.review.decision !== (item.status === 'approved-by-agent' ? 'approved' : 'rejected')) throw Error(`Conflicting machine decision: ${item.id}`);
    const digest = createHash('sha256').update(JSON.stringify(item)).digest('hex');
    return {
      id: item.id, sourceDigest: digest, machineStatus: item.status,
      stage: 'human-review-required', approvedForPublication: false,
      // Draft is copied for substantive review; it is not evidence of accuracy or rights.
      draft: item,
      candidate: {
        title: typeof item.hr.title === 'string' ? item.hr.title : '',
        sources: item.items.map(s => ({title: typeof s?.title === 'string' ? s.title : '', url: typeof s?.url === 'string' ? s.url : '', primary: false, confirmed: false, checkedAt: null})),
        // The generated output may include imagery; do not declare it absent without checking.
        visuals: null,
        attribution: null,
        editorialApproval: null,
        aiGovernance: {usedAI: true, role: 'deployer', purpose: 'Urednički pregled iz javnih izvora',
          prohibitedUseScreenPassed: false, privacyAndRightsReviewed: false, riskClassification: 'unknown',
          publicInterest: true, generatesOrAltersText: true, deepfake: false,
          humanEditorialReview: null, disclosure: {visible: false, text: ''}},
      },
      nextSteps: ['Provjeriti izvore i datume, činjenice i prava.', 'Provjeriti stvarne vizuale, autorstvo i AI oznaku.', 'Zabilježiti stvarni sadržajni ljudski pregled i uredničku odluku.', 'Ponovno provjeriti kandidata i koristiti zaseban postupak objave.'],
    };
  });
  return {version: 'ASG_AGENT_REVIEW_PACKET_V1', sourceSha, queueDate: queue.run_date || null,
    status: candidates.length ? 'awaiting-human-review' : 'no-candidates', published: false,
    note: 'Strojno odobrenje nije ljudsko odobrenje niti dokaz prava, činjenica ili javne objave.', candidates};
}

function main(args) {
  if (args.length !== 4 || args[0] !== '--queue-dir' || args[2] !== '--sha') throw Error('Usage: node apps/agents/operations/review-packet-v1.mjs --queue-dir DIR --sha FULL_SHA');
  const dir = resolve(args[1]);
  const files = readdirSync(dir).filter(f => /^queue-\d{4}-\d{2}-\d{2}\.json$/.test(f));
  if (files.length !== 1) throw Error('Expected exactly one current queue in isolated run directory');
  console.log(JSON.stringify(preparePacket(JSON.parse(readFileSync(join(dir, files[0]), 'utf8')), args[3]), null, 2));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 2; }
}
