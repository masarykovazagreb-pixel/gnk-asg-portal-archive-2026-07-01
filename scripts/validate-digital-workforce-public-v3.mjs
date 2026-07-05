import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const errors=[];
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const check=(value,message)=>{if(!value)errors.push(message);};
const requireAll=(file,tokens)=>{const source=read(file);for(const token of tokens)check(source.includes(token),`${file}: missing ${token}`);return source;};

const directorySource=read('apps/portal/assets/js/digital-workforce-directory-v1.js');
const sandbox={module:{exports:{}},exports:{}};
vm.runInNewContext(directorySource,sandbox,{filename:'digital-workforce-directory-v1.js'});
const directory=sandbox.module.exports;
const profiles=directory.profiles||[];

check(directory.count===1537,'directory count must equal 1537');
check(profiles.length===1537,'profile array must contain 1537 records');
check(new Set(profiles.map(item=>item.workerId)).size===1537,'worker identifiers must be unique');
check(new Set(profiles.map(item=>item.name)).size===1537,'display names must be unique');
check(new Set(profiles.map(item=>item.department)).size===27,'27 departments required');
check(new Set(profiles.map(item=>item.entitySlot)).size===43,'43 entity slots required');
check(new Set(profiles.map(item=>item.operatingCountry)).size===18,'18 operating countries required');

for(const item of profiles){
  for(const field of ['name','workerId','department','role','positionTitle','operatingCountry','operatingRegion','languages','timezone','status','entitySlot','responsibility','authority','operatingMode','backgroundCadence','budgetEnvelopeKey','budgetMode'])check(typeof item[field]==='string'&&item[field].trim(),`${item.workerId||'unknown'} missing ${field}`);
  check(/^[A-Z]{3,4}-GNK\d{2}-\d{4}$/.test(item.workerId),`invalid worker identifier ${item.workerId}`);
  check(/^GNK(?:0[1-9]|[1-3]\d|4[0-3])$/.test(item.entitySlot),`invalid entity slot ${item.entitySlot}`);
  check(Array.isArray(item.workTasks)&&item.workTasks.length>=4,`${item.workerId} work tasks incomplete`);
  check(Array.isArray(item.policySet)&&item.policySet.length>=9,`${item.workerId} policy set incomplete`);
  check(Array.isArray(item.financialPlanningBases)&&item.financialPlanningBases.length===2,`${item.workerId} planning bases incomplete`);
  check(item.paymentAuthority===false,`${item.workerId} payment boundary invalid`);
  check(item.contractAuthority===false,`${item.workerId} contract boundary invalid`);
  check(item.auditRequired===true,`${item.workerId} audit rule missing`);
  check(item.peerReviewRequired===true,`${item.workerId} peer review rule missing`);
  check(item.minimumOptions===2,`${item.workerId} option rule missing`);
}

const governance=JSON.parse(read('apps/portal/assets/data/digital-workforce-governance.json'));
check(governance.status==='controlled-review','governance status invalid');
check(governance.proposalProtocol?.minimumOptions===2,'proposal option rule missing');
check(governance.proposalProtocol?.selfApproval==='forbidden','self review boundary missing');
check(Array.isArray(governance.mandatoryHumanApproval)&&governance.mandatoryHumanApproval.length>=11,'human approval gates incomplete');
for(const id of ['P01','P02','P03','P04','P05','P06','P07','P08'])check(governance.operatingProtocols.some(item=>item.id===id),`protocol missing ${id}`);

const pages=['apps/portal/digital-workforce/directory/index.html','apps/portal/digital-workforce/work-profiles/index.html','apps/portal/digital-workforce/protocols/index.html','apps/portal/about-the-group/index.html','apps/portal/o-grupi/index.html','apps/portal/the-code/intelligence/index.html'];
for(const file of pages){
  const html=requireAll(file,['<title>','name="description"','rel="canonical"','property="og:title"','property="og:description"','property="og:image"','name="twitter:card"','name="twitter:title"','name="twitter:description"','name="twitter:image"','application/ld+json']);
  const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  check(schemas.length>0,`${file}: schema missing`);
  for(const schema of schemas){try{JSON.parse(schema[1]);}catch(error){errors.push(`${file}: invalid schema ${error.message}`);}}
}

