// 201 country agents plus nine deterministic network roles, executed in one process.
// Outputs are internal leads, never verified facts or publication authorizations.
import {masterAgent} from './coordinator-v1.mjs';
import {safeUrl} from '../../../scripts/lib/aktual-world-feed-http-v1.mjs';

export function runFleet(registry, cache, {now=Date.now(), slug=null}={}) {
 const report=masterAgent(registry,cache,{now,slug});
 const countries=report.countries;
 const drafts=countries.flatMap(country=>country.briefs.map(lead=>({
  country:country.slug, language:country.language,
  // No invented prose: an attributed headline is a lead, not an original article.
  headline:lead.headline, source:lead.source, url:lead.url, publishedAt:lead.publishedAt,
  kind:'source-linked-lead', status:'review-required', checksRequired:[...lead.checksRequired]
 })));
 const fresh=countries.filter(c=>c.cacheStatus==='fresh').length;
 const labels=countries.filter(c=>c.deskBot.distinctSourceLabels>=2).length;
 const allSafe=drafts.every(d=>safeUrl(d.url) && d.headline && d.source && Number.isFinite(Date.parse(d.publishedAt)));
 const make=(id,task,status,details)=>({id,task,execution:'completed',status,details});
 // Status describes the data, not whether a check executed or whether a source has rights.
 const networkAgents=[
  make('registry','Validate configured edition scope','ok',{configured:registry.countries.length,processed:countries.length}),
  make('freshness','Measure fresh country caches',fresh===countries.length?'ok':'attention',{fresh,missingOrStale:countries.length-fresh}),
  make('source-safety','Check lead URL and required attribution',!drafts.length?'empty':allSafe?'ok':'blocked',{checked:drafts.length,notFactOrRightsVerification:true}),
  make('diversity','Count editions with at least two source labels',labels===countries.length?'ok':'attention',{editions:labels,labelsAreNotOwnershipProof:true}),
  make('lead-writer','Prepare attributed source-linked leads',drafts.length?'attention':'empty',{leads:drafts.length,originalArticles:0}),
  make('rights','Identify rights and fact checks still required','blocked',{leadsRequiringReview:drafts.length}),
  make('publication','Enforce no automatic publication or approval','blocked',{approved:0,published:0}),
  make('coverage','Measure editions with candidates',report.summary.withCandidates===countries.length?'ok':'attention',{...report.summary}),
  make('supervisor','Summarize this run and distinguish execution from production','attention',{scope:report.scope,liveStatus:'not-checked'})
 ];
 return {version:'AKTUAL_WORLD_FLEET_V1',generatedAt:report.generatedAt,scope:report.scope,
  configuredAgents:210,executedAgents:countries.length+networkAgents.length,
  agentsAre:'201 country roles plus 9 network roles in one deterministic process; not independent services or people',
  publication:'not-approved',automaticArticlePublishing:false,
  countryAgents:countries,networkAgents,drafts};
}
