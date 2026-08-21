import fs from 'node:fs';

function providerRuntime(provider, telemetry = {}) {
  return {...(provider.fixture || {}), ...(telemetry[provider.id] || {})};
}

export function normalizedScore(provider, registry, telemetry = {}) {
  const f = providerRuntime(provider, telemetry);
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

export function providerHealth(provider, registry, telemetry = {}) {
  const f = providerRuntime(provider, telemetry);
  const failures = Number(f.consecutiveFailures || 0);
  const age = Number(f.ageSeconds || 0);
  if (f.status === 'down' || f.status === 'quarantined' || failures >= Number(registry.healthPolicy?.quarantineAfterConsecutiveFailures || 3)) return 'quarantined';
  if (age > Number(registry.healthPolicy?.stale?.maxAgeSeconds || 7200)) return 'stale';
  if (failures > Number(registry.healthPolicy?.degraded?.maxConsecutiveFailures || 2) || age > Number(registry.healthPolicy?.degraded?.maxAgeSeconds || 1800)) return 'degraded';
  return 'healthy';
}

export function selfHealPlan(provider, registry, telemetry = {}) {
  const f = providerRuntime(provider, telemetry);
  const health = providerHealth(provider, registry, telemetry);
  const failures = Number(f.consecutiveFailures || 0);
  const automaticRetries = Number(registry.healthPolicy?.automaticRetries || 0);
  if (health === 'quarantined') return {provider:provider.id, action:'quarantine', retriesRemaining:0, reason:'failure-threshold-or-explicit-down'};
  if (health === 'stale') return {provider:provider.id, action:'failover', retriesRemaining:0, reason:'freshness-threshold-exceeded'};
  if (failures > 0 && failures <= automaticRetries) return {provider:provider.id, action:'retry', retriesRemaining:Math.max(0, automaticRetries - failures), backoff:registry.healthPolicy?.retryBackoff || 'exponential'};
  if (health === 'degraded') return {provider:provider.id, action:'failover', retriesRemaining:0, reason:'degraded-after-retry-budget'};
  return {provider:provider.id, action:'keep', retriesRemaining:automaticRetries};
}

export function routeProvider(registry, domain, {production = false, telemetry = {}} = {}) {
  const route = (registry.routingContracts || []).find(r => r.domain === domain);
  if (!route) return {domain, state:'blocked', reason:'unknown-domain', provider:null};
  const providers = new Map((registry.testProviders || []).map(p => [p.id, p]));
  const evaluated = (route.providers || []).map(id => providers.get(id)).filter(Boolean).map(provider => ({
    provider,
    health: providerHealth(provider, registry, telemetry),
    score: normalizedScore(provider, registry, telemetry),
    selfHeal: selfHealPlan(provider, registry, telemetry)
  }));
  const candidates = evaluated.filter(x => !['quarantined','down','stale'].includes(x.health));

  if (production && registry.principles?.mockProvidersNeverSatisfyProductionFreshness) {
    return {domain, state:'blocked', reason:'test-providers-not-production-eligible', provider:null, fallback:route.onAllUnavailable, evaluated:evaluated.map(({provider,...x}) => ({provider:provider.id,...x}))};
  }

  const minimum = Number(registry.scoring?.minimumProductionScore || 0);
  const eligible = candidates.filter(x => x.score >= minimum).sort((a,b) => b.score - a.score);
  if (!eligible.length) return {domain, state:'degraded', reason:'no-healthy-provider-above-threshold', provider:null, fallback:route.onAllUnavailable, evaluated:evaluated.map(({provider,...x}) => ({provider:provider.id,...x}))};
  const selected = eligible[0];
  return {domain, state:selected.health === 'healthy' ? 'ready' : 'degraded', provider:selected.provider.id, score:Number(selected.score.toFixed(6)), health:selected.health, selfHeal:selected.selfHeal, fallback:route.onAllUnavailable};
}

export function loadRegistry(path='config/master-asg-provider-registry-v1.json') {
  return JSON.parse(fs.readFileSync(path,'utf8'));
}

if (process.argv[1]?.endsWith('master-asg-provider-router-v1.mjs')) {
  const registry = loadRegistry();
  const checks = ['weather','market','intelligence','publication'].map(domain => routeProvider(registry, domain));
  const weather = checks.find(x => x.domain === 'weather');
  if (weather?.provider !== 'mock-weather-primary') throw new Error(`provider router expected mock-weather-primary, got ${weather?.provider}`);

  const failoverWeather = routeProvider(registry, 'weather', {telemetry:{
    'mock-weather-primary': {status:'down', consecutiveFailures:3},
    'mock-weather-fallback': {status:'healthy', consecutiveFailures:0, ageSeconds:45}
  }});
  if (failoverWeather.provider !== 'mock-weather-fallback') throw new Error(`provider failover expected mock-weather-fallback, got ${failoverWeather.provider}`);

  const retryPlan = selfHealPlan((registry.testProviders || []).find(p => p.id === 'mock-market-primary'), registry, {
    'mock-market-primary': {status:'healthy', consecutiveFailures:1, ageSeconds:20}
  });
  if (retryPlan.action !== 'retry' || retryPlan.retriesRemaining !== 1) throw new Error('self-heal retry budget contract failed');

  const quarantinedPlan = selfHealPlan((registry.testProviders || []).find(p => p.id === 'mock-intel-primary'), registry, {
    'mock-intel-primary': {status:'down', consecutiveFailures:3}
  });
  if (quarantinedPlan.action !== 'quarantine') throw new Error('self-heal quarantine contract failed');

  const productionWeather = routeProvider(registry, 'weather', {production:true});
  if (productionWeather.state !== 'blocked') throw new Error('mock provider must fail closed in production mode');
  for (const check of checks) if (!check.fallback) throw new Error(`missing fallback result for ${check.domain}`);
  console.log(JSON.stringify({status:'MASTER_ASG_PROVIDER_ROUTER_OK', checks, failoverWeather, retryPlan, quarantinedPlan, productionWeather}));
}
