import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const failures=[];
const requireText=(file,needles)=>{
  const value=read(file);
  for(const needle of needles){
    if(!value.includes(needle))failures.push(`${file}: missing ${needle}`);
  }
};

requireText('apps/portal/contact/index.html',[
  'id="contactForm"',
  '/api/contact-submit',
  'type="file" accept="application/pdf"'
]);

requireText('workers/gnk-asg-direct-operator/src/manual-mail-service-v1.js',[
  "export const SEND_PATH='/api/admin-mail-send'",
  "export const READINESS_PATH='/api/mail-center/send-readiness'",
  "if(clean(body.confirm)!=='SEND_MAIL')",
  'await env.EMAIL.send(payload)',
  'MANDATORY_BCC'
]);

requireText('workers/gnk-asg-direct-operator/src/media-outreach-delivery-html-v1.js',[
  "if(body.confirm!=='SEND_TEST_EMAIL')",
  "if(body.confirm!=='QUEUE_APPROVED_MEDIA')",
  "if(body.confirm!=='DISPATCH_ONE_QUEUED_EMAIL')",
  'valid_test_gate_required',
  'processDeliveryQueue'
]);

requireText('apps/portal/media-application/index.html',[
  'id="loginForm"',
  'id="registrationForm"',
  'id="mailCode"',
  'id="pin"',
  'id="documentFile"'
]);

requireText('apps/portal/assets/media-registration-v1.js',[
  "const API='/api/media-registration'",
  "api('/login'",
  "api('/draft'",
  "api('/document'",
  "api('/submit'",
  "api('/logout'"
]);

requireText('workers/gnk-asg-direct-operator/src/media-registration-v1.js',[
  "export const PUBLIC_UI='/media-application'",
  "const PUBLIC_API='/api/media-registration'",
  "const COOKIE='gnk_asg_media_registration'",
  'HttpOnly; Secure; SameSite=Strict',
  'media_registration_sessions',
  'media_registration_drafts',
  'media_registration_documents',
  'processMediaInvitationQueue',
  'handleMediaRegistrationPublic'
]);

requireText('workers/gnk-asg-direct-operator/src/public-shell-v11.js',[
  "const isolatedFunctionalPaths=['/media-application','/media-registration-admin']",
  'if(isolatedFunctionalPaths.some',
  'return html;'
]);

requireText('apps/portal/assets/public-menu-v18.js',[
  'window.__GNK_ASG_PUBLIC_MENU_V18__',
  "'/admin-center/'",
  "'/contact/'",
  "'/media-kit/'"
]);

if(failures.length){
  console.error('Public redesign backend contract FAILED');
  for(const failure of failures)console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Public redesign backend contract PASSED');
console.log('Protected: contact, manual mail, mass mail, journalist login, drafts, documents, submissions and invitation queue.');
