#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve('apps/portal');
const read=(p,f=null)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return f}};
const manifest=read(path.join(ROOT,'data/editorial-plan/manifest.json'),{packages:[]});
const holds=read(path.join(ROOT,'data/editorial-plan/publication-holds.json'),{holds:[]});
const registry=read(path.join(ROOT,'data/editorial-registry.json'),{items:[]});
const parity=read(path.join(ROOT,'data/blog-content/parity.json'),{});
const seo=read(path.join(ROOT,'data/seo-visibility-status.json'),{});
const news=read(path.join(ROOT,'data/update_status.json'),{});
const activeHolds=new Set((holds.holds||[]).filter(x=>x.active).map(x=>x.packageId));
const now=new Date(process.env.SUPERVISOR_NOW||Date.now());
const future=(manifest.packages||[])
  .filter(p=>!p.publishedAt && new Date(p.publishAt)>=new Date(now.toISOString().slice(0,10)+'T00:00:00+02:00'))
  .sort((a,b)=>new Date(a.publishAt)-new Date(b.publishAt))
  .map(p=>({id:p.id,publishAt:p.publishAt,held:activeHolds.has(p.id),files:p.files||[]}));
const end=future.length?future[future.length-1].publishAt:null;
const dailyDates=[...new Set(future.map(p=>String(p.publishAt).slice(0,10)))];
const report={
  version:'GNK_ASG_WORKFORCE_SUPERVISOR_AGENT_V1',
  generatedAt:new Date().toISOString(),
  agent:{id:'AGENT-PORTAL-SUPERVISOR-001',status:'active-workflow-controller',mode:'read-only-control-and-evidence'},
  modeledWorkforce:{profiles:1573,assignments:1573,projects:9,domains:12,semantics:'modeled assignments; not 1573 independent runtime processes'},
  editorial:{
    futurePackages:future.length,
    dailyCoverageDays:dailyDates.length,
    coverageThrough:end,
    activeHolds:[...activeHolds].length,
    next:future.slice(0,5)
  },
  publication:{registryItems:(registry.items||[]).length},
  distribution:{parityVersion:parity.version||null,channels:parity.channels||null},
  seo:{version:seo.version||null,generatedAt:seo.generatedAt||seo.updatedAt||null},
  news:{updatedAt:news.updatedAt||news.generatedAt||news.checked_at||null},
  controls:{
    canonicalPortal:'https://gnk-asg.hr',
    author:'Nermin Sefić',
    authorProfile:'/nermin-sefic/',
    authorImage:'/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp',
    groupEntity:'GNK DINAMO Ltd. USA Group',
    blogChannels:['Blogger','Dev.to','Tumblr','Telegraph']
  }
};
fs.mkdirSync('artifacts/workforce-supervisor',{recursive:true});
fs.writeFileSync('artifacts/workforce-supervisor/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
