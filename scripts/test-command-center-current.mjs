import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {registerHooks} from 'node:module';

const root=process.cwd();
const worker='workers/gnk-asg-direct-operator';
const config=fs.readFileSync(`${worker}/wrangler.toml`,'utf8');
const entry=config.match(/^main\s*=\s*"([^"]+)"/m)?.[1];
assert(entry,'Worker main must be explicit');
assert(fs.existsSync(`${worker}/${entry}`),'Configured Worker entrypoint must exist');
assert.match(config,/^PUBLIC_ENVIRONMENT\s*=\s*"review-direct-operator"/m);
for(const name of ['NEWS_AUTO_PUBLICATION_SCHEDULED_LIVE','MAIL_AUTO_REPLY_LIVE','MAIL_STUDIO_LIVE','MAIL_MANUAL_LIVE','MAIL_PROFILE_TEST_LIVE','MAIL_BOOTSTRAP_SMOKE_TEST','MEDIA_OUTREACH_LIVE','MEDIA_OUTREACH_SCHEDULED_LIVE','MEDIA_OUTREACH_TEST_LIVE','MEDIA_APPLICATION_AUTO_ACK']){
  assert.match(config,new RegExp(`^${name}\\s*=\\s*"false"`,'m'),`${name} must remain locked`);
}
assert(!/^\s*(routes\s*=|\[\[routes\]\]|zone_name\s*=)/m.test(config),'Review config must remain route-less');
for(const file of ['apps/portal/admin-center/index.html','apps/portal/media-application/index.html']){
  const html=fs.readFileSync(file,'utf8');
  assert.match(html,/<main\b/i);
  for(const tag of html.match(/<(?:script|link)\b[^>]*>/gi)||[]){
    if(/^<link/i.test(tag)&&! /stylesheet/i.test(tag))continue;
    const url=tag.match(/(?:src|href)=["']([^"']+)["']/i)?.[1];
    if(!url?.startsWith('/'))continue;
    const asset=path.resolve('apps/portal',`.${url.split('?')[0]}`);
    assert(asset.startsWith(path.resolve('apps/portal')+path.sep),'Asset path must stay in portal');
    assert(fs.statSync(asset).isFile()&&fs.statSync(asset).size>0,`Missing referenced asset: ${url}`);
    if(asset.endsWith('.js')){const check=spawnSync(process.execPath,['--check',asset],{encoding:'utf8'});assert.equal(check.status,0,check.stderr);}
  }
}
const admin=fs.readFileSync('apps/portal/admin-center/index.html','utf8');
for(const route of ['/mail-studio/','/operator-dashboard/','/media-registration-admin/','/admin-center/editorial-approval/'])assert(admin.includes(`href="${route}"`),`Missing Admin link: ${route}`);

// The optional historical contact snapshot is not the current runtime registry.
const contacts='apps/portal/data/media-outreach-contacts-v1.json';
if(fs.existsSync(contacts)){
  const rows=JSON.parse(fs.readFileSync(contacts,'utf8'));
  assert(Array.isArray(rows)&&rows.length>0);
  const codes=rows.map(x=>String(x.mailCode||''));
  assert(codes.every(x=>/^GNK-MEDIA-\d{8}-[A-Z]{2}-[A-Z0-9]{1,12}-\d{3}$/.test(x)));
  assert.equal(new Set(codes).size,codes.length);
  for(const row of rows)for(const key of ['approved','automationAllowed'])assert(row[key]===undefined||typeof row[key]==='boolean');
}else console.log('Historical contact snapshot absent; no historical count asserted.');

// Cloudflare-only mail transport is mocked to throw if any test tries to send.
registerHooks({
  resolve(specifier,context,next){return specifier==='cloudflare:email'?{url:'test:cloudflare-email',shortCircuit:true}:next(specifier,context)},
  load(url,context,next){return url==='test:cloudflare-email'?{format:'module',source:'export class EmailMessage { constructor(){ throw new Error("Email transport forbidden in CI test"); } }',shortCircuit:true}:next(url,context)}
});
let externalCalls=0;
globalThis.fetch=async()=>{externalCalls++;throw new Error('External access forbidden in CI test')};
const app=(await import(`../${worker}/${entry}`)).default;
const origin='https://gnk-asg.hr';
const env={OPERATOR_TOKEN:'ci-fixture-only-not-a-real-token'};
for(const route of ['/admin-center/','/admin-center/editorial-approval/','/media-registration-admin/','/api/editorial-approval/queue','/api/media-registration-admin/applications']){
  const response=await app.fetch(new Request(origin+route),env,{waitUntil(){}});
  assert.equal(response.status,401,`${route} must reject unauthenticated access`);
  assert.match(response.headers.get('cache-control')||'',/no-store/i);
}
const decisionRoute='/api/media-registration-admin/decision';
const denied=await app.fetch(new Request(origin+decisionRoute,{method:'POST',headers:{'content-type':'application/json'},body:'{}'}),env,{waitUntil(){}});
assert.equal(denied.status,401,'Gateway must protect media decisions');
const {handleMediaRegistrationReviewDecision:decide}=await import(`../${worker}/src/media-registration-review-decision-v1.js`);
const {processMediaInvitationQueue}=await import(`../${worker}/src/media-registration-post-code-v2.js`);
assert.equal((await processMediaInvitationQueue()).skipped,'post_registration_code_policy');
const {processMediaInvitationQueue:currentQueue}=await import(`../${worker}/src/media-registration-v1.js`);
assert.equal((await currentQueue({})).skipped,'paused','Current invitation queue must default to paused');
const request=(body,headers={})=>new Request(origin+decisionRoute,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
const body={mailCode:'GNK-MEDIA-20261005-XX-CITEST-001',status:'APPROVED',expectedRevision:1};
assert.equal((await decide(request(body,{origin:'https://other.example'}),{})).status,403);
assert.equal((await decide(request({...body,expectedRevision:undefined}),{})).status,409);
assert.equal((await decide(request({...body,status:'REJECTED'}),{})).status,400);
const writes=[];
const db={
  batch:async()=>[],
  prepare(sql){
    return {bind(...args){
      return {
        first:async()=>({mail_code:body.mailCode,status:'SUBMITTED',revision:2}),
        run:async()=>{writes.push({sql,args});return {meta:{changes:1}}}
      };
    }};
  }
};
assert.equal((await decide(request(body),{GNK_ASG_D1:db})).status,409);
assert.equal(writes.length,0,'Stale decision must not write');
const approved=await decide(request({...body,expectedRevision:2}),{GNK_ASG_D1:db});
assert.equal(approved.status,200);
assert.equal((await approved.json()).noNotification,true);
assert.equal(writes.length,2,'Approved decision must update and audit');
assert(writes[1].args.includes('human_review_status_changed'));
assert.equal(externalCalls,0,'Validation must not access external services');
console.log(`Current Command Center assets, ${entry}, authentication, review locks and human decisions: PASS`);
