export const CONTENT_SOURCE_POLICY_VERSION='GNK_ASG_CONTENT_SOURCE_POLICY_V1_20260719';

export const CONTENT_SOURCE_CLASSES=Object.freeze([
 'first-party',
 'official-api',
 'official-feed',
 'licensed-external',
 'external-publisher-link'
]);

const EXTERNAL_CLASSES=new Set(CONTENT_SOURCE_CLASSES.filter(value=>value!=='first-party'));
const AUTOMATED_OFFICIAL_CLASSES=new Set(['official-api','official-feed']);
const clean=value=>String(value??'').trim();
const validIso=value=>{const text=clean(value);return text&&Number.isFinite(Date.parse(text))?new Date(text).toISOString():null};
const validHttpUrl=value=>{const text=clean(value);if(!text)return'';try{const url=new URL(text);return ['http:','https:'].includes(url.protocol)?url.toString().slice(0,2000):''}catch{return''}};

function normalizeRatePolicy(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const maxRequests=Math.floor(Number(value.maxRequests));
 const windowSeconds=Math.floor(Number(value.windowSeconds));
 const cacheTtlSeconds=Math.floor(Number(value.cacheTtlSeconds));
 if(!Number.isFinite(maxRequests)||maxRequests<1||!Number.isFinite(windowSeconds)||windowSeconds<1)return null;
 return{
  maxRequests,
  windowSeconds,
  cacheTtlSeconds:Number.isFinite(cacheTtlSeconds)&&cacheTtlSeconds>=0?cacheTtlSeconds:0,
  enforcement:'central-worker'
 };
}

export function buildContentProvenance(input={},context={}){
 const category=clean(context.category||input.category||'first-party');
 const originalUrl=validHttpUrl(context.sourceUrl||input.sourceUrl);
 const inferredClass=originalUrl?'external-publisher-link':'first-party';
 const sourceClass=clean(input.sourceClass||inferredClass).toLowerCase();
 const sourceName=clean(input.sourceName||(sourceClass==='first-party'?'GNK ASG':'')).slice(0,160);
 const termsUrl=validHttpUrl(input.sourceTermsUrl||input.termsUrl);
 const licenseId=clean(input.sourceLicense||input.licenseId).slice(0,120);
 const accessTier=clean(input.sourceAccessTier||input.accessTier).toLowerCase().slice(0,40);
 const termsVerifiedAt=validIso(input.sourceTermsVerifiedAt||input.termsVerifiedAt);
 const sourcePublishedAt=validIso(input.sourcePublishedAt||input.publishedAt);
 const retrievedAt=validIso(input.retrievedAt)||validIso(context.at)||new Date().toISOString();
 const ratePolicy=normalizeRatePolicy(input.sourceRatePolicy||input.ratePolicy);
 const errors=[],flags=[];
 if(!CONTENT_SOURCE_CLASSES.includes(sourceClass))errors.push('invalid-source-class');
 const external=EXTERNAL_CLASSES.has(sourceClass);
 if(external&&!originalUrl)errors.push('external-source-url-required');
 if(external&&!sourceName)errors.push('external-source-name-required');
 if(clean(input.sourcePublishedAt||input.publishedAt)&&!sourcePublishedAt)flags.push('source-published-at-review');
 if(AUTOMATED_OFFICIAL_CLASSES.has(sourceClass)){
  if(accessTier!=='free')flags.push('official-free-tier-required');
  if(!termsUrl||!licenseId||!termsVerifiedAt)flags.push('official-terms-review');
  if(!ratePolicy)flags.push('official-rate-policy-required');
 }
 if(sourceClass==='licensed-external'&&(!termsUrl||!licenseId||!termsVerifiedAt))flags.push('external-license-review');
 if(sourceClass==='external-publisher-link')flags.push('external-publisher-manual-review');
 const isSourceSummary=category.startsWith('source-summary-');
 if(isSourceSummary&&!external)errors.push('source-summary-external-source-required');
 const autoEligible=errors.length===0&&flags.length===0&&(sourceClass==='first-party'||AUTOMATED_OFFICIAL_CLASSES.has(sourceClass)||sourceClass==='licensed-external');
 const provenance={
  policyVersion:CONTENT_SOURCE_POLICY_VERSION,
  sourceClass,
  sourceName,
  originalUrl,
  sourcePublishedAt,
  retrievedAt,
  termsUrl,
  licenseId,
  accessTier:accessTier||null,
  usageBasis:clean(input.usageBasis||(sourceClass==='first-party'?'first-party-original':'original-summary-with-link')).slice(0,120),
  ratePolicy,
  attributionRequired:external,
  autoEligible
 };
 return{provenance,errors,flags:[...new Set(flags)],autoEligible};
}

export function provenanceReviewFlags(provenance){
 if(!provenance||provenance.policyVersion!==CONTENT_SOURCE_POLICY_VERSION)return['source-provenance-required'];
 return provenance.autoEligible?[]:['source-policy-review'];
}
