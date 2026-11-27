// Publication gate for an authorized research/writer agent. Evidence is a private
// record, not automatically exposed to readers. This validates record structure,
// not the truth or independence of a source: the editorial agent must check both.
export function checkReady(article,now=Date.now()){
 if(article?.editorial_verified!==true||!article.evidence||article.evidence.factCheck!=="passed"||article.evidence.originality!=="passed"||article.evidence.languageCheck!=="passed")throw Error("Missing editorial checks");
 const e=article.evidence;
 if(typeof e.topic!=="string"||!e.topic.trim()||typeof e.factSummary!=="string"||e.factSummary.trim().length<40)throw Error("Missing fact record");
 if(!Array.isArray(e.sources)||e.sources.length<2||e.sources.length>10||!Array.isArray(article.sources))throw Error("Missing source evidence");
 const refs=new Set(article.sources.map(s=>new URL(s).href)),domains=new Set();
 for(const s of e.sources){const u=new URL(s.url);const ts=Date.parse(s.checkedAt);if(u.protocol!=="https:"||u.username||u.password||!refs.has(u.href)||!Number.isFinite(ts)||ts>now||now-ts>24*3600000||typeof s.supports!=="string"||s.supports.trim().length<15||typeof s.independenceGroup!=="string"||!s.independenceGroup.trim())throw Error("Unverified source evidence");domains.add(s.independenceGroup.trim().toLowerCase())}
 const required=e.international===true?3:2;if(domains.size<required)throw Error("Insufficient independent reporting");
 if(!article.media&&e.imageDecision!=="original-illustration")throw Error("Missing image decision");
 if(article.media&&e.imageDecision!=="rights-verified")throw Error("Missing image rights decision");
 return true;
}
