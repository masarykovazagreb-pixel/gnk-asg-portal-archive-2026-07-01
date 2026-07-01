import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const read=file=>{
  const absolute=path.join(root,file);
  if(!fs.existsSync(absolute)){
    failures.push(`${file}: file missing`);
    return '';
  }
  return fs.readFileSync(absolute,'utf8');
};
const requireText=(file,needles)=>{
  const value=read(file);
  for(const needle of needles){
    if(!value.includes(needle))failures.push(`${file}: missing ${needle}`);
  }
};

requireText('apps/portal/contact/index.html',[
  'id="contactForm"',
  '/api/contact-submit',
  'type="file"',
  'accept="application/pdf"'
]);

requireText('workers/gnk-asg-direct-operator/src/manual-mail-service-v1.js',[
  '/api/admin-mail-send',
  '/api/mail-center/send-readiness',
  'SEND_MAIL',
  'env.EMAIL.send',
  'MANDATORY_BCC'
]);

requireText('workers/gnk-asg-direct-operator/src/media-outreach-delivery-html-v1.js',[
  'SEND_TEST_EMAIL',
  'QUEUE_APPROVED_MEDIA',
  'DISPATCH_ONE_QUEUED_EMAIL',
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
  '/api/media-registration',
  "api('/login'",
  "api('/draft'",
  "api('/document'",
  "api('/submit'",
  "api('/logout'"
]);

requireText('workers/gnk-asg-direct-operator/src/media-registration-v1.js',[
  '/media-application',
  '/api/media-registration',
  'gnk_asg_media_registration',
  'HttpOnly; Secure; SameSite=Strict',
  'media_registration_sessions',
  'media_registration_drafts',
  'media_registration_documents',
  'processMediaInvitationQueue',
  'handleMediaRegistrationPublic'
]);

requireText('workers/gnk-asg-direct-operator/src/public-shell-v11.js',[
  "'/media-application'",
  "'/media-registration-admin'",
  "'/campaign-mailer'",
  'if(isPrivatePath(normalized))return html;',
  'GNK_ASG_PUBLIC_REDESIGN_V1_20260701_R2'
]);

requireText('apps/portal/assets/public-menu-v18.js',[
  'window.__GNK_ASG_PUBLIC_MENU_V18__',
  "'/admin-center/'",
  "'/contact/'",
  "'/media-kit/'"
]);

requireText('workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v1.js',[
  'campaign-mailer-shell-v2.js',
  'campaign-mailer-v2.js',
  'isCampaignMailerApi',
  'authorizeCampaignMailer',
  'handleCampaignMailer',
  'runQueue'
]);

requireText('workers/gnk-asg-direct-operator/src/campaign-mailer-shell-v2.js',[
  "path==='/campaign-mailer'",
  '/campaign-mailer/',
  'authorizeCampaignMailer',
  'x-gnk-asg-campaign-mailer'
]);

requireText('workers/gnk-asg-direct-operator/src/campaign-mailer-v2.js',[
  'applyApprovalGuard',
  'rateGate',
  'runQueue',
  'campaign_mailer_runner_lock'
]);

requireText('apps/portal/campaign-mailer/index.html',[
  'Campaign Mailer'
]);

if(failures.length){
  console.error('Public redesign backend contract FAILED');
  for(const failure of failures)console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Public redesign backend contract PASSED');
console.log('Protected: contact, manual mail, media delivery, journalist portal, Admin tools and Campaign Mailer.');
