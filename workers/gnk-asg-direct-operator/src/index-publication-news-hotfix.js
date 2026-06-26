import core from './index.js';

const VERSION = 'GNK_ASG_PUBLICATION_NEWS_V6_20260626';
const MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const NEWS_SCHEDULE = ['09:00','16:00','21:00'];
const NEWS_HOURS_ZAGREB = new Set([9,16,21]);
const PUBLIC_NEWS_LIMIT = 100;
const ARCHIVE_PRUNE_AT = 1000;
const ARCHIVE_RETAIN_AFTER_PRUNE = 500;
const FALLBACK_IMAGE = '/assets/news-fallback.svg';
const FEEDS = [
  ['BBC Business','business','world','https://feeds.bbci.co.uk/news/business/rss.xml'],
  ['The Guardian Business','business','world','https://www.theguardian.com/business/rss'],
  ['The New York Times Business','business','world','https://rss.nytimes.com/services/xml/rss/nyt/Business.xml'],
  ['CNBC World','markets','world','https://www.cnbc.com/id/100727362/device/rss/rss.html'],
  ['TechCrunch','technology','world','https://techcrunch.com/feed/'],
  ['MIT Technology Review','technology','world','https://www.technologyreview.com/feed/'],
  ['Wired','technology','world','https://www.wired.com/feed/rss'],
  ['CoinDesk','digital-assets','world','https://www.coindesk.com/arc/outboundfeeds/rss/'],
  ['World Economic Forum','business','world','https://www.weforum.org/agenda/rss.xml'],
  ['IMF Blog','economy','world','https://www.imf.org/en/Blogs/rss'],
  ['Ars Technica','technology','world','https://feeds.arstechnica.com/arstechnica/index'],
  ['The Verge','technology','world','https://www.theverge.com/rss/index.xml'],
  ['VentureBeat','technology','world','https://venturebeat.com/feed/'],
  ['European Central Bank','economy','Europe','https://www.ecb.europa.eu/rss/press.html'],
  ['European Commission Press Corner','economy','Europe','https://ec.europa.eu/commission/presscorner/api/rss?language=en'],
  ['Balkan Green Energy News','energy','Southeast Europe','https://balkangreenenergynews.com/feed/'],
  ['The Slovenia Times','business','Slovenia','https://sloveniatimes.com/feed/'],
  ['Sarajevo Times','business','Bosnia and Herzegovina','https://sarajevotimes.com/feed/'],
  ['Capital.ba','business','Bosnia and Herzegovina','https://capital.ba/feed/'],
  ['BiznisInfo.ba','business','Bosnia and Herzegovina','https://www.biznisinfo.ba/feed/'],
  ['Biznis.rs','business','Serbia','https://biznis.rs/feed/'],
  ['SEEbiz','business','Southeast Europe','https://www.seebiz.eu/rss/'],
  ['Poslovni dnevnik','business','Croatia','https://www.poslovni.hr/feed'],
  ['Lider Media','business','Croatia','https://lidermedia.hr/feed/'],
  ['Tportal Hrvatska','domestic','Croatia','https://www.tportal.hr/rss'],
  ['Netokracija','technology','Croatia','https://www.netokracija.com/feed']
];
const IMAGE_POOL = [
  {src:'https://gnk-asg.hr/assets/seo-gallery/gnk-asg-ai-asistent.jpg',alt:'GNK ASG AI asistent i digitalne operacije',categories:['technology','ai']},
  {src:'https://gnk-asg.hr/assets/seo-gallery/gnk-asg-globalna-mreza.jpg',alt:'GNK ASG globalna poslovna mreža',categories:['region','world','business']},
  {src:'https://gnk-asg.hr/assets/seo-gallery/gnk-asg-burze-i-trzista.jpg',alt:'GNK ASG burze, tržišta i digitalna imovina',categories:['business','markets','technology']},
  {src:'https://gnk-asg.hr/assets/seo-gallery/gnk-asg-sportska-infrastruktura.jpg',alt:'GNK ASG sportska infrastruktura i urbani razvoj',categories:['sport','industry','region']},
  {src:'https://gnk-asg.hr/assets/seo-gallery/gnk-asg-odrziva-buducnost.jpg',alt:'GNK ASG održiva budućnost i partnerstva',categories:['industry','region','sustainability']},
  {src:'https://gnk-asg.hr/assets/seo-gallery/gnk-asg-kartice-i-placanja.jpg',alt:'GNK ASG kartice, plaćanja i fintech',categories:['business','technology','fintech']},
  {src:'https://gnk-asg.hr/assets/seo-gallery/gnk-asg-poslovna-zgrada.jpg',alt:'GNK ASG međunarodno poslovanje i korporativni razvoj',categories:['business','world']},
  {src:'https://gnk-asg.hr/assets/seo-gallery/gnk-asg-komunikacija-i-kontakt.jpg',alt:'GNK ASG komunikacija i digitalni kanali',categories:['technology','region']}
];

