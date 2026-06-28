import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root=path.resolve(import.meta.dirname,'..');
const configPath=process.env.EMAIL_ROUTING_CONFIG||path.join(root,'config/email-routing-worker-rules-v1.json');
const config=JSON.parse(await fs.readFile(configPath,'utf8'));
const token=process.env.CLOUDFLARE_API_TOKEN||'';
const zoneId=process.env.CLOUDFLARE_ZONE_ID||'';
const apply=process.env.APPLY_EMAIL_ROUTING==='true';
const allowReplace=process.env.ALLOW_REPLACE_EXISTING_EMAIL_RULES==='true';

if(!token)throw new Error('CLOUDFLARE_API_TOKEN is required.');
if(!zoneId)throw new Error('CLOUDFLARE_ZONE_ID is required.');
if(!Array.isArray(config.addresses)||config.addresses.length!==10)throw new Error('Exactly ten explicit mailbox addresses are required.');
if(new Set(config.addresses).size!==config.addresses.length)throw new Error('Mailbox addresses must be unique.');
if(!config.worker)throw new Error('Worker name is required.');

const base=`https://api.cloudflare.com/client/v4/zones/${zoneId}/email/routing/rules`;
const headers={authorization:`Bearer ${token}`,'content-type':'application/json'};

async function api(url,options={}){
  const response=await fetch(url,{...options,headers:{...headers,...options.headers}});
  const payload=await response.json().catch(()=>({success:false,errors:[{message:`HTTP ${response.status}`}]}));
  if(!response.ok||payload.success===false){
    const detail=(payload.errors||[]).map(item=>item.message).filter(Boolean).join('; ')||`HTTP ${response.status}`;
    throw new Error(detail);
  }
  return payload;
}

function literalAddress(rule){
  const matcher=(rule.matchers||[]).find(item=>item?.type==='literal'&&item?.field==='to');
  return String(matcher?.value||'').toLowerCase();
}

function hasDesiredAction(rule){
  return(rule.actions||[]).some(action=>action?.type==='worker'&&Array.isArray(action.value)&&action.value.includes(config.worker));
}

function desired(address){
  return{
    actions:[{type:'worker',value:[config.worker]}],
    matchers:[{type:'literal',field:'to',value:address}],
    enabled:Boolean(config.enabledOnApply),
    name:`GNK ASG Worker Intake · ${address}`
  };
}

const listing=await api(`${base}?page=1&per_page=50`,{method:'GET'});
const existing=Array.isArray(listing.result)?listing.result:[];
const operations=[];

for(const rawAddress of config.addresses){
  const address=String(rawAddress).trim().toLowerCase();
  const rule=existing.find(item=>literalAddress(item)===address);
  if(!rule){
    operations.push({type:'create',address,body:desired(address)});
    continue;
  }
  if(hasDesiredAction(rule)&&Boolean(rule.enabled)===Boolean(config.enabledOnApply)){
    operations.push({type:'unchanged',address,id:rule.id});
    continue;
  }
  if(!hasDesiredAction(rule)&&!allowReplace){
    operations.push({type:'conflict',address,id:rule.id,actions:rule.actions||[]});
    continue;
  }
  operations.push({type:'update',address,id:rule.id,body:desired(address)});
}

const conflicts=operations.filter(item=>item.type==='conflict');
console.log(JSON.stringify({version:config.version,zone:config.zone,worker:config.worker,apply,allowReplace,operations},null,2));
if(conflicts.length)throw new Error(`Existing non-worker rules found for: ${conflicts.map(item=>item.address).join(', ')}. Set ALLOW_REPLACE_EXISTING_EMAIL_RULES=true only after review.`);

if(!apply){
  console.log('Dry run only. No Email Routing rule was changed.');
  process.exit(0);
}

for(const operation of operations){
  if(operation.type==='create'){
    await api(base,{method:'POST',body:JSON.stringify(operation.body)});
    console.log(`Created ${operation.address}`);
  }else if(operation.type==='update'){
    await api(`${base}/${operation.id}`,{method:'PUT',body:JSON.stringify(operation.body)});
    console.log(`Updated ${operation.address}`);
  }
}

const verified=await api(`${base}?page=1&per_page=50`,{method:'GET'});
const finalRules=Array.isArray(verified.result)?verified.result:[];
const missing=config.addresses.filter(address=>{
  const rule=finalRules.find(item=>literalAddress(item)===address.toLowerCase());
  return!rule||!rule.enabled||!hasDesiredAction(rule);
});
if(missing.length)throw new Error(`Routing verification failed for: ${missing.join(', ')}`);
console.log(`Verified ${config.addresses.length} explicit Email Routing rules.`);
