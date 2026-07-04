import assert from 'node:assert/strict';
import {normalizeMailStudioSignature} from '../src/mail-studio-extension-v3.js';
import {__test as ai} from '../src/ai-inbound-auto-reply-v2.js';

const institutional = [
  'Body',
  '',
  'Nermin Sefić | Managing Director',
  'Managing Director',
  'Global Service Centre: London',
  'nermin.sefic@gnk-asg.hr',
  'https://gnk-asg.hr',
  '',
  'Srdačan pozdrav,',
  '',
  'Nermin Sefić | Managing Director',
  'GNK ASG d.o.o.',
  'Zagrebačka cesta 130, 10090 Zagreb',
  'OIB: 75227917632 · MBS: 081512375',
  'Web: https://gnk-asg.hr',
  'E-mail: nermin.sefic@gnk-asg.hr'
].join('\n');

const normalizedInstitutional = normalizeMailStudioSignature({
  from: {email: 'nermin.sefic@gnk-asg.hr'},
  text: institutional,
  plainText: institutional
});
assert.match(normalizedInstitutional.text, /Global Service Centre: London/);
assert.doesNotMatch(normalizedInstitutional.text, /OIB: 75227917632/);
assert.equal(normalizedInstitutional.text, normalizedInstitutional.plainText);
assert.equal(normalizedInstitutional.headers['X-GNK-ASG-Signature-Parity'], 'GNK_ASG_MAIL_STUDIO_EXTENSION_V6_20260704_SIGNATURE_PARITY');

const normalizedMedia = normalizeMailStudioSignature({
  from: {email: 'media@gnk-asg.hr'},
  text: 'Test message',
  html: '<html><body><p>Test message</p></body></html>'
});
assert.match(normalizedMedia.text, /Media Relations & Accreditation Center/);
assert.match(normalizedMedia.html, /gnk-asg-email-logo-transparent\.png/);
assert.equal((normalizedMedia.html.match(/data-gnk-asg-media-signature=/g) || []).length, 1);
assert.equal((normalizedMedia.text.match(/Media Relations & Accreditation Center/g) || []).length, 1);

assert.equal(ai.detectLanguage('Poštovani, možete li potvrditi prijavu?'), 'hr');
assert.equal(ai.detectLanguage('Guten Tag, können Sie bitte antworten?'), 'de');
assert.equal(ai.detectLanguage('Hello, please confirm receipt.'), 'en');
assert.equal(ai.signatureName('Thank you\n\nKind regards\nJohn Smith', 'john@example.com'), 'John Smith');
assert.equal(ai.signatureName('Hvala\n\nSrdačan pozdrav\nAna Horvat', 'ana@example.com'), 'Ana Horvat');

const incoming = {
  from: 'John Smith <john@example.com>',
  to: 'media@gnk-asg.hr',
  headers: new Headers({from: 'John Smith <john@example.com>', to: 'media@gnk-asg.hr'})
};
const automaticPayload = {
  from: {email: 'media@gnk-asg.hr'},
  to: 'john@example.com',
  subject: 'Re: Accreditation request',
  text: 'Your message has been received.',
  headers: {'Auto-Submitted': 'auto-replied'}
};
assert.equal(ai.isAutomaticReply(automaticPayload, incoming), true);
assert.equal(ai.isAutomaticReply({...automaticPayload, headers: {}, subject: 'New message', text: 'Manual note'}, incoming), false);

console.log('ENTERPRISE_FINAL_REVIEW_UNIT_TESTS_OK');
