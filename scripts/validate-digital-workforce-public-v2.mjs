import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const errors=[];
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const check=(ok,message)=>{if(!ok)errors.push(message);};
const requireAll=(file,needles)=>{const source=read(file);for(const needle of needles)check(source.includes(needle),`${file}: missing ${needle}`);return source;};

const source=read('apps/portal/assets/js/digital-workforce-directory-v1.js');
const sandbox={module:{exports:{}},exports:{}};
vm.runInNewContext(source,sandbox,{filename:'digital-workforce-directory-v1.js'});
const directory=sandbox.module.exports;
const profiles=directory.profiles||[];
const fields=['name','workerId','department','role','positionTitle','countryRegion','operatingCountry','operatingRegion','languages','timezone','status','entitySlot','responsibility','authority','operatingMode','backgroundCadence','budgetEnvelopeKey','budgetMode'];
const requiredFinancialBases=[
  'GNK ASG d.o.o. standalone FY2025 + 30.6.2026 management input',
  'GNK DINAMO Ltd. Group consolidated FY2025 + 30.6.2026 management input'
];

check(directory.count===1537,'directory count must equal 1537');
check(profiles.length===1537,'profile array must contain 1537 records');
check(new Set(profiles.map(profile=>profile.workerId)).size===1537,'Worker IDs must be unique');
check(new Set(profiles.map(profile=>profile.name)).size===1537,'display names must be unique');
check(Array.isArray(directory.financialPlanningBases)&&directory.financialPlanningBases.length===2,'directory must expose two financial planning bases');
for(const profile of profiles){
  for(const field of fields)check(typeof profile[field]==='string'&&profile[field].trim(),`${profile.workerId||'unknown'} missing ${field}`);
  check(/^[A-Z]{3,4}-GNK\d{2}-\d{4}$/.test(profile.workerId),`invalid Worker ID ${profile.workerId}`);
  check(/^GNK(?:0[1-9]|[1-3]\d|4[0-3])$/.test(profile.entitySlot),`invalid entity slot ${profile.entitySlot}`);
  check(/^[\p{L}'-]+ [A-Z]\.$/u.test(profile.name),`display name must use first name and surname initial ${profile.name}`);
  check(profile.positionTitle.includes(profile.department),`${profile.workerId} position title must include department`);
  check(profile.operatingMode==='background-scheduled',`${profile.workerId} background mode invalid`);
  check(Array.isArray(profile.workTasks)&&profile.workTasks.length>=4,`${profile.workerId} requires at least four work tasks`);
  check(profile.workTasks.every(task=>typeof task==='string'&&task.trim()),`${profile.workerId} contains invalid work task`);
  check(Array.isArray(profile.policySet)&&profile.policySet.length>=9,`${profile.workerId} policy set incomplete`);
  for(const protocol of ['P01','P02','P03','P04','P05','P06','P07','P08'])check(profile.policySet.some(item=>item.startsWith(protocol)),`${profile.workerId} missing ${protocol}`);
  check(Array.isArray(profile.financialPlanningBases)&&profile.financialPlanningBases.length===2,`${profile.workerId} financial bases incomplete`);
  for(const financialBase of requiredFinancialBases)check(profile.financialPlanningBases.includes(financialBase),`${profile.workerId} missing financial base ${financialBase}`);
  check(profile.paymentAuthority===false,`${profile.workerId} must not have payment authority`);
  check(profile.contractAuthority===false,`${profile.workerId} must not have contract authority`);
  check(profile.auditRequired===true,`${profile.workerId} audit requirement missing`);
  check(profile.peerReviewRequired===true,`${profile.workerId} peer review requirement missing`);
  check(profile.minimumOptions===2,`${profile.workerId} minimum two options missing`);
}

const blueprint=JSON.parse(read('apps/portal/assets/data/digital-workforce-blueprint.json'));
const governance=JSON.parse(read('apps/portal/assets/data/digital-workforce-governance.json'));
const seo=JSON.parse(read('apps/portal/assets/data/seo-entity-registry.json'));
const departments=new Set(profiles.map(profile=>profile.department));
const entities=new Set(profiles.map(profile=>profile.entitySlot));
const countries=new Set(profiles.map(profile=>profile.operatingCountry));
check(blueprint.departments.length===27,'blueprint must contain 27 departments');
check(departments.size===27,'directory must use 27 departments');
for(const department of blueprint.departments)check(departments.has(department),`missing department ${department}`);
check(entities.size===43,'directory must use 43 entity slots');
for(let i=1;i<=43;i++)check(entities.has(`GNK${String(i).padStart(2,'0')}`),`missing entity slot GNK${String(i).padStart(2,'0')}`);
check(countries.size===18,'directory must use all 18 operating countries');

const disclosure='The directory contains digital operations profiles and functional workflow identities. It is not, by itself, a register of natural persons or confirmed employment relationships.';
check(governance.publicDisclosure===disclosure,'canonical disclosure mismatch');
check(governance.proposalProtocol.minimumOptions===2,'minimum two options rule missing');
check(governance.proposalProtocol.selfApproval==='forbidden','self approval must be forbidden');
const approvals=['public publication','media statement','legal opinion or filing','registry submission','financial commitment','mass email or campaign send','production deploy','DNS or Cloudflare change','secret or credential change','deletion of production data','claim that a profile is a human employee'];
for(const approval of approvals)check(governance.mandatoryHumanApproval.includes(approval),`mandatory human approval missing ${approval}`);
for(const id of ['P01','P02','P03','P04','P05','P06','P07','P08'])check(governance.operatingProtocols.some(protocol=>protocol.id===id),`protocol missing ${id}`);

const pages=[
  'apps/portal/digital-workforce/directory/index.html',
  'apps/portal/digital-workforce/work-profiles/index.html',
  'apps/portal/digital-workforce/protocols/index.html',
  'apps/portal/about-the-group/index.html',
  'apps/portal/o-grupi/index.html',
  'apps/portal/the-code/intelligence/index.html'
];
for(const page of pages){
  const html=requireAll(page,['<title>','name="description"','noindex,nofollow,noarchive','rel="canonical"','property="og:title"','property="og:description"','property="og:image"','name="twitter:card"','name="twitter:title"','name="twitter:description"','name="twitter:image"','application/ld+json']);
  const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  check(schemas.length>0,`${page}: schema missing`);
  for(const schema of schemas){try{JSON.parse(schema[1]);}catch(error){errors.push(`${page}: invalid schema ${error.message}`);}}
}

const directoryHtml=requireAll('apps/portal/digital-workforce/directory/index.html',[disclosure,'numberOfItems":1537','Export filtered CSV','Print view','aria-live="polite"']);
check(directoryHtml.includes('"@type":"ItemList"'),'directory ItemList schema missing');
requireAll('apps/portal/digital-workforce/work-profiles/index.html',['Work Profiles','Work tasks','Policies','Financial planning bases','backgroundCadence','budgetEnvelopeKey']);
requireAll('apps/portal/digital-workforce/protocols/index.html',['Always requires human approval','Stop and rollback protocol','Audit and escalation','minimumOptions']);

const about=read('apps/portal/about-the-group/index.html');
const aboutHr=read('apps/portal/o-grupi/index.html');
const code=read('apps/portal/the-code/intelligence/index.html');
check(!about.includes('"@type":"Person"'),'Person schema must not be on About the Group');
check(!aboutHr.includes('"@type":"Person"'),'Person schema must not be on O grupi');
check(code.includes('"@type":"Person"')&&code.includes('Nermin Sefić'),'relevant Nermin Sefić Person schema missing');
check(code.includes('"author"')&&code.includes('"editor"')&&code.includes('"publisher"'),'editorial relations missing');

check(seo.indexingPolicy.defaultBeforeApproval==='noindex,nofollow,noarchive','SEO robots policy invalid');
check(seo.indexingPolicy.sitemapBeforeApproval==='exclude','SEO sitemap policy invalid');
check(seo.indexingPolicy.automaticPublication===false,'automatic publication must remain false before approval');
for(const route of ['/digital-workforce/','/digital-workforce/directory/','/digital-workforce/protocols/','/about-the-group/','/o-grupi/','/the-code/intelligence/'])check(Boolean(seo.routes[route]),`SEO route missing ${route}`);

const menu=requireAll('apps/portal/assets/public-menu-v18.js',['window.__GNK_ASG_PUBLIC_MENU_V18__','/digital-workforce/','/digital-workforce/directory/','/digital-workforce/protocols/','/about-the-group/','/the-code/intelligence/']);
for(const internal of ['/admin-center/','/mission-control/','/registry-center/','/deployment/','/mobile-admin/','/seo/','/design-review/','/enterprise/']){
  check(!menu.includes(`href="${internal}`)&&!menu.includes(`href='${internal}`),`internal route exposed ${internal}`);
}
requireAll('workers/gnk-asg-direct-operator/src/public-shell-v11.js',['public-menu-v18.js','if(isPrivatePath(normalized))return html;']);

const runtime=requireAll('apps/portal/assets/js/editorial-operations-runtime-v1.js',['/api/editorial-operations/plan']);
check(!runtime.includes("const API='/api/editorial-operations'"),'ambiguous editorial API base remains');
check(!read('workers/gnk-asg-direct-operator/src/editorial-workflow-v1.js').includes("state:'published'"),'unapproved published state forbidden in base workflow');
check(!/<button[^>]*>[^<]*(publish|objavi)/i.test(read('apps/portal/editorial-operations/release-queue/index.html')),'release queue publish button forbidden');
requireAll('.github/workflows/deploy-luxury-index-pr.yml',['This workflow performs no deployment and no email submission.']);

if(errors.length){
  console.error(`DIGITAL_WORKFORCE_PUBLIC_CONTRACT_FAILED ${errors.length}`);
  for(const error of errors)console.error(`- ${error}`);
  process.exit(1);
}
console.log('DIGITAL_WORKFORCE_PUBLIC_CONTRACT_OK');
console.log(JSON.stringify({profiles:profiles.length,departments:departments.size,entitySlots:entities.size,countries:countries.size,mandatoryHumanApprovals:approvals.length}));