function chooseArticleImage(category,recentArticles,seed){
  const normalized = String(category || '').toLowerCase();
  const recent = new Set(
    (Array.isArray(recentArticles) ? recentArticles : [])
      .slice(0,8)
      .map(item => String(item?.image || ''))
      .filter(Boolean)
  );
  const matching = IMAGE_POOL.filter(item => item.categories.includes(normalized));
  const base = matching.length ? matching : IMAGE_POOL;
  const unused = base.filter(item => !recent.has(item.src));
  const candidates = unused.length ? unused : base;
  const hash = [...String(seed || '')].reduce((sum,char) => (sum * 31 + char.charCodeAt(0)) >>> 0,0);
  return candidates[hash % candidates.length];
}

const json = (data,status=200,extra={}) => new Response(JSON.stringify(data,null,2),{
  status,
  headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, no-cache, must-revalidate',
    ...extra
  }
});

const html = (value,status=200,extra={}) => new Response(value,{
  status,
  headers:{
    'content-type':'text/html; charset=utf-8',
    'cache-control':'no-store, no-cache, must-revalidate',
    ...extra
  }
});

const esc = value => String(value ?? '').replace(/[&<>"']/g,c => ({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#039;'
}[c]));

const clean = value => String(value || '').replace(/\s+/g,' ').trim();
const slugify = value => String(value || 'objava')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'')
  .replace(/đ/gi,'d')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g,'-')
  .replace(/^-+|-+$/g,'')
  .slice(0,110) || 'objava';
const words = value => String(value || '').trim().split(/\s+/).filter(Boolean).length;
const nowIso = () => new Date().toISOString();
const kv = env => env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || null;
function zagrebSlot(date=new Date()){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));return{hour:Number(parts.hour),key:`${parts.year}-${parts.month}-${parts.day}-${parts.hour}`};}
async function claimNewsSlot(env,slot){const store=kv(env);if(!store)return true;const key=`automation:news-v6:slot:${slot}`;if(await store.get(key))return false;await store.put(key,nowIso(),{expirationTtl:172800});return true;}

