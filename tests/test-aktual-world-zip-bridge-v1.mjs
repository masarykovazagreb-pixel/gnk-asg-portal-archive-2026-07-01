import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
const portal=join(root,'apps/portal/gnk-aktual');
const data=JSON.parse(readFileSync(join(root,'apps/portal/data/world-countries-v1.json'),'utf8'));
const sitemap=readFileSync(join(portal,'media/sitemap.xml'),'utf8');
test('ZIP migration contract: exactly 201 distinct country pages',()=>{
  assert.equal(data.count,201);
  assert.equal(data.countries.length,201);
  assert.equal(new Set(data.countries.map(c=>c.slug)).size,201);
  assert.equal(new Set(data.countries.map(c=>c.code)).size,201);
  for(const country of data.countries){
    const htmlFile=join(portal,'media',country.slug,'index.html');
    const rssFile=join(portal,'media',country.slug,'feed.xml');
    assert(existsSync(htmlFile),'missing country '+country.slug);
    assert(existsSync(rssFile),'missing RSS '+country.slug);
    const page=readFileSync(htmlFile,'utf8');
    const canonical='https://gnk-asg.hr/gnk-aktual/media/'+country.slug+'/';
    assert(page.includes('href="'+canonical+'"'),'missing canonical '+country.slug);
    assert(sitemap.includes('<loc>'+canonical+'</loc>'),'sitemap missing '+country.slug);
  }
});
test('source-backed navigation and Space-Z prototype promotion preserved',()=>{
  for(const slug of ['hrvatska','francuska','gvajana','srbija']){
    const page=readFileSync(join(portal,'media',slug,'index.html'),'utf8');
    assert(page.includes('j1hex9qg03f0-d.space-z.ai'),'prototype promotion missing: '+slug);
    assert(page.includes('data-external-station="v1"'),'external station missing: '+slug);
  }
});
test('sitemap contains 201 editions, country directory and 10 legacy cities',()=>{
  assert.equal((sitemap.match(/<loc>/g)||[]).length,212);
  for(const c of data.cities){
    const route='https://gnk-asg.hr/gnk-aktual/grad/'+c.slug+'/';
    assert(sitemap.includes('<loc>'+route+'</loc>'),'legacy city missing '+c.slug);
  }
});
