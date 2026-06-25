const VERSION='GNK_ASG_GALLERY_ROTATION_V1_20260625';
const RECENT_WINDOW=30;
const GALLERY_PATH='/data/visual_gallery.json';
const IMAGE_RE=/\.(?:jpe?g|png|webp|avif)$/i;

const now=()=>new Date().toISOString();
const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
const absolute=src=>/^https?:\/\//i.test(String(src||''))?String(src):`https://gnk-asg.hr${String(src||'').startsWith('/')?'':'/'}${String(src||'')}`;

async function readJson(env,key,fallback){
  const kv=store(env);
  if(!kv)return fallback;
  try{const raw=await kv.get(key);return raw?JSON.parse(raw):fallback}catch{return fallback}
}

async function writeJson(env,key,value){
  const kv=store(env);
  if(!kv)return false;
  await kv.put(key,JSON.stringify(value,null,2));
  return true;
}

async function readStaticGallery(env){
  if(!env.ASSETS?.fetch)return{album:{},items:[]};
  try{
    const response=await env.ASSETS.fetch(new Request(`https://assets.gnk-asg.local${GALLERY_PATH}`,{headers:{accept:'application/json'}}));
    if(!response.ok)return{album:{},items:[]};
    const data=await response.json();
    return{album:data?.album||{},items:Array.isArray(data?.items)?data.items:[]};
  }catch{return{album:{},items:[]}}
}

function metadataAllows(item){
  const kind=clean(item?.asset_type||item?.type||item?.kind).toLowerCase();
  if(['text','description','description-only','placeholder','document'].includes(kind))return false;
  if(item?.has_photo===false||item?.hasImage===false||item?.active===false||item?.status==='removed')return false;
  const src=clean(item?.src||item?.url||item?.image);
  return Boolean(src&&IMAGE_RE.test(src));
}

async function verifyAsset(env,item){
  const src=clean(item?.src||item?.url||item?.image);
  if(!metadataAllows(item))return{ok:false,reason:'metadata_or_extension',item};
  if(!env.ASSETS?.fetch)return{ok:true,item:{...item,src}};
  try{
    let response=await env.ASSETS.fetch(new Request(`https://assets.gnk-asg.local${src.startsWith('/')?'':'/'}${src}`,{method:'HEAD'}));
    if(response.status===405)response=await env.ASSETS.fetch(new Request(`https://assets.gnk-asg.local${src.startsWith('/')?'':'/'}${src}`,{method:'GET',headers:{range:'bytes=0-2047'}}));
    const type=String(response.headers.get('content-type')||'').toLowerCase();
    const length=Number(response.headers.get('content-length')||0);
    if(!response.ok)return{ok:false,reason:`http_${response.status}`,item};
    if(type&&!type.startsWith('image/'))return{ok:false,reason:`content_type_${type}`,item};
    if(length>0&&length<1024)return{ok:false,reason:'file_too_small',item};
    return{ok:true,item:{...item,src,asset_type:'photograph',status:'active'}};
  }catch(error){return{ok:false,reason:String(error?.message||error),item}}
}

export async function verifiedGallery(env){
  const source=await readStaticGallery(env);
  const checked=[];
  for(const item of source.items)checked.push(await verifyAsset(env,item));
  const items=checked.filter(row=>row.ok).map(row=>row.item);
  const removed=checked.filter(row=>!row.ok).map(row=>({id:row.item?.id||'',src:row.item?.src||'',reason:row.reason}));
  return{
    album:{...source.album,updated_at:now(),verification:VERSION,visible_image_policy:'Samo stvarne slikovne datoteke. Tekstualni, opisni, prazni i nedostupni zapisi automatski su isključeni.'},
    items,
    audit:{version:VERSION,checkedAt:now(),sourceCount:source.items.length,verifiedCount:items.length,removedCount:removed.length,removed}
  };
}

function topicWords(item){
  const values=[...(Array.isArray(item?.topic)?item.topic:[]),...(Array.isArray(item?.categories)?item.categories:[]),item?.title,item?.description];
  return values.map(clean).join(' ').toLowerCase();
}

function categoryScore(item,category){
  const haystack=topicWords(item);
  const value=clean(category).toLowerCase();
  const groups={
    technology:['technology','tehnologija','ai','digital','automatizacija'],
    ai:['ai','umjetna inteligencija','technology','tehnologija'],
    business:['business','poslovanje','korporativ','globalna mreža','identitet'],
    markets:['market','tržišt','burze','financ','digitalna imovina'],
    finance:['financ','bilanca','profit','kapital','market','tržišt'],
    fintech:['fintech','plaćanja','kartice','digitalna ekonomija'],
    sport:['sport','infrastruktura','urbani razvoj'],
    industry:['industr','održivost','infrastruktura','energija'],
    region:['globalna mreža','zemlje','međunarodno','region'],
    world:['globalna mreža','međunarodno','world','zemlje']
  };
  const terms=groups[value]||[value];
  return terms.reduce((score,term)=>score+(term&&haystack.includes(term)?1:0),0);
}