async function readJson(env,key,fallback){
  const store = kv(env);
  if(!store) return fallback;
  try{
    const raw = await store.get(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch{
    return fallback;
  }
}

async function writeJson(env,key,value,ttl){
  const store = kv(env);
  if(!store) return false;
  await store.put(key,JSON.stringify(value,null,2),ttl ? {expirationTtl:ttl} : undefined);
  return true;
}

async function readList(env,key){
  const value = await readJson(env,key,[]);
  return Array.isArray(value) ? value : [];
}

async function writeList(env,key,list,max=500){
  return writeJson(env,key,list.slice(0,max));
}

function token(request){
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.match(/^Bearer\s+(.+)$/i);
  return String(
    (bearer && bearer[1]) ||
    request.headers.get('x-news-publish-token') ||
    request.headers.get('x-operator-token') ||
    request.headers.get('x-admin-token') ||
    request.headers.get('x-gnk-asg-token') ||
    ''
  ).trim();
}

function authorized(request,env){
  const got = token(request);
  const allowed = [
    env.NEWS_PUBLISH_TOKEN,
    env.OPERATOR_TOKEN,
    env.GNK_ASG_OPERATOR_TOKEN,
    env.ADMIN_TOKEN,
    env.GNK_ASG_ADMIN_TOKEN
  ].map(v => String(v || '').trim()).filter(Boolean);
  return Boolean(got && allowed.includes(got));
}

function decodeXml(value){
  return String(value || '')
    .replace(/<!\[CDATA\[/g,'')
    .replace(/\]\]>/g,'')
    .replace(/&amp;/g,'&')
    .replace(/&quot;/g,'"')
    .replace(/&#39;|&apos;/g,"'")
    .replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function rawTag(block,name){
  const match=String(block||'').match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`,'i'));
  return match?String(match[1]||''):'';
}

function tag(block,name){
  return decodeXml(rawTag(block,name));
}

function attr(block,name,attribute){
  const match=String(block||'').match(new RegExp(`<${name}\\b[^>]*\\b${attribute}=["']([^"']+)["'][^>]*>`,'i'));
  return match?decodeXml(match[1]):'';
}

function link(block){
  const direct=tag(block,'link');
  if(/^https?:\/\//i.test(direct))return direct;
  return decodeXml((String(block||'').match(/<link[^>]+href=["']([^"']+)["']/i)||[,''])[1]);
}

function validHttp(value,base=''){
  const raw=String(value||'').trim();
  if(!raw)return '';
  try{
    const url=new URL(raw,base||undefined);
    return /^https?:$/.test(url.protocol)?url.href:'';
  }catch{return'';}
}

function imageFromFeed(block,itemUrl){
  const enclosure=(String(block||'').match(/<enclosure\b[^>]*\burl=["']([^"']+)["'][^>]*>/i)||[,''])[1];
  const html=[rawTag(block,'description'),rawTag(block,'content:encoded'),rawTag(block,'content'),rawTag(block,'summary')].join(' ');
  const embedded=(html.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)||[,''])[1];
  const candidates=[attr(block,'media:content','url'),attr(block,'media:thumbnail','url'),attr(block,'image','href'),decodeXml(enclosure),decodeXml(embedded)];
  for(const candidate of candidates){const image=validHttp(candidate,itemUrl);if(image)return image;}
  return '';
}

function isFallbackImage(value){
  const image=String(value||'').toLowerCase();
  return !image||image.includes('/assets/news-fallback.svg')||image.startsWith('data:image/svg+xml');
}

function normalizeNewsItem(item){
  const url=validHttp(item?.url||item?.link||item?.articleUrl||item?.sourceUrl||'');
  const sourceImage=[item?.image,item?.imageUrl,item?.image_url].map(value=>validHttp(value,url)).find(value=>value&&!isFallbackImage(value))||'';
  const image=sourceImage||FALLBACK_IMAGE;
  const publishedAt=item?.publishedAt||item?.published_at||item?.pubDate||nowIso();
  return{...item,url,sourceUrl:item?.sourceUrl||url,summary:clean(item?.summary||item?.description||item?.text||item?.excerpt||''),source:item?.source||item?.sourceTitle||item?.region||item?.category||'GNK ASG',publishedAt,published_at:item?.published_at||publishedAt,image,imageUrl:image,imageFallback:!sourceImage,imageAlt:item?.imageAlt||item?.title||'GNK ASG Business News',imageCredit:item?.imageCredit||item?.source||item?.sourceTitle||'Izvor'};
}

function itemTime(item){const value=Date.parse(item?.publishedAt||item?.published_at||'');return Number.isFinite(value)?value:0;}
function itemKey(item){return String(item?.url||item?.sourceUrl||item?.id||item?.title||'').trim().toLowerCase();}
function uniqueSorted(items,limit=3000){
  const seen=new Set();
  return (Array.isArray(items)?items:[]).map(normalizeNewsItem).filter(item=>item.title&&item.url).sort((a,b)=>itemTime(b)-itemTime(a)).filter(item=>{const key=itemKey(item);if(!key||seen.has(key))return false;seen.add(key);return true;}).slice(0,limit);
}

function parseFeed(xml,feed){
  const blocks=String(xml||'').match(/<item[\s\S]*?<\/item>/gi)||String(xml||'').match(/<entry[\s\S]*?<\/entry>/gi)||[];
  return blocks.slice(0,30).map((block,index)=>{
    const title=clean(tag(block,'title'));
    const url=link(block);
    const publishedAt=tag(block,'pubDate')||tag(block,'published')||tag(block,'updated')||tag(block,'dc:date')||nowIso();
    const sourceImage=imageFromFeed(block,url);
    return{id:slugify(`${feed[0]}-${index}-${title}-${url}`),title,summary:clean(tag(block,'description')||tag(block,'summary')||tag(block,'content:encoded')||tag(block,'content')).slice(0,900),url,sourceUrl:url,source:feed[0],category:feed[1],group:feed[1],region:feed[2],publishedAt,published_at:publishedAt,image:sourceImage||FALLBACK_IMAGE,imageUrl:sourceImage||FALLBACK_IMAGE,imageFallback:!sourceImage,imageAlt:title,imageCredit:feed[0]};
  }).filter(item=>item.title&&/^https?:\/\//i.test(item.url));
}

async function fetchFeed(feed){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(feed[3],{headers:{'user-agent':'GNK-ASG-News-V6/1.0',accept:'application/rss+xml,application/atom+xml,application/xml,text/xml,*/*'},signal:controller.signal});
    const body=await response.text();
    if(!response.ok)throw new Error(`HTTP_${response.status}`);
    return parseFeed(body,feed);
  }finally{clearTimeout(timer);}
}

async function fetchNews(){
  const settled=await Promise.allSettled(FEEDS.map(fetchFeed));
  const items=[];
  const errors=[];
  settled.forEach((result,index)=>{if(result.status==='fulfilled')items.push(...result.value);else errors.push({source:FEEDS[index][0],error:String(result.reason?.message||result.reason)});});
  return{items:uniqueSorted(items,PUBLIC_NEWS_LIMIT),errors};
}

async function refreshNews(env){
  const result=await fetchNews();
  const previous=await readJson(env,'data:news:external',{items:[]});
  const previousItems=Array.isArray(previous?.items)?previous.items:[];
  const combined=uniqueSorted([...result.items,...previousItems]);
  const active=combined.slice(0,PUBLIC_NEWS_LIMIT);
  const overflow=combined.slice(PUBLIC_NEWS_LIMIT);
  const previousArchive=await readJson(env,'data:news:archive',{items:[]});
  let archive=uniqueSorted([...overflow,...(Array.isArray(previousArchive?.items)?previousArchive.items:[])]);
  let deletedFromArchive=0;
  if(archive.length>=ARCHIVE_PRUNE_AT){deletedFromArchive=archive.length-ARCHIVE_RETAIN_AFTER_PRUNE;archive=archive.slice(0,ARCHIVE_RETAIN_AFTER_PRUNE);}
  const payload={ok:active.length>0,version:VERSION,status:result.items.length?'LIVE':active.length?'FALLBACK':'UNAVAILABLE',updatedAt:nowIso(),timeZone:'Europe/Zagreb',newsSchedule:NEWS_SCHEDULE,activeLimit:PUBLIC_NEWS_LIMIT,count:active.length,configuredNewsSources:FEEDS.length,sourceMix:{global:13,regional:9,croatian:4},withSourceImageCount:active.filter(item=>!item.imageFallback).length,archiveCount:archive.length,archivePruneAt:ARCHIVE_PRUNE_AT,archiveRetainAfterPrune:ARCHIVE_RETAIN_AFTER_PRUNE,deletedFromArchive,sources:FEEDS.map(feed=>feed[0]),errors:result.errors,items:active};
  await writeJson(env,'data:news:external',payload);
  await writeJson(env,'data:news:archive',{ok:true,version:VERSION,updatedAt:payload.updatedAt,count:archive.length,pruneAt:ARCHIVE_PRUNE_AT,retainAfterPrune:ARCHIVE_RETAIN_AFTER_PRUNE,lastDeletedCount:deletedFromArchive,items:archive});
  await writeJson(env,'automation:news-refresh:last',{ok:payload.ok,version:VERSION,status:payload.status,updatedAt:payload.updatedAt,count:payload.count,withSourceImageCount:payload.withSourceImageCount,archiveCount:payload.archiveCount,errors:payload.errors});
  return payload;
}

async function staticNews(request,env){
  if(!env.ASSETS?.fetch) return [];
  try{
    const response = await env.ASSETS.fetch(new Request(new URL('/data/news.json',request.url),{
      headers:{accept:'application/json'}
    }));
    if(!response.ok) return [];
    const value = await response.json();
    return Array.isArray(value) ? value : (Array.isArray(value?.items) ? value.items : []);
  }catch{
    return [];
  }
}

async function mergedNews(request,env){
  const manual=await readList(env,'data:news:items');
  const externalData=await readJson(env,'data:news:external',{items:[]});
  const external=Array.isArray(externalData?.items)?externalData.items:[];
  const fallback=await staticNews(request,env);
  const items=uniqueSorted([...manual,...external,...fallback],PUBLIC_NEWS_LIMIT);
  return{ok:true,version:VERSION,status:externalData?.status||(external.length?'LIVE':'SNAPSHOT'),updatedAt:externalData?.updatedAt||items[0]?.publishedAt||items[0]?.published_at||nowIso(),timeZone:'Europe/Zagreb',newsSchedule:NEWS_SCHEDULE,activeLimit:PUBLIC_NEWS_LIMIT,archivePruneAt:ARCHIVE_PRUNE_AT,archiveRetainAfterPrune:ARCHIVE_RETAIN_AFTER_PRUNE,source:VERSION,counts:{manual:manual.length,external:external.length,static:fallback.length,total:items.length},items};
}

async function runAi(env,system,prompt,maxTokens=4096,temperature=0.2){
  const result = await env.AI.run(MODEL,{
    messages:[
      {role:'system',content:system},
      {role:'user',content:prompt}
    ],
    temperature,
    max_tokens:maxTokens
  });

  return String(
    result?.response ||
    result?.result?.response ||
    result?.output_text ||
    result?.text ||
    ''
  ).replace(/^```(?:json|markdown|text)?/i,'').replace(/```$/,'').trim();
}

function extractJson(raw){
  const value = String(raw || '');
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  if(start < 0 || end <= start) throw new Error('metadata_json_missing');
  return JSON.parse(value.slice(start,end + 1));
}

function limitWords(value,max){
  const list = String(value || '').trim().split(/\s+/).filter(Boolean);
  return list.length > max ? list.slice(0,max).join(' ') : String(value || '').trim();
}

async function generateBody(env,language,title,sources){
  const isHr = language === 'hr';
  let body = '';

  for(let attempt=0;attempt<7 && words(body)<650;attempt+=1){
    const currentWords = words(body);
    let prompt;

    if(isHr){
      prompt = body
        ? `Nastavi sljedeći analitički članak na hrvatskom jeziku. Trenutačno ima ${currentWords} riječi. Napiši samo 260 do 360 novih sadržajnih riječi koje se mogu dodati na kraj. Dodaj novu analizu poslovnih učinaka, europski ili regionalni kontekst, rizike, prilike i zaključak. Ne ponavljaj postojeće rečenice. Ne koristi naslov, popise, markdown, izvore ni potpis autora.\n\nPostojeći tekst:\n${body}\n\nIzvori:\n${JSON.stringify(sources)}`
        : `Napiši izvorni analitički članak na hrvatskom jeziku. U ovom odgovoru napiši najmanje 320 riječi. Obradi aktualni kontekst, ključne činjenice, poslovne i tržišne učinke, europski ili regionalni kontekst, rizike i prilike. Piši u sadržajnim odlomcima. Ne koristi naslov, popise, markdown, izvore ni potpis autora. Ne izmišljaj činjenice i ne prepisuj izvore.\n\nNaslov:\n${title}\n\nIzvori:\n${JSON.stringify(sources)}`;
    }else{
      prompt = body
        ? `Continue the following analytical article in English. It currently contains ${currentWords} words. Write only 260 to 360 new substantive words that can be appended to the end. Add new analysis of business implications, European or regional context, risks, opportunities and a conclusion. Do not repeat existing sentences. Do not use a title, lists, markdown, sources or an author signature.\n\nExisting text:\n${body}\n\nSources:\n${JSON.stringify(sources)}`
        : `Write an original analytical article in English. In this response write at least 320 words. Cover the current context, key facts, business and market implications, European or regional context, risks and opportunities. Use substantive paragraphs. Do not use a title, lists, markdown, sources or an author signature. Do not invent facts and do not copy the source articles.\n\nTitle:\n${title}\n\nSources:\n${JSON.stringify(sources)}`;
    }

    const chunk = await runAi(
      env,
      isHr
        ? 'Pišeš profesionalne, činjenične i izvorne poslovne analize na hrvatskom jeziku.'
        : 'You write professional, factual and original business analysis in English.',
      prompt,
      4096,
      0.25
    );

    if(words(chunk) < 45) continue;
    body = body ? `${body}\n\n${chunk}` : chunk;
  }

  return limitWords(body,1100);
}

async function autoEditor(env){
  const startedAt = nowIso();
  try{
    if(!env.AI?.run) throw new Error('AI_binding_missing');

    const source = await fetchNews();
    const history = await readList(env,'auto-editor:history');
    const approvedExisting = await readList(env,'publish:approved');
    const used = new Set(history.slice(0,300).map(item => String(item.sourceUrl || '').toLowerCase()));
    const recentCategory = String(approvedExisting[0]?.category || '').toLowerCase();
    const unusedItems = source.items.filter(item => !used.has(String(item.url).toLowerCase()));
    const primary =
      unusedItems.find(item => String(item.category || '').toLowerCase() !== recentCategory) ||
      unusedItems[0] ||
      source.items[0];
    if(!primary) throw new Error('no_suitable_source');

    const related = source.items
      .filter(item => item.url !== primary.url && (item.category === primary.category || item.region === primary.region))
      .slice(0,2);

    const sources = [primary,...related].map(item => ({
      title:item.title,
      summary:item.summary,
      source:item.source,
      url:item.url,
      publishedAt:item.publishedAt,
      category:item.category,
      region:item.region
    }));

    let data = {};
    try{
      data = extractJson(await runAi(
        env,
        'Ti si glavni urednik GNK ASG Intelligence Deska.',
        `Vrati isključivo valjani JSON bez markdowna s ključevima titleHr,titleEn,summaryHr,summaryEn,category,region,seoTitleHr,seoTitleEn,seoDescriptionHr,seoDescriptionEn,keywords. Naslovi moraju biti prirodni. Svaki sažetak mora imati 80 do 130 riječi. SEO naslovi najviše 70 znakova, SEO opisi 120 do 165 znakova, keywords mora biti polje od 8 do 15 pojmova. Ne izmišljaj činjenice.\n\nIzvori:\n${JSON.stringify(sources)}`,
        1800,
        0.15
      ));
    }catch{
      data = {};
    }

    const titleHr = clean(data.titleHr || primary.title);
    const titleEn = clean(data.titleEn || primary.title);

    const generated = await Promise.all([
      generateBody(env,'hr',titleHr,sources),
      generateBody(env,'en',titleEn,sources)
    ]);

    const bodyHr = generated[0];
    const bodyEn = generated[1];

    if(!titleHr || !titleEn || words(bodyHr)<500 || words(bodyEn)<500){
      throw new Error(`invalid_generated_article_hr_${words(bodyHr)}_en_${words(bodyEn)}`);
    }

    let summaryHr = clean(data.summaryHr);
    let summaryEn = clean(data.summaryEn);
    if(summaryHr.length < 70) summaryHr = clean(bodyHr).slice(0,420);
    if(summaryEn.length < 70) summaryEn = clean(bodyEn).slice(0,420);

    const slug = slugify(titleHr);
    const now = nowIso();
    const canonical = `https://gnk-asg.hr/objave/${slug}/`;
    const selectedImage = chooseArticleImage(
      clean(data.category || primary.category || 'business'),
      approvedExisting,
      `${primary.url}-${now}`
    );
    const sourceLines = sources.map((item,index) => `${index + 1}. ${item.source}: ${item.title} – ${item.url}`).join('\n');

    const article = {
      id:`auto-${now.replace(/[^0-9]/g,'').slice(0,14)}-${slug.slice(0,50)}`,
      kind:'article',
      type:'article',
      slug,
      status:'published',
      approvedForPublic:true,
      title:titleHr,
      titleHr,
      titleEn,
      summary:summaryHr,
      summaryHr,
      summaryEn,
      body:`${bodyHr}\n\nIzvori informacija:\n${sourceLines}\n\nAutor: Nermin Sefić`,
      bodyHr:`${bodyHr}\n\nIzvori informacija:\n${sourceLines}\n\nAutor: Nermin Sefić`,
      bodyEn:`${bodyEn}\n\nInformation sources:\n${sourceLines}\n\nAuthor: Nermin Sefić`,
      category:clean(data.category || primary.category || 'business'),
      region:clean(data.region || primary.region || 'world'),
      image:selectedImage.src,
      imageAlt:`${selectedImage.alt}: ${titleHr}`,
      imageCredit:'GNK ASG Visual Index',
      author:'Nermin Sefić',
      source:'GNK ASG Intelligence Desk',
      sourceUrl:primary.url,
      sources,
      createdAt:now,
      updatedAt:now,
      publishedAt:now,
      published_at:now,
      canonical,
      hrUrl:`/objave/${slug}/`,
      enUrl:`/publications/${slug}/`,
      publicUrl:`/objave/${slug}/`,
      wordCountHr:words(bodyHr),
      wordCountEn:words(bodyEn),
      seo:{
        title:clean(data.seoTitleHr || titleHr).slice(0,75),
        titleHr:clean(data.seoTitleHr || titleHr).slice(0,75),
        titleEn:clean(data.seoTitleEn || titleEn).slice(0,75),
        description:clean(data.seoDescriptionHr || summaryHr).slice(0,170),
        descriptionHr:clean(data.seoDescriptionHr || summaryHr).slice(0,170),
        descriptionEn:clean(data.seoDescriptionEn || summaryEn).slice(0,170),
        keywords:Array.isArray(data.keywords) ? data.keywords.slice(0,24) : [],
        canonical,
        author:'Nermin Sefić'
      }
    };

    const approved = await readList(env,'publish:approved');
    const articles = await readList(env,'data:articles:items');
    const news = await readList(env,'data:news:items');

    await writeList(env,'publish:approved',[article,...approved.filter(item => item?.slug !== slug)],500);
    await writeList(env,'data:articles:items',[article,...articles.filter(item => item?.slug !== slug)],500);

    const teaser = {
      id:`news-${article.id}`,
      kind:'news',
      title:article.title,
      summary:article.summary,
      url:canonical,
      sourceUrl:canonical,
      source:'GNK ASG Intelligence Desk',
      category:article.category,
      group:article.category,
      region:article.region,
      image:article.image,
      publishedAt:now,
      published_at:now,
      status:'published'
    };

    await writeList(env,'data:news:items',[teaser,...news.filter(item => item?.url !== canonical)],500);
    await writeJson(env,`article:${article.id}`,article);

    const historyEntry = {
      articleId:article.id,
      title:article.title,
      slug,
      sourceUrl:primary.url,
      publishedAt:now,
      wordCountHr:article.wordCountHr,
      wordCountEn:article.wordCountEn,
      category:article.category,
      image:article.image
    };

    await writeList(env,'auto-editor:history',[historyEntry,...history],500);

    const result = {
      ok:true,
      version:VERSION,
      startedAt,
      finishedAt:nowIso(),
      article
    };

    await writeJson(env,'auto-editor:last',result);
    return result;
  }catch(error){
    const result = {
      ok:false,
      version:VERSION,
      error:String(error?.message || error),
      startedAt,
      finishedAt:nowIso()
    };
    await writeJson(env,'auto-editor:last',result);
    return result;
  }
}

function paragraphHtml(value){
  return String(value || '').split(/\n{2,}/).map(paragraph => `<p>${esc(paragraph).replace(/\n/g,'<br>')}</p>`).join('');
}

async function listPage(env,english=false){
  const items = await readList(env,'publish:approved');
  const cards = items.map(item => {
    const title = english ? (item.titleEn || item.titleHr || item.title) : (item.titleHr || item.title);
    const summary = english ? (item.summaryEn || item.summaryHr || item.summary) : (item.summaryHr || item.summary);
    const url = english ? `/publications/${esc(item.slug)}/` : `/objave/${esc(item.slug)}/`;
    return `<article><small>${esc(item.category || 'business')} · ${esc(item.publishedAt || '')}</small><h2><a href="${url}">${esc(title)}</a></h2><p>${esc(summary || '')}</p><a href="${url}">${english ? 'Open publication' : 'Otvori objavu'} →</a></article>`;
  }).join('');

  return html(`<!doctype html><html lang="${english ? 'en' : 'hr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${english ? 'Publications' : 'Objave i analize'} | GNK ASG</title><link rel="canonical" href="https://gnk-asg.hr/${english ? 'publications' : 'objave'}/"><style>body{margin:0;background:#050d19;color:#f7f9fc;font-family:Arial,sans-serif}main{width:min(1100px,calc(100% - 28px));margin:auto;padding:48px 0}h1{font:700 clamp(2.2rem,6vw,4rem)/1.05 Georgia;color:#fff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:15px}article{background:#0d2340;border:1px solid rgba(212,175,55,.32);border-radius:20px;padding:20px}a{color:#d4af37;text-decoration:none;font-weight:800}p{color:#c3cfdf;line-height:1.6}small{color:#d4af37}</style></head><body><main><nav><a href="/">GNK ASG</a> · <a href="${english ? '/objave/' : '/publications/'}">${english ? 'HR' : 'EN'}</a> · <a href="${english ? '/news/' : '/vijesti/'}">${english ? 'News' : 'Vijesti'}</a></nav><h1>${english ? 'Publications & Insights' : 'Objave i analize'}</h1><div class="grid">${cards || `<p>${english ? 'No publications yet.' : 'Još nema objava.'}</p>`}</div></main></body></html>`);
}

async function detailPage(env,slug,english=false){
  const items = await readList(env,'publish:approved');
  const item = items.find(entry => String(entry?.slug) === String(slug));
  if(!item) return html('<h1>Objava nije pronađena</h1>',404);

  const title = english ? (item.titleEn || item.titleHr || item.title) : (item.titleHr || item.title);
  const summary = english ? (item.summaryEn || item.summaryHr || item.summary) : (item.summaryHr || item.summary);
  const body = english ? (item.bodyEn || item.bodyHr || item.body) : (item.bodyHr || item.body);
  const seo = item.seo || {};
  const canonical = item.canonical || `https://gnk-asg.hr/objave/${item.slug}/`;

  return html(`<!doctype html><html lang="${english ? 'en' : 'hr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(english ? (seo.titleEn || title) : (seo.titleHr || seo.title || title))}</title><meta name="description" content="${esc(english ? (seo.descriptionEn || summary) : (seo.descriptionHr || seo.description || summary))}"><link rel="canonical" href="${esc(canonical)}"><link rel="alternate" hreflang="hr" href="https://gnk-asg.hr/objave/${esc(item.slug)}/"><link rel="alternate" hreflang="en" href="https://gnk-asg.hr/publications/${esc(item.slug)}/"><meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(summary)}"><meta property="og:image" content="${esc(item.image || '')}"><style>body{margin:0;background:#050d19;color:#f7f9fc;font-family:Arial,sans-serif}main{max-width:920px;margin:auto;padding:48px 18px}article{background:#09182a;border:1px solid rgba(212,175,55,.32);border-radius:24px;padding:clamp(20px,4vw,42px)}h1{font:700 clamp(2.1rem,6vw,4rem)/1.08 Georgia;color:#fff}p{color:#d7e0ec;line-height:1.78;font-size:1.04rem}a{color:#d4af37;text-decoration:none;font-weight:800}img{width:100%;max-height:520px;object-fit:cover;border-radius:18px}.lead{color:#c3cfdf;font-size:1.14rem}</style></head><body><main><article><nav><a href="${english ? '/publications/' : '/objave/'}">← ${english ? 'Publications' : 'Objave'}</a></nav><h1>${esc(title)}</h1><p class="lead">${esc(summary)}</p>${item.image ? `<img src="${esc(item.image)}" alt="${esc(item.imageAlt || title)}">` : ''}<div>${paragraphHtml(body)}</div></article></main></body></html>`);
}

async function handle(request,env,ctx){
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/,'') || '/';

  if(path === '/data/news.json') return json(await mergedNews(request,env),200,{'x-gnk-asg-news-automation':'legacy-v6','x-gnk-asg-news-lifecycle':VERSION});
  if(path === '/data/news-archive.json') return json(await readJson(env,'data:news:archive',{ok:true,version:VERSION,count:0,items:[]}));
  if(path === '/data/auto-editor.json') return json({ok:true,updatedAt:nowIso(),items:await readList(env,'publish:approved')});
  if(path === '/data/news-automation-status.json' || path === '/operator/news-automation/status'){
  const archive=await readJson(env,'data:news:archive',{items:[]});
  return json({
    ok:true,
    version:VERSION,
    timeZone:'Europe/Zagreb',
    newsSchedule:NEWS_SCHEDULE,
    newsRefreshesPerDay:3,
    configuredNewsSources:FEEDS.length,
    sourceMix:{global:13,regional:9,croatian:4},
    activeNewsLimit:PUBLIC_NEWS_LIMIT,
    archiveCount:Array.isArray(archive?.items)?archive.items.length:0,
    archivePruneAt:ARCHIVE_PRUNE_AT,
    archiveDeleteCount:500,
    archiveRetainAfterPrune:ARCHIVE_RETAIN_AFTER_PRUNE,
    autoEditor:'every 2 hours',
    lastNewsRefresh:await readJson(env,'automation:news-refresh:last',null),
    lastAutoEditor:await readJson(env,'auto-editor:last',null),
    lastScheduledRun:await readJson(env,'automation:scheduled:last',null)
  });
}

if(path === '/api/news-refresh'){
    if(request.method === 'GET') return json({ok:true,method:'POST',endpoint:'/api/news-refresh'});
    if(request.method !== 'POST') return json({ok:false,error:'method_not_allowed'},405);
    const last = await readJson(env,'automation:public-refresh:last',null);
    const lastTime = Date.parse(last?.updatedAt || '');
    if(Number.isFinite(lastTime) && Date.now() - lastTime < 300000){
      return json({
        ok:false,
        error:'refresh_cooldown',
        retryAfter:Math.ceil((300000 - (Date.now() - lastTime)) / 1000)
      },429);
    }
    await writeJson(env,'automation:public-refresh:last',{updatedAt:nowIso()},600);
    return json(await refreshNews(env));
  }

  if(path === '/operator/news-refresh' || path === '/operator/auto-editor/run' || path === '/operator/news-automation/run'){
    if(request.method !== 'POST') return json({ok:false,error:'method_not_allowed'},405);
    if(!authorized(request,env)) return json({ok:false,error:'authorization_required'},401);
    if(path === '/operator/news-refresh') return json(await refreshNews(env));
    if(path === '/operator/auto-editor/run'){
      const result = await autoEditor(env);
      return json(result,result.ok ? 200 : 500);
    }
    const news = await refreshNews(env);
    const editor = await autoEditor(env);
    return json({ok:news.ok && editor.ok,news,editor},news.ok && editor.ok ? 200 : 500);
  }

  if(request.method === 'GET' && path === '/objave') return listPage(env,false);
  if(request.method === 'GET' && path === '/publications') return listPage(env,true);
  if(request.method === 'GET' && path.startsWith('/objave/')) return detailPage(env,path.slice('/objave/'.length),false);
  if(request.method === 'GET' && path.startsWith('/publications/')) return detailPage(env,path.slice('/publications/'.length),true);

  if((request.method === 'GET' || request.method === 'HEAD') && env.ASSETS?.fetch){
    const asset = await env.ASSETS.fetch(request);
    if(asset.status !== 404) return asset;
  }

  return core.fetch(request,env,ctx);
}

export default {
  fetch:handle,
  async scheduled(event,env,ctx){
  const task=(async()=>{
    const now=new Date();
    const local=zagrebSlot(now);
    const result={ok:true,version:VERSION,cron:event?.cron||'',timeZone:'Europe/Zagreb',local,startedAt:nowIso(),newsRefresh:null,autoEditor:null,skipped:[]};
    if(NEWS_HOURS_ZAGREB.has(local.hour)){
      if(await claimNewsSlot(env,local.key))result.newsRefresh=await refreshNews(env);else result.skipped.push(`news:${local.key}`);
    }else result.skipped.push(`news:outside-schedule:${local.hour}`);
    if(now.getUTCHours()%2===0)result.autoEditor=await autoEditor(env);
    result.finishedAt=nowIso();
    result.ok=result.newsRefresh?.ok!==false&&(!result.autoEditor||result.autoEditor.ok!==false);
    await writeJson(env,'automation:scheduled:last',result);
    return result;
  })();
  if(ctx?.waitUntil){ctx.waitUntil(task);return;}
  return task;
},
async email(message,env,ctx){
    if(typeof core.email === 'function') return core.email(message,env,ctx);
  }
};
