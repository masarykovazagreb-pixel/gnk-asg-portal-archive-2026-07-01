import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const requested=process.argv[2]||'all';
const failures=[];
const groups=new Set(requested==='all'?['mail','registration','shell','campaign','entrypoints']:[requested]);
const read=file=>{const absolute=path.join(root,file);if(!fs.existsSync(absolute)){failures.push(`${file}: file missing`);return'';}return fs.readFileSync(absolute,'utf8');};
const requireAll=(group,file,needles)=>{if(!groups.has(group))return;const value=read(file);for(const needle of needles)if(!value.includes(needle))failures.push(`[${group}] ${file}: missing ${needle}`);};
const requireNone=(group,file,needles)=>{if(!groups.has(group))return;const value=read(file);for(const needle of needles)if(value.includes(needle))failures.push(`[${group}] ${file}: forbidden ${needle}`);};
const requireCondition=(group,label,condition)=>{if(groups.has(group)&&!condition)failures.push(`[${group}] ${label}`);};
const parseMain=value=>String(value.match(/^main = "([^"]+)"/m)?.[1]||'').trim();

if(groups.has('mail')){
  const contact=read('apps/portal/contact/index.html');
  requireCondition('mail','Croatian contact form contract missing',contact.includes('id="contactForm"')&&contact.includes('name="consent"')&&contact.includes('name="website"')&&contact.includes('honeypot')&&contact.includes('name="email"')&&contact.includes('type="email"')&&contact.includes('name="message"'));
  const contactEn=read('apps/portal/en/contact/index.html');
  requireCondition('mail','English contact form contract missing',contactEn.includes('id="contactForm"')&&contactEn.includes('name="consent"')&&contactEn.includes('name="website"')&&contactEn.includes('honeypot')&&contactEn.includes('name="email"')&&contactEn.includes('type="email"')&&contactEn.includes('name="message"'));
  requireAll('mail','workers/gnk-asg-direct-operator/src/manual-mail-service-v1.js',['/api/admin-mail-send','/api/mail-center/send-readiness','SEND_MAIL','env.EMAIL.send','MANDATORY_BCC']);
  requireAll('mail','workers/gnk-asg-direct-operator/src/media-outreach-delivery-html-v1.js',['SEND_TEST_EMAIL','QUEUE_APPROVED_MEDIA','DISPATCH_ONE_QUEUED_EMAIL','valid_test_gate_required','processDeliveryQueue']);
}

if(groups.has('registration')){
  requireAll('registration','apps/portal/media-application/index.html',['id="loginForm"','id="registrationForm"','id="mailCode"','id="pin"','id="documentFile"']);
  requireAll('registration','apps/portal/assets/media-registration-v1.js',['/api/media-registration','/login','/draft','/document','/submit','/logout']);
  requireAll('registration','workers/gnk-asg-direct-operator/src/media-registration-v1.js',["PUBLIC_UI='/media-application'","PUBLIC_API='/api/media-registration'","COOKIE='gnk_asg_media_registration'",'HttpOnly; Secure; SameSite=Strict','media_registration_sessions','media_registration_drafts','media_registration_documents','processMediaInvitationQueue','handleMediaRegistrationPublic']);
}

if(groups.has('shell')){
  requireAll('shell','workers/gnk-asg-direct-operator/src/public-shell-v11.js',["'/media-application'","'/media-registration-admin'","'/campaign-mailer'","'/mail-studio'","'/media-command-center'",'if(isPrivatePath(normalized))return html;','GNK_ASG_PUBLIC_REDESIGN_V1_20260701_R2']);
  requireNone('shell','workers/gnk-asg-direct-operator/src/public-shell-v11.js',['/assets/public-menu-v18.js','body>header:not(#gnk-public-header-v18)']);
  requireAll('shell','apps/portal/assets/public-digital-workforce-menu-v1.js',['window.__GNK_DW_MENU_V1__','/digital-workforce/','/editor-desk/','/workers/']);
}

