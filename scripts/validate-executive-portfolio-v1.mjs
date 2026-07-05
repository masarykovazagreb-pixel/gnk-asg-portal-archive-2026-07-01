import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const base=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,base),'utf8');
const governance=JSON.parse(await read('apps/portal/data/project-portfolio-governance-v1.json'));
const health=await read('apps/portal/assets/admin-center-health-v1.js');
const ui=await read('apps/portal/assets/admin-executive-portfolio-v1.js');
const css=await read('apps/portal/assets/executive-project-portfolio-v1.css');

assert.equal(Object.keys(governance.functionOwners||{}).length,19);
assert.equal(governance.additionalProjects?.length,9);
assert.equal(new Set(governance.additionalProjects.map(x=>x.id)).size,9);
assert.equal(governance.defaultGovernance?.budget?.approved,null);
assert.equal(governance.defaultGovernance?.budget?.status,'not-set');
assert.equal(governance.defaultGovernance?.financialModel?.status,'not-approved');
assert.equal(governance.defaultGovernance?.reviewGate?.automaticPublication,false);
assert.ok(health.includes('admin-executive-portfolio-v1.js'));
assert.ok(health.includes('executive-project-portfolio-v1.css'));
for(const text of ['Projektni owner i timovi','Backlog i aktivni zadaci','Milestonei i rokovi','Dokumenti','Ovisnosti','Rizici','Review gate i audit','Budžet i financijski model','Status radnika','NIJE POSTAVLJENO'])assert.ok(ui.includes(text),text);
assert.ok(css.includes('@media(max-width:700px)'));
console.log(JSON.stringify({ok:true,totalProjects:28,additionalProjects:9}));
