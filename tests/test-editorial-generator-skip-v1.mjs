import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('scheduled editorial generator renders a keyboard skip link and target',()=>{
 const source=fs.readFileSync('scripts/editorial-publish-scheduled-v1.mjs','utf8');
 const start=source.indexOf('function articleHtml('),end=source.indexOf('\nfunction appendCard(',start);assert.ok(start>=0&&end>start);
 const fn=vm.runInNewContext(`(${source.slice(start,end)})`,{
  routeFor:()=>'/objave/example/',SITE:'https://gnk-asg.hr',articleAuthorFor:()=>null,articleImage:()=>({url:'https://example.com/img.webp',path:'/img.webp'}),isVerifiedNerminAuthor:()=>false,topicalKeywords:()=>[],esc:x=>String(x??''),PERSON_URL:'https://gnk-asg.hr/nermin-sefic/',PERSON_ID:'person',ORGANIZATION_ID:'org',WEBSITE_ID:'web',labelFor:()=> 'Objava',dateLabel:()=> 'Dan',authorBox:()=>''
 });
 const html=fn({type:'objava',title:'Primjer',summary:'Primjer',section:'Svijet',paragraphs:['Tekst'],links:[]},'2026-01-01T00:00:00Z');
 assert.match(html,/<link rel="stylesheet" href="\/assets\/am-design-v1\.css" data-am-design="v1">/);
 assert.match(html,/<body><a class="skip" href="#editorialContent">Preskoči na sadržaj<\/a>/);
 assert.match(html,/<main id="editorialContent" tabindex="-1" class="editorial-wrap article">/);
});
test('world topics generator renders localized skip links',()=>{
 const src=fs.readFileSync('scripts/world-topics-materialize-v1.mjs','utf8');
 const start=src.indexOf('function pageFor('),end=src.indexOf('\nunpack();',start);assert.ok(start>=0&&end>start);
 const fn=vm.runInNewContext(`(${src.slice(start,end)})`,{
  resolve:(...x)=>x.join('/'),SRC_DIR:'/tmp',readFileSync:()=> '# Title\nBody',splitTitle:()=>['Title','Body'],descFrom:()=> 'Description',coverFor:()=>({url:'https://example.com/image.webp',image:'/image.webp',alt:'Illustration'}),SITE:'https://gnk-asg.hr',ORGANIZATION_AUTHOR:'Desk',mdToHtml:()=>'<p>Body</p>',attr:String,esc:String
 });
 const topic={hr:'hr.md',en:'en.md',hrSlug:'primjer',enSlug:'example',hrSection:'Svijet',enSection:'World',charts:['x.webp','y.webp'],tags:['Test'],kw:['test']};
 for(const [lang,label] of [['hr','Preskoči na sadržaj'],['en','Skip to content']]){
  const html=fn(topic,lang).html;
  assert.ok(html.includes('<link rel="stylesheet" href="/assets/am-design-v1.css" data-am-design="v1">'));
  assert.ok(html.includes(`<body><a class="skip" href="#editorialContent">${label}</a>`));
  assert.ok(html.includes('<main id="editorialContent" tabindex="-1" class="editorial-wrap article">'));
 }
});
