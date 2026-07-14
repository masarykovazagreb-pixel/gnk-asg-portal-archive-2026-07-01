import fs from 'node:fs';
import vm from 'node:vm';

const contrast=fs.readFileSync('apps/portal/assets/public-contrast-hardening-v1.js','utf8');
const editorial=fs.readFileSync('apps/portal/assets/index-editorial-order-v6.js','utf8');
const dashboard=fs.readFileSync('apps/portal/assets/editorial-approval-v1.js','utf8');
const mailAuditUi=fs.readFileSync('apps/portal/assets/editorial-approval-mail-audit-v1.js','utf8');
const dashboardHtml=fs.readFileSync('apps/portal/admin-center/editorial-approval/index.html','utf8');
const dashboardCss=fs.readFileSync('apps/portal/assets/editorial-approval-v1.css','utf8');
const adminCenter=fs.readFileSync('apps/portal/admin-center/index.html','utf8');
const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v21.js','utf8');
const queue=JSON.parse(fs.readFileSync('apps/portal/data/editorial-approval-queue.json','utf8'));
const mailAudit=JSON.parse(fs.readFileSync('apps/portal/data/mail-audit-20260713.json','utf8'));

new vm.Script(contrast,{filename:'public-contrast-hardening-v1.js'});
new vm.Script(editorial,{filename:'index-editorial-order-v6.js'});
new vm.Script(dashboard,{filename:'editorial-approval-v1.js'});
new vm.Script(mailAuditUi,{filename:'editorial-approval-mail-audit-v1.js'});

if(!contrast.includes('GNK_CONTRAST_HARDENING_V2_20260714_DYNAMIC_RECHECK'))throw new Error('contrast v2 marker missing');
if(!contrast.includes('.group-section .group-card'))throw new Error('group-card contrast guard missing');
if(contrast.includes("dataset.gnkContrastHard==='1'"))throw new Error('stale one-pass contrast guard still present');
if(!contrast.includes('MutationObserver')||!contrast.includes('ResizeObserver'))throw new Error('dynamic contrast recheck missing');
if(!editorial.includes('__GNK_INDEX_EDITORIAL_ORDER_V6__'))throw new Error('injected editorial v6 marker missing');
if(!editorial.includes("dataset.gnkEditorialVisible='v6-100'"))throw new Error('editorial v6 visible-state marker missing');
if(!worker.includes('/assets/index-editorial-order-v6.js'))throw new Error('worker does not inject editorial v6 runtime');
if(!dashboard.includes("data-batch")||!dashboard.includes('approved')||!dashboard.includes('revision')||!dashboard.includes('rejected'))throw new Error('batch decisions missing');
if(!dashboard.includes('localStorage')||!dashboard.includes('exportDecisions'))throw new Error('decision persistence/export missing');
if(!dashboard.includes("const DATA_URL='/api/editorial-approval/queue'"))throw new Error('approval queue must use authenticated API');
if(dashboard.includes('/data/editorial-approval-queue.json'))throw new Error('dashboard still exposes public queue asset');
if(!mailAuditUi.includes("const URL='/api/editorial-approval/mail-audit'"))throw new Error('mail audit must use authenticated API');
if(mailAuditUi.includes('/data/mail-audit-20260713.json'))throw new Error('mail audit UI still exposes public asset');
if(!worker.includes("'/api/editorial-approval/queue','/data/editorial-approval-queue.json'"))throw new Error('protected queue route missing');
if(!worker.includes("'/api/editorial-approval/mail-audit','/data/mail-audit-20260713.json'"))throw new Error('protected mail-audit route missing');
if(!worker.includes('PRIVATE_APPROVAL_ASSET_PATHS')||!worker.includes("x-gnk-private-asset':'blocked"))throw new Error('direct public approval assets are not blocked');
if(!worker.includes('/api/operator-auth-check')||!worker.includes('Operator/admin session required.'))throw new Error('approval API session guard missing');
if(!worker.includes("x-gnk-editorial-approval-protected','v1-session-required'"))throw new Error('protected approval response marker missing');
if(!dashboardHtml.includes('08:00–09:00 Europe/Zagreb'))throw new Error('approval time window missing');
if(!dashboardHtml.includes('Izostanak odgovora nije odobrenje'))throw new Error('explicit approval warning missing');
if(!dashboardHtml.includes('editorial-approval-mail-audit-v1.js'))throw new Error('mail audit panel loader missing');
if(!dashboardCss.includes('.editorial-item[data-status=approved]'))throw new Error('decision status styling missing');
if(!adminCenter.includes('/admin-center/editorial-approval/'))throw new Error('admin center dashboard link missing');
if(mailAudit.delivery.incomingAccepted!==true||mailAudit.delivery.autoReplyReceived!==true)throw new Error('live mail round-trip not confirmed');
if(mailAudit.reply.generativeAiObserved!==false)throw new Error('AI observation must be explicit');
if(mailAudit.branding.embeddedLogoConfirmed!==false)throw new Error('logo finding must remain evidence-based');
if(queue.items.length!==13)throw new Error(`expected 13 editorial drafts, got ${queue.items.length}`);
if(queue.items.filter(x=>x.type==='objava').length!==10)throw new Error('expected 10 publications');
if(queue.items.filter(x=>x.type==='komentar').length!==3)throw new Error('expected 3 commentaries');
if(queue.projects.length!==9)throw new Error(`expected 9 projects, got ${queue.projects.length}`);
for(const item of queue.items){
  for(const field of ['id','title','slug','seoTitle','metaDescription']){
    if(!String(item[field]||'').trim())throw new Error(`${item.id||'unknown'} missing ${field}`);
  }
  if(!Array.isArray(item.keywords)||item.keywords.length<3)throw new Error(`${item.id} keywords missing`);
  if(!Array.isArray(item.internalLinks)||item.internalLinks.length<2)throw new Error(`${item.id} internal links missing`);
  if(!Array.isArray(item.body)||item.body.length<3)throw new Error(`${item.id} body too short`);
}
for(const project of queue.projects){
  for(const field of ['id','name','objective','lead','meeting','report']){
    if(!String(project[field]||'').trim())throw new Error(`${project.id||'unknown'} missing ${field}`);
  }
  if(!Array.isArray(project.workers)||project.workers.length<2)throw new Error(`${project.id} workers missing`);
  if(!Array.isArray(project.deliverables)||project.deliverables.length<2)throw new Error(`${project.id} deliverables missing`);
}
if(queue.approvalWindow.policy.toLowerCase().includes('izostanak')===false)throw new Error('explicit approval policy missing');
console.log('Overnight approval, protected data, injected editorial runtime, live-mail and contrast contract: PASS');
