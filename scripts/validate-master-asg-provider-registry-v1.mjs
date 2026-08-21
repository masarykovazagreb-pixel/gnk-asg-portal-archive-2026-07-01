import fs from 'node:fs';

const path='config/master-asg-provider-registry-v1.json';
const registry=JSON.parse(fs.readFileSync(path,'utf8'));
const fail=(message)=>{throw new Error(`MASTER_ASG_PROVIDER_REGISTRY_INVALID: ${message}`)};
const principles=registry.principles||{};
for(const key of ['noImplicitExternalAuthority','publicOrAuthorizedOnly','noSecretsInRepository','mockProvidersNeverProduceExternalSideEffects','mockProvidersNeverSatisfyProductionFreshness','failClosedWhenAllProvidersUnhealthy','provenanceRequired','independentOriginDeduplication']){
  if(principles[key]!==true) fail(`principle ${key} must be true`);
}
const weights=registry.scoring?.weights||{};
const weightTotal=Object.values(weights).reduce((sum,value)=>sum+Number(value||0),0);
if(Math.abs(weightTotal-1)>1e-9) fail(`scoring weights must sum to 1, got ${weightTotal}`);
if(registry.scoring?.formula!=='quality*freshness*reliability*latency*cost') fail('unexpected scoring formula');
const health=registry.healthPolicy||{};
if(Number(health.quarantineAfterConsecutiveFailures)<3) fail('quarantine threshold too permissive');
if(Number(health.recoverySuccessesRequired)<2) fail('recovery requires at least two successes');
if(Number(health.automaticRetries)>2) fail('automatic retry cap must not exceed 2');
const providers=registry.testProviders||[];
const ids=new Set();
for(const provider of providers){
  if(!provider.id||ids.has(provider.id)) fail(`duplicate or missing provider id ${provider.id||''}`);
  ids.add(provider.id);
  if(provider.mode!=='test-only') fail(`${provider.id} must remain test-only`);
  if(provider.kind!=='deterministic-mock') fail(`${provider.id} must be deterministic-mock`);
  if(provider.sideEffects!==false) fail(`${provider.id} may not have external side effects`);
  if(!provider.fixture||provider.fixture.status!=='healthy') fail(`${provider.id} missing healthy deterministic fixture`);
  for(const metric of ['quality','reliability','cost']){
    const value=Number(provider.fixture[metric]);
    if(!(value>=0&&value<=1)) fail(`${provider.id} invalid ${metric}`);
  }
  if(Number(provider.fixture.ageSeconds)<0||Number(provider.fixture.latencyMs)<0) fail(`${provider.id} invalid freshness/latency`);
}
for(const required of ['mock-weather-primary','mock-weather-fallback','mock-market-primary','mock-intel-primary','mock-publication-sink']){
  if(!ids.has(required)) fail(`missing required mock provider ${required}`);
}
const routes=registry.routingContracts||[];
for(const route of routes){
  if(!route.domain||!route.strategy) fail('routing contract missing domain/strategy');
  if(!Array.isArray(route.providers)||route.providers.length===0) fail(`${route.domain} route has no providers`);
  for(const id of route.providers) if(!ids.has(id)) fail(`${route.domain} route references unknown provider ${id}`);
  if(!route.onAllUnavailable) fail(`${route.domain} route missing fail-closed fallback`);
}
const weather=routes.find(route=>route.domain==='weather');
if(weather?.testExpectedPrimary!=='mock-weather-primary') fail('weather deterministic primary expectation missing');
if(weather?.providers?.[1]!=='mock-weather-fallback') fail('weather fallback ordering missing');
const publication=routes.find(route=>route.domain==='publication');
if(publication?.strategy!=='single-writer-exact-sha') fail('publication route must require single-writer exact-SHA');
if(publication?.onAllUnavailable!=='queue-only') fail('publication fail-closed behavior must be queue-only');
const intel=routes.find(route=>route.domain==='intelligence');
if(intel?.strategy!=='independent-source-fusion') fail('intelligence route must preserve source independence');
if(intel?.onAllUnavailable!=='insufficient-evidence') fail('intelligence route must fail as insufficient-evidence');
console.log(`MASTER_ASG_PROVIDER_REGISTRY_OK providers=${providers.length} routes=${routes.length} weightTotal=${weightTotal}`);
