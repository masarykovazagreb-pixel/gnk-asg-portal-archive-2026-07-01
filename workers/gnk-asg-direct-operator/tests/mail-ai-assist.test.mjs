import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {handleMailAiAssist,AI_PATH,VERSION} from '../src/mail-ai-assist-v2.js';

function request(body){
  return new Request(`https://gnk-asg.hr${AI_PATH}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
}

test('media request uses Workers AI with a media-specific low-temperature prompt',async()=>{
  let captured=null;
  const env={MAIL_AI_MODEL:'test-model',AI:{run:async(model,prompt)=>{captured={model,prompt};return{response:'Poštovani,\n\nPotvrđujemo primitak medijskog upita.'};}}};
  const response=await handleMailAiAssist(request({task:'media_reply',recipientName:'Redakcija',relation:'novinar / medijski upit',subject:'Upit za objavu',context:'Molimo potvrdu činjenica.',tone:'medijski i neutralno'}),env);
  assert.equal(response.status,200);
  const payload=await response.json();
  assert.equal(payload.ai,true);
  assert.equal(payload.mode,'media');
  assert.equal(payload.model,'test-model');
  assert.equal(captured.model,'test-model');
  assert.equal(captured.prompt.temperature,0.18);
  assert.match(captured.prompt.messages[0].content,/Ovo je medijski odgovor/);
  assert.match(captured.prompt.messages[0].content,/Ne izmišljaj činjenice/);
  assert.match(captured.prompt.messages[0].content,/Ne dodaj potpis|Potpis se dodaje zasebno/);
  assert.equal(response.headers.get('x-gnk-asg-mail-ai'),VERSION);
});

test('business request uses the normal professional mode',async()=>{
  const env={AI:{run:async()=>({response:'Poštovani,\n\nHvala na poruci.'})}};
  const response=await handleMailAiAssist(request({task:'personalized_reply',relation:'poslovni partner',context:'Dogovor o sastanku.'}),env);
  const payload=await response.json();
  assert.equal(payload.ai,true);
  assert.equal(payload.mode,'business');
});

test('missing AI binding returns a safe media fallback',async()=>{
  const response=await handleMailAiAssist(request({task:'media_reply',relation:'novinar',context:'Pitanje o projektu.'}),{});
  const payload=await response.json();
  assert.equal(payload.ai,false);
  assert.equal(payload.mode,'media-fallback');
  assert.match(payload.text,/medijskom upitu/);
});

test('media UI prepares text and contains no mail-send endpoint',()=>{
  const root=path.resolve(import.meta.dirname,'../../..');
  const ui=fs.readFileSync(path.join(root,'apps/portal/assets/mail-studio-ai-media-v1.js'),'utf8');
  const wrapper=fs.readFileSync(path.join(root,'workers/gnk-asg-direct-operator/src/index-project50-v31-mail-inbox.js'),'utf8');
  assert.match(ui,/GNK_ASG_MAIL_STUDIO_AI_MEDIA_V1_20260628/);
  assert.match(ui,/AI medijski odgovor/);
  assert.match(ui,/\/api\/ai-assist/);
  assert.doesNotMatch(ui,/\/api\/admin-mail-send/);
  assert.match(wrapper,/protectedMailGate/);
  assert.match(wrapper,/MAIL_CENTER_SESSION/);
  assert.match(wrapper,/mail-studio-ai-media-v1\.js\?v=20260628-v1/);
});
