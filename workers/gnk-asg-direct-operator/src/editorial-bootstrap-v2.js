import {readList,writeJson} from './editorial-core-v1.js';
import {ensureEditorialBootstrap as ensureBaseBootstrap,EDITORIAL_BOOTSTRAP_VERSION as BASE_VERSION} from './editorial-bootstrap-v1.js';

export const EDITORIAL_BOOTSTRAP_VERSION='GNK_ASG_EDITORIAL_BOOTSTRAP_ALL_10_V2_20260627';
const REQUIRED_SLUGS=[
  'how-a-structured-pdf-centre-improves-public-verifiability',
  'why-legal-information-belongs-in-primary-navigation',
  'bilingual-corporate-communication-as-an-operating-standard',
  'artificial-intelligence-with-mandatory-human-review',
  'market-data-is-information-not-investment-advice',
  'structured-media-applications-reduce-organisational-risk',
  'why-every-business-publication-should-carry-sources',
  'cybersecurity-in-official-corporate-communication',
  'global-networks-and-business-continuity',
  'managing-documents-versions-and-the-public-record'
];
const clean=value=>String(value??'').trim();

export async function ensureEditorialBootstrap(env,{minimum=10}={}){
  const before=await readList(env,'publish:approved');
  const existing=new Set(before.map(item=>clean(item?.slug)));
  const missing=REQUIRED_SLUGS.filter(slug=>!existing.has(slug));
  if(missing.length){
    await ensureBaseBootstrap(env,{minimum:before.length+missing.length});
  }
  const after=await readList(env,'publish:approved');
  const finalSlugs=new Set(after.map(item=>clean(item?.slug)));
  const unresolved=REQUIRED_SLUGS.filter(slug=>!finalSlugs.has(slug));
  const result={
    ok:after.length>=minimum&&unresolved.length===0,
    version:EDITORIAL_BOOTSTRAP_VERSION,
    baseVersion:BASE_VERSION,
    requiredSeedCount:REQUIRED_SLUGS.length,
    created:Math.max(0,after.length-before.length),
    total:after.length,
    minimum,
    requiredSlugs:REQUIRED_SLUGS,
    missingBefore:missing,
    unresolved,
    approvedImage:'/assets/gnk-asg-social-card.png',
    completedAt:new Date().toISOString()
  };
  await writeJson(env,'editorial:bootstrap:last',result);
  return result;
}
