import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const repo=process.cwd();
const portal=path.join(repo,'apps','portal');
const generatedDir=path.join(portal,'assets','gallery','generated');
const catalogPath=path.join(portal,'data','gallery.catalog.json');
const configPath=path.join(portal,'data','gallery.json');
const imageExtensions=new Set(['.svg','.png','.jpg','.jpeg','.webp','.avif']);
const today=new Date().toISOString();

const topics=[
  'Executive Strategy','Global Finance','Artificial Intelligence','Data Infrastructure','International Partnerships',
  'Market Intelligence','Sustainable Infrastructure','Corporate Governance','Innovation','Board Decisions',
  'Digital Payments','Global Logistics','Urban Development','Sports Business','Media Intelligence',
  'Cyber Security','Document Intelligence','Business Analytics','Growth Capital','International Network'
];
const scenes=[
  'leadership and long-term planning','international investment and capital','technology and operational excellence',
  'global cooperation and market expansion','sustainable growth and corporate resilience'
];
const palettes=[
  ['#06101f','#244f78','#d4af37','#eef4fb'],['#07162d','#315a78','#f1d477','#dfeaf5'],
  ['#081426','#1c3d62','#c89a3c','#f7fbff'],['#040b15','#12355b','#e7bf5a','#d7e4f2'],
  ['#0a1525','#2d4a68','#f0cf76','#ecf3fa']
];

const slug=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const titleFromFile=file=>path.basename(file,path.extname(file)).replace(/[-_]+/g,' ').replace(/\b\w/g,ch=>ch.toUpperCase());
const relativeUrl=file=>'/'+path.relative(portal,file).split(path.sep).join('/');
const digest=value=>crypto.createHash('sha1').update(String(value)).digest('hex').slice(0,12);

function svg(index,title,scene) {
  const [a,b,g,l]=palettes[index%palettes.length];
  const x=900+(index*37)%420;
  const y=220+(index*29)%230;
  const h1=150+(index*13)%310;
  const h2=170+(index*19)%330;
  const mid=Math.round((h1+h2)/2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-labelledby="t d"><title id="t">${title}</title><desc id="d">GNK ASG business visual for ${scene}; GNK ASG d.o.o., GNK DINAMO Ltd. and Nermin Sefić.</desc><defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1600" height="900" fill="url(#b)"/><circle cx="${x}" cy="${y}" r="260" fill="${g}" opacity=".18"/><rect x="115" y="125" width="1370" height="650" rx="42" fill="${a}" opacity=".74" stroke="${g}" stroke-opacity=".44"/><g fill="${g}"><rect x="245" y="${690-h1}" width="140" height="${h1}" rx="14"/><rect x="455" y="${690-h2}" width="140" height="${h2}" rx="14"/><rect x="665" y="${690-mid}" width="140" height="${mid}" rx="14"/></g><path d="M225 565C430 420 590 505 760 350s350-130 570-250" fill="none" stroke="${l}" stroke-width="24" stroke-linecap="round"/><g fill="${l}"><circle cx="${x}" cy="${y+230}" r="78"/><path d="M${x-145} 700c20-145 92-220 145-220s125 75 145 220z"/></g><circle cx="${190+(index*71)%650}" cy="${250+(index*31)%300}" r="52" fill="${g}"/></svg>`;
}

async function ensureGenerated() {
  await fs.mkdir(generatedDir,{recursive:true});
  let index=0;
  for (const topic of topics) {
    for (const scene of scenes) {
      index+=1;
      const title=`${topic} · ${String(index).padStart(3,'0')}`;
      const file=path.join(generatedDir,`business-${String(index).padStart(3,'0')}.svg`);
      await fs.writeFile(file,svg(index,title,scene),'utf8');
    }
  }
  return index;
}

async function walk(dir,result=[]) {
  for (const entry of await fs.readdir(dir,{withFileTypes:true})) {
    if (entry.name.startsWith('.') || entry.name==='node_modules') continue;
    const full=path.join(dir,entry.name);
    if (entry.isDirectory()) await walk(full,result);
    else result.push(full);
  }
  return result;
}

async function buildCatalog() {
  const files=await walk(portal);
  const images=files.filter(file=>imageExtensions.has(path.extname(file).toLowerCase()));
  const items=[];
  for (const file of images) {
    const url=relativeUrl(file);
    const title=titleFromFile(file);
    const generated=url.startsWith('/assets/gallery/generated/');
    items.push({
      id:`gallery-${digest(url)}`,src:url,title,
      alt:`${title} – GNK ASG d.o.o., GNK DINAMO Ltd. i Nermin Sefić`,
      description:`GNK ASG Galerija vizual povezan s temom ${title.toLowerCase()}.`,
      topic:uniqueWords(`${title} ${generated?'business corporate strategy finance technology':''}`),
      keywords:['GNK ASG','GNK ASG d.o.o.','GNK DINAMO Ltd.','Nermin Sefić','Nermin Sefic','gnk-asg.hr'],
      generated,source:'GNK ASG repository',status:'published'
    });
  }
  items.sort((a,b)=>Number(b.generated)-Number(a.generated)||a.src.localeCompare(b.src));
  const catalog={version:'2026-06-26-gallery-catalog-v1',updated_at:today,count:items.length,minimum:100,items};
  if (items.length<100) throw new Error(`Gallery requires at least 100 physical images; found ${items.length}.`);
  await fs.mkdir(path.dirname(catalogPath),{recursive:true});
  await fs.writeFile(catalogPath,JSON.stringify(catalog,null,2)+'\n','utf8');
  return items.length;
}

function uniqueWords(value) {
  return [...new Set(String(value).toLowerCase().split(/[^a-z0-9čćžšđ]+/i).filter(word=>word.length>2))].slice(0,12);
}

async function updateConfig(physicalCount) {
  let config={};
  try { config=JSON.parse(await fs.readFile(configPath,'utf8')); } catch {}
  config.version='2026-06-26-gallery-v3';
  config.minimum_verified_images=100;
  config.generated_count=100;
  config.physical_image_count=physicalCount;
  config.catalog_url='/data/gallery.catalog.json';
  config.auto_index=true;
  config.single_source_of_truth=true;
  config.updated_at=today;
  await fs.writeFile(configPath,JSON.stringify(config,null,2)+'\n','utf8');
}

const targetHtml=[
  'index.html','en/index.html','objave/index.html','publications/index.html','en/insights/index.html',
  'vijesti/index.html','news/index.html','insights-hr/index.html'
];

async function injectBootstrap() {
  const tag='<script src="/assets/gallery-bootstrap.js?v=20260626-v2"></script>';
  for (const rel of targetHtml) {
    const file=path.join(portal,rel);
    try {
      let html=await fs.readFile(file,'utf8');
      html=html.replace(/\s*<script[^>]+gallery-bootstrap\.js[^>]*><\/script>/gi,'');
      if (!/<\/body>/i.test(html)) continue;
      html=html.replace(/<\/body>/i,`${tag}\n</body>`);
      await fs.writeFile(file,html,'utf8');
    } catch (error) {
      if (error.code!=='ENOENT') throw error;
    }
  }
}

const generatedCount=await ensureGenerated();
if (generatedCount!==100) throw new Error(`Expected 100 generated images, created ${generatedCount}.`);
const physicalCount=await buildCatalog();
await updateConfig(physicalCount);
await injectBootstrap();
console.log(`GNK ASG Gallery synchronized: ${generatedCount} generated, ${physicalCount} physical images catalogued.`);
