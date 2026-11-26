// Country coverage audit: configuration is not proof of access, licensing or facts.
const host=value=>{try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return '';return u.hostname.toLowerCase().replace(/^www\./,'')}catch{return ''}};
const normalizeLanguage=value=>String(value||'').toLowerCase()==='srp'?'sr':String(value||'').toLowerCase();
export function sourceCoverage(registry,cache,{slug=null,now=Date.now()}={}){
 if(!Array.isArray(registry?.countries))throw Error('Missing country registry');
 const countries=registry.countries.filter(c=>!slug||c.slug===slug);
 if(!countries.length||new Set(countries.map(c=>c.slug)).size!==countries.length)throw Error('Invalid country scope');
 const editions=countries.map(c=>{
  const language=normalizeLanguage(c.language);
  const stamp=cache?.scopeUpdatedAt?.countries?.[c.slug]??(!cache?.scopeUpdatedAt?cache?.updatedAt:null);
  const age=now-Date.parse(stamp);
  const fresh=Number.isFinite(age)&&age>=0&&age<24*3600000;
  const checks=Array.isArray(cache?.sourceChecks)?cache.sourceChecks.filter(x=>x.kind==='country'&&x.scope===c.slug):[];
  const feeds=(c.sourcesList||[]).map(s=>{
   const domain=host(s.rss);
   const matching=checks.filter(x=>x.source===s.name);
   // Old diagnostics lack feed identity. A shared source label must not verify a specific URL.
   const sameLabel=(c.sourcesList||[]).filter(x=>x.name===s.name).length;
   const exact=matching.filter(x=>x.feedId===s.id);
   const check=exact.length===1?exact[0]:sameLabel===1&&matching.length===1?matching[0]:null;
   return {id:s.id,name:s.name,domain,kind:!domain?'invalid':domain==='news.google.com'?'aggregator':'direct',
    nativeLanguage:normalizeLanguage(s.language)===language,
    observation:fresh&&check?check.status:'unverified',
    rightsStatus:'unverified',factVerification:'not-performed'};
  });
  const direct=feeds.filter(f=>f.kind==='direct'&&f.nativeLanguage);
  const uniqueDirectDomains=new Set(direct.map(f=>f.domain)).size;
  const observedDirect=direct.filter(f=>f.observation==='headlines');
  const gap=Math.max(0,5-uniqueDirectDomains);
  const roles={agentId:'country:'+c.slug,language,editionUrl:c.url,
    sourceDiscovery:'discover-local-publishers-public-institutions-and-specialist-sources',
    editor:'select-and-verify-topics-in-local-language',
    writer:'original-article-after-fact-and-rights-check',
    publisher:'submit-to-existing-authorized-single-writer',
    execution:'configured-responsibility-not-independent-service',
    productionPublication:'unverified'};
  return {slug:c.slug,language,configuredFeeds:feeds.length,directFeeds:direct.length,
    uniqueDirectDomains,aggregatorFeeds:feeds.filter(f=>f.kind==='aggregator').length,
    observedDirectHeadlines:observedDirect.length,discoveryGapToFive:gap,feeds,roles,
    discoveryPriority:uniqueDirectDomains===0?'P0':gap>0?'P1':'P2',
    researchRequired:['publisher homepage and official feed','freshness and language','terms and rights','ownership independence','topic-level corroboration']};
 });
 return {version:'AKTUAL_WORLD_SOURCE_COVERAGE_V1',editionCount:editions.length,
  configuredFeeds:editions.reduce((a,c)=>a+c.configuredFeeds,0),
  directFeeds:editions.reduce((a,c)=>a+c.directFeeds,0),
  editionsWithoutDirect:editions.filter(c=>!c.directFeeds).length,
  editionsWithObservedDirect:editions.filter(c=>c.observedDirectHeadlines>0).length,
  sourceRightsVerified:0,productionPublicationsVerified:0,
  editions:editions.sort((a,b)=>a.discoveryPriority.localeCompare(b.discoveryPriority)||a.slug.localeCompare(b.slug))};
}
