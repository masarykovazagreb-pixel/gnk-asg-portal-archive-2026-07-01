import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index='apps/portal/en/autorske-objave/index.html';
test('English author archive links to existing canonical English articles',()=>{
 const html=fs.readFileSync(index,'utf8');
 const links=[...html.matchAll(/href="([^"?#]+\.html)"/g)].map(m=>new URL(m[1],'https://gnk-asg.hr/en/autorske-objave/')).filter(url=>url.origin==='https://gnk-asg.hr').map(url=>url.pathname);
 assert.ok(links.length>=8,'archive articles must remain present');
 for(const link of links){
  assert.ok(link.startsWith('/en/autorske-objave/'),`${link} points away from English`);
  assert.match(link,/^\/en\/autorske-objave\/[a-z0-9-]+\.html$/);
  const file=`apps/portal${link}`; assert.ok(fs.existsSync(file),file);
  const page=fs.readFileSync(file,'utf8');
  assert.match(page,/<html lang="en"/);
  assert.ok(page.includes(`<link rel="canonical" href="https://gnk-asg.hr${link}"`),file);
  assert.match(page,/<h1\b[^>]*>[^<]+<\/h1>/,file);
 }
 assert.equal(new Set(links).size,links.length,'duplicate article links');
});
