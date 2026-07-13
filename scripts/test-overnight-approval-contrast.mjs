import fs from 'node:fs';
import vm from 'node:vm';

const contrast=fs.readFileSync('apps/portal/assets/public-contrast-hardening-v1.js','utf8');
const editorial=fs.readFileSync('apps/portal/assets/index-editorial-order-v1.js','utf8');
const queue=JSON.parse(fs.readFileSync('apps/portal/data/editorial-approval-queue.json','utf8'));

new vm.Script(contrast,{filename:'public-contrast-hardening-v1.js'});
new vm.Script(editorial,{filename:'index-editorial-order-v1.js'});

if(!contrast.includes('GNK_CONTRAST_HARDENING_V2_20260714_DYNAMIC_RECHECK'))throw new Error('contrast v2 marker missing');
if(!contrast.includes('.group-section .group-card'))throw new Error('group-card contrast guard missing');
if(contrast.includes("dataset.gnkContrastHard==='1'"))throw new Error('stale one-pass contrast guard still present');
if(!editorial.includes('GNK_INDEX_EDITORIAL_ORDER_V5_20260714_SYNTAX_SAFE'))throw new Error('syntax-safe editorial marker missing');
if(queue.items.length!==13)throw new Error(`expected 13 editorial drafts, got ${queue.items.length}`);
if(queue.items.filter(x=>x.type==='objava').length!==10)throw new Error('expected 10 publications');
if(queue.items.filter(x=>x.type==='komentar').length!==3)throw new Error('expected 3 commentaries');
if(queue.projects.length!==9)throw new Error(`expected 9 projects, got ${queue.projects.length}`);
for(const item of queue.items){
  for(const field of ['id','title','slug','seoTitle','metaDescription']){
    if(!String(item[field]||'').trim())throw new Error(`${item.id||'unknown'} missing ${field}`);
  }
  if(!Array.isArray(item.internalLinks)||item.internalLinks.length<2)throw new Error(`${item.id} internal links missing`);
  if(!Array.isArray(item.body)||item.body.length<3)throw new Error(`${item.id} body too short`);
}
if(queue.approvalWindow.policy.toLowerCase().includes('izostanak')===false)throw new Error('explicit approval policy missing');
console.log('Overnight approval, editorial and contrast contract: PASS');