requireAll('apps/portal/digital-workforce/directory/index.html',['noindex,nofollow,noarchive','numberOfItems":1537','Export filtered CSV','Print view','aria-live="polite"']);
requireAll('apps/portal/digital-workforce/work-profiles/index.html',['noindex,nofollow,noarchive','data.count!==1537','Work Profiles','Work tasks','Policies','Financial planning bases','backgroundCadence','budgetEnvelopeKey']);
requireAll('apps/portal/digital-workforce/protocols/index.html',['Always requires human approval','Stop and rollback protocol','Audit and escalation','minimumOptions']);

const reviewRuntime=requireAll('workers/gnk-asg-direct-operator/src/index-enterprise-projects-runtime-v1.js',['reviewEnvironment','x-robots-tag','x-gnk-review-indexing']);
check(reviewRuntime.includes('noindex, nofollow, noarchive'),'review indexing lock missing');
for(const config of ['workers/gnk-asg-direct-operator/wrangler.toml','workers/gnk-asg-direct-operator/wrangler.review-preview.toml'])check(/PUBLIC_ENVIRONMENT\s*=\s*"[^"]*(review|preview|isolated)/i.test(read(config)),`${config}: review marker missing`);

for(const file of ['apps/portal/about-the-group/index.html','apps/portal/o-grupi/index.html']){
  const html=read(file);
  check(!html.includes('digital-workflow-role'),`${file}: workflow role cannot be Person schema`);
  check(!/[A-Z]{3,4}-GNK\d{2}-\d{4}/.test(html),`${file}: worker identifier exposed as Person`);
  if(html.includes('"@type":"Person"'))check(html.includes('Nermin Sefić'),`${file}: unevidenced Person schema`);
}
const intelligence=read('apps/portal/the-code/intelligence/index.html');
check(intelligence.includes('"@type":"Person"')&&intelligence.includes('Nermin Sefić'),'evidenced author relation missing');
const structuredAttribution=intelligence.includes('"author"')&&intelligence.includes('"editor"')&&intelligence.includes('"publisher"');
const visibleAttribution=/Author, editor and publisher relations remain separate\.?/i.test(intelligence);
check(structuredAttribution||visibleAttribution,'editorial relations missing');

const seo=JSON.parse(read('apps/portal/assets/data/seo-entity-registry.json'));
check(seo.indexingPolicy?.defaultBeforeApproval==='noindex,nofollow,noarchive','SEO review policy invalid');
check(seo.indexingPolicy?.sitemapBeforeApproval==='exclude','sitemap review policy invalid');
check(seo.indexingPolicy?.automaticPublication===false,'automatic publication boundary invalid');

const menu=requireAll('apps/portal/assets/public-menu-v18.js',['window.__GNK_ASG_PUBLIC_MENU_V18__','/digital-workforce/','/digital-workforce/directory/','/digital-workforce/protocols/','/about-the-group/','/the-code/intelligence/']);
for(const route of ['/admin-center/','/mission-control/','/registry-center/','/deployment/','/mobile-admin/','/seo/','/design-review/','/enterprise/'])check(!menu.includes(`href="${route}`)&&!menu.includes(`href='${route}`),`private route exposed ${route}`);
requireAll('workers/gnk-asg-direct-operator/src/public-shell-v11.js',['public-menu-v18.js','if(isPrivatePath(normalized))return html;']);

const editorialRuntime=requireAll('apps/portal/assets/js/editorial-operations-runtime-v1.js',['/api/editorial-operations/plan']);
check(!editorialRuntime.includes("const API='/api/editorial-operations'"),'ambiguous editorial route remains');
check(!read('workers/gnk-asg-direct-operator/src/editorial-workflow-v1.js').includes("state:'published'"),'unapproved published state present');
check(!/<button[^>]*>[^<]*(publish|objavi)/i.test(read('apps/portal/editorial-operations/release-queue/index.html')),'release action exposed in queue');

if(errors.length){
  console.error(`DIGITAL_WORKFORCE_PUBLIC_CONTRACT_FAILED ${errors.length}`);
  for(const error of errors)console.error(`- ${error}`);
  process.exit(1);
}
console.log('DIGITAL_WORKFORCE_PUBLIC_CONTRACT_OK');
console.log(JSON.stringify({profiles:profiles.length,departments:27,entitySlots:43,countries:18,humanApprovalGates:governance.mandatoryHumanApproval.length}));
