import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const failures=[];
const read=relative=>{
  const file=path.join(root,relative);
  if(!fs.existsSync(file)){failures.push(`${relative}: missing`);return'';}
  return fs.readFileSync(file,'utf8');
};
const json=relative=>{try{return JSON.parse(read(relative));}catch(error){failures.push(`${relative}: invalid JSON (${error.message})`);return{};}};
const requireText=(relative,needles)=>{const value=read(relative);for(const needle of needles){if(!value.includes(needle))failures.push(`${relative}: missing ${needle}`);}return value;};
const assert=(condition,message)=>{if(!condition)failures.push(message);};

const directorySource=read('apps/portal/assets/js/digital-workforce-directory-v1.js');
const sandbox={module:{exports:{}},exports:{}};
vm.runInNewContext(directorySource,sandbox,{filename:'digital-workforce-directory-v1.js'});
const directory=sandbox.module.exports;
const profiles=directory.profiles||[];
const requiredFields=['name','workerId','department','role','countryRegion','languages','timezone','status','entitySlot','responsibility'];

assert(directory.count===1500,'directory: declared count must equal 1500');
assert(profiles.length===1500,'directory: profile array must contain exactly 1500 records');
assert(new Set(profiles.map(item=>item.workerId)).size===1500,'directory: Worker IDs must be unique');
assert(new Set(profiles.map(item=>item.name)).size===1500,'directory: displayed profile names must be unique');
for(const [index,profile] of profiles.entries()){
  for(const field of requiredFields)assert(typeof profile[field]==='string'&&profile[field].trim(),`directory: profile ${index+1} missing ${field}`);
  assert(/^[A-Z]{3,4}-GNK\d{2}-\d{4}$/.test(profile.workerId),`directory: invalid Worker ID ${profile.workerId}`);
  assert(/^GNK(?:0[1-9]|[1-3]\d|4[0-3])$/.test(profile.entitySlot),`directory: invalid entity slot ${profile.entitySlot}`);
}

const blueprint=json('apps/portal/assets/data/digital-workforce-blueprint.json');
const governance=json('apps/portal/assets/data/digital-workforce-governance.json');
const seo=json('apps/portal/assets/data/seo-entity-registry.json');
const departments=new Set(profiles.map(item=>item.department));
const entitySlots=new Set(profiles.map(item=>item.entitySlot));
assert((blueprint.departments||[]).length===27,'blueprint: must define exactly 27 departments');
assert(departments.size===27,'directory: must use all 27 departments');
for(const department of blueprint.departments||[])assert(departments.has(department),`directory: department missing ${department}`);
assert(entitySlots.size===43,'directory: must use all 43 entity slots');
for(let i=1;i<=43;i++)assert(entitySlots.has(`GNK${String(i).padStart(2,'0')}`),`directory: entity slot missing GNK${String(i).padStart(2,'0')}`);

const disclosure='The directory contains digital operations profiles and functional workflow identities. It is not, by itself, a register of natural persons or confirmed employment relationships.';
assert(governance.publicDisclosure===disclosure,'governance: canonical public disclosure mismatch');
assert(governance.proposalProtocol?.minimumOptions===2,'governance: proposals must require at least two options');
assert(governance.proposalProtocol?.selfApproval==='forbidden','governance: self approval must be forbidden');
const mandatory=[
  'public publication','media statement','legal opinion or filing','registry submission','financial commitment',
  'mass email or campaign send','production deploy','DNS or Cloudflare change','secret or credential change',
  'deletion of production data','claim that a profile is a human employee'
];
for(const item of mandatory)assert((governance.mandatoryHumanApproval||[]).includes(item),`governance: mandatory human approval missing ${item}`);
for(const protocol of ['P01','P02','P03','P04','P05','P06','P07','P08'])assert((governance.operatingProtocols||[]).some(item=>item.id===protocol),`governance: protocol missing ${protocol}`);

const publicPages=[
  'apps/portal/digital-workforce/directory/index.html',
  'apps/portal/digital-workforce/protocols/index.html',
  'apps/portal/about-the-group/index.html',
  'apps/portal/o-grupi/index.html',
  'apps/portal/the-code/intelligence/index.html'
];
for(const page of publicPages){
  const html=requireText(page,[
    '<title>','name="description"','name="robots" content="noindex,nofollow,noarchive"','rel="canonical"',
    'property="og:title"','property="og:description"','property="og:image"','name="twitter:card"',
    'name="twitter:title"','name="twitter:description"','name="twitter:image"','application/ld+json'
  ]);
  const scripts=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match=>match[1]);
  assert(scripts.length>0,`${page}: schema.org graph missing`);
  for(const source of scripts){try{JSON.parse(source);}catch(error){failures.push(`${page}: invalid schema.org JSON (${error.message})`);}}
}

