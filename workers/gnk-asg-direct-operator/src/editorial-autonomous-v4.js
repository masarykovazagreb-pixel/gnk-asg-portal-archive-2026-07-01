import {
  refreshBusinessSources,
  saveDraft,
  publishDraft,
  monitorPublications,
  readJson,
  writeJson,
  readList,
  writeList,
  scheduleLock,
  writeScheduleResult,
  words
} from './editorial-core-v1.js';
import {rotateLatestArticleImage} from './gallery-rotation-v1.js';

export const AUTONOMOUS_VERSION='GNK_ASG_EDITORIAL_AUTONOMOUS_V4_20260702';
export const AUTHOR='Nermin Sefić';
export const PUBLISHER='GNK ASG d.o.o.';
export const RIGHTS_HOLDER='GNK DINAMO Ltd.';
const SITE='https://gnk-asg.hr';
const MODEL='@cf/meta/llama-3.1-8b-instruct-fast';
const DEFAULT_START='2026-07-02T01:00:00.000Z';
const DEFAULT_INTENSIVE_END='2026-07-05T01:00:00.000Z';
const DEFAULT_DAILY_HOURS=[7,13,19];
const SOURCE_MAX_AGE_MS=90*60*1000;
const MIN_WORDS=500;
const MAX_SOURCE_AGE_MS=96*60*60*1000;
const TARGET_CATEGORIES=['business','technology','cybersecurity','markets','finance','economy','industry','policy-business','innovation'];
const STOP=new Set('a an and are as at be by for from has have how in into is it its of on or that the their this to was were will with after before over under more new says said world global business technology market markets company companies industry report reports news today latest could would should about amid through than also hrvatska hrvatske europska european'.split(/\s+/));

const now=()=>new Date().toISOString();
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const safe=value=>clean(value).replace(/[<>]/g,'');
const year=()=>String(new Date().getUTCFullYear());
const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;

function settings(env={}){
  const start=env.EDITORIAL_AUTONOMY_START||DEFAULT_START;
  const intensiveEnd=env.EDITORIAL_INTENSIVE_END||DEFAULT_INTENSIVE_END;
  const dailyHours=clean(env.EDITORIAL_DAILY_HOURS||DEFAULT_DAILY_HOURS.join(',')).split(',').map(Number).filter(Number.isFinite);
  return{start,intensiveEnd,dailyHours:dailyHours.length?dailyHours:DEFAULT_DAILY_HOURS,intensiveCadenceHours:3,steadyPublicationsPerDay:3,minWords:MIN_WORDS};
}

function localTime(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const value=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return{date:`${value.year}-${value.month}-${value.day}`,hour:Number(value.hour),minute:Number(value.minute)};
}

function publicationSlot(env,force=false){
  const cfg=settings(env),current=Date.now(),start=Date.parse(cfg.start),end=Date.parse(cfg.intensiveEnd),local=localTime();
  if(force)return{due:true,mode:'forced',key:`forced:${Math.floor(current/300000)}`,local,cfg};
  if(!Number.isFinite(start)||current<start)return{due:false,mode:'not-started',local,cfg};
  if(Number.isFinite(end)&&current<end){
    const slot=Math.floor((current-start)/(cfg.intensiveCadenceHours*60*60*1000));
    return{due:true,mode:'first-72-hours',key:`intensive:${slot}`,slot,local,cfg};
  }
  const hour=cfg.dailyHours.includes(local.hour)?local.hour:null;
  if(hour===null||local.minute>34)return{due:false,mode:'three-daily',local,cfg};
  return{due:true,mode:'three-daily',key:`daily:${local.date}:${hour}`,local,cfg};
}

function terms(value){
  return new Set(clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(term=>term.length>3&&!STOP.has(term)).slice(0,40));
}
function overlap(a,b){let score=0;for(const term of a)if(b.has(term))score+=1;return score;}
function sourceDate(item){const stamp=Date.parse(item?.publishedAt||item?.published_at||'');return Number.isFinite(stamp)?stamp:0;}
function sourceCategory(item){const value=clean(item?.category||item?.group||'business').toLowerCase();return TARGET_CATEGORIES.includes(value)?value:(/tech|software|digital|ai|cyber/.test(value)?'technology':/market|stock|capital/.test(value)?'markets':/financ|bank|econom/.test(value)?'finance':/industr|energy|manufact/.test(value)?'industry':'business');}

