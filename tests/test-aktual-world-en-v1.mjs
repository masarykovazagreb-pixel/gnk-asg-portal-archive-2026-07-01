import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,rmSync,cpSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const registry=JSON.parse(readFileSync('apps/portal/data/world-countries-v1.json','utf8'));
test('201 English country editions are reproduced deterministically',()=>{
 const temp=mkdtempSync(join(tmpdir(),'aktual-en-'));
 try {
  const run=spawnSync(process.execPath,['scripts/build-aktual-world-en-v1.mjs'],{encoding:'utf8',env:{...process.env,AKTUAL_EN_OUT:temp}});
  assert.equal(run.status,0,run.stderr);
  assert.equal(readdirSync(temp,{withFileTypes:true}).filter(x=>x.isDirectory()).length,201);
  const html=readFileSync(join(temp,'hrvatska','index.html'),'utf8');
  const directory=readFileSync(join(temp,'index.html'),'utf8');
  assert.match(directory, /<meta property="og:image" /);
  assert.match(directory, /<meta name="twitter:card" content="summary_large_image">/);
  const japan=readFileSync(join(temp,'japan','index.html'),'utf8');
  assert.match(html,/<html lang="en">/);
  assert.match(html,/<link rel="canonical" href="https:\/\/gnk-asg.hr\/en\/gnk-aktual\/media\/hrvatska\/">/);
  assert.match(html,/hreflang="hr"/);
  assert.match(html,/href="\/en\/radio\/"/);
  assert.match(html,/Nermin Sefić/);
  assert.match(japan,/Japan/);
  assert.doesNotMatch(html,/"@type":"NewsArticle"/);
  assert.match(html,/External publishers|external publishers|External publisher/);
  const sitemap=readFileSync(join(temp,'sitemap.xml'),'utf8');
  assert.match(sitemap,/<urlset/);
  assert.ok(!sitemap.includes('https://price.download'));
  const check=spawnSync(process.execPath,['scripts/build-aktual-world-en-v1.mjs','--check'],{encoding:'utf8',env:{...process.env,AKTUAL_EN_OUT:temp}});
  assert.equal(check.status,0,check.stderr);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
test('committed EN pages have registry-aligned managed blocks and sitemap',()=>{
 const run=spawnSync(process.execPath,['scripts/build-aktual-world-en-v1.mjs','--check'],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
});

test('201 Croatian directories reciprocate English and expose a visible language switch',()=>{
 for(const c of registry.countries){
  const page=readFileSync('apps/portal/gnk-aktual/media/'+c.slug+'/index.html','utf8');
  const local='https://gnk-asg.hr/gnk-aktual/media/'+c.slug+'/';
  const english='https://gnk-asg.hr/en/gnk-aktual/media/'+c.slug+'/';
  assert.equal(page.split('<link rel="alternate" hreflang="hr" href="'+local+'">').length-1,1,c.slug+' HR');
  assert.equal(page.split('<link rel="alternate" hreflang="en" href="'+english+'">').length-1,1,c.slug+' EN');
  assert.equal(page.split('<link rel="alternate" hreflang="x-default" href="'+english+'">').length-1,1,c.slug+' default');
  assert.ok(page.includes('href="'+english+'" lang="en" hreflang="en">English</a>'),c.slug+' switch');
 }
});


test('Premium editorial design maintains five distinct visual modules in HR + EN without claiming live stories',()=>{
  const en=readFileSync('apps/portal/assets/aktual-world-premium-en-v1.css','utf8');
  const hr=readFileSync('apps/portal/assets/aktual-world-page-a11y-v1.css','utf8');
  for(const css of [en,hr]){
    assert.ok(css.includes('AKTUAL DESIGN VARIANTS V2'),'visual contract marker');
    assert.ok(css.includes('prefers-reduced-motion:reduce'),'reduced-motion contract');
    assert.ok(css.includes('forced-colors:active'),'high-contrast contract');
  }
  assert.ok(en.includes('.am-source-grid>.am-source-card:first-child'),'featured source type');
  assert.ok(en.includes('.am-source-grid>.am-source-card:nth-child(5n+3)'),'magazine card type');
  assert.ok(en.includes('.am-source-grid>.am-source-card:only-child'),'single reference type');
  assert.ok(en.includes('.am-directory-grid>li:first-child'),'featured Croatian directory type');
  assert.ok(en.includes('.am-radio .am-button'),'radio CTA type');
  assert.ok(hr.includes('#worldContent .sources>a:first-child'),'HR featured source type');
  assert.ok(hr.includes('#worldContent .sources>a:nth-child(5n+3)'),'HR magazine source type');
  assert.match(en, /@media\(max-width:620px\)/);
  assert.match(hr, /@media\(max-width:540px\)/);
  const croatia=readFileSync('apps/portal/en/gnk-aktual/media/hrvatska/index.html','utf8');
  assert.ok(croatia.includes('Source catalogue — not a live article feed'),'no fake live status');
});

test('existing layers survive catalogue sync, robots are respected, and malformed pages fail before writes',()=>{
 const temp=mkdtempSync(join(tmpdir(),'aktual-en-protect-'));
 const root='apps/portal/en/gnk-aktual/media';
 const facts=/<aside class="am-hero-panel" aria-label="Edition facts">[\s\S]*?<\/aside>/g;
 const sources=/<section class="am-section"><div class="am-section-head"><div><p class="am-kicker">RESEARCH \/ (?:VERIFIED )?SOURCE DIRECTORY<\/p>[\s\S]*?<\/ul><\/section>/g;
 const list=/<ul class="am-directory-grid" id="amCountryList">[\s\S]*?<\/ul>/g;
 const strip=html=>html.replace(facts,'FACTS').replace(sources,'SOURCES').replace(list,'DIRECTORY');
 try{
  cpSync(root,temp,{recursive:true});
  const country=join(temp,'hrvatska/index.html'),last=join(temp,registry.countries.at(-1).slug,'index.html');
  const before=registry.countries.map(c=>[join(temp,c.slug,'index.html'),readFileSync(join(temp,c.slug,'index.html'),'utf8')]);
  const directoryBefore=readFileSync(join(temp,'index.html'),'utf8');
  const old=readFileSync(last,'utf8');writeFileSync(last,old.replace('RESEARCH / SOURCE DIRECTORY','BAD DIRECTORY'));
  const beforeBad=readFileSync(country,'utf8');
  const env={...process.env,AKTUAL_EN_OUT:temp};
  const bad=spawnSync(process.execPath,['scripts/build-aktual-world-en-v1.mjs'],{encoding:'utf8',env});
  assert.notEqual(bad.status,0);assert.match(bad.stderr,/Unexpected managed block/);assert.equal(readFileSync(country,'utf8'),beforeBad);
  writeFileSync(last,old);
  // robots is an independently managed policy; don't silently index or list a noindex page.
  const html=readFileSync(country,'utf8').replace('content="index,follow,max-image-preview:large"','content="noindex,follow"');
  assert.notEqual(html,beforeBad);writeFileSync(country,html);
  const run=spawnSync(process.execPath,['scripts/build-aktual-world-en-v1.mjs'],{encoding:'utf8',env});assert.equal(run.status,0,run.stderr);
  for(const [file,prior] of before){const expected=file===country?html:prior;assert.equal(strip(readFileSync(file,'utf8')),strip(expected),file);}
  assert.equal(strip(readFileSync(join(temp,'index.html'),'utf8')),strip(directoryBefore));
  assert.ok(!readFileSync(join(temp,'sitemap.xml'),'utf8').includes('/media/hrvatska/'));
  const check=spawnSync(process.execPath,['scripts/build-aktual-world-en-v1.mjs','--check'],{encoding:'utf8',env});assert.equal(check.status,0,check.stderr);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
