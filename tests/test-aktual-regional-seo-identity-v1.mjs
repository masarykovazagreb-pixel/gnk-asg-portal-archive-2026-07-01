#!/usr/bin/env node
// 8 AKTUAL MEDIA regional editions + central hub SEO/attribution regression.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),portal=path.join(root,'apps/portal');
const page=p=>fs.readFileSync(path.join(portal,p),'utf8');
const source=fs.readFileSync(path.join(root,'apps/region/engine/build.mjs'),'utf8');
const channels=JSON.parse(fs.readFileSync(path.join(root,'apps/region/channels.json'),'utf8')).channels;
assert.equal(channels.length,8);
assert.ok(source.includes('<meta property="og:site_name" content="AKTUAL MEDIA">'));
const falseAuth='<link rel="author" href="'+'$'+'{PUBLIC}/nermin-sefic/">';
assert.ok(!source.includes(falseAuth),'Generated bot writing must not claim personal author');
assert.match(source,/editor: \{ '@type': 'Person', name: 'Nermin Sefić'/);
assert.match(source,/author: \{ '@id': AKTUAL_NEWS_ENTITY_ID \}/);
assert.match(source,/const hasLanguageAlternative = path === '' \|\| path === 'en\/'/);
const all=[{id:'hub',lang:'hr',url:'https://gnk-asg.hr/kanal/',p:'kanal/index.html'},
 ...channels.map(c=>({id:c.id,lang:c.lang,url:c.base,p:'kanal/'+c.id+'/index.html'}))];
for(const item of all){
 const html=page(item.p);
 const canonical=html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/)?.[1];
 const siteName=html.match(/<meta\s+property="og:site_name"\s+content="([^"]+)"/)?.[1];
 const lang=html.match(/<html\s+lang="([^"]+)"/)?.[1];
 const alts=[...html.matchAll(/<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/g)];
 assert.equal(canonical,item.url,item.id+' canonical');
 assert.equal(siteName,'AKTUAL MEDIA',item.id+' Open Graph publisher');
 assert.equal(lang,item.lang,item.id+' native language');
 assert.match(html,/<meta\s+name="robots"\s+content="index,follow/i);
 assert.ok(html.includes('https://gnk-asg.hr/gnk-aktual/'));
 assert.ok(html.includes('NewsMediaOrganization'));
 assert.ok(!html.includes('<link rel="author" href="https://gnk-asg.hr/nermin-sefic/">'),item.id+' unsupported byline');
 if(item.id!=='hub'){
  assert.ok(alts.some(x=>x[1]===item.lang&&x[2]===item.url),item.id+' local hreflang');
  assert.ok(alts.some(x=>x[1]==='en'&&x[2]===item.url+'en/'),item.id+' English hreflang');
 }
}
console.log('PASS AKTUAL MEDIA SEO identity: 9 canonical native-language landing pages, OG attribution, editor/author separation (repo only; live status not inferred).');
