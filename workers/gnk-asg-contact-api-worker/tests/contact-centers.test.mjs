import test from 'node:test';
import assert from 'node:assert/strict';
import {applyReceivingCenterToPayload,VERSION} from '../src/index-centers-v4.js';

const caseId='GNK-ASG-20260628-ABCD1234';
const payload={
  subject:`[${caseId}] Potvrda zaprimanja upita`,
  text:`Poštovani,\n\nEvidencijski broj: ${caseId}\n\nSačuvajte evidencijski broj radi buduće komunikacije.\n\nSrdačan pozdrav,`,
  html:`<p>Poštovani,</p><p><b>Evidencijski broj:</b> ${caseId}</p><p>Sačuvajte evidencijski broj radi buduće komunikacije.</p>`
};

test('contact auto-reply includes the stable digital receiving center',()=>{
  const first=applyReceivingCenterToPayload(payload);
  const second=applyReceivingCenterToPayload(payload);
  assert.match(first.text,/Vašu poruku evidentirao je GNK ASG digitalni centar zaprimanja/);
  assert.match(first.html,/Digitalni centar zaprimanja/);
  assert.equal(first.headers['X-GNK-ASG-Case-Id'],caseId);
  assert.equal(first.headers['X-GNK-ASG-Receiving-Center'],second.headers['X-GNK-ASG-Receiving-Center']);
  assert.equal(first.headers['X-GNK-ASG-Receiving-Centers-Version'],'GNK_ASG_MAIL_RECEIVING_CENTERS_V1_20260628');
  assert.equal(VERSION,'GNK_ASG_CONTACT_CENTERS_WRAPPER_V4_20260628');
});

test('messages without a GNK ASG case identifier remain unchanged',()=>{
  const ordinary={subject:'Ordinary message',text:'Text',html:'<p>Text</p>'};
  assert.equal(applyReceivingCenterToPayload(ordinary),ordinary);
});
