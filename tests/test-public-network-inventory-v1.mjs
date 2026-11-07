import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {SITES} from '../apps/sites/lib/registry.mjs';
import {WORLD_PORTALS} from '../apps/world/lib/registry.mjs';

test('javni popis odgovara registrima i povezan je s obje glavne stranice',()=>{
  execFileSync(process.execPath,['scripts/factory/build-public-network-inventory-v1.mjs','--check']);
  const channels=JSON.parse(readFileSync('apps/region/channels.json','utf8')).channels;
  for(const lang of ['hr','en']){
    const path=lang==='hr'?'apps/portal/mreza/izvori/index.html':'apps/portal/en/mreza/izvori/index.html';
    const html=readFileSync(path,'utf8');
    assert.match(html,new RegExp(`<html lang="${lang}">`));
    assert.match(html,/data-am-netday=/);assert.match(html,/am-ribbon/);
    assert.match(html,/data-am-author="v1"/);assert.match(html,/data-am-impressum/);
    assert.match(html,/data-public-title-search/);assert.match(html,/public-title-search-v1.js/);
    const jsonld=[...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
    assert.ok(jsonld.some(x=>x['@type']==='WebSite'));
    const url=lang==='hr'?'https://gnk-asg.hr/mreza/izvori/':'https://gnk-asg.hr/en/mreza/izvori/';
    assert.ok(readFileSync('apps/portal/sitemap.xml','utf8').includes(`<loc>${url}</loc>`));
    assert.match(html,/#NerminSefić #NerminSefic/);
    for(const x of [...channels,...SITES,...WORLD_PORTALS])assert.ok(html.includes(x.base),`Nedostaje ${x.base}`);
    assert.match(html,lang==='hr'?/Ne potvrđuje dostupnost, vlasništvo, licencu ni dopuštenje/:/does not verify availability, ownership, licences or permission/);
    assert.match(html,/<strong>(blocked|pending)<\/strong>/);
    const href=lang==='hr'?'/mreza/izvori/':'/en/mreza/izvori/';
    for(const p of lang==='hr'?['apps/portal/index.html','apps/portal/gnk-aktual/index.html']:['apps/portal/en/index.html','apps/portal/en/gnk-aktual/index.html'])assert.match(readFileSync(p,'utf8'),new RegExp(`data-network-inventory-link="v1"[^]*?href="${href}"`));
  }
});
