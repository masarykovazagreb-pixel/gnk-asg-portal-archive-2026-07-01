import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const portal=path.join(root,'apps','portal');
const catalogPath=path.join(portal,'data','gallery.catalog.json');
const quarantinePath=path.join(portal,'data','gallery.quarantine.json');
const configPath=path.join(portal,'data','gallery.json');
const updatedAt=new Date().toISOString();

const normalize=value=>String(value||'')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'')
  .toLowerCase()
  .replace(/[_-]+/g,' ')
  .replace(/\s+/g,' ')
  .trim();

function editorialReason(item){
  const src=normalize(item?.src);
  const title=normalize(item?.title);
  const value=`${src} ${title}`;

  if(src.includes('/assets/gallery/generated/'))return '';

  const utility=/\b(favicon|app icon|touch icon|mask icon|sprite|loader|loading|placeholder|tracking pixel|qr code|qrcode|flag icon|avatar default)\b/.test(value);
  if(utility)return 'non-editorial-utility-asset';

  const mark=/\b(logo|logotip|wordmark|brand mark|crest|badge|emblem|shield|klupski znak|club mark|social card)\b/.test(value);
  if(mark)return 'non-editorial-brand-asset';

  return '';
}

const catalog=JSON.parse(await fs.readFile(catalogPath,'utf8'));
let quarantine={version:'2026-06-26-gallery-quarantine-v2',updated_at:updatedAt,count:0,items:[]};
try{quarantine=JSON.parse(await fs.readFile(quarantinePath,'utf8'));}catch{}

const approved=[];
const newlyQuarantined=[];
for(const item of Array.isArray(catalog.items)?catalog.items:[]){
  const reason=editorialReason(item);
  if(reason)newlyQuarantined.push({...item,reason,status:'quarantined'});
  else approved.push(item);
}

const merged=new Map();
for(const item of [...(quarantine.items||[]),...newlyQuarantined]){
  const key=item.src||item.id;
  if(key&&!merged.has(key))merged.set(key,item);
}
const quarantineItems=[...merged.values()].sort((a,b)=>String(a.src).localeCompare(String(b.src)));

if(approved.length<100)throw new Error(`Editorial Gallery requires at least 100 approved images; found ${approved.length}.`);

catalog.version='2026-06-26-gallery-catalog-v3';
catalog.updated_at=updatedAt;
catalog.count=approved.length;
catalog.quarantined_count=quarantineItems.length;
catalog.editorial_policy={
  publication_pool_only:true,
  excludes:['logos','wordmarks','favicons','icons','badges','emblems','crests','shields','social cards','UI placeholders'],
  generated_business_visuals_allowed:true
};
catalog.items=approved;

quarantine.version='2026-06-26-gallery-quarantine-v2';
quarantine.updated_at=updatedAt;
quarantine.count=quarantineItems.length;
quarantine.editorial_policy=catalog.editorial_policy;
quarantine.items=quarantineItems;

const config=JSON.parse(await fs.readFile(configPath,'utf8'));
config.version='2026-06-26-gallery-v5';
config.physical_image_count=approved.length;
config.quarantined_image_count=quarantineItems.length;
config.editorial_policy=catalog.editorial_policy;
config.updated_at=updatedAt;

await fs.writeFile(catalogPath,JSON.stringify(catalog,null,2)+'\n','utf8');
await fs.writeFile(quarantinePath,JSON.stringify(quarantine,null,2)+'\n','utf8');
await fs.writeFile(configPath,JSON.stringify(config,null,2)+'\n','utf8');

console.log(JSON.stringify({approved:approved.length,quarantined:quarantineItems.length,newlyQuarantined:newlyQuarantined.length}));