function randomIndex(length){
  if(length<=1)return 0;
  try{return crypto.getRandomValues(new Uint32Array(1))[0]%length}catch{return Math.floor(Math.random()*length)}
}

export async function chooseVerifiedImage(env,category,articles=[]){
  const gallery=await verifiedGallery(env);
  if(!gallery.items.length)return{ok:false,error:'verified_gallery_empty',gallery};
  const usage=await readJson(env,'auto-editor:image-usage',[]);
  const recent=new Set([
    ...(Array.isArray(articles)?articles:[]).slice(0,RECENT_WINDOW).map(item=>clean(item?.image)),
    ...(Array.isArray(usage)?usage:[]).slice(0,RECENT_WINDOW).map(item=>clean(item?.image))
  ].filter(Boolean).map(value=>absolute(value)));
  const ranked=gallery.items.map(item=>({...item,_score:categoryScore(item,category)}));
  const highest=Math.max(0,...ranked.map(item=>item._score));
  const matching=highest>0?ranked.filter(item=>item._score===highest):ranked;
  const unused=matching.filter(item=>!recent.has(absolute(item.src)));
  const fallbackUnused=ranked.filter(item=>!recent.has(absolute(item.src)));
  const candidates=unused.length?unused:(fallbackUnused.length?fallbackUnused:matching);
  const selected=candidates[randomIndex(candidates.length)];
  return{ok:true,selected:{...selected,src:absolute(selected.src)},gallery,recentWindow:RECENT_WINDOW,candidateCount:candidates.length};
}

function applyImage(article,selected,catalogSize,candidateCount){
  const title=clean(article?.titleHr||article?.title||article?.titleEn);
  const baseAlt=clean(selected?.alt||selected?.title||'GNK ASG poslovna fotografija');
  const image=absolute(selected.src);
  return{
    ...article,
    image,
    imageAlt:`${baseAlt}. ${title}. GNK ASG d.o.o., GNK DINAMO Ltd. i Nermin Sefić.`,
    imageCredit:'GNK ASG Visual Index',
    imageSeo:{
      title:clean(selected?.title||title),
      alt:`${baseAlt}. GNK ASG d.o.o., GNK DINAMO Ltd. i Nermin Sefić.`,
      description:clean(selected?.description||article?.seo?.description||article?.summaryHr||article?.summary),
      keywords:['GNK ASG','GNK ASG d.o.o.','GNK DINAMO Ltd.','Nermin Sefić','korporativni portal','poslovne vijesti'],
      author:'Nermin Sefić'
    },
    imageAssignment:{
      ok:true,version:VERSION,imageId:selected?.id||'',image,category:article?.category||'',recentImageWindow:RECENT_WINDOW,catalogSize,candidateCount,assignedAt:now()
    }
  };
}

export async function rotateLatestArticleImage(env,{force=false}={}){
  const approved=await readJson(env,'publish:approved',[]);
  if(!Array.isArray(approved)||!approved.length)return{ok:false,error:'approved_articles_empty'};
  const latest=approved[0];
  if(!force&&latest?.imageAssignment?.version===VERSION)return{ok:true,skipped:true,articleId:latest.id,image:latest.image};
  const choice=await chooseVerifiedImage(env,latest?.category,approved);
  if(!choice.ok)return choice;
  const updated=applyImage(latest,choice.selected,choice.gallery.items.length,choice.candidateCount);
  const replace=list=>(Array.isArray(list)?list:[]).map((item,index)=>index===0||item?.id===latest.id||item?.slug===latest.slug?{...item,...updated}:item);
  await writeJson(env,'publish:approved',replace(approved));
  const articles=await readJson(env,'data:articles:items',[]);
  await writeJson(env,'data:articles:items',replace(articles));
  const news=await readJson(env,'data:news:items',[]);
  const updatedNews=(Array.isArray(news)?news:[]).map(item=>item?.articleId===latest.id||item?.slug===latest.slug?{...item,image:updated.image,imageAlt:updated.imageAlt,imageCredit:updated.imageCredit,imageAssignment:updated.imageAssignment}:item);
  await writeJson(env,'data:news:items',updatedNews);
  const usage=await readJson(env,'auto-editor:image-usage',[]);
  await writeJson(env,'auto-editor:image-usage',[{articleId:latest.id,slug:latest.slug,image:updated.image,imageId:choice.selected.id,category:latest.category,usedAt:now()},...(Array.isArray(usage)?usage:[])].slice(0,300));
  return{ok:true,articleId:latest.id,slug:latest.slug,image:updated.image,imageId:choice.selected.id,recentImageWindow:RECENT_WINDOW,catalogSize:choice.gallery.items.length,candidateCount:choice.candidateCount,removedInvalid:choice.gallery.audit.removedCount,finishedAt:now()};
}

export{VERSION,RECENT_WINDOW};
