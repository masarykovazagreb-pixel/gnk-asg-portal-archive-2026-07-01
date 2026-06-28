import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('Mail Studio media panel opens the existing command center only after user action',()=>{
  const ui=read('apps/portal/assets/mail-studio-media-panel-v1.js');
  assert.match(ui,/GNK_ASG_MAIL_STUDIO_MEDIA_PANEL_V1_20260628/);
  assert.match(ui,/Otvori slanje medijima/);
  assert.match(ui,/\/media-command-center\/\?embedded=1&source=mail-studio/);
  assert.match(ui,/if\(frame&&!frame\.src\)frame\.src=/);
  assert.match(ui,/Ništa nije poslano/);
  assert.doesNotMatch(ui,/fetch\s*\(/);
  assert.doesNotMatch(ui,/\/api\/media-outreach\/dispatch|\/api\/admin-mail-send|send_email|queue-approved/);
});

test('active Mail Studio wrapper injects the media panel without adding an Admin module',()=>{
  const wrapper=read('workers/gnk-asg-direct-operator/src/index-project50-v31-mail-inbox.js');
  const adminLock=read('apps/portal/assets/admin-center-mail-only-v1.js');
  assert.match(wrapper,/mail-studio-media-panel-v1\.js\?v=20260628-v1/);
  assert.match(wrapper,/mediaPanelSendsOnOpen:false/);
  assert.match(wrapper,/mediaCommandCenterRoute:'\/media-command-center\/'/);
  assert.match(adminLock,/dataset\.module!=='mail'/);
  assert.doesNotMatch(adminLock,/media-command-center/);
});
