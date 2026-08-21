import fs from 'node:fs';

export function normalizedScore(provider, registry) {
  const f = provider.fixture || {};
  const w = registry.scoring?.weights || {};
  const freshness = Math.max(0, 1 - Number(f.ageSeconds || 0) / Math.max(1, Number(registry.healthPolicy?.stale?.maxAgeSeconds || 7200)));
  const latency = 1 / (1 + Math.max(0, Number(f.latencyMs || 0)) / 1000);
  const values = {
    quality: Number(f.quality || 0),
    freshness,
    reliability: Number(f.reliability || 0),
    latency,
    cost: Number(f.cost || 0)
  };
  return Object.entries(w).reduce((sum, [k, weight]) => sum + Number(weight) * values[k], 0);
}

export function providerHealth(provider, registry) {
  const f = provider.fixture || {};
  const failures = Number(f.consecutiveFailures || 0);
  const age = Number(f.ageSeconds || 0);
  if (f.status === 'down' || f.status === 'quarantined' || failures >= Number(registry.healthPolicy?.quarantineAfterConsecutiveFailures || 3)) return 'quarantined';
  if (age > Number(registry.healthPolicy?.stale?.maxAgeSeconds || 7200)) return 'stale';
  if (failures > Number(registry.healthPolicy?.degraded?.maxConsecutiveFailures || 2) || age > Number(registry.healthPolicy?.degraded?.maxAgeSeconds || 1800)) return 'degraded';
  return 'healthy';
}

export function routeProvider(registry, domain, {production = false} = {}) {
  const route = (registry.routingContracts || []).find(r => r.domain === domain);
  if (!route) return {domain, state:'blocked', reason:'unknown-domain', provider:null};
  const providers = new Map((registry.testProviders || []).map(p => [p.id, p]));
  const candidates = (route.providers || []).map(id => providers.get(id)).filter(Boolean).map(provider => ({
    provider,
    health: providerHealth(provider, registry),
    score: normalizedScore(provider, registry)
  })).filter(x => !['quarantined','down','stale'].includes(x.health));

  if (production && registry.principles?.mockProvidersNeverSatisfyProductionFreshness) {
    return {domain, state:'blocked', reason:'test-providers-not-production-eligible', provider:null, fallback:route.onAllUnavailable};
  }

  const minimum = Number(registry.scoring?.minimumProductionScore || 0);
  const eligible = candidates.filter(x => x.score >= minimum).sort((a,b) => b.score - a.score);
  if (!eligible.length) return {domain, state:'degraded', reason:'no-healthy-provider-above-threshold', provider:null, fallback:route.onAllUnavailable};
  const selected = eligible[0];
  return {domain, state:selected.health === 'healthy' ? 'ready' : 'degraded', provider:selected.provider.id, score:Number(selected.score.toFixed(6)), health:selected.health, fallback:route.onAllUnavailable};
}

export function loadRegistry(path='config/master-asg-provider-registry-v1.json') {
  return JSON.parse(fs.readFileSync(path,'utf8'));
}

if (process.argv[1]?.endsWith('master-asg-provider-router-v1.mjs')) {
  const registry = loadRegistry();
  const checks = ['weather','market','intelligence','publication'].map(domain => routeProvider(registry, domain));
  const weather = checks.find(x => x.domain === 'weather');
  if (weather?.provider !== 'mock-weather-primary') throw new Error(`provider router expected mock-weather-primary, got ${weather?.provider}`);
  const productionWeather = routeProvider(registry, 'weather', {production:true});
  if (productionWeather.state !== 'blocked') throw new Error('mock provider must fail closed in production mode');
  for (const check of checks) if (!check.fallback) throw new Error(`missing fallback result for ${check.domain}`);
  console.log(JSON.stringify({status:'MASTER_ASG_PROVIDER_ROUTER_OK', checks, productionWeather}));
}
