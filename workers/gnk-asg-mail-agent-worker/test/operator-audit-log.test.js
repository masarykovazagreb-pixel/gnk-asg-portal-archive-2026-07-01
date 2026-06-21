import { readOperatorAuditLog, writeOperatorAuditLog } from '../src/operator-audit-log.js';

class MemoryKV {
  constructor() {
    this.values = new Map();
  }
  async get(key) {
    return this.values.get(key) ?? null;
  }
  async put(key, value) {
    this.values.set(key, String(value));
  }
}

const env = { GNK_ASG_KV: new MemoryKV() };
const written = await writeOperatorAuditLog(env, {
  action: 'suppression.add',
  entityType: 'email',
  entityId: 'person@example.com',
  actor: 'operator-token',
  result: 'success',
  metadata: {
    reason: 'opt_out',
    token: 'must-not-be-stored',
    body: 'must-not-be-stored'
  }
});

if (!written?.id) throw new Error('Audit event was not created.');
const entries = await readOperatorAuditLog(env);
if (entries.length !== 1) throw new Error('Audit event was not persisted.');
if (entries[0].action !== 'suppression.add') throw new Error('Audit action is incorrect.');
if (entries[0].metadata.reason !== 'opt_out') throw new Error('Safe audit metadata is missing.');
if ('token' in entries[0].metadata || 'body' in entries[0].metadata) {
  throw new Error('Sensitive audit metadata was not redacted.');
}

console.log('Operator audit log test passed: persistence and metadata redaction.');
