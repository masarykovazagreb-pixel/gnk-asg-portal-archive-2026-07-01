/**
 * AKTUAL MEDIA newsroom editorial quality gate.
 * Static validation only; passing does not prove factual truth, rights or human review.
 * Nothing here dispatches a publication or writes to the public site.
 */
import {createHash} from 'node:crypto';
const words = value => String(value || '').normalize('NFKC')
  .toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
const httpsUrl = str => {
  try {
    const u = new URL(str);
    return u.protocol === 'https:' && !u.username && !u.password && u.hostname.includes('.');
  } catch { return false; }
};
const ngrams = (value, n) => {
  const out = new Set(), t=words(value);
  for (let i=0;i+n<=t.length;i++) out.add(t.slice(i,i+n).join(' '));
  return out;
};
function copiedSpan(body, source) {
  const target=ngrams(body,11);
  for(const phrase of ngrams(source,11)) if(target.has(phrase)) return true;
  return false;
}
/**
 * Hash covers all publication-relevant evidence and content. A review for
 * an earlier version is stale, even if the new draft keeps the same title.
 * It is NOT a signature or proof that a human actually reviewed the text.
 */
export function editorialFingerprint(draft) {
  const keys=['title','dek','body','claims','sources','imageUrl','imageRights','disclosure','research_gaps','evidence_level','substantiveResearchDone','privacyAndRightsReviewed','correctionsUrl'];
  const payload={};
  for(const key of keys) payload[key]=draft?.[key] ?? null;
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
export function assessDraft(draft, {now=Date.now()} = {}) {
  const problems=[];
  const flag=(code, condition) => { if(condition) problems.push(code); };
  flag('invalid-draft', !draft || typeof draft !== 'object' || Array.isArray(draft));
  if(problems.length) return {eligible:false,stage:'blocked',problems};
  flag('not-draft', draft.status!=='draft');
  flag('missing-title', typeof draft.title!=='string' || draft.title.trim().length<24);
  flag('insufficient-original-body', words(draft.body).length<260);
  flag('unlabeled-ai-authorship', draft.aiAssisted!==true);
  flag('missing-visible-ai-disclosure', draft.disclosure?.visible!==true ||
    !String(draft.disclosure?.text||'').toLowerCase().includes('ai'));
  flag('missing-sourced-claims', !Array.isArray(draft.claims) || draft.claims.length<2);
  const sources=Array.isArray(draft.sources) ? draft.sources : [];
  const ids=new Set(), hosts=new Set(), evidenceById=new Map();
  const groups=new Set();
  let primaryCount=0;
  const validSources=[];
  for(const s of sources) {
    if(!httpsUrl(s?.url) || typeof s?.id!=='string' || !s.id.trim() || ids.has(s.id)) {
      problems.push('invalid-source');continue;
    }
    const host=new URL(s.url).hostname.replace(/^www\./,'');
    const stamp=Date.parse(String(s.published_at||''));
    if(!Number.isFinite(stamp) || stamp>now || now-stamp>14*86400000) {
      problems.push('unverified-source-date');continue;
    }
    ids.add(s.id); hosts.add(host); validSources.push(s);
    // Two domains owned by the same publisher are not independent.
    const group=String(s.editorialGroup||'').trim().toLowerCase();
    if(!group) problems.push('source-ownership-unverified');
    else groups.add(group);
    const checkedAt=Date.parse(String(s.evidenceCheckedAt||''));
    if(!Number.isFinite(checkedAt) || checkedAt>now || checkedAt<stamp ||
       !['full-article','primary-document','official-record','firsthand-interview'].includes(s.materialType) ||
       !String(s.evidenceNote||'').trim()) {
      problems.push('source-material-not-inspected');
    }
    if(['primary-document','official-record'].includes(s.materialType) &&
       Number.isFinite(checkedAt) && checkedAt<=now && checkedAt>=stamp)primaryCount++;
    evidenceById.set(s.id,group);
  }
  flag('insufficient-independent-outlets', hosts.size<2 || groups.size<2);
  flag('missing-primary-evidence',primaryCount<1);
  for(const claim of Array.isArray(draft.claims)?draft.claims:[]) {
    const e=Array.isArray(claim?.evidence) ? claim.evidence : [];
    flag('claim-without-two-sources',
      typeof claim?.text!=='string' || claim.text.trim().length<10 ||
      new Set(e).size<2 || e.some(id=>!ids.has(id)) ||
      new Set(e.map(id=>evidenceById.get(id)).filter(Boolean)).size<2);
  }
  for(const s of validSources) {
    if(copiedSpan(draft.body, [s.title||'',s.summary||''].join(' '))) {
      problems.push('near-copy-of-source');
    }
  }
  if(draft.imageUrl) {
    flag('image-rights-not-verified', !httpsUrl(draft.imageUrl) ||
      !['owned','licensed','public-domain'].includes(draft.imageRights?.basis) ||
      !String(draft.imageRights?.credit||'').trim());
  }
  flag('research-unverified',draft.substantiveResearchDone!==true ||
    draft.evidence_level!=='primary-and-secondary-verified' ||
    !Array.isArray(draft.research_gaps) || draft.research_gaps.length!==0);
  const review=draft.humanEditorialReview||{};
  const fingerprint=editorialFingerprint(draft);
  const issuedAt=Date.parse(String(draft.generated_at||''));
  flag('missing-substantive-human-review',review.substantive!==true ||
    !String(review.reviewer||'').trim() ||
    !review.editorialResponsibilityAccepted ||
    !Number.isFinite(Date.parse(String(review.approvedAt||''))) || Date.parse(String(review.approvedAt||'')) > now ||
    (Number.isFinite(issuedAt) && Date.parse(String(review.approvedAt||''))<issuedAt) ||
    review.article_sha256!==fingerprint);
  flag('privacy-rights-screen-missing',draft.privacyAndRightsReviewed!==true);
  flag('corrections-policy-missing',!httpsUrl(draft.correctionsUrl));
  return {eligible:problems.length===0,stage:problems.length?'blocked':'eligible-for-manual-release',
    problems:[...new Set(problems)],
    editorial_fingerprint:fingerprint,
    assessment_note:'Metadata gate only, not a signature. Verified source material, human approval and rights evidence must really exist; this tool does not prove them. Publication/deploy is a separate operation.'};
}