async function selectSourceCluster(env){
  const items=await readList(env,'editorial:news:items');
  const history=await readList(env,'editorial:v4:source-history');
  const used=new Set(history.slice(0,1200).flatMap(row=>row.urls||[row.url]).filter(Boolean).map(value=>clean(value).toLowerCase()));
  const cutoff=Date.now()-MAX_SOURCE_AGE_MS;
  let candidates=items.filter(item=>/^https?:\/\//i.test(clean(item?.url))&&sourceDate(item)>=cutoff&&!used.has(clean(item.url).toLowerCase()));
  if(candidates.length<4)candidates=items.filter(item=>/^https?:\/\//i.test(clean(item?.url))&&!used.has(clean(item.url).toLowerCase()));
  candidates.sort((a,b)=>sourceDate(b)-sourceDate(a));
  if(!candidates.length)return{ok:false,error:'no_unused_current_sources'};

  const categoryHistory=await readList(env,'editorial:v4:category-history');
  const recentCategories=categoryHistory.slice(0,3).map(row=>row.category);
  const primary=candidates.find(item=>!recentCategories.includes(sourceCategory(item)))||candidates[0];
  const primaryTerms=terms(`${primary.title} ${primary.summary||''}`);
  const cluster=[primary];
  const publishers=new Set([clean(primary.source).toLowerCase()]);
  const related=candidates.slice(1).map(item=>{
    const sameCategory=sourceCategory(item)===sourceCategory(primary)?3:0;
    const relatedTerms=overlap(primaryTerms,terms(`${item.title} ${item.summary||''}`));
    const freshness=Math.max(0,Math.round((sourceDate(item)-cutoff)/(60*60*1000))/24);
    return{item,score:sameCategory+relatedTerms*2+freshness};
  }).sort((a,b)=>b.score-a.score);
  for(const row of related){
    if(cluster.length>=4)break;
    const publisher=clean(row.item.source).toLowerCase();
    if(!publisher||publishers.has(publisher))continue;
    if(row.score<2&&cluster.length>=2)continue;
    cluster.push(row.item);publishers.add(publisher);
  }
  if(cluster.length<2){
    const fallback=candidates.find(item=>item.url!==primary.url&&!publishers.has(clean(item.source).toLowerCase()));
    if(fallback)cluster.push(fallback);
  }
  if(cluster.length<2)return{ok:false,error:'insufficient_independent_sources'};
  return{ok:true,category:sourceCategory(primary),region:clean(primary.region||primary.market||'world'),primary,items:cluster.map(item=>({title:clean(item.title),summary:clean(item.summary).slice(0,1200),url:clean(item.url),source:clean(item.source),publishedAt:item.publishedAt||item.published_at||'',category:sourceCategory(item),region:clean(item.region||item.market||'world')}))};
}

async function aiText(env,system,prompt,maxTokens=4096,temperature=0.16){
  if(!env.AI?.run)throw new Error('AI_binding_missing');
  const result=await env.AI.run(env.AUTO_EDITOR_MODEL||MODEL,{messages:[{role:'system',content:system},{role:'user',content:prompt}],max_tokens:maxTokens,temperature});
  return clean(result?.response||result?.result?.response||result?.output_text||result?.text||'').replace(/^```(?:json|markdown|text)?/i,'').replace(/```$/,'').trim();
}
function extractJson(value){const start=String(value).indexOf('{'),end=String(value).lastIndexOf('}');if(start<0||end<=start)throw new Error('metadata_json_missing');return JSON.parse(String(value).slice(start,end+1));}

async function articleBody(env,language,title,cluster){
  const hr=language==='hr';
  const sourceContext=JSON.stringify(cluster.items,null,2);
  const system=hr?'Pišeš profesionalne, izvorne i činjenične poslovne analize na hrvatskom jeziku.':'You write professional, original and factual business analysis in English.';
  const instructions=hr
    ?`Napiši analitički članak od 520 do 700 riječi na hrvatskom jeziku. Jasno razdvoji potvrđene činjenice iz izvora od uredničke analize. Objasni poslovni značaj, tehnološki ili tržišni kontekst, rizike, prilike i zaključak. Ne izmišljaj brojke, izjave, događaje, osobe ni povezanost s GNK ASG ili GNK DINAMO Ltd. Ne prepisuj izvore, ne koristi duge citate, markdown, naslov, popis izvora ni potpis. Koristi više odlomaka.`
    :`Write a 520 to 700 word analytical article in English. Clearly distinguish facts supported by the supplied sources from editorial analysis. Explain business significance, technology or market context, risks, opportunities and a conclusion. Do not invent figures, quotes, events, people or any connection to GNK ASG or GNK DINAMO Ltd. Do not copy source wording, use long quotations, markdown, a title, source list or signature. Use multiple paragraphs.`;
  let body=await aiText(env,system,`${instructions}\n\nTitle: ${title}\n\nSource material:\n${sourceContext}`,4096,0.2);
  if(words(body)<MIN_WORDS){
    const addition=await aiText(env,system,`${hr?'Dopuni tekst s još 220 do 320 riječi bez ponavljanja i bez novih nepotvrđenih činjenica.':'Expand the text by another 220 to 320 words without repetition or new unsupported facts.'}\n\n${body}\n\nSources:\n${sourceContext}`,2600,0.18);
    body=`${body}\n\n${addition}`;
  }
  if(words(body)<MIN_WORDS)throw new Error(`${language}_body_too_short_${words(body)}`);
  return body.split(/\s+/).slice(0,1050).join(' ');
}

async function generateDraft(env,cluster){
  const sourceContext=JSON.stringify(cluster.items,null,2);
  let metadata={};
  try{
    metadata=extractJson(await aiText(env,'You are the editor-in-chief of the GNK ASG Intelligence Desk. Return valid JSON only.',`Create publication metadata from the supplied current sources. Return only JSON with keys titleHr,titleEn,summaryHr,summaryEn,category,region,seoTitleHr,seoTitleEn,seoDescriptionHr,seoDescriptionEn,keywords. Titles must be informative rather than sensational. Each summary must contain 70 to 110 words. Keywords must be an array of 8 to 16 precise terms. Do not invent facts.\n\nSources:\n${sourceContext}`,1800,0.12));
  }catch{}
  const fallbackTitle=clean(cluster.primary.title);
  const titleHr=clean(metadata.titleHr||fallbackTitle);
  const titleEn=clean(metadata.titleEn||fallbackTitle);
  const [bodyHr,bodyEn]=await Promise.all([articleBody(env,'hr',titleHr,cluster),articleBody(env,'en',titleEn,cluster)]);
  const saved=await saveDraft(env,{
    contentType:'analysis',titleHr,titleEn,
    summaryHr:clean(metadata.summaryHr)||bodyHr.split(/\s+/).slice(0,85).join(' '),
    summaryEn:clean(metadata.summaryEn)||bodyEn.split(/\s+/).slice(0,85).join(' '),
    bodyHr,bodyEn,category:clean(metadata.category)||cluster.category,region:clean(metadata.region)||cluster.region,
    sourceUrl:cluster.primary.url,sources:cluster.items.map(item=>({title:item.title,url:item.url,source:item.source})),
    seoTitleHr:clean(metadata.seoTitleHr)||titleHr,seoTitleEn:clean(metadata.seoTitleEn)||titleEn,
    seoDescriptionHr:clean(metadata.seoDescriptionHr)||clean(metadata.summaryHr),seoDescriptionEn:clean(metadata.seoDescriptionEn)||clean(metadata.summaryEn),
    keywords:Array.isArray(metadata.keywords)?metadata.keywords:[],author:AUTHOR,
    notes:`Autonomous sourced publication ${AUTONOMOUS_VERSION}`
  });
  return saved.draft;
}

function svgEscape(value){return safe(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;');}
function wrapTitle(value,max=30){const words=clean(value).split(/\s+/),lines=[];let line='';for(const word of words){const next=clean(`${line} ${word}`);if(next.length>max&&line){lines.push(line);line=word}else line=next;if(lines.length===3)break}if(line&&lines.length<4)lines.push(line);return lines.slice(0,4);}
function visualSvg(article,width,height,variant){
  const title=wrapTitle(article.titleHr||article.title,variant==='portrait'?24:34);
  const titleSize=variant==='portrait'?92:Math.round(width/25);
  const startY=variant==='portrait'?620:Math.round(height*.44);
  const lineHeight=Math.round(titleSize*1.12);
  const tspans=title.map((line,index)=>`<tspan x="${Math.round(width*.08)}" y="${startY+index*lineHeight}">${svgEscape(line)}</tspan>`).join('');
  const category=svgEscape((article.category||'BUSINESS · TECHNOLOGY · INTELLIGENCE').toUpperCase());
  return`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${svgEscape(article.imageAlt||article.titleHr||article.title)}"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#020812"/><stop offset=".52" stop-color="#08284b"/><stop offset="1" stop-color="#0e5e96"/></linearGradient><radialGradient id="glow"><stop stop-color="#ffe092" stop-opacity=".45"/><stop offset="1" stop-color="#ffe092" stop-opacity="0"/></radialGradient><pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M64 0H0V64" fill="none" stroke="#ffffff" stroke-opacity=".06"/></pattern></defs><rect width="100%" height="100%" fill="url(#bg)"/><rect width="100%" height="100%" fill="url(#grid)"/><circle cx="${Math.round(width*.82)}" cy="${Math.round(height*.18)}" r="${Math.round(Math.min(width,height)*.36)}" fill="url(#glow)"/><path d="M${Math.round(width*.55)} ${Math.round(height*.12)} C${Math.round(width*.82)} ${Math.round(height*.18)},${Math.round(width*.66)} ${Math.round(height*.72)},${Math.round(width*.94)} ${Math.round(height*.84)}" fill="none" stroke="#d7aa3c" stroke-width="${Math.max(4,Math.round(width/300))}" stroke-opacity=".8"/><g fill="#d7aa3c">${[0,1,2,3,4].map((n)=>`<circle cx="${Math.round(width*(.59+n*.075))}" cy="${Math.round(height*(.19+n*.13))}" r="${Math.max(8,Math.round(width/180))}"/>`).join('')}</g><text x="${Math.round(width*.08)}" y="${Math.round(height*.13)}" fill="#ffe092" font-family="Arial,sans-serif" font-size="${Math.round(width/48)}" font-weight="700" letter-spacing="6">GNK ASG INTELLIGENCE DESK</text><text fill="#ffffff" font-family="Georgia,serif" font-size="${titleSize}" font-weight="700">${tspans}</text><text x="${Math.round(width*.08)}" y="${Math.round(height*.88)}" fill="#c8d8e8" font-family="Arial,sans-serif" font-size="${Math.round(width/55)}" letter-spacing="3">${category}</text><text x="${Math.round(width*.08)}" y="${Math.round(height*.94)}" fill="#ffe092" font-family="Arial,sans-serif" font-size="${Math.round(width/62)}">Nermin Sefić · GNK ASG d.o.o. · © ${year()} GNK DINAMO Ltd.</text></svg>`;
}

async function generatedVisual(env,article){
  const bucket=env.GNK_ASG_MEDIA_ASSETS;
  if(!bucket?.put)return{ok:false,error:'r2_binding_missing'};
  const month=now().slice(0,7).replace('-','/'),base=`generated-articles/${month}/${article.id}`;
  const variants={cover:{width:2400,height:1350},social:{width:1200,height:630},portrait:{width:1600,height:2000}};
  const output={};
  for(const [name,size] of Object.entries(variants)){
    const key=`${base}/${name}.svg`,body=visualSvg(article,size.width,size.height,name);
    await bucket.put(key,body,{httpMetadata:{contentType:'image/svg+xml; charset=utf-8',cacheControl:'public, max-age=31536000, immutable'},customMetadata:{articleId:article.id,slug:article.slug,author:AUTHOR,publisher:PUBLISHER,rightsHolder:RIGHTS_HOLDER,variant:name}});
    output[name]={url:`${SITE}/r2/${key}`,width:size.width,height:size.height,mimeType:'image/svg+xml'};
  }
  return{ok:true,mode:'generated-editorial-visual',variants:output};
}

function articleSchema(article){
  const canonical=article.canonical||`${SITE}/objave/${article.slug}/`;
  return{'@context':'https://schema.org','@type':'NewsArticle','@id':`${canonical}#article`,headline:article.titleHr||article.title,alternativeHeadline:article.titleEn||'',description:article.summaryHr||article.summary||'',image:[article.imageGenerated?.cover?.url||article.image].filter(Boolean),datePublished:article.publishedAt||article.published_at,dateModified:article.updatedAt||article.publishedAt||article.published_at,inLanguage:['hr','en'],mainEntityOfPage:canonical,author:{'@type':'Person',name:AUTHOR,url:`${SITE}/nermin-sefic/`},publisher:{'@type':'Organization',name:PUBLISHER,url:`${SITE}/`},copyrightHolder:{'@type':'Organization',name:RIGHTS_HOLDER},copyrightYear:year(),isBasedOn:(article.sources||[]).map(item=>item.url).filter(Boolean)};
}

async function replacePublished(env,article){
  const match=item=>item?.id===article.id||item?.slug===article.slug;
  const replace=list=>(Array.isArray(list)?list:[]).map(item=>match(item)?{...item,...article}:item);
  const approved=await readList(env,'publish:approved'),articles=await readList(env,'data:articles:items'),news=await readList(env,'data:news:items');
  await writeList(env,'publish:approved',replace(approved),500);
  await writeList(env,'data:articles:items',replace(articles),500);
  await writeList(env,'data:news:items',(Array.isArray(news)?news:[]).map(item=>item?.url===article.canonical||item?.slug===article.slug?{...item,articleId:article.id,slug:article.slug,image:article.image,imageAlt:article.imageAlt,imageCredit:article.imageCredit,author:AUTHOR,publisher:PUBLISHER,rightsHolder:RIGHTS_HOLDER,sources:article.sources}:item),500);
  await writeJson(env,`article:${article.id}`,article);
}

export async function runAutonomousPublication(env,{forceSourceRefresh=false}={}){
  const startedAt=now(),result={ok:false,version:AUTONOMOUS_VERSION,startedAt,sourceRefresh:null,cluster:null,draft:null,publish:null,image:null,monitor:null};
  let sourceState=await readJson(env,'editorial:sources:last',null);
  const sourceStamp=Date.parse(sourceState?.updatedAt||'');
  if(forceSourceRefresh||!sourceState?.ok||!Number.isFinite(sourceStamp)||Date.now()-sourceStamp>SOURCE_MAX_AGE_MS){result.sourceRefresh=await refreshBusinessSources(env);sourceState=result.sourceRefresh;}
  if(!sourceState?.ok||Number(sourceState?.count||0)<2){result.error='editorial_sources_unavailable';result.finishedAt=now();await writeJson(env,'editorial:v4:last',result);return result;}
  try{
    const cluster=await selectSourceCluster(env);if(!cluster.ok)throw new Error(cluster.error);
    result.cluster={category:cluster.category,region:cluster.region,count:cluster.items.length,sources:cluster.items.map(item=>({source:item.source,title:item.title,url:item.url,publishedAt:item.publishedAt}))};
    const draft=await generateDraft(env,cluster);result.draft={id:draft.id,slug:draft.slug,title:draft.titleHr,wordCountHr:words(draft.bodyHr),wordCountEn:words(draft.bodyEn)};
    result.publish=await publishDraft(env,draft.id);if(!result.publish?.ok)throw new Error(result.publish?.error||'publication_failed');
    let approved=await readList(env,'publish:approved');let latest=approved.find(item=>item?.slug===result.publish.article.slug)||approved[0];if(!latest)throw new Error('published_article_missing');
    result.image=await rotateLatestArticleImage(env,{force:true});
    approved=await readList(env,'publish:approved');latest=approved.find(item=>item?.slug===result.publish.article.slug)||approved[0];
    if(!result.image?.ok||!latest?.image){
      const generated=await generatedVisual(env,latest||result.publish.article);if(!generated.ok)throw new Error(generated.error||'image_generation_failed');
      result.image=generated;latest={...(latest||result.publish.article),image:generated.variants.cover.url,imageGenerated:generated.variants,imageAlt:`${clean(latest?.titleHr||latest?.title)} — GNK ASG Intelligence Desk`,imageCredit:`${PUBLISHER}; rights holder ${RIGHTS_HOLDER}`};
    }
    const article={...latest,author:AUTHOR,authorName:AUTHOR,publisher:PUBLISHER,publisherName:PUBLISHER,rightsHolder:RIGHTS_HOLDER,copyrightHolder:RIGHTS_HOLDER,copyrightYear:year(),copyrightNotice:`© ${year()} ${RIGHTS_HOLDER}. Sva prava pridržana.`,editorialResponsibility:PUBLISHER,sources:cluster.items.map(item=>({title:item.title,url:item.url,source:item.source,publishedAt:item.publishedAt})),sourceLinks:cluster.items.map(item=>item.url),publicationPolicy:{version:AUTONOMOUS_VERSION,minimumWordsPerLanguage:MIN_WORDS,requiresMultipleSources:true,requiresImage:true,author:AUTHOR,publisher:PUBLISHER,rightsHolder:RIGHTS_HOLDER},seo:{...(latest.seo||{}),author:AUTHOR,publisher:PUBLISHER,copyrightHolder:RIGHTS_HOLDER,structuredData:articleSchema({...latest,sources:cluster.items})}};
    await replacePublished(env,article);
    const sourceHistory=await readList(env,'editorial:v4:source-history');await writeList(env,'editorial:v4:source-history',[{articleId:article.id,slug:article.slug,urls:cluster.items.map(item=>item.url),category:article.category,publishedAt:article.publishedAt||article.published_at},...sourceHistory],1500);
    const categoryHistory=await readList(env,'editorial:v4:category-history');await writeList(env,'editorial:v4:category-history',[{category:article.category,articleId:article.id,publishedAt:article.publishedAt||article.published_at},...categoryHistory],100);
    result.article={id:article.id,slug:article.slug,title:article.titleHr||article.title,canonical:article.canonical,image:article.image,publishedAt:article.publishedAt||article.published_at,author:AUTHOR,publisher:PUBLISHER,rightsHolder:RIGHTS_HOLDER,sourceCount:article.sources.length};
    result.monitor=await monitorPublications(env);result.ok=true;
  }catch(error){result.error=clean(error?.message||error);}
  result.finishedAt=now();await writeJson(env,'editorial:v4:last',result);return result;
}

export async function runAutonomousSchedule(event,env,ctx,{force=false}={}){
  const slot=publicationSlot(env,force),result={ok:true,version:AUTONOMOUS_VERSION,cron:event?.cron||'',slot,startedAt:now(),sourceRefresh:null,publication:null,monitor:null};
  const refreshSlot=Math.floor(Date.now()/SOURCE_MAX_AGE_MS);
  if(await scheduleLock(env,`editorial:v4:source-refresh:${refreshSlot}`,Math.ceil(SOURCE_MAX_AGE_MS/1000))){result.sourceRefresh=await refreshBusinessSources(env);}
  if(slot.due&&await scheduleLock(env,`editorial:v4:publication:${slot.key}`,force?240:Math.max(7200,slot.mode==='first-72-hours'?10500:82800))){result.publication=await runAutonomousPublication(env,{forceSourceRefresh:false});}
  const monitorSlot=Math.floor(Date.now()/(60*60*1000));
  if(await scheduleLock(env,`editorial:v4:monitor:${monitorSlot}`,3500))result.monitor=result.publication?.monitor||await monitorPublications(env);
  result.ok=[result.sourceRefresh,result.publication,result.monitor].filter(Boolean).every(item=>item.ok!==false);result.finishedAt=now();await writeScheduleResult(env,result);await writeJson(env,'editorial:v4:schedule:last',result);return result;
}

export async function autonomousStatus(env){
  const [last,schedule,sources,published]=await Promise.all([readJson(env,'editorial:v4:last',null),readJson(env,'editorial:v4:schedule:last',null),readJson(env,'editorial:sources:last',null),readList(env,'publish:approved')]);
  return{ok:true,version:AUTONOMOUS_VERSION,automaticPublication:true,schedule:settings(env),currentSlot:publicationSlot(env,false),identityPolicy:{author:AUTHOR,publisher:PUBLISHER,rightsHolder:RIGHTS_HOLDER},qualityPolicy:{minimumWordsPerLanguage:MIN_WORDS,multipleIndependentSources:true,sourceLinks:true,galleryImageFirst:true,generatedVisualFallback:true,bilingual:true},sourceStatus:sources?{updatedAt:sources.updatedAt,count:sources.count,healthySources:sources.healthySources,totalSources:sources.totalSources}:null,publishedCount:published.length,lastPublication:last?.article||null,lastRun:last,lastSchedule:schedule};
}
