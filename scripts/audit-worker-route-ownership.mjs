import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve('workers');
const REPORT=path.resolve('artifacts/worker-route-ownership.json');
const EXTERNAL_REGISTRY=path.resolve('config/control-plane/external-workers-v1.json');
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

const external=fs.existsSync(EXTERNAL_REGISTRY)?JSON.parse(fs.readFileSync(EXTERNAL_REGISTRY,'utf8')):{workers:[]};
const managedExternal=new Set((external.workers||[]).filter(x=>x?.managed===true).map(x=>String(x.name||'').trim()).filter(Boolean));

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
const allDuplicateRoutes=[...routeOwners.entries()].filter(([,owners])=>owners.length>1).map(([route,owners])=>({route,owners}));

const approvedDeployConfigs=configs.filter(config=>config.approvedDeployConfig);
const approvedRouteOwners=new Map();
for(const config of approvedDeployConfigs)for(const route of config.routes){const list=approvedRouteOwners.get(route)||[];list.push(config.file);approvedRouteOwners.set(route,list)}
const activeDuplicateRoutes=[...approvedRouteOwners.entries()].filter(([,owners])=>owners.length>1).map(([route,owners])=>({route,owners}));
const dormantDuplicateRoutes=allDuplicateRoutes.filter(item=>!item.owners.some(owner=>APPROVED_DEPLOY_CONFIGS.has(owner)));

const missingApprovedDeployConfigs=[...APPROVED_DEPLOY_CONFIGS].filter(file=>!configs.some(config=>config.file===file));
const workerNames=[...new Set(configs.map(x=>x.name).filter(Boolean))];
const unmanagedKnownWorkers=KNOWN_EXTERNAL.filter(name=>!managedExternal.has(name));

const directOperator=configs.filter(x=>x.name==='gnk-asg-direct-operator'||x.file.includes('gnk-asg-direct-operator/'));
const directOperatorAllConfigsRouteLess=directOperator.length>0&&directOperator.every(x=>x.routeLess);
const directOperatorApprovedConfigs=directOperator.filter(x=>x.approvedDeployConfig);
const directOperatorApprovedConfigsRouteLess=directOperatorApprovedConfigs.length>0&&directOperatorApprovedConfigs.every(x=>x.routeLess);
const routefulDormantDirectOperatorConfigs=directOperator.filter(x=>!x.approvedDeployConfig&&!x.routeLess);
const directDeployConfig=configs.find(x=>x.file===DIRECT_DEPLOY_CONFIG)||null;
const directDeployConfigRouteLess=Boolean(directDeployConfig?.routeLess);

const findings=[];
for(const item of dormantDuplicateRoutes)findings.push({severity:'info',code:'DORMANT_CONFIG_ROUTE_CONFLICT',...item,message:'Legacy/dormant declaration only; no approved production deploy config owns this duplicate route.'});
for(const item of activeDuplicateRoutes)findings.push({severity:'error',code:'DUPLICATE_APPROVED_DEPLOY_ROUTE',...item});
for(const file of missingApprovedDeployConfigs)findings.push({severity:'error',code:'APPROVED_DEPLOY_CONFIG_MISSING',file});
for(const name of unmanagedKnownWorkers)findings.push({severity:'error',code:'KNOWN_PRODUCTION_WORKER_NOT_IN_MANAGEMENT_REGISTRY',worker:name});
for(const config of routefulDormantDirectOperatorConfigs)findings.push({severity:'info',code:'DORMANT_DIRECT_OPERATOR_ROUTEFUL_CONFIG',file:config.file,routes:config.routes,message:'Historical routeful config is not an approved production deploy config.'});
if(!directOperatorApprovedConfigsRouteLess)findings.push({severity:'error',code:'DIRECT_OPERATOR_APPROVED_CONFIG_ROUTEFUL',files:directOperatorApprovedConfigs.map(x=>x.file)});
if(!directDeployConfigRouteLess)findings.push({severity:'error',code:'DIRECT_DEPLOY_CONFIG_NOT_ROUTELESS',file:DIRECT_DEPLOY_CONFIG});
if(!directDeployConfig)findings.push({severity:'error',code:'DIRECT_DEPLOY_CONFIG_MISSING',file:DIRECT_DEPLOY_CONFIG});

const report={
  version:'WORKER_ROUTE_OWNERSHIP_AUDIT_V4_20261002_ACTIVE_VS_DORMANT',
  generatedAt:new Date().toISOString(),
  semantics:{
    activeRoutes:'Routes declared by approved production deploy configs only.',
    dormantRoutes:'Routes declared only by non-approved legacy/review configs; tracked as migration debt, not production ownership.',
    directOperatorSafety:'Fail-closed is evaluated against approved production deploy configs. Historical routeful configs remain visible as dormant debt.'
  },
  summary:{
    configs:configs.length,
    workerNames:workerNames.length,
    declaredRoutesAllConfigs:[...routeOwners.keys()].length,
    allDuplicateRoutes:allDuplicateRoutes.length,
    activeDeclaredRoutes:[...approvedRouteOwners.keys()].length,
    activeDuplicateRoutes:activeDuplicateRoutes.length,
    dormantDuplicateRoutes:dormantDuplicateRoutes.length,
    approvedDeployConfigs:approvedDeployConfigs.length,
    missingApprovedDeployConfigs:missingApprovedDeployConfigs.length,
    knownExternalWorkers:KNOWN_EXTERNAL.length,
    managedExternalWorkers:KNOWN_EXTERNAL.filter(name=>managedExternal.has(name)).length,
    unmanagedKnownWorkers:unmanagedKnownWorkers.length,
    directOperatorAllConfigsRouteLess,
    directOperatorApprovedConfigsRouteLess,
    directDeployConfigRouteLess
  },
  directDeployConfig,
  approvedDeployConfigs,
  activeDuplicateRoutes,
  dormantDuplicateRoutes,
  unmanagedKnownWorkers,
  routefulDormantDirectOperatorConfigs,
  findings
};

fs.mkdirSync(path.dirname(REPORT),{recursive:true});
fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary,null,2));
if(
  !configs.length||
  !directDeployConfig||
  missingApprovedDeployConfigs.length||
  activeDuplicateRoutes.length||
  unmanagedKnownWorkers.length||
  !directOperatorApprovedConfigsRouteLess||
  !directDeployConfigRouteLess
){
  console.error('Approved production Worker route ownership is invalid.');
  process.exit(1);
}