if(groups.has('campaign')){
  requireAll('campaign','workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v2.js',['campaign-mailer-shell-v2.js','campaign-mailer-v2.js','isCampaignMailerApi','authorizeCampaignMailer','handleCampaignMailer','runQueue']);
  requireAll('campaign','workers/gnk-asg-direct-operator/src/campaign-mailer-shell-v2.js',["path==='/campaign-mailer'",'/campaign-mailer/','authorizeCampaignMailer','x-gnk-asg-campaign-mailer',"DASHBOARD_NEXT='/campaign-mailer/#dashboard'",'/admin-login/?next=','gnk-asg-dashboard-menu-v2','EMAIL_STATUS_HREF']);
  requireAll('campaign','workers/gnk-asg-direct-operator/src/campaign-mailer-v2.js',['applyApprovalGuard','rateGate','runQueue','campaign_mailer_runner_lock']);
  requireAll('campaign','apps/portal/campaign-mailer/index.html',['Campaign Mailer']);
}

if(groups.has('entrypoints')){
  const review=read('workers/gnk-asg-direct-operator/wrangler.toml');
  const reviewMain=parseMain(review);
  requireCondition('entrypoints','main review Worker must declare a src/*.js entrypoint',/^src\/[A-Za-z0-9._-]+\.js$/.test(reviewMain));
  const reviewFile=reviewMain?`workers/gnk-asg-direct-operator/${reviewMain}`:'';
  if(reviewFile){
    const reviewSource=read(reviewFile);
    const baseAuth=String(reviewSource.match(/from ['"]\.\/(index-unified-auth-v\d+\.js)['"]/)?.[1]||'').trim();
    requireCondition('entrypoints','review Worker must wrap a versioned unified-auth runtime',Boolean(baseAuth));
    if(baseAuth)requireCondition('entrypoints',`review unified-auth runtime missing: ${baseAuth}`,fs.existsSync(path.join(root,'workers/gnk-asg-direct-operator/src',baseAuth)));
    requireCondition('entrypoints','review Worker must stamp the active entrypoint',reviewSource.includes('x-gnk-active-entrypoint'));
  }
  requireCondition('entrypoints','main review environment marker missing',review.includes('PUBLIC_ENVIRONMENT = "review-direct-operator"'));
  requireCondition('entrypoints','review manual mail must remain disabled',review.includes('MAIL_MANUAL_LIVE = "false"'));
  requireCondition('entrypoints','review media outreach must remain disabled',review.includes('MEDIA_OUTREACH_LIVE = "false"'));
  requireAll('entrypoints','workers/gnk-asg-direct-operator/wrangler.review-preview.toml',['main = "src/index-enterprise-projects-runtime-v1.js"','PUBLIC_ENVIRONMENT = "isolated-review-preview"']);
  requireAll('entrypoints','workers/gnk-asg-direct-operator/src/index-enterprise-projects-runtime-v1.js',["from './index-final-admin-gateway-v2.js'",'isEnterpriseProjectApi','isNewsMarketIntelligenceApi','runEnterpriseProjectCycle','runNewsMarketIntelligence']);
  requireAll('entrypoints','workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v2.js',["from './index-final-admin-gateway-projects-v1.js'",'handleMailStudioInbound','recordInbound']);
  requireAll('entrypoints','workers/gnk-asg-direct-operator/src/index-final-admin-gateway-projects-v1.js',["from './index-media-command-center-v20.js'",'handleMediaProjects','handleMediaDelivery']);
  requireAll('entrypoints','workers/gnk-asg-direct-operator/src/index-media-command-center-v20.js',["from './index-mail-studio-bridge-v17.js'",'handleMediaCommandCenter']);
}

if(failures.length){console.error(`Protected portal contract FAILED (${requested})`);for(const failure of failures)console.error(`- ${failure}`);process.exit(1);}
console.log(`Protected portal contract PASSED (${requested})`);
