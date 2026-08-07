import fs from 'node:fs';
import assert from 'node:assert/strict';

const file='apps/portal/analize/rat-dug-i-zlato-kapital-bitcoin-2026/index.html';
const related='<nav class="related-articles" aria-label="Povezani sadržaj"><a href="/analize/">Analize</a><a href="/nermin-sefic/">Nermin Sefić</a><a href="/objave/">Objave</a><a href="/komentari/">Komentari</a><a href="/gnk-aktual/">Aktual Media</a></nav>';
let html=fs.readFileSync(file,'utf8');
assert.ok(html.includes('<main class="editorial-wrap article">'),'missing editorial main');
assert.ok(html.includes('<h1>'),'missing H1');
assert.ok(/<img[^>]+src="\/(?!\/)/i.test(html),'missing local image');
if(html.includes('<article class="article-body">')){
  html=html.replace('<article class="article-body">','<div class="article-body">');
  html=html.replace('</article><nav class="related-articles"','</div><nav class="related-articles"');
}
if(/<nav class="related-articles"[\s\S]*?<\/nav>/.test(html)) html=html.replace(/<nav class="related-articles"[\s\S]*?<\/nav>/,related);
else html=html.replace('</main>',`${related}</main>`);
fs.writeFileSync(file,html,'utf8');
const internal=new Set([...html.matchAll(/href="(\/[^"#?]*)/g)].map(m=>m[1]));
assert.ok(internal.size>=5,`expected >=5 internal links, got ${internal.size}`);
assert.ok(!html.includes('<article class="article-body">'),'article-body still isolates main metadata');
console.log(JSON.stringify({ok:true,file,internalLinks:internal.size},null,2));
