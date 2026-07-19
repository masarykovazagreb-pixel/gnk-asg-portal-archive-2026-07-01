export const VERSION='GNK_ASG_CANONICAL_NEWS_FEED_V1_20260719_URL_DEDUPLICATION';

const TRACKING_PARAMETER=/^(?:utm_[a-z0-9_]+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid)$/i;

export function newsItemSourceUrl(item){
 return String(item?.sourceUrl||item?.url||item?.link||item?.href||'').trim();
}

export function normalizeNewsUrl(value){
 const raw=String(value||'').trim();
 if(!/^https?:\/\//i.test(raw))return raw;
 try{
  const url=new URL(raw);
  url.hash='';
  for(const key of [...url.searchParams.keys()])if(TRACKING_PARAMETER.test(key))url.searchParams.delete(key);
  url.searchParams.sort();
  if(url.pathname.length>1)url.pathname=url.pathname.replace(/\/+$/,'');
  return url.href;
 }catch{return raw}
}

const publishedAt=item=>{
 const parsed=Date.parse(item?.published_at||item?.publishedAt||item?.date||0);
 return Number.isFinite(parsed)?parsed:0;
};

export function normalizeCanonicalNewsItems(data,limit=100){
 const source=Array.isArray(data)?data:(data?.items||data?.posts||data?.news||[]);
 const sorted=source
  .filter(item=>item&&item.title&&newsItemSourceUrl(item))
  .sort((a,b)=>publishedAt(b)-publishedAt(a));
 const seen=new Set();
 const result=[];
 const maximum=Math.max(0,Number.isFinite(Number(limit))?Math.floor(Number(limit)):100);
 for(const item of sorted){
  if(result.length>=maximum)break;
  const key=normalizeNewsUrl(newsItemSourceUrl(item));
  if(!key||seen.has(key))continue;
  seen.add(key);
  result.push(item);
 }
 return result;
}
