import { topicDiscoveryStreams } from './aktual-rss-topics-v1.mjs';
/**
 * AKTUAL MEDIA: 201 independent local editorial desks.
 * This ONLY plans source research. No LLM, publishing or sitemap mutation.
 */
export const dailyDraftQuota = (country) => country.code === 'HR' ? 50 : 5;
export const dailyTopicTarget = 15;
const goodUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      !url.hash && !!url.hostname && !/^(?:localhost|127\.|10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[01])\.)/.test(url.hostname);
  } catch { return false; }
};
const domain = (s) => goodUrl(s) ? new URL(s).hostname.replace(/^www\./,'') : null;
export function verifyWritingEvidence(packet, country, editor, now = Date.now()) {
  const errors = [];
  if (packet?.schema !== 'aktual-factual-evidence/v1') errors.push('INVALID_SCHEMA');
  if (packet?.country !== country?.slug || packet?.language !== country?.language) errors.push('WRONG_LOCALE');
  const age = (t) => Number.isFinite(Date.parse(t)) && Date.parse(t) <= now + 3600000 && Date.parse(t) >= now - 72 * 3600000;
  if (!editor || packet?.approvedBy !== editor || packet?.approvalScope !== 'drafting-only' ||
      !age(packet?.approvedAt) || !age(packet?.verifiedAt)) errors.push('HUMAN_EVIDENCE_APPROVAL_REQUIRED');
  const sources = packet?.sources;
  if (!Array.isArray(sources) || sources.length < 2) errors.push('TWO_SOURCES_REQUIRED');
  else {
    const hosts = sources.map(s => domain(s?.url));
    if (hosts.some(h => !h || h === 'news.google.com') || new Set(hosts).size < 2 ||
        sources.some(s => !s.id || !s.publisher || !age(s.checkedAt)) ||
        new Set(sources.map(s=>s.id)).size !== sources.length)
      errors.push('INDEPENDENT_SOURCES_NOT_VERIFIED');
  }
  const facts = packet?.facts;
  if (!Array.isArray(facts) || facts.length < 2) errors.push('VERIFIED_FACTS_REQUIRED');
  else {
    const ids = new Set((sources || []).map(s => s.id));
    if (facts.some(f => typeof f.statement !== 'string' || f.statement.length < 15 ||
        f.statement.length > 300 || !Array.isArray(f.sourceIds) || !f.sourceIds.length ||
        f.sourceIds.some(id => !ids.has(id)))) errors.push('UNSUPPORTED_FACT');
  }
  return {ok:errors.length === 0,errors};
}
export function originalNewsBrief(packet, country, editor, now = Date.now()) {
  const gate = verifyWritingEvidence(packet,country,editor,now);
  if (!gate.ok) throw Error('EVIDENCE_BLOCKED: '+gate.errors.join(','));
  return {
    status:'PRIVATE_DRAFT_ONLY',language:country.language,mayPublish:false,
    systemInstruction:'Write an original accurate newsroom draft in language '+country.language+
      '. Source headlines, full texts, summaries and pictures are RESEARCH LEADS ONLY. Never reproduce or translate them. Use ONLY independently verified facts. No fabricated claims, quotes or interviews, no borrowed photos, no keyword stuffing. If evidence is insufficient, say BLOCKED. Cite sources by original URLs. This is a private draft pending human article approval.',
    facts:packet.facts.map(f=>({fact:f.statement,sourceIds:f.sourceIds})),
    sourceLinks:packet.sources.map(s=>({id:s.id,publisher:s.publisher,url:s.url}))
  };
}
export function planCountryDesks(registry, cache, now = Date.now()) {
  if (!Array.isArray(registry?.countries) || registry.countries.length !== 201)
    throw Error('EXPECTED_201_COUNTRIES');
  const keys = registry.countries.map(c=>c.code);
  if (new Set(keys).size !== 201) throw Error('DUPLICATE_COUNTRY');
  const fresh = cache && Date.parse(cache.updatedAt) >= now - 86400000 &&
    Date.parse(cache.updatedAt) <= now + 3600000 && cache.countries;
  const agents = registry.countries.map(c => {
    if (!c.slug || !c.code || !/^[a-z]{2,3}$/i.test(c.language || '')) throw Error('COUNTRY_CONFIG_INVALID');
    const sourceCatalog = (c.sourcesList || []).filter(s=>goodUrl(s.rss));
    const discovered = [];
    const seen = new Set();
    for (const h of fresh ? (cache.countries[c.slug] || []) : []) {
      const t=Date.parse(h.publishedAt);
      if (!goodUrl(h.url) || !h.title || !Number.isFinite(t) ||
          t < now-72*3600000 || t > now+3600000 || seen.has(h.url)) continue;
      seen.add(h.url);
      discovered.push({topicHeadline:h.title,source:h.source,sourceUrl:h.url,
        publishedAt:h.publishedAt,evidenceVerified:false,imageRightsVerified:false});
      if(discovered.length===15)break;
    }
    return {
      agentId:'original-desk-'+c.slug,country:c.nameLocal,countryCode:c.code,lang:c.language,
      route:c.url,registeredRssSources:sourceCatalog.length,additionalRssSourcesNeeded:Math.max(0,15-sourceCatalog.length),
      topicTarget:15,availableThematicDiscoveryStreams:topicDiscoveryStreams(c),
      draftTarget:dailyDraftQuota(c),unverifiedTopicLeads:discovered,
      missingTopicLeads:15-discovered.length,verifiedPackets:0,published:0,
      status:'RESEARCH_ONLY_NOT_PUBLISHED'
    };
  });
  return {
    schema:'aktual-201-local-editorial-desks/v1',generatedAt:new Date(now).toISOString(),
    policy:'Verified source topics, independent original writing, human review, no automatic copying or publication',
    countries:agents.length,plannedDailyDrafts:agents.reduce((n,a)=>n+a.draftTarget,0),
    totalRegisteredFeedSlots:agents.reduce((n,a)=>n+a.registeredRssSources,0),
    thematicAggregatorStreams:agents.reduce((n,a)=>n+a.availableThematicDiscoveryStreams.length,0),
    countriesBelow15Sources:agents.filter(a=>a.additionalRssSourcesNeeded>0).length,
    countriesWith15Topics:agents.filter(a=>a.unverifiedTopicLeads.length>=15).length,
    published:0,releaseApproved:false,agents
  };
}
