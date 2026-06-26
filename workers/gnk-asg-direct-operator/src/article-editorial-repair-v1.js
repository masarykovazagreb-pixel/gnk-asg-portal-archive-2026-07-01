export const VERSION='GNK_ASG_ARTICLE_EDITORIAL_REPAIR_V1_20260626';
const MODEL='@cf/meta/llama-3.1-8b-instruct-fast';
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const words=value=>String(value||'').trim().split(/\s+/).filter(Boolean).length;

async function runAi(env,system,prompt,maxTokens=3800){
  if(!env.AI?.run)throw new Error('AI_binding_missing');
  const result=await env.AI.run(env.AUTO_EDITOR_MODEL||MODEL,{messages:[{role:'system',content:system},{role:'user',content:prompt}],max_tokens:maxTokens,temperature:.12});
  return String(result?.response||result?.result?.response||result?.output_text||result?.text||'').replace(/^```(?:json|markdown|text)?/i,'').replace(/```$/,'').trim();
}
function sourceData(article){
  return(Array.isArray(article?.sources)?article.sources:[]).slice(0,5).map(item=>({title:clean(item.title),summary:clean(item.summary),source:clean(item.source),url:clean(item.url),publishedAt:item.publishedAt||''})).filter(item=>item.title&&item.url);
}
function sourceList(sources,label){return`\n\n${label}:\n${sources.map((item,index)=>`${index+1}. ${item.source}: ${item.title} – ${item.url}`).join('\n')}`}
async function generateBody(env,language,article,sources){
  const hr=language==='hr';
  const system=hr?'Urednik si poslovnog i tehnološkog medija. Pišeš standardnim hrvatskim jezikom, činjenično i bez senzacionalizma.':'You are a business and technology editor. Write factual international English without sensationalism.';
  const prompt=hr
    ? `Napiši novu analizu od 600 do 800 riječi o glavnoj temi prvog izvora. Ostale izvore koristi samo ako su izravno povezani s istom temom; nepovezane teme potpuno zanemari. Koristi isključivo činjenice iz priloženih izvora. Tvrdnje koje izvor ne potvrđuje izravno pripiši riječima "prema izvješću" ili "prema navodu izvora". Ne izmišljaj brojke, osobe, događaje ni zaključke. Bez naslova, popisa, markdowna, potpisa i odjeljka izvora. Izbjegni ponavljanje rečenica i konstrukcije "morati da". Struktura: kontekst, potvrđene činjenice, poslovni učinci, europski ili regionalni kontekst, rizici i prilike, odmjeren zaključak.\n\nIzvori: ${JSON.stringify(sources)}`
    : `Write a new 600-to-800-word analysis about the primary topic in the first source. Use other sources only when they directly concern the same topic and ignore unrelated topics entirely. Use only facts contained in the supplied sources. Attribute claims not directly confirmed with phrases such as "according to the report". Do not invent figures, people, events or conclusions. No title, lists, markdown, signature or source section. Avoid repeated sentences. Structure: context, confirmed facts, business effects, European or regional context, risks and opportunities, measured conclusion.\n\nSources: ${JSON.stringify(sources)}`;
  let body=await runAi(env,system,prompt,3900);
  if(words(body)<520){
    const extra=await runAi(env,system,hr
      ? `Nastavi sljedeći tekst s 180 do 260 potpuno novih riječi, bez ponavljanja i samo na temelju istih izvora. Vrati samo nastavak.\n\nTekst: ${body}\n\nIzvori: ${JSON.stringify(sources)}`
      : `Continue the following text with 180 to 260 entirely new words, without repetition and using only the same sources. Return only the continuation.\n\nText: ${body}\n\nSources: ${JSON.stringify(sources)}`,1800);
    body=`${body}\n\n${extra}`;
  }
  return body;
}
function extractJson(raw){const start=raw.indexOf('{'),end=raw.lastIndexOf('}');if(start<0||end<=start)throw new Error('metadata_json_missing');return JSON.parse(raw.slice(start,end+1))}
async function generateMetadata(env,bodyHr,bodyEn,sources){
  const raw=await runAi(env,'Ti si dvojezični urednik GNK ASG Intelligence Deska.',`Vrati samo valjani JSON s ključevima titleHr,titleEn,summaryHr,summaryEn,seoTitleHr,seoTitleEn,seoDescriptionHr,seoDescriptionEn,keywords. Hrvatski naslov mora biti prirodan standardni hrvatski, a engleski naslov prirodan engleski. Sažeci neka imaju 70–110 riječi. SEO naslovi do 70 znakova, SEO opisi 120–165 znakova. keywords mora biti niz od 8–15 pojmova. Ne dodaj činjenice kojih nema u tekstovima ili izvorima.\n\nHR tekst: ${bodyHr.slice(0,10000)}\n\nEN text: ${bodyEn.slice(0,10000)}\n\nSources: ${JSON.stringify(sources)}`,2200);
  return extractJson(raw);
}
export async function repairArticle(env,article){
  const sources=sourceData(article);
  if(!article?.id||!sources.length)return{ok:false,error:'repair_sources_missing',version:VERSION};
  try{
    const [bodyHr,bodyEn]=await Promise.all([generateBody(env,'hr',article,sources),generateBody(env,'en',article,sources)]);
    const meta=await generateMetadata(env,bodyHr,bodyEn,sources);
    const canonical=article?.seo?.canonical||article?.canonical||article?.publicUrl||`https://gnk-asg.hr/objave/${article.slug||article.id}.html`;
    const repaired={
      ...article,
      title:clean(meta.titleHr),titleHr:clean(meta.titleHr),titleEn:clean(meta.titleEn),
      summary:clean(meta.summaryHr),summaryHr:clean(meta.summaryHr),summaryEn:clean(meta.summaryEn),
      body:`${bodyHr}${sourceList(sources,'Izvori informacija')}\n\nAutor: Nermin Sefić`,
      bodyHr:`${bodyHr}${sourceList(sources,'Izvori informacija')}\n\nAutor: Nermin Sefić`,
      bodyEn:`${bodyEn}${sourceList(sources,'Information sources')}\n\nAuthor: Nermin Sefić`,
      wordCountHr:words(bodyHr),wordCountEn:words(bodyEn),
      status:'published',approvedForPublic:true,
      seo:{...(article.seo||{}),title:clean(meta.seoTitleHr||meta.titleHr).slice(0,70),titleHr:clean(meta.seoTitleHr||meta.titleHr).slice(0,70),titleEn:clean(meta.seoTitleEn||meta.titleEn).slice(0,70),description:clean(meta.seoDescriptionHr||meta.summaryHr).slice(0,165),descriptionHr:clean(meta.seoDescriptionHr||meta.summaryHr).slice(0,165),descriptionEn:clean(meta.seoDescriptionEn||meta.summaryEn).slice(0,165),keywords:Array.isArray(meta.keywords)?meta.keywords.map(clean).filter(Boolean).slice(0,15):[],canonical},
      canonical,
      updatedAt:new Date().toISOString(),
      editorialRepair:{version:VERSION,sourceCount:sources.length,repairedAt:new Date().toISOString()}
    };
    return{ok:true,version:VERSION,article:repaired};
  }catch(error){return{ok:false,version:VERSION,error:String(error?.message||error)}}
}
