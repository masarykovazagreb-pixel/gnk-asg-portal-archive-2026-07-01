import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const contract = JSON.parse(await readFile(new URL('../config/public-data-surface.json', import.meta.url), 'utf8'));

assert.equal(contract.mode, 'offline-shadow');
assert.equal(contract.enabled, false);
assert.equal(contract.publicReleaseAllowed, false);
assert.equal(contract.safety.realMoney, false);
assert.equal(contract.safety.payments, false);
assert.equal(contract.safety.withdrawals, false);
assert.equal(contract.safety.externalDeposits, false);
assert.equal(contract.safety.leverage, false);
assert.equal(contract.safety.shortSelling, false);
assert.equal(contract.safety.productionWrites, false);
assert.equal(contract.safety.automaticPublishing, false);
assert.equal(contract.privacy.allowEmails, false);
assert.equal(contract.privacy.allowIpAddresses, false);
assert.equal(contract.privacy.allowSecrets, false);
assert.equal(contract.privacy.allowPrivateNotes, false);
assert.equal(contract.privacy.allowRawEvidenceDocuments, false);
assert.ok(contract.sections.length >= 10, 'Public surface should expose rich, structured data when activated.');
assert.ok(contract.disclaimer.includes('SIMULACIJA'));

console.log(JSON.stringify({ ok: true, sections: contract.sections.length, publicReleaseAllowed: false }, null, 2));
