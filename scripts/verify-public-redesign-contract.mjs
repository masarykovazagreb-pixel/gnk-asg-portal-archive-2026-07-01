import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const requested=process.argv[2]||'all';
const failures=[];
const groups=new Set(requested==='all'?['mail','registration','shell','campaign']:[requested]);
const read=file=>{
  const absolute=path.join(root,file);
  if(!fs.existsSync(absolute)){
    failures.push(`${file}: file missing`);
    return '';
  }
  return fs.readFileSync(absolute,'utf8');
};
const requireAll=(group,file,needles)=>{
  if(!groups.has(group))return;
  const value=read(file);
  for(const needle of needles){
    if(!value.includes(needle))failures.push(`[${group}] ${file}: missing ${needle}`);
  }
};
const requireCondition=(group,label,condition)=>{
  if(groups.has(group)&&!condition)failures.push(`[${group}] ${label}`);
};

if(groups.has('mail')){
  const contact=read('apps/portal/contact/index.html');
  requireCondition('mail','Croatian contact form/API/PDF contract missing',
    contact.includes('id="contactForm"')&&contact.includes('/api/contact-submit')&&contact.includes('type="file"')&&contact.includes('accept="application/pdf"'));
  const contactEn=read('apps/portal/en/contact/index.html');
  requireCondition('mail','English contact form/API/PDF contract missing',
    contactEn.includes('id="enContactForm"')&&contactEn.includes('/api/contact-submit')&&contactEn.includes('type="file"')&&contactEn.includes('accept="application/pdf"'));
  requireAll('mail','workers/gnk-asg-direct-operator/src/manual-mail-service-v1.js',[
    '/api/admin-mail-send','/api/mail-center/send-readiness','SEND_MAIL','env.EMAIL.send','MANDATORY_BCC'
  ]);
  requireAll('mail','workers/gnk-asg-direct-operator/src/media-outreach-delivery-html-v1.js',[
    'SEND_TEST_EMAIL','QUEUE_APPROVED_MEDIA','DISPATCH_ONE_QUEUED_EMAIL','valid_test_gate_required','processDeliveryQueue'
  ]);
}

if(groups.has('registration')){
  requireAll('registration','apps/portal/media-application/index.html',[
    'id="loginForm"','id="registrationForm"','id="mailCode"','id="pin"','id="documentFile"'
  ]);
  requireAll('registration','apps/portal/assets/media-registration-v1.js',[
    '/api/media-registration','/login','/draft','/document','/submit','/logout'
  ]);
  requireAll('registration','workers/gnk-asg-direct-operator/src/media-registration-v1.js',[
    "PUBLIC_UI='/media-application'","PUBLIC_API='/api/media-registration'","COOKIE='gnk_asg_media_registration'",
    'HttpOnly; Secure; SameSite=Strict','media_registration_sessions','media_registration_drafts',
    'media_registration_documents','processMediaInvitationQueue','handleMediaRegistrationPublic'
  ]);
}

if(groups.has('shell')){
  requireAll('shell','workers/gnk-asg-direct-operator/src/public-shell-v11.js',[
    "'/media-application'","'/media-registration-admin'","'/campaign-mailer'","'/mail-studio'","'/media-command-center'",
    'if(isPrivatePath(normalized))return html;','GNK_ASG_PUBLIC_REDESIGN_V1_20260701_R2'
  ]);
  requireAll('shell','apps/portal/assets/public-menu-v18.js',[
    'window.__GNK_ASG_PUBLIC_MENU_V18__','/admin-center/','/contact/','/media-kit/'
  ]);
}

if(groups.has('campaign')){
  requireAll('campaign','workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v1.js',[
    'campaign-mailer-shell-v2.js','campaign-mailer-v2.js','isCampaignMailerApi','authorizeCampaignMailer','handleCampaignMailer','runQueue'
  ]);
  requireAll('campaign','workers/gnk-asg-direct-operator/src/campaign-mailer-shell-v2.js',[
    "path==='/campaign-mailer'",'/campaign-mailer/','authorizeCampaignMailer','x-gnk-asg-campaign-mailer'
  ]);
  requireAll('campaign','workers/gnk-asg-direct-operator/src/campaign-mailer-v2.js',[
    'applyApprovalGuard','rateGate','runQueue','campaign_mailer_runner_lock'
  ]);
  requireAll('campaign','apps/portal/campaign-mailer/index.html',['Campaign Mailer']);
}

if(failures.length){
  console.error(`Protected portal contract FAILED (${requested})`);
  for(const failure of failures)console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Protected portal contract PASSED (${requested})`);