requireText('apps/portal/digital-workforce/directory/index.html',[disclosure,'numberOfItems":1500','Export filtered CSV','Print view','aria-live="polite"']);
requireText('apps/portal/digital-workforce/protocols/index.html',['Always requires human approval','Stop and rollback protocol','Audit and escalation','minimumOptions']);

const directoryHtml=read('apps/portal/digital-workforce/directory/index.html');
assert(directoryHtml.includes('"@type":"ItemList"'),'directory: ItemList schema missing');
const aboutHtml=read('apps/portal/about-the-group/index.html');
const aboutHrHtml=read('apps/portal/o-grupi/index.html');
const codeHtml=read('apps/portal/the-code/intelligence/index.html');
assert(!aboutHtml.includes('"@type":"Person"'),'About the Group: Person schema must not be injected');
assert(!aboutHrHtml.includes('"@type":"Person"'),'O grupi: Person schema must not be injected');
assert(codeHtml.includes('"@type":"Person"')&&codeHtml.includes('Nermin Sefić'),'THE CODE Intelligence: relevant Person schema missing');
assert(codeHtml.includes('"author"')&&codeHtml.includes('"editor"')&&codeHtml.includes('"publisher"'),'THE CODE Intelligence: author/editor/publisher relations missing');

assert(seo.indexingPolicy?.defaultBeforeApproval==='noindex,nofollow,noarchive','SEO registry: default review robots rule invalid');
assert(seo.indexingPolicy?.sitemapBeforeApproval==='exclude','SEO registry: sitemap decision must exclude review routes');
assert(seo.indexingPolicy?.automaticPublication===false,'SEO registry: automatic publication must be disabled');
assert(seo.entities?.nerminSefic?.usageRule?.includes('only where'),'SEO registry: Nermin Sefić relevance rule missing');
for(const route of ['/digital-workforce/','/digital-workforce/directory/','/digital-workforce/protocols/','/about-the-group/','/o-grupi/','/the-code/intelligence/'])assert(seo.routes?.[route],`SEO registry: route missing ${route}`);

const menu=requireText('apps/portal/assets/public-menu-v19.js',[
  '/digital-workforce/','/digital-workforce/directory/','/digital-workforce/protocols/','/about-the-group/','/the-code/intelligence/'
]);
for(const forbidden of ['/admin-center/','/mission-control/','/registry-center/','/deployment/','/mobile-admin/','/seo/','/design-review/','/enterprise/']){
  const exposed=new RegExp(`href:["']${forbidden.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`).test(menu);
  assert(!exposed,`public menu: internal route exposed ${forbidden}`);
}

const shell=requireText('workers/gnk-asg-direct-operator/src/public-shell-v11.js',['public-menu-v19.js','if(isPrivatePath(normalized))return html;']);
for(const privateRoute of ['/editorial-operations','/mission-control','/registry-center','/deployment','/mobile-admin','/seo','/design-review','/enterprise','/entities','/strategy-performance'])assert(shell.includes(`'${privateRoute}'`),`public shell: private route isolation missing ${privateRoute}`);

const editorialRuntime=requireText('apps/portal/assets/js/editorial-operations-runtime-v1.js',['/api/editorial-operations/plan']);
assert(!editorialRuntime.includes("const API='/api/editorial-operations'"),'editorial runtime: ambiguous API base contract remains');
const editorialWorkflow=read('workers/gnk-asg-direct-operator/src/editorial-workflow-v1.js');
assert(!editorialWorkflow.includes("state:'published'"),'editorial workflow: automatic published state forbidden');
const releaseQueue=read('apps/portal/editorial-operations/release-queue/index.html');
assert(!/<button[^>]*>[^<]*(publish|objavi)/i.test(releaseQueue),'release queue: publish button forbidden');

const workflowDirectory=path.join(root,'.github/workflows');
for(const filename of fs.readdirSync(workflowDirectory).filter(file=>/\.ya?ml$/i.test(file))){
  const source=fs.readFileSync(path.join(workflowDirectory,filename),'utf8');
  const deployCommand=/\b(?:wrangler\s+(?:deploy|publish)|cloudflare\s+pages\s+deploy|npm\s+run\s+deploy)\b/i.test(source);
  const pullRequest=/\bpull_request\s*:/i.test(source);
  if(deployCommand&&pullRequest){
    const guarded=/github\.event_name\s*==\s*['"]workflow_dispatch['"]/i.test(source)||/github\.ref\s*==\s*['"]refs\/heads\/main['"]/i.test(source);
    assert(guarded,`${filename}: deploy command is reachable from pull_request without explicit dispatch/main guard`);
  }
}

if(failures.length){
  console.error(`Digital Workforce public contract FAILED (${failures.length})`);
  for(const failure of failures)console.error(`- ${failure}`);
  process.exit(1);
}
console.log('DIGITAL_WORKFORCE_PUBLIC_CONTRACT_OK');
console.log(JSON.stringify({profiles:profiles.length,departments:departments.size,entitySlots:entitySlots.size,mandatoryHumanApprovals:governance.mandatoryHumanApproval.length}));
