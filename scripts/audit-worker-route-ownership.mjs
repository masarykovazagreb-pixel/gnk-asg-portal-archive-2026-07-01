import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve('workers');
const REPORT=path.resolve('artifacts/worker-route-ownership.json');
const KNOWN_EXTERNAL=['gnk-asg-news-backend'];
const DIRECT_DEPLOY_CONFIG='workers/gnk-asg-direct-operator/wrangler.workforce-production-no-routes.toml';
const APPROVED_DEPLOY_CONFIGS=new Set([
  'workers/gnk-asg-contact-api-worker/wrangler.no-routes.toml',
  DIRECT_DEPLOY_CONFIG,
  'workers/gnk-asg-operator-center/wrangler.toml'
]);

const walk=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const p=path.join(dir,entry.name);return entry.isDirectory()?walk(p):[p]}):[];
const files=walk(ROOT).filter(p=>/^wrangler(?:\..+)?\.toml$/i.test(path.basename(p)));
const quoted=(raw,key)=>raw.match(new RegExp(`^\\s*${key}\\s*=\\s*["']([^"']+)["']\\s*$`,'m'))?.[1]||'';
const stringRoutes=raw=>{const m=raw.match(/^\s*routes\s*=\s*\[([\s\S]*?)\]/m);return m?[...m[1].matchAll(/(?:^|,)\s*["']([^"']+)["']\s*(?=,|$)/gm)].map(x=>x[1]):[]};
const objectPatterns=raw=>[...raw.matchAll(/pattern\s*=\s*["']([^"']+)["']/g)].map(x=>x[1]);

const configs=files.map(file=>{
  const raw=fs.readFileSync(file,'utf8');
  const name=quoted(raw,'name');
  const main=quoted(raw,'main');
  const routes=[...new Set([...stringRoutes(raw),...objectPatterns(raw)])];
  const routeLess=routes.length===0;
  const relative=path.relative('.',file).split(path.sep).join('/');
  return{file:relative,name,main,routes,routeLess,approvedDeployConfig:APPROVED_DEPLOY_CONFIGS.has(relative)};
});

const routeOwners=new Map();
for(const config of configs)for(const route of config.routes){const list=routeOwners.get(route)||[];list.push(config.file);routeOwners.set(route,list)}
const duplicateRoutes=[...routeOwners.entries()].filter(([,owners])=>owners.length>1).map(([route,owners])=>({route,owners}));
const approvedDeployConfigs=configs.filter(config=>config.approvedDeployConfig);
const approvedRouteOwners=new Map();
for(const config of approvedDeployConfigs)for(const route of config.routes){const list=approvedRouteOwners.get(route)||[];list.push(config.file);approvedRouteOwners.set(route,list)}
const duplicateApprovedRoutes=[...approvedRouteOwners.entries()].filter(([,owners])=>owners.length>1).map(([route,owners])=>({route,owners}));
const missingApprovedDeployConfigs=[...APPROVED_DEPLOY_CONFIGS].filter(file=>!configs.some(config=>config.file===file));
const workerNames=[...new Set(configs.map(x=>x.name).filter(Boolean))];
const unmanagedKnownWorkers=KNOWN_EXTERNAL.filter(name=>!workerNames.includes(name));
const directOperator=configs.filter(x=>x.name==='gnk-asg-direct-operator'||x.file.includes('gnk-asg-direct-operator/'));
const directOperatorAllConfigsRouteLess=directOperator.length>0&&directOperator.every(x=>x.routeLess);
const directDeployConfig=configs.find(x=>x.file===DIRECT_DEPLOY_CONFIG)||null;
const directDeployConfigRouteLess=Boolean(directDeployConfig?.routeLess);
const findings=[];
for(const item of duplicateRoutes)findings.push({severity:'warning',code:'DORMANT_CONFIG_ROUTE_CONFLICT',...item,message:'Conflict is outside the approved production deploy config set.'});
for(const item of duplicateApprovedRoutes)findings.push({severity:'error',code:'DUPLICATE_APPROVED_DEPLOY_ROUTE',...item});
for(const file of missingApprovedDeployConfigs)findings.push({severity:'error',code:'APPROVED_DEPLOY_CONFIG_MISSING',file});
for(const name of unmanagedKnownWorkers)findings.push({severity:'warning',code:'KNOWN_PRODUCTION_WORKER_NOT_MANAGED_IN_REPO',worker:name});
if(directDeployConfigRouteLess)findings.push({severity:'warning',code:'DIRECT_DEPLOY_CONFIG_ROUTELESS',file:DIRECT_DEPLOY_CONFIG,message:'The approved deploy config is route-less and cannot take ownership of a conflicting public route by itself.'});
if(!directDeployConfig)findings.push({severity:'error',code:'DIRECT_DEPLOY_CONFIG_MISSING',file:DIRECT_DEPLOY_CONFIG});

const report={
  version:'WORKER_ROUTE_OWNERSHIP_AUDIT_V3_20260809_WORKFORCE_PRODUCTION_CONFIG',
  generatedAt:new Date().toISOString(),
  summary:{
    configs:configs.length,
    workerNames:workerNames.length,
    declaredRoutes:[...routeOwners.keys()].length,
    duplicateRoutes:duplicateRoutes.length,
    approvedDeployConfigs:approvedDeployConfigs.length,
    approvedDeclaredRoutes:[...approvedRouteOwners.keys()].length,
    duplicateApprovedRoutes:duplicateApprovedRoutes.length,
    missingApprovedDeployConfigs:missingApprovedDeployConfigs.length,
    unmanagedKnownWorkers:unmanagedKnownWorkers.length,
    directOperatorAllConfigsRouteLess,
    directDeployConfigRouteLess
  },
  directDeployConfig,
  configs,
  duplicateRoutes,
  approvedDeployConfigs,
  duplicateApprovedRoutes,
  missingApprovedDeployConfigs,
  unmanagedKnownWorkers,
  findings
};
fs.mkdirSync(path.dirname(REPORT),{recursive:true});
fs.writeFileSync(REPORT,JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if(!configs.length||!directDeployConfig||missingApprovedDeployConfigs.length||duplicateApprovedRoutes.length){console.error('Approved deployment route ownership is invalid.');process.exit(1)}
