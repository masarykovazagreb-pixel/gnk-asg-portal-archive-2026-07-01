// GNK_ASG_AI_NEWSROOM_WRITER_V2_DAILY_10_3_FAIL_CLOSED
// Review-only worker: prepares exactly 10 source summaries and 3 commentaries.
// Production publishing remains disabled until the scheduler and service authorization
// are explicitly approved. No default image, anonymous write or partial daily batch.

const ENQUEUE_ENDPOINT='https://gnk-asg.hr/api/news-auto-publication/enqueue';
const AI_ASSIST_ENDPOINT='https://gnk-asg.hr/api/ai-assist';
const NEWS_SOURCE_URL='https://gnk-asg.hr/data/news.json';
const DAILY_NEWS=10;
const DAILY_COMMENTARIES=3;
const DAILY_TOTAL=DAILY_NEWS+DAILY_COMMENTARIES;
const TIME_ZONE='Europe/Zagreb';

const clean=value=>String(value||'').trim();
const slugify=value=>clean(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)||'dnevni-pregled';
async function digest(value){const bytes=new TextEncoder().encode(value),sum=await crypto.subtle.digest('SHA-256',bytes);return[...new Uint8Array(sum)].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,24)}
function categoryOf(topic){const value=`${topic.group||''} ${topic.category||''}`.toLowerCase();if(/tech|ai/.test(value))return'source-summary-technology';if(/digital|crypto|blockchain/.test(value))return'source-summary-crypto';if(/market/.test(value))return'source-summary-markets';if(/fintech/.test(value))return'source-summary-fintech';return'source-summary-business'}
function authHeaders(env){const token=clean(env.NEWSROOM_AUTOMATION_TOKEN);if(!token)throw new Error('newsroom_service_authorization_not_configured');return{'content-type':'application/json','authorization':`Bearer ${token}`}}
function zoneParts(date){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);return Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)]))}
function zoneOffset(date){const part=zoneParts(date);return Date.UTC(part.year,part.month-1,part.day,part.hour,part.minute,part.second)-date.getTime()}
function targetNine(now=new Date()){const part=zoneParts(now);const candidateFor=(year,month,day)=>{const wall=Date.UTC(year,month-1,day,9,0,0);let candidate=new Date(wall-zoneOffset(new Date(wall)));candidate=new Date(wall-zoneOffset(candidate));return candidate};let target=candidateFor(part.year,part.month,part.day);if(target.getTime()<=now.getTime()+60000){const next=new Date(Date.UTC(part.year,part.month-1,part.day)+86400000),n=zoneParts(next);target=candidateFor(n.year,n.month,n.day)}return target.toISOString()}
async function imagePath(topic,kind){const seed=clean(topic.url)||clean(topic.title),id=await digest(`${kind}:${seed}`);return`/assets/editorial/generated/${kind}-${slugify(topic.title).slice(0,42)}-${id}.svg`}

