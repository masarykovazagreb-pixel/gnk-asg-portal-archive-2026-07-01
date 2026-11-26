// GNK_ASG_AI_NEWSROOM_WRITER_V3_SOURCE_PROVENANCE_FAIL_CLOSED
// Source-linked review worker; each successfully generated item is submitted independently.
// Keep source provenance, authorization and publication classification; no editorial daily quota.

const ENQUEUE_ENDPOINT='https://gnk-asg.hr/api/news-auto-publication/enqueue';
const AI_ASSIST_ENDPOINT='https://gnk-asg.hr/api/ai-assist';
const NEWS_SOURCE_URL='https://gnk-asg.hr/api/public-news-feed';
const EXECUTION_LIMIT=13;

const clean=value=>String(value||'').trim();
const slugify=value=>clean(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)||'dnevni-pregled';
async function digest(value){const bytes=new TextEncoder().encode(value),sum=await crypto.subtle.digest('SHA-256',bytes);return[...new Uint8Array(sum)].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,24)}
function categoryOf(topic){const value=`${topic.group||''} ${topic.category||''}`.toLowerCase();if(/tech|ai/.test(value))return'source-summary-technology';if(/digital|crypto|blockchain/.test(value))return'source-summary-crypto';if(/market/.test(value))return'source-summary-markets';if(/fintech/.test(value))return'source-summary-fintech';return'source-summary-business'}
function authHeaders(env){const token=clean(env.NEWSROOM_AUTOMATION_TOKEN);if(!token)throw new Error('newsroom_service_authorization_not_configured');return{'content-type':'application/json','authorization':`Bearer ${token}`}}
async function imagePath(topic,kind){const seed=clean(topic.url)||clean(topic.title),id=await digest(`${kind}:${seed}`);return`/assets/editorial/generated/${kind}-${slugify(topic.title).slice(0,42)}-${id}.svg`}

async function pickTopics(){
 const response=await fetch(NEWS_SOURCE_URL,{cf:{cacheTtl:0}});
 if(!response.ok)throw new Error(`news_fetch_failed_${response.status}`);
 const articles=await response.json();
 if(!Array.isArray(articles))throw new Error('news_format_unexpected');
 const risk=/court|lawsuit|legal|sud|tužb|passport|osobni podaci|personal data/i,seen=new Set(),safe=[];
 for(const topic of articles){const url=clean(topic?.url),title=clean(topic?.title),summary=clean(topic?.summary);if(!url||!title||!summary||risk.test(`${title} ${summary}`)||seen.has(url))continue;seen.add(url);safe.push(topic);if(safe.length===EXECUTION_LIMIT)break}
 if(!safe.length)throw new Error('no_safe_topics');
 return safe;
}
async function writeOriginal(topic,kind,env){
 const instruction=kind==='commentary'
  ?'Napiši izvorni poslovni komentar od 150 do 220 riječi.'
  :'Napiši izvorni informativni poslovni tekst od 180 do 260 riječi.';
 const prompt=[instruction,'Ne prepisuj izvor. Koristi samo činjenice iz naslova i sažetka. Jasno odvoji činjenice izvora od vlastitog konteksta. Bez investicijskog, pravnog ili medicinskog savjeta. Ton neutralan i urednički.','',`Naslov izvora: ${topic.title}`,`Sažetak izvora: ${topic.summary}`,`Medij: ${topic.source||'nepoznat'}`].join('\n');
 const response=await fetch(AI_ASSIST_ENDPOINT,{method:'POST',headers:authHeaders(env),body:JSON.stringify({task:kind==='commentary'?'newsroom_commentary':'newsroom_source_summary',style:'corporate',lang:'hr',subject:topic.title,context:'AKTUAL MEDIA — samostalna izvorno povezana urednička obrada',text:prompt})});
 if(!response.ok)throw new Error(`ai_assist_failed_${response.status}`);
 const data=await response.json(),text=clean(data?.text);
 if(text.length<180)throw new Error('ai_assist_content_too_short');
 return text;
}
async function enqueue(topic,kind,content,scheduledFor,env){
 const commentary=kind==='commentary',title=commentary?`Komentar: ${clean(topic.title)}`:`${clean(topic.title)} — poslovni pregled`,imageUrl=await imagePath(topic,kind);
 const payload={title:title.slice(0,240),summary:content.slice(0,700),content,sourceName:clean(topic.source||new URL(topic.url).hostname).slice(0,160),sourceUrl:clean(topic.url),sourceClass:'external-publisher-link',sourcePublishedAt:clean(topic.publishedAt||topic.published_at||topic.date),retrievedAt:new Date().toISOString(),usageBasis:'original-summary-with-link',sourceTermsUrl:clean(topic.sourceTermsUrl),sourceLicense:clean(topic.sourceLicense),sourceTermsVerifiedAt:clean(topic.sourceTermsVerifiedAt),imageUrl,imageCredit:'GNK ASG — izvorna generirana urednička ilustracija',category:commentary?'commentary':categoryOf(topic),language:'hr',seoTitle:`${title} | GNK ASG`.slice(0,240),metaDescription:content.slice(0,300),imageAlt:`GNK ASG urednička ilustracija: ${title}`.slice(0,240),imageTitle:title.slice(0,240),imageCaption:`${title}. Izvorna ilustracija GNK ASG.`.slice(0,320),scheduledFor};
 const response=await fetch(ENQUEUE_ENDPOINT,{method:'POST',headers:authHeaders(env),body:JSON.stringify(payload)});
 if(!response.ok)throw new Error(`enqueue_failed_${response.status}`);
 const data=await response.json();if(!data?.ok||!data?.post)throw new Error('enqueue_invalid_response');return data;
}
async function runDailyNewsroom(env){
 const result={ok:false,prepared:0,queued:0,manualReview:0,news:0,commentaries:0,scheduledFor:null,errors:[]};
 try{
  authHeaders(env);
  const topics=await pickTopics(),scheduledFor=new Date().toISOString();result.scheduledFor=scheduledFor;
  for(let index=0;index<topics.length;index++){
   const topic=topics[index],kind=index%4===3?'commentary':'news';
   try{
    const content=await writeOriginal(topic,kind,env);
    const entry=await enqueue(topic,kind,content,scheduledFor,env);
    result.prepared++;if(kind==='news')result.news++;else result.commentaries++;
    if(entry.post.status==='queued')result.queued++;else result.manualReview++;
   }catch(error){result.errors.push({index,kind,title:clean(topic?.title).slice(0,160),error:clean(error?.message).slice(0,200)})}
  }
  result.ok=result.prepared>0;
  result.partial=result.errors.length>0;
  result.publicationConfirmed=false;
 }catch(error){result.errors.push({error:clean(error?.message).slice(0,200)})}
 return result;
}
export default{
 async fetch(request,env){if(request.method==='GET')return new Response(JSON.stringify({ok:true,service:'GNK ASG AI Newsroom Writer',mode:'review-only',dailyQuota:null,executionLimit:EXECUTION_LIMIT,authorizationConfigured:!!clean(env.NEWSROOM_AUTOMATION_TOKEN)},null,2),{headers:{'content-type':'application/json','cache-control':'no-store'}});if(request.method!=='POST')return new Response('Method not allowed',{status:405});const result=await runDailyNewsroom(env);return new Response(JSON.stringify(result,null,2),{status:result.ok?200:503,headers:{'content-type':'application/json','cache-control':'no-store'}})},
 async scheduled(event,env,ctx){ctx.waitUntil(runDailyNewsroom(env))}
};

