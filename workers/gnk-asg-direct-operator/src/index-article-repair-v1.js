import app from './index-ui-harmonizer.js';

const VERSION = 'GNK_ASG_ARTICLE_REPAIR_V1';
const MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const KNOWN_OLD_SLUG = 'chinese-e-commerce-giant-alibaba-sues-us-government-over-defence-blacklist';
const DEFAULT_IMAGE = 'https://gnk-asg.hr/assets/article-alibaba-us-defence-blacklist.svg';

const json = (data,status=200) => new Response(JSON.stringify(data,null,2),{
  status,
  headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
    'x-gnk-asg-article-repair':VERSION
  }
});

const clean = value => String(value || '').replace(/\s+/g,' ').trim();
const words = value => String(value || '').trim().split(/\s+/).filter(Boolean).length;
const nowIso = () => new Date().toISOString();
const slugify = value => String(value || 'objava')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'')
  .replace(/đ/gi,'d')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g,'-')
  .replace(/^-+|-+$/g,'')
  .slice(0,110) || 'objava';
const store = env => env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || null;

function requestToken(request){
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.match(/^Bearer\s+(.+)$/i);
  return String(
    (bearer && bearer[1]) ||
    request.headers.get('x-operator-token') ||
    request.headers.get('x-admin-token') ||
    request.headers.get('x-news-publish-token') ||
    request.headers.get('x-gnk-asg-token') ||
    ''
  ).trim();
}

function authorized(request,env){
  const supplied = requestToken(request);
  const allowed = [
    env.GNK_ASG_OPERATOR_TOKEN,
    env.OPERATOR_TOKEN,
    env.GNK_ASG_ADMIN_TOKEN,
    env.ADMIN_TOKEN,
    env.NEWS_PUBLISH_TOKEN
  ].map(value => String(value || '').trim()).filter(Boolean);
  return Boolean(supplied && allowed.includes(supplied));
}