async function pickTopics(){
 const response=await fetch(NEWS_SOURCE_URL,{cf:{cacheTtl:0}});
 if(!response.ok)throw new Error(`news_fetch_failed_${response.status}`);
 const articles=await response.json();
 if(!Array.isArray(articles))throw new Error('news_format_unexpected');
 const risk=/court|lawsuit|legal|sud|tužb|passport|osobni podaci|personal data/i,seen=new Set(),safe=[];
 for(const topic of articles){const url=clean(topic?.url),title=clean(topic?.title),summary=clean(topic?.summary);if(!url||!title||!summary||risk.test(`${title} ${summary}`)||seen.has(url))continue;seen.add(url);safe.push(topic);if(safe.length===DAILY_TOTAL)break}
 if(safe.length<DAILY_TOTAL)throw new Error(`insufficient_safe_topics_${safe.length}_of_${DAILY_TOTAL}`);
 return safe;
}
async function writeOriginal(topic,kind,env){
 const instruction=kind==='commentary'
  ?'Napiši izvorni poslovni komentar od 150 do 220 riječi.'
  :'Napiši izvorni informativni poslovni tekst od 180 do 260 riječi.';
 const prompt=[instruction,'Ne prepisuj izvor. Koristi samo činjenice iz naslova i sažetka. Jasno odvoji činjenice izvora od vlastitog konteksta. Bez investicijskog, pravnog ili medicinskog savjeta. Ton neutralan i urednički.','',`Naslov izvora: ${topic.title}`,`Sažetak izvora: ${topic.summary}`,`Medij: ${topic.source||'nepoznat'}`].join('\n');
 const response=await fetch(AI_ASSIST_ENDPOINT,{method:'POST',headers:authHeaders(env),body:JSON.stringify({task:kind==='commentary'?'newsroom_commentary':'newsroom_source_summary',style:'corporate',lang:'hr',subject:topic.title,context:'GNK ASG Newsroom dnevni paket 10+3',text:prompt})});
 if(!response.ok)throw new Error(`ai_assist_failed_${response.status}`);
 const data=await response.json(),text=clean(data?.text);
 if(text.length<180)throw new Error('ai_assist_content_too_short');
 return text;
}
async function enqueue(topic,kind,content,scheduledFor,env){
 const commentary=kind==='commentary',title=commentary?`Komentar: ${clean(topic.title)}`:`${clean(topic.title)} — poslovni pregled`,imageUrl=await imagePath(topic,kind);
 const payload={title:title.slice(0,240),summary:content.slice(0,700),content,sourceName:clean(topic.source||'GNK ASG Newsroom').slice(0,160),sourceUrl:clean(topic.url),imageUrl,imageCredit:'GNK ASG — izvorna generirana urednička ilustracija',category:commentary?'commentary':categoryOf(topic),language:'hr',seoTitle:`${title} | GNK ASG`.slice(0,240),metaDescription:content.slice(0,300),imageAlt:`GNK ASG urednička ilustracija: ${title}`.slice(0,240),imageTitle:title.slice(0,240),imageCaption:`${title}. Izvorna ilustracija GNK ASG.`.slice(0,320),scheduledFor};
 const response=await fetch(ENQUEUE_ENDPOINT,{method:'POST',headers:authHeaders(env),body:JSON.stringify(payload)});
 if(!response.ok)throw new Error(`enqueue_failed_${response.status}`);
 const data=await response.json();if(!data?.ok||!data?.post)throw new Error('enqueue_invalid_response');return data;
}
async function runDailyNewsroom(env){
 const result={ok:false,prepared:0,queued:0,manualReview:0,news:0,commentaries:0,scheduledFor:null,errors:[]};
 try{
  authHeaders(env);
  const topics=await pickTopics(),scheduledFor=targetNine();result.scheduledFor=scheduledFor;
  for(let index=0;index<topics.length;index++){
   const kind=index<DAILY_NEWS?'news':'commentary';
   try{const content=await writeOriginal(topics[index],kind,env),entry=await enqueue(topics[index],kind,content,scheduledFor,env);result.prepared++;if(kind==='news')result.news++;else result.commentaries++;if(entry.post.status==='queued')result.queued++;else result.manualReview++}
   catch(error){result.errors.push({index,kind,title:clean(topics[index]?.title).slice(0,160),error:clean(error?.message).slice(0,200)})}
  }
  result.ok=result.prepared===DAILY_TOTAL&&result.news===DAILY_NEWS&&result.commentaries===DAILY_COMMENTARIES;
  if(!result.ok)result.errors.push({error:'daily_10_3_batch_incomplete'});
 }catch(error){result.errors.push({error:clean(error?.message).slice(0,200)})}
 return result;
}
export default{
 async fetch(request,env){if(request.method==='GET')return new Response(JSON.stringify({ok:true,service:'GNK ASG AI Newsroom Writer',mode:'review-only',daily:{news:DAILY_NEWS,commentaries:DAILY_COMMENTARIES,time:'09:00',timeZone:TIME_ZONE},authorizationConfigured:!!clean(env.NEWSROOM_AUTOMATION_TOKEN)},null,2),{headers:{'content-type':'application/json','cache-control':'no-store'}});if(request.method!=='POST')return new Response('Method not allowed',{status:405});const result=await runDailyNewsroom(env);return new Response(JSON.stringify(result,null,2),{status:result.ok?200:503,headers:{'content-type':'application/json','cache-control':'no-store'}})},
 async scheduled(event,env,ctx){ctx.waitUntil(runDailyNewsroom(env))}
};
