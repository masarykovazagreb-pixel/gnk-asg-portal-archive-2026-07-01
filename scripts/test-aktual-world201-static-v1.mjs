import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
const root='apps/portal/world';
const read=p=>readFileSync(join(root,p),'utf8');
test('201 individual static route directories and pages',()=>{
 const dirs=readdirSync(root,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name);
 assert.equal(dirs.length,201);
 assert.equal(new Set(dirs).size,201);
 for(const dir of dirs){const html=read(join(dir,'index.html'));
   assert.match(html,/<title>[^<]+AKTUAL MEDIA WORLD<\/title>/);
   assert.match(html,/name="robots" content="noindex,follow"/);
   assert.match(html,/rel="canonical"/);
   assert.match(html,/href="\/radio\/"/);
   assert.match(html,/href="\/world\/"/);
   assert.doesNotMatch(html,/<script[^>]*src="https?:/);
 }
});
test('world index includes 201 country links and accessible search',()=>{
 const html=read('index.html');
 const matches=[...html.matchAll(/class="tile" data-key="[^"]+" href="\/world\/[^"]+\/"/g)];
 assert.equal(matches.length,201);
 assert.match(html,/id="q" type="search"/);
 assert.match(html,/id="count" role="status" aria-live="polite"/);
 assert.match(read('world201.css'),/\[hidden\]\{display:none!important\}/);
});
test('Ghana duplicate is canonicalized and noindex',()=>{
 const alias=read('gvana/index.html');
 assert.match(alias,/https:\/\/gnk-asg\.hr\/world\/gana\//);
 assert.match(alias,/name="robots" content="noindex,follow"/);
});
test('static routes do not invent published articles',()=>{
 const html=read('hrvatska/index.html');
 assert.match(html,/No independently verified published reports/);
 assert.match(html,/External results are operated by their publishers/);
});
