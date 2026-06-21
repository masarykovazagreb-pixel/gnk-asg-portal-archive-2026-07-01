const CAMPAIGN_KEY='mail-agent:media-campaigns:v1';

export async function readMediaCampaigns(env){
  if(!env.GNK_ASG_KV)return [];
  const raw=await env.GNK_ASG_KV.get(CAMPAIGN_KEY);
  if(!raw)return [];
  try{const parsed=JSON.parse(raw);return Array.isArray(parsed)?parsed:[];}catch{return [];}
}

export async function saveMediaCampaign(env,campaign){
  if(!env.GNK_ASG_KV)return campaign;
  const items=await readMediaCampaigns(env);
  const next=[campaign,...items.filter(item=>item?.id!==campaign?.id)].slice(0,50);
  await env.GNK_ASG_KV.put(CAMPAIGN_KEY,JSON.stringify(next,null,2));
  return campaign;
}

export async function findMediaCampaign(env,id){
  const items=await readMediaCampaigns(env);
  return items.find(item=>item?.id===id)||null;
}
