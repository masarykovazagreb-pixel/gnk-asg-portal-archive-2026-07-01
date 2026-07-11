import assert from 'node:assert/strict';
import { enforceRequiredSignature, MANDATORY_BCC, VERSION } from '../src/email-signature-contract-v1.js';

const result = enforceRequiredSignature({
  from: { name: 'GNK ASG Info Desk', email: 'info@gnk-asg.hr' },
  to: 'recipient@example.com',
  subject: 'Test',
  text: 'Provjera poruke',
  html: '<p>Provjera poruke</p>'
});

assert.match(result.text, /GNK ASG d\.o\.o\./);
assert.match(result.text, /OIB: 75227917632/);
assert.match(result.text, /E-mail: info@gnk-asg\.hr/);
assert.match(result.html, /data-gnk-asg-signature=/);
assert.match(result.html, /GNK_ASG_logo_gold_transparent\.png/);
assert.equal(result.bcc, MANDATORY_BCC + ', rht@gmx.com', 'BCC must include both mandatory copies (2026-07-11 owner-confirmed second address)');
assert.equal(result.headers['X-GNK-ASG-Signature-Contract'], VERSION);
assert.equal(result.headers['X-GNK-ASG-Mandatory-Copy'], 'ENFORCED');
assert.equal(result.headers['X-GNK-ASG-Signature-Logo'], 'gold');

const deduplicated = enforceRequiredSignature({
  from: 'info@gnk-asg.hr',
  to: MANDATORY_BCC,
  text: 'Test'
});
assert.equal(deduplicated.bcc, 'rht@gmx.com', 'Primary mandatory copy must not duplicate a visible recipient, but the second mandatory copy still applies');

const media = enforceRequiredSignature({
  from: { name: 'Media Center', email: 'media@gnk-asg.hr' },
  to: 'recipient@example.com',
  text: 'Media test'
});
assert.match(media.text, /GNK DINAMO Ltd\. Group/);
assert.match(media.text, /Media Relations & Accreditation Center/);
assert.doesNotMatch(media.text, /WhatsApp|\+385|091/);

const secondPass = enforceRequiredSignature(result);
assert.equal((secondPass.text.match(/GNK ASG d\.o\.o\./g) || []).length, 1, 'Signature must remain idempotent');

console.log('email-signature-contract-v1: mandatory signature, BCC and idempotence OK');
