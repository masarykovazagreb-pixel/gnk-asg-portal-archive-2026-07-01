#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {INTRO,EDITIONS,safeCanonical,ownedImage,selectCandidates,buildCopy,postKey,ORIGIN} from '../scripts/global-distribution-core-v1.mjs';
assert.equal(EDITIONS.length,8,'all 8 regional language editions required');
for(const l of ['hr','sr','bs','hu','sl','it','bg','ro','en','es','pt','fr','de','ja','zh','vi','id','ar','sw'])
  assert(typeof INTRO[l]==='string'&&INTRO[l].length>14,'missing international locale '+l);
assert.equal(safeCanonical('https://gnk-asg.hr/kanal/zagreb/clanak/provjera/'),
  'https://gnk-asg.hr/kanal/zagreb/clanak/provjera/');
assert.equal(safeCanonical('https://malicious.example/objave/one/'),null);
assert.equal(safeCanonical('https://gnk-asg.hr/admin/login/'),null);
assert.equal(ownedImage('https://source.example/photo.jpg'),null,'do not mirror third-party news photos');
assert.equal(ownedImage('https://gnk-asg.hr/assets/izdanja/zagreb-1200.webp'),
  'https://gnk-asg.hr/assets/izdanja/zagreb-1200.webp');
assert.equal(ownedImage('https://gnk-asg.hr/assets/editorial/img.svg'),null,'SVG cannot be uploaded as a post image');
const now=new Date('2026-10-22T12:00:00Z');
const obj={title:'Analiza: Javne nabave u regiji',description:'Ovo je kritička analiza objavljenih podataka',
  path:'/objave/javne-nabave/',publishedAt:'2026-10-21T08:00:00Z',language:'hr',
  image:'https://gnk-asg.hr/assets/editorial/cover.png'};
const bad={title:'Future',path:'/objave/future/',publishedAt:'2028-01-01T10:00:00Z'};
const region={title:'Iráni bankot kapcsoltak le Németországban',summary:'Preuzeto od izvora',
  url:'https://external-source.example/article',slug:'example-key',date:'2026-10-22T06:00:00Z',sourceName:'Portfolio',
  image:'https://external-source.example/photo.jpg'};
const out=selectCandidates({featured:{items:[obj,obj,bad]},registry:{items:[{...obj,status:'draft',path:'/objave/draft/'}]},
  regions:{budimpesta:{items:[region]}},now});
assert.equal(out.length,2,'published source dedupe and date gating');
const regional=out.find(x=>x.lang==='hu');
assert(regional&&regional.canonical===ORIGIN+'/kanal/budimpesta/clanak/example-key/');
assert(!regional.image.includes('external-source'),'regional source images must not be mirrored');
assert.equal(regional.reviewMode,true);
const pkg=buildCopy(regional,'ja',300);
assert(pkg.text.includes('AKTUAL MEDIA'),'canonical media brand');
assert(pkg.text.includes(regional.canonical),'original URL');
assert(!pkg.text.includes('external-source.example'),'source image or source article never published as own canonical');
assert.equal(pkg.sourceLanguage,'hu');
assert.equal(pkg.translatedArticle,false,'localized intro must not pretend story is translated');
assert([...pkg.text].length<=300,'network post fits Bluesky text limit');
assert.notEqual(postKey('bluesky',regional,'hu'),postKey('mastodon',regional,'hu'));
assert.notEqual(postKey('bluesky',regional,'hu'),postKey('bluesky',regional,'en'));
const main=fs.readFileSync('scripts/global-free-distribution-v1.mjs','utf8');
assert(main.includes("process.env.CONFIRM_EXTERNAL_PUBLISH!=='AKTUAL_MEDIA_APPROVED_20261022'"));
assert(main.includes('preflight(v.item.canonical)'),'must check canonical live before external publish');
assert(main.includes('pending_verification'),'ambiguous published output must not be blindly re-posted');
assert(main.includes("const LIVE=process.argv.includes('--live')"),'preview must be default');
const workflow=fs.readFileSync('.github/workflows/global-free-distribution.yml','utf8');
for(const v of ["confirm_external_distribution:","default: false","inputs.confirm_external_distribution == true",
  "vars.GNK_ASG_EXTERNAL_DISTRIBUTION == 'true'","github.ref == 'refs/heads/main'",
  "workflow_dispatch:","automation/global-distribution-state"])
  assert(workflow.includes(v),'missing workflow guard '+v);
assert(!/^\s{2}(?:schedule|push):/m.test(workflow),'no auto external publishing');
assert(!workflow.includes('secrets.TELEGRAPH'),'existing four blogs remain separate');
console.log('PASS AKTUAL MEDIA global free distribution: 19 locales, 8 editions, canonical/image rights, API opt-in, dedupe');
