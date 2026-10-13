import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function runDirectory(locale){
  const events=new Map();
  const options={sector:[],stage:[]};
  const element=(name,extra={})=>({name,value:'',textContent:'',innerHTML:'',addEventListener(type,fn){events.set(`${name}:${type}`,fn)},...extra});
  const controls={
    q:element('q'),
    sector:element('sector',{add(option){options.sector.push(option)}}),
    stage:element('stage',{add(option){options.stage.push(option)}}),
    rows:element('rows')
  };
  const count=element('worker-count');
  const summary=element('worker-result-count');
  const document={
    documentElement:{lang:locale,dataset:{}},
    getElementById:id=>controls[id]||null,
    querySelector:selector=>selector==='[data-worker-count]'?count:selector==='[data-worker-result-count]'?summary:null
  };
  const window={};
  class FakeOption{constructor(label,value){this.text=label;this.value=value}}
  vm.runInNewContext(read('apps/portal/assets/workers-directory-v1.js'),{window,document,Option:FakeOption},{filename:'workers-directory-v1.js'});
  return{window,controls,options,count,summary,events,document};
}

const hr=runDirectory('hr');
const en=runDirectory('en');
for(const [locale,result] of [['hr',hr],['en',en]]){
  const meta=result.window.__GNK_WORKER_DIRECTORY_META__;
  const profiles=result.window.__GNK_WORKER_DIRECTORY_DATA__||[];
  assert.equal(meta.total,1573,`${locale}: directory total`);
  assert.equal(meta.base,1536,`${locale}: core profile count`);
  assert.equal(meta.specialists,37,`${locale}: specialist profile count`);
  assert.equal(profiles.length,1573,`${locale}: generated profile count`);
  assert.equal(new Set(profiles.map(item=>item.code)).size,1573,`${locale}: worker codes must be unique`);
  assert.equal(new Set(profiles.map(item=>item.name)).size,1573,`${locale}: synthetic names must be unique`);
  assert.equal(new Set(profiles.map(item=>item.firstName)).size,1573,`${locale}: first names must be unique`);
  assert.equal(new Set(profiles.map(item=>item.lastName)).size,1573,`${locale}: last names must be unique`);
  assert.equal(new Set(profiles.slice(0,1536).map(item=>item.sector)).size,12,`${locale}: core sector count`);
  assert.equal(new Set(profiles.slice(0,1536).map(item=>item.func)).size,16,`${locale}: core function count`);
  assert.equal(new Set(profiles.map(item=>item.sector)).size,13,`${locale}: all profile sectors including the QA specialty`);
  assert.equal(new Set(profiles.map(item=>item.stage)).size,8,`${locale}: stage count`);
  for(const item of profiles){
    for(const field of ['code','name','position','location','sector','func','stage','job'])assert.ok(typeof item[field]==='string'&&item[field].trim(),`${locale}: ${item.code} missing ${field}`);
    assert.match(item.code,/^DWF-\d{4}$/u,`${locale}: invalid worker code ${item.code}`);
  }
  assert.match(result.window.__GNK_WORKER_DIRECTORY_META__.version,/BILINGUAL_FILTER_LABELS/u);
}

assert.equal(hr.count.textContent,'1.573','Croatian count must use Croatian number formatting');
assert.equal(en.count.textContent,'1,573','English count must use English number formatting');
assert.equal(hr.options.sector[0].text,'Strategija');
assert.equal(en.options.sector[0].text,'Strategy');
assert.equal(hr.options.stage[0].text,'Zaprimanje');
assert.equal(en.options.stage[0].text,'Intake');
assert.match(hr.controls.rows.innerHTML,/Strategija/u);
assert.match(hr.controls.rows.innerHTML,/Planiranje/u);
assert.match(en.controls.rows.innerHTML,/Strategy/u);
assert.match(en.controls.rows.innerHTML,/Planning/u);
assert.doesNotMatch(en.controls.rows.innerHTML,/Strategija|Planiranje|zaprimanje/u,'English directory rows must not leak Croatian filter/task labels');
assert.equal(hr.summary.textContent,'1.573 rezultata · prikazano 300');
assert.equal(en.summary.textContent,'1,573 results · showing 300');

const hrPage=read('apps/portal/workers/index.html');
const enPage=read('apps/portal/en/workers/index.html');
for(const [locale,html] of [['hr',hrPage],['en',enPage]]){
  assert.match(html,/rel="canonical"/u,`${locale}: canonical URL required`);
  assert.match(html,/hreflang="en"/u,`${locale}: English alternate required`);
  assert.match(html,/hreflang="hr"/u,`${locale}: Croatian alternate required`);
  assert.match(html,/workers-directory-v1\.js\?v=20261012-bilingual-filters-v4/u,`${locale}: current directory asset required`);
  assert.match(html,/synthetic|sintetička/u,`${locale}: generated profiles must be identified as synthetic`);
  assert.match(html,/does not display secrets|Ne prikazuje tajne/u,`${locale}: public data boundary must remain visible`);
}
assert.match(enPage,/<div class="count" data-worker-count>1,573<\/div>/u,'English static count must be locale-correct before JavaScript loads');

const review=read('workers/gnk-asg-direct-operator/wrangler.toml');
assert.match(review,/main = "src\/index-digital-workforce-v1\.js"/u);
assert.match(review,/PUBLIC_ENVIRONMENT = "review-direct-operator"/u);
assert.match(review,/name = "gnk-asg-direct-operator-review"/u);
assert.doesNotMatch(review,/^\[\[(?:kv_namespaces|d1_databases|r2_buckets|send_email)\]\]/mu,'review runtime must not bind production services');
assert.doesNotMatch(review,/^\[triggers\]/mu,'review runtime must not schedule external automation');
for(const flag of ['MAIL_AUTO_REPLY_LIVE','MAIL_STUDIO_LIVE','MAIL_MANUAL_LIVE','MEDIA_OUTREACH_LIVE','MEDIA_OUTREACH_SCHEDULED_LIVE','EMAIL_OPEN_TRACKING_ENABLED'])assert.match(review,new RegExp(`${flag} = "false"`),`${flag} must be off in review`);

console.log(JSON.stringify({ok:true,contract:'current-synthetic-worker-directory-and-isolated-runtime',profiles:1573,coreProfiles:1536,specialists:37,uniqueCodes:true,uniqueNames:true,bilingualFilters:true,reviewRuntimeIsolated:true},null,2));
