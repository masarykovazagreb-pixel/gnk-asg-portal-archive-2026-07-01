import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=path=>fs.readFileSync(path,'utf8');
const errors=[];
const assert=(condition,message)=>{if(!condition)errors.push(message);};
const includes=(path,value,message)=>assert(read(path).includes(value),message||`${path} missing ${value}`);
const excludes=(path,value,message)=>assert(!read(path).includes(value),message||`${path} still contains ${value}`);

const jsFiles=[
  'apps/portal/assets/public-shell-v15.js',
  'apps/portal/assets/index-priority-v1.js',
  'apps/portal/assets/mail-studio-delivery-policy-v1.js',
  'workers/gnk-asg-direct-operator/src/index-project50-v30-unified-menu.js',
  'workers/gnk-asg-direct-operator/src/index-project50-v32-priority.js',
  'workers/gnk-asg-direct-operator/src/index-mail-studio-bridge-v15.js',
  'workers/gnk-asg-direct-operator/src/manual-mail-service-v2.js',
  'workers/gnk-asg-direct-operator/src/media-outreach-delivery-v5.js'
];
for(const file of jsFiles){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0)errors.push(`Syntax error in ${file}: ${result.stderr||result.stdout}`);
}

includes('workers/gnk-asg-direct-operator/wrangler.toml','main = "src/index-project50-v32-priority.js"','Wrangler does not use priority entrypoint.');
includes('workers/gnk-asg-direct-operator/wrangler.toml','MEDIA_OUTREACH_LIVE = "false"','Media production sending must remain locked before approval.');
includes('workers/gnk-asg-direct-operator/src/index-project50-v30-unified-menu.js','x-gnk-asg-index-menu-items\',\'11','Index menu item count is not 11.');
includes('workers/gnk-asg-direct-operator/src/index-project50-v30-unified-menu.js','href="/admin-center/"','Index Admin does not lead to protected Admin Center.');
includes('apps/portal/assets/public-shell-v15.js',"header.dataset.menuItems='11'",'Public menu is not aligned to 11 index items.');
includes('apps/portal/assets/public-shell-v15.js',"['Admin','/admin-center/'",'Public Admin link is incorrect.');
excludes('apps/portal/assets/public-shell-v15.js','/auto-editor/','Auto Editor must not appear in the public menu.');
excludes('apps/portal/assets/public-shell-v15.js','/downloads/','Downloads must not appear in the public menu.');
excludes('apps/portal/assets/public-shell-v15.js','/legal/','Legal must not appear in the public menu.');
includes('apps/portal/assets/index-priority-v1.js','gnk-code-start','Index Play control is not connected to THE CODE.');
includes('apps/portal/assets/index-priority-v1.css','.hero{display:none!important}','Index hero cleanup is missing.');
includes('apps/portal/contact/index.html','contact-quality-v2.css?v=20260628-v5','Croatian Contact does not use final design.');
includes('apps/portal/en/contact/index.html','contact-quality-v2.css?v=20260628-v5','English Contact does not use final design.');
excludes('apps/portal/contact/index.html','PDF centar','Croatian Contact still advertises removed PDF centre.');
excludes('apps/portal/en/contact/index.html','PDF centre','English Contact still advertises removed PDF centre.');
includes('workers/gnk-asg-direct-operator/src/manual-mail-service-v2.js',"PREFLIGHT_PATH='/api/mail-center/preflight'",'Mail preflight endpoint missing.');
includes('workers/gnk-asg-direct-operator/src/manual-mail-service-v2.js','manual_mail_suppressions','Mail suppression registry missing.');
includes('workers/gnk-asg-direct-operator/src/manual-mail-service-v2.js','mail_rate_limit','Mail rate-limit enforcement missing.');
includes('workers/gnk-asg-direct-operator/src/manual-mail-service-v2.js','duplicate_recent_send','Mail deduplication missing.');
includes('workers/gnk-asg-direct-operator/src/index-mail-studio-bridge-v15.js',"from './manual-mail-service-v2.js'",'Mail Studio is not connected to V2 sending service.');
includes('apps/portal/assets/mail-studio-delivery-policy-v1.js','ZAVRŠNA POTVRDA SLANJA','Mail Studio final confirmation is missing.');
includes('workers/gnk-asg-direct-operator/src/media-outreach-delivery-v5.js','processAccessDeliveryQueue','Media Sender does not issue access codes during delivery.');
includes('workers/gnk-asg-direct-operator/src/media-outreach-delivery-v5.js','MEDIA_OUTREACH_RELEASE_APPROVED','Media release gate is missing.');
includes('workers/gnk-asg-direct-operator/src/index-unified-auth-v14.js',"'/admin-center'",'Admin Center is not in the protected UI list.');
includes('workers/gnk-asg-direct-operator/src/index-unified-auth-v14.js','Unesite postojeći operatorski token','Admin token login page is missing.');

if(errors.length){console.error(`Priority validation failed (${errors.length}):\n- ${errors.join('\n- ')}`);process.exit(1);}
console.log('Priority validation passed: index, Contact, Mail Studio, Media Sender and Admin token protection.');
