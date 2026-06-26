import {verifiedGallery as baseVerifiedGallery,rotateLatestArticleImage,VERSION as BASE_VERSION,RECENT_WINDOW} from './gallery-rotation-v1.js';

export const VERSION='GNK_ASG_GALLERY_ROTATION_V2_20260626';
const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
async function generated(env){const kv=store(env);if(!kv)return[];try{const raw=await kv.get('visual-gallery:generated');const value=raw?JSON.parse(raw):[];return Array.isArray(value)?value:[]}catch{return[]}}

export async function verifiedGallery(env){
  const base=await baseVerifiedGallery(env),extra=(await generated(env)).filter(item=>item&&item.src&&item.active!==false&&item.status!=='removed');
  const seen=new Set(),items=[...extra,...base.items].filter(item=>{const key=String(item.id||item.src||'').toLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true});
  return{
    album:{...base.album,updated_at:new Date().toISOString(),verification:VERSION,generated_count:extra.length},
    items,
    audit:{...base.audit,version:VERSION,baseVersion:BASE_VERSION,generatedCount:extra.length,verifiedCount:items.length,sourceCount:Number(base.audit?.sourceCount||0)+extra.length}
  };
}

export{rotateLatestArticleImage,RECENT_WINDOW};
