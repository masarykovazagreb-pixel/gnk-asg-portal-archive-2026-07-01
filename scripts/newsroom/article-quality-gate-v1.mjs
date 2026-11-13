/**
 * AKTUAL MEDIA newsroom editorial quality gate.
 * Static validation only; passing does not prove factual truth, rights or human review.
 * Nothing here dispatches a publication or writes to the public site.
 */
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
  const ids=new Set(), hosts=new Set();
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
  }
  flag('insufficient-independent-outlets', hosts.size<2);
  for(const claim of Array.isArray(draft.claims)?draft.claims:[]) {
    const e=Array.isArray(claim?.evidence) ? claim.evidence : [];
    flag('claim-without-two-sources',
      typeof claim?.text!=='string' || claim.text.trim().length<10 ||
      new Set(e).size<2 || e.some(id=>!ids.has(id)));
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
  const review=draft.humanEditorialReview||{};
  flag('missing-substantive-human-review',review.substantive!==true ||
    !String(review.reviewer||'').trim() ||
    !review.editorialResponsibilityAccepted ||
    !Number.isFinite(Date.parse(String(review.approvedAt||''))));
  flag('privacy-rights-screen-missing',draft.privacyAndRightsReviewed!==true);
  flag('corrections-policy-missing',!httpsUrl(draft.correctionsUrl));
  return {eligible:problems.length===0,stage:problems.length?'blocked':'eligible-for-manual-release',
    problems:[...new Set(problems)],
    assessment_note:'Metadata gate only. Substantive review and independent factual verification must really have occurred; not proved by this function. Publication/deploy is a separate operation.'};
}