async function readJson(env,key,fallback){
  const kv = store(env);
  if(!kv) throw new Error('kv_binding_missing');
  try{
    const raw = await kv.get(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch{
    return fallback;
  }
}

async function writeJson(env,key,value){
  const kv = store(env);
  if(!kv) throw new Error('kv_binding_missing');
  await kv.put(key,JSON.stringify(value,null,2));
}

async function readList(env,key){
  const value = await readJson(env,key,[]);
  return Array.isArray(value) ? value : [];
}

async function writeList(env,key,value){
  await writeJson(env,key,value.slice(0,500));
}

async function runAi(env,system,prompt,maxTokens=4096,temperature=0.2){
  if(!env.AI?.run) throw new Error('ai_binding_missing');
  const result = await env.AI.run(MODEL,{
    messages:[
      {role:'system',content:system},
      {role:'user',content:prompt}
    ],
    max_tokens:maxTokens,
    temperature
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
  const text = String(raw || '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if(start < 0 || end <= start) throw new Error('metadata_json_missing');
  return JSON.parse(text.slice(start,end + 1));
}

function normalizeSources(item){
  const output = [];
  const raw = Array.isArray(item?.sources) ? item.sources : (item?.sources ? [item.sources] : []);
  for(const source of raw){
    if(source && typeof source === 'object'){
      output.push({
        title:clean(source.title || item.title),
        summary:clean(source.summary || item.summary),
        source:clean(source.source || item.source || 'Izvor'),
        url:clean(source.url || source.sourceUrl || item.sourceUrl || item.url),
        publishedAt:source.publishedAt || item.publishedAt || nowIso(),
        category:clean(source.category || item.category || 'business'),
        region:clean(source.region || item.region || 'world')
      });
    }else if(clean(source)){
      output.push({
        title:clean(item.title),
        summary:clean(item.summary),
        source:clean(item.source || 'Izvor'),
        url:clean(source),
        publishedAt:item.publishedAt || nowIso(),
        category:clean(item.category || 'business'),
        region:clean(item.region || 'world')
      });
    }
  }
  if(!output.length){
    output.push({
      title:clean(item?.title || 'Poslovna analiza'),
      summary:clean(item?.summary),
      source:clean(item?.source || 'Izvorni zapis'),
      url:clean(item?.sourceUrl || item?.url || 'https://gnk-asg.hr/objave/'),
      publishedAt:item?.publishedAt || nowIso(),
      category:clean(item?.category || 'business'),
      region:clean(item?.region || 'world')
    });
  }
  return output.filter(source => source.title || source.url).slice(0,4);
}

async function generateBody(env,language,title,sources){
  const croatian = language === 'hr';
  let body = '';
  for(let attempt=0;attempt<7 && words(body)<650;attempt+=1){
    const current = words(body);
    const prompt = croatian
      ? (body
        ? `Nastavi analitički članak na hrvatskom jeziku. Tekst trenutačno ima ${current} riječi. Napiši 260 do 360 novih sadržajnih riječi koje se mogu izravno dodati na kraj. Dodaj novu analizu poslovnih posljedica, regulatornog i geopolitičkog konteksta, rizika, prilika i zaključka. Ne ponavljaj prethodne rečenice. Bez naslova, popisa, markdowna, izvora i potpisa.\n\nPostojeći tekst:\n${body}\n\nIzvori:\n${JSON.stringify(sources)}`
        : `Napiši izvorni analitički članak na hrvatskom jeziku od najmanje 320 riječi o zadanoj temi. Obradi činjenice iz izvora, poslovne i tržišne posljedice, regulatorni i geopolitički kontekst, rizike, prilike i važnost za europske tvrtke. Ne izmišljaj činjenice. Bez naslova, popisa, markdowna, izvora i potpisa.\n\nNaslov:\n${title}\n\nIzvori:\n${JSON.stringify(sources)}`)
      : (body
        ? `Continue the analytical article in English. It currently has ${current} words. Write 260 to 360 new substantive words that can be appended directly. Add new analysis of business implications, regulatory and geopolitical context, risks, opportunities and a conclusion. Do not repeat earlier sentences. No title, lists, markdown, sources or signature.\n\nExisting text:\n${body}\n\nSources:\n${JSON.stringify(sources)}`
        : `Write an original analytical article in English of at least 320 words on the stated topic. Cover facts from the sources, business and market implications, regulatory and geopolitical context, risks, opportunities and relevance for European companies. Do not invent facts. No title, lists, markdown, sources or signature.\n\nTitle:\n${title}\n\nSources:\n${JSON.stringify(sources)}`);

    const chunk = await runAi(
      env,
      croatian
        ? 'Pišeš profesionalne, činjenične i izvorne poslovne analize na hrvatskom jeziku.'
        : 'You write professional, factual and original business analysis in English.',
      prompt,
      4096,
      0.25
    );
    if(words(chunk) < 50) continue;
    body = body ? `${body}\n\n${chunk}` : chunk;
  }
  return body.trim();
}

async function repairArticle(env,oldSlug){
  const approved = await readList(env,'publish:approved');
  const articles = await readList(env,'data:articles:items');
  const news = await readList(env,'data:news:items');
  const item = approved.find(entry => String(entry?.slug) === oldSlug) || articles.find(entry => String(entry?.slug) === oldSlug);
  if(!item) throw new Error('article_not_found');

  const sources = normalizeSources(item);
  let metadata = {};
  try{
    metadata = extractJson(await runAi(
      env,
      'Ti si glavni urednik GNK ASG Intelligence Deska.',
      `Vrati isključivo valjani JSON bez markdowna s ključevima titleHr,titleEn,summaryHr,summaryEn,seoTitleHr,seoTitleEn,seoDescriptionHr,seoDescriptionEn,keywords,category,region. Hrvatski naslov i sažetak moraju biti prirodno napisani na hrvatskom jeziku. Engleski naslov i sažetak moraju biti na engleskom jeziku. Ne izmišljaj činjenice.\n\nStari naslov: ${clean(item.title || item.titleEn || item.titleHr)}\n\nIzvori:\n${JSON.stringify(sources)}`,
      1800,
      0.15
    ));
  }catch{
    metadata = {};
  }

  const known = oldSlug === KNOWN_OLD_SLUG;
  const titleHr = known
    ? 'Kineski div e-trgovine Alibaba tuži američku vladu zbog obrambene crne liste'
    : clean(metadata.titleHr || item.titleHr || item.title || 'Poslovna analiza');
  const titleEn = known
    ? 'Chinese e-commerce giant Alibaba sues US government over defence blacklist'
    : clean(metadata.titleEn || item.titleEn || item.title || titleHr);

  const [bodyHr,bodyEn] = await Promise.all([
    generateBody(env,'hr',titleHr,sources),
    generateBody(env,'en',titleEn,sources)
  ]);

  if(words(bodyHr)<500 || words(bodyEn)<500){
    throw new Error(`repair_too_short_hr_${words(bodyHr)}_en_${words(bodyEn)}`);
  }

  const newSlug = slugify(titleHr);
  const now = nowIso();
  const canonical = `https://gnk-asg.hr/objave/${newSlug}/`;
  const sourceLines = sources.map((source,index) => `${index + 1}. ${source.source}: ${source.title} – ${source.url}`).join('\n');
  const summaryHr = clean(metadata.summaryHr || bodyHr).slice(0,520);
  const summaryEn = clean(metadata.summaryEn || bodyEn).slice(0,520);
  const image = known ? DEFAULT_IMAGE : (clean(item.image) || DEFAULT_IMAGE);

  const repaired = {
    ...item,
    id:item.id || `repair-${now.replace(/[^0-9]/g,'').slice(0,14)}-${newSlug.slice(0,45)}`,
    kind:'article',
    type:'article',
    slug:newSlug,
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
    category:clean(metadata.category || item.category || 'business'),
    region:clean(metadata.region || item.region || 'world'),
    image,
    imageAlt:`${titleHr} – GNK ASG analiza`,
    imageCredit:'GNK ASG Visual Index',
    author:'Nermin Sefić',
    source:'GNK ASG Intelligence Desk',
    sourceUrl:sources[0]?.url || item.sourceUrl || '',
    sources,
    updatedAt:now,
    publishedAt:item.publishedAt || now,
    published_at:item.published_at || item.publishedAt || now,
    canonical,
    hrUrl:`/objave/${newSlug}/`,
    enUrl:`/publications/${newSlug}/`,
    publicUrl:`/objave/${newSlug}/`,
    wordCountHr:words(bodyHr),
    wordCountEn:words(bodyEn),
    seo:{
      title:clean(metadata.seoTitleHr || titleHr).slice(0,75),
      titleHr:clean(metadata.seoTitleHr || titleHr).slice(0,75),
      titleEn:clean(metadata.seoTitleEn || titleEn).slice(0,75),
      description:clean(metadata.seoDescriptionHr || summaryHr).slice(0,170),
      descriptionHr:clean(metadata.seoDescriptionHr || summaryHr).slice(0,170),
      descriptionEn:clean(metadata.seoDescriptionEn || summaryEn).slice(0,170),
      keywords:Array.isArray(metadata.keywords) ? metadata.keywords.slice(0,20) : ['Alibaba','SAD','obrambena crna lista','e-trgovina','regulacija','geopolitika','GNK ASG'],
      canonical,
      author:'Nermin Sefić'
    }
  };

  const replace = list => [repaired,...list.filter(entry => String(entry?.slug) !== oldSlug && String(entry?.slug) !== newSlug)];
  await writeList(env,'publish:approved',replace(approved));
  await writeList(env,'data:articles:items',replace(articles));

  const teaser = {
    id:`news-${repaired.id}`,
    kind:'news',
    title:repaired.title,
    summary:repaired.summary,
    url:canonical,
    sourceUrl:canonical,
    source:'GNK ASG Intelligence Desk',
    category:repaired.category,
    group:repaired.category,
    region:repaired.region,
    image:repaired.image,
    publishedAt:repaired.publishedAt,
    published_at:repaired.published_at,
    status:'published'
  };

  await writeList(env,'data:news:items',[teaser,...news.filter(entry => String(entry?.url) !== `https://gnk-asg.hr/objave/${oldSlug}/` && String(entry?.url) !== canonical)]);
  await writeJson(env,`article:${repaired.id}`,repaired);
  await writeJson(env,`article:redirect:${oldSlug}`,{slug:newSlug,updatedAt:now});
  await writeJson(env,'article-repair:last',{ok:true,version:VERSION,oldSlug,newSlug,updatedAt:now,wordCountHr:repaired.wordCountHr,wordCountEn:repaired.wordCountEn});

  return {ok:true,version:VERSION,oldSlug,newSlug,article:repaired};
}

async function handle(request,env,ctx){
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/,'') || '/';

  if(path === '/operator/article-repair'){
    if(request.method !== 'POST') return json({ok:false,error:'method_not_allowed'},405);
    if(!authorized(request,env)) return json({ok:false,error:'authorization_required'},401);
    try{
      const body = await request.json().catch(() => ({}));
      const slug = clean(body.slug);
      if(!slug) return json({ok:false,error:'slug_required'},400);
      return json(await repairArticle(env,slug),200);
    }catch(error){
      return json({ok:false,version:VERSION,error:String(error?.message || error)},500);
    }
  }

  const match = path.match(/^\/(objave|publications)\/([^/]+)$/);
  if(match){
    const alias = await readJson(env,`article:redirect:${match[2]}`,null);
    if(alias?.slug && alias.slug !== match[2]){
      return Response.redirect(`https://gnk-asg.hr/${match[1]}/${alias.slug}/`,301);
    }
  }

  return app.fetch(request,env,ctx);
}

export default {
  fetch:handle,
  scheduled(event,env,ctx){
    if(typeof app.scheduled === 'function') return app.scheduled(event,env,ctx);
  },
  email(message,env,ctx){
    if(typeof app.email === 'function') return app.email(message,env,ctx);
  }
};
