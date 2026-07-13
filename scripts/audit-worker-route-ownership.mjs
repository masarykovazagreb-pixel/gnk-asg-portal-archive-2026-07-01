import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve('workers');
const REPORT=path.resolve('artifacts/worker-route-ownership.json');
const KNOWN_EXTERNAL=['gnk-asg-news-backend'];

const walk=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const p=path.join(dir,entry.name);return entry.isDirectory()?walk(p):[p]}):[];
const files=walk(ROOT).filter(p=>/^wrangler(?:\..+)?\.toml$/i.test(path.basename(p)));
const quoted=(raw,key)=>raw.match(new RegExp(`^\\s*${key}\\s*=\\s*["']([^"']+)["']\\s*$`,'m'))?.[1]||'';
const arrays=(raw,key)=>{const m=raw.match(new RegExp(`^\\s*${key}\\s*=\\s*\\[([\\s\\S]*?)\\]`,'m'));return m?[...m[1].matchAll(/["']([^"']+)["']/g)].map(x=>x[1]):[]};
const objectPatterns=raw=>[...raw.matchAll(/pattern\s*=\s*["']([^"']+)["']/g)].map(x=>x[1]);

const configs=files.map(file=>{
  const raw=fs.readFileSync(file,'utf8');
  const name=quoted(raw,'name');
  const main=quoted(raw,'main');
  const routes=[...new Set([...arrays(raw,'routes'),...objectPatterns(raw)])];
  const routeLess=routes.length===0;
  const relative=path.relative('.',file).split(path.sep).join('/');
  return{file:relative,name,main,routes,routeLess};
});

const routeOwners=new Map();
for(const config of configs)for(const route of config.routes){const list=routeOwners.get(route)||[];list.push(config.file);routeOwners.set(route,list)}
const duplicateRoutes=[...routeOwners.entries()].filter(([,owners])=>owners.length>1).map(([route,owners])=>({route,owners}));
const workerNames=[...new Set(configs.map(x=>x.name).filter(Boolean))];
const unmanagedKnownWorkers=KNOWN_EXTERNAL.filter(name=>!workerNames.includes(name));
const directOperator=configs.filter(x=>x.name==='gnk-asg-direct-operator'||x.file.includes('gnk-asg-direct-operator/'));
const directOperatorRouteLess=directOperator.length>0&&directOperator.every(x=>x.routeLess);
const findings=[];
for(const item of duplicateRoutes)findings.push({severity:'warning',code:'DUPLICATE_DECLARED_ROUTE',...item});
for(const name of unmanagedKnownWorkers)findings.push({severity:'warning',code:'KNOWN_PRODUCTION_WORKER_NOT_MANAGED_IN_REPO',worker:name});
if(directOperatorRouteLess)findings.push({severity:'warning',code:'DIRECT_OPERATOR_ROUTELESS',message:'Direct operator deploy cannot take ownership of a conflicting public route by itself.'});

const report={version:'WORKER_ROUTE_OWNERSHIP_AUDIT_V1_20260713',generatedAt:new Date().toISOString(),summary:{configs:configs.length,workerNames:workerNames.length,declaredRoutes:[...routeOwners.keys()].length,duplicateRoutes:duplicateRoutes.length,unmanagedKnownWorkers:unmanagedKnownWorkers.length,directOperatorRouteLess},configs,duplicateRoutes,unmanagedKnownWorkers,findings};
fs.mkdirSync(path.dirname(REPORT),{recursive:true});fs.writeFileSync(REPORT,JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if(!configs.length){console.error('No wrangler configuration files found.');process.exit(1)}
