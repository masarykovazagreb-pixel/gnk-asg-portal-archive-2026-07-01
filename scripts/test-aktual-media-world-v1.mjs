#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const files={
  hr:'apps/portal/gnk-aktual/index.html',
  en:'apps/portal/en/gnk-aktual/index.html',
  topicsHr:'apps/portal/gnk-aktual/teme/index.html',
  topicsEn:'apps/portal/en/gnk-aktual/topics/index.html',
  css:'apps/portal/assets/aktual-media-world-v1.css',
  js:'apps/portal/assets/aktual-media-world-v1.js',
  sitemap:'apps/portal/sitemap.xml'
};
const failures=[];
for(const [name,p] of Object.entries(files)){
  if(!fs.existsSync(p)) failures.push(name+': missing '+p);
}
if(failures.length){console.error(failures.join('\n'));process.exit(1)}

const hr=read(files.hr),en=read(files.en),topicsHr=read(files.topicsHr),topicsEn=read(files.topicsEn),js=read(files.js),css=read(files.css),sitemap=read(files.sitemap);
for(const [name,html] of [['hr',hr],['en',en]]){
  for(const id of ['amEditionDate','amFeedStatus','amSectionNav','amBreakingTrack','amLead','amRail','amLatestList','amSources','amSearchForm','amSearchInput','amSearchResults','amGroups','amEditorialLinks']){
    if(!html.includes('id="'+id+'"')) failures.push(name+': missing #'+id);
  }
  if(!html.includes('/assets/aktual-media-world-v1.css')) failures.push(name+': missing world CSS');
  if(!html.includes('/assets/aktual-media-world-v1.js')) failures.push(name+': missing world JS');
  if(!html.includes('id="aktualSova"')) failures.push(name+': missing AKTUAL Sova desk');
  if(!html.includes('/assets/aktual-sova-v1.js')) failures.push(name+': missing AKTUAL Sova module');
  for(const tab of ['source','foresight','weekly','explain']) if(!html.includes('data-sova-tab="'+tab+'"')) failures.push(name+': missing Sova '+tab+' tab');
  const keywordTags=[...html.matchAll(/<meta\s+name=["']keywords["'][^>]*>/gi)].map(m=>m[0]);
  if(keywordTags.some(x=>/Nermin\s+Sefi[cć]/i.test(x))) failures.push(name+': author name present in meta keywords');
}
if(!hr.toLocaleLowerCase('hr').includes('modelirani digitalni vodič')||!hr.toLocaleLowerCase('hr').includes('modelirani strateški foresight vodič')) failures.push('hr: Sova transparent classification missing');
if(!en.toLowerCase().includes('modelled digital guide')||!en.toLowerCase().includes('modelled strategic foresight guide')) failures.push('en: Sova transparent classification missing');
for(const [name,html] of [['topicsHr',topicsHr],['topicsEn',topicsEn]]){
  if(!html.includes('data-aktual-view="topics"')) failures.push(name+': wrong view mode');
  if(!html.includes('id="amTopicGrid"')) failures.push(name+': missing topic grid');
  if(!html.includes('id="amSources"')) failures.push(name+': missing source map');
}
if(!js.includes("fetch('/data/news.json")) failures.push('js: must consume canonical news feed');
if(!js.includes("fetch('/data/kolumne.json")) failures.push('js: must consume canonical columns feed');
if(!js.includes("world:'international'")) failures.push('js: world alias normalization missing');
if(!js.includes("business:'economy'")) failures.push('js: business alias normalization missing');
const imageGuard=js.slice(js.indexOf('const localEditorialVisuals ='),js.indexOf('  const meta = item =>'));
if(!imageGuard.includes('localEditorialVisuals')||!imageGuard.includes('selectImage')) failures.push('js: local preview protection missing');
else {
  // Browser-free contract test against the actual image renderer.
  const renderImage=new Function('esc','lang','metaFor',`${imageGuard};return image;`)(
    value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),
    'hr',group=>({label:String(group||'Ostalo')})
  );
  const external=renderImage({title:'Izvorna vijest',image:'https://img.decrypt.co/photo.jpg',_group:'technology'},true);
  if(external.includes('img.decrypt.co') || external.includes('src="http') || external.includes('src="//')) failures.push('js: external images must never load as reader subresources');
  if(!external.includes('src="/assets/gallery/')||!external.includes('Tematska ilustracija')) failures.push('js: external images must use attributed local topical illustrations');
  if(!external.includes('width="1200" height="675"')||!external.includes('loading="eager"')) failures.push('js: lead image dimensions/priority missing');
  const original=renderImage({title:'Verificirana lokalna ilustracija',image:'/assets/gallery/agentic-ai-orchestration-organic-v3.svg',imageAlt:'Tema o AI-u',_group:'technology'});
  if(!original.includes('src="/assets/gallery/agentic-ai-orchestration-organic-v3.svg"')) failures.push('js: preserve approved local images');
}
if(/innerHTML\s*=\s*[^;]*item\.title/.test(js)) failures.push('js: unescaped direct title injection detected');
if(!css.includes('.am-leadgrid')||!css.includes('.am-cardgrid')||!css.includes('@media')) failures.push('css: required responsive newsroom layout missing');

// Tržišta shares the canonical AKTUAL news feed. Its previews must never
// reintroduce third-party image cookies or portray an illustration as a photo.
const marketsHtml=read('apps/portal/trzista/index.html');
const visualStart=marketsHtml.indexOf('function previewVisual(item)');
const visualEnd=marketsHtml.indexOf('\n  fetch(',visualStart);
if(visualStart<0||visualEnd<=visualStart) failures.push('markets: missing approved preview image handler');
else {
  const previewVisual=Function(`${marketsHtml.slice(visualStart,visualEnd)};return previewVisual;`)();
  const remoteEconomy=previewVisual({image:'https://img.decrypt.co/news.jpg',group:'economy',title:'Poslovna vijest'});
  if(remoteEconomy.src!=='/assets/gallery/kapitalna-disciplina-amber-energy-05-v2.svg') failures.push('markets: economy remote images must use local fallback');
  if(!remoteEconomy.alt.startsWith('Tematska ilustracija GNK ASG')) failures.push('markets: local illustration must be labelled honestly');
  const remoteDigital=previewVisual({image:'//remote.example/test.jpg',group:'digital-assets',title:'Digitalna imovina'});
  if(remoteDigital.src!=='/assets/gallery/digitalna-imovina-gold-navy-11-v2.svg') failures.push('markets: protocol-relative image must use local fallback');
  const local=previewVisual({image:'/assets/gallery/agentic-ai-orchestration-organic-v3.svg',imageAlt:'Urednička ilustracija AI',group:'technology'});
  if(local.src!=='/assets/gallery/agentic-ai-orchestration-organic-v3.svg') failures.push('markets: preserve existing approved local artwork');
  if(marketsHtml.includes("esc(item.image||")||!marketsHtml.includes('width="1200" height="675"')) failures.push('markets: uncensored image rendering or missing fixed dimensions');
}

for(const url of ['https://gnk-asg.hr/gnk-aktual/teme/','https://gnk-asg.hr/en/gnk-aktual/topics/']){
  if(!sitemap.includes('<loc>'+url+'</loc>')) failures.push('sitemap missing '+url);
}
const report={version:'AKTUAL_MEDIA_WORLD_V1_TEST',files:Object.keys(files).length,failures};
console.log(JSON.stringify(report,null,2));
if(failures.length) process.exit(1);
