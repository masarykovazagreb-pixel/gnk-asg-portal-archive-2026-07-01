// AKTUAL MEDIA: source-first, multilingual, platform-neutral distribution packaging.
// This module does not make network calls or claim anything was published.
import {createHash} from 'node:crypto';

export const ORIGIN='https://gnk-asg.hr';
export const BRAND='AKTUAL MEDIA';
export const EDITIONS=[
  ['zagreb','hr','Zagreb'],['beograd','sr','Beograd'],['sarajevo','bs','Sarajevo'],
  ['budimpesta','hu','Budapest'],['ljubljana','sl','Ljubljana'],['rim','it','Roma'],
  ['sofija','bg','Sofija'],['bukurest','ro','București']
];

// Only the public-network introduction is localized here. Article headlines
// and claims remain in the original language until an approved translation exists.
export const INTRO={
  hr:'Regionalni pregled medija i kritički osvrt na način izvještavanja',
  en:'Regional media coverage and a critical review of reporting',
  sr:'Regionalni pregled medija i kritički osvrt na izveštavanje',
  bs:'Regionalni pregled medija i kritički osvrt na izvještavanje',
  hu:'Regionális médiaszemle és kritikai áttekintés a tudósításokról',
  sl:'Regionalni pregled medijev in kritični pogled na poročanje',
  it:'Rassegna stampa regionale e analisi critica dell’informazione',
  bg:'Регионален медиен преглед и критичен анализ на отразяването',
  ro:'Revistă a presei regionale și analiză critică a relatărilor',
  es:'Panorama de medios regionales y análisis crítico de la cobertura',
  pt:'Panorama da imprensa regional e análise crítica da cobertura',
  fr:'Revue des médias régionaux et analyse critique de leur couverture',
  de:'Regionale Medienschau und kritische Analyse der Berichterstattung',
  ja:'地域メディアの動向と報道内容に関する批判的な分析',
  zh:'区域媒体报道综述与批判性分析',
  vi:'Tổng quan truyền thông khu vực và phân tích phản biện về cách đưa tin',
  id:'Tinjauan media regional dan analisis kritis pemberitaan',
  ar:'ملخص للتغطية الإعلامية الإقليمية وتحليل نقدي لطريقة تناول الأخبار',
  sw:'Muhtasari wa vyombo vya habari vya kikanda na uchambuzi wa taarifa'
};
export const TOPIC_TAGS=['#AktualMedia','#RegionalNews'];
const allowedRoutes=/^\/(?:objave|komentari|analize|en\/(?:commentary|publications|analysis)|kanal\/(?:zagreb|beograd|sarajevo|budimpesta|ljubljana|rim|sofija|bukurest)\/clanak)\/[^\s?#]+\/$/;
export const short = (s,n=190) => {const clean=String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();return [...clean].length>n?[...clean].slice(0,n-1).join('').replace(/\s+\S*$/,'')+'…':clean};
export function safeCanonical(url){
  try {const u=new URL(url);return u.protocol==='https:'&&u.hostname==='gnk-asg.hr'&&allowedRoutes.test(u.pathname)&&!u.search&&!u.hash?u.toString():null;}catch{return null;}
}
export function ownedImage(image){
  try{const u=new URL(image);return u.protocol==='https:' && u.hostname==='gnk-asg.hr' &&
    /^\/assets\/[a-z0-9/_\-.]+\.(?:jpe?g|png|webp)$/i.test(u.pathname) && !u.search && !u.hash ?u.toString():null;}catch{return null;}
}
export function selectCandidates({featured={items:[]},registry={items:[]},regions={},now=new Date(),max=40}={}){
  const seen=new Set(), result=[];
  const accept=(raw)=> {
    if(!raw?.title||!raw?.path||['held','hold','draft','blocked','cancelled'].includes(String(raw.status||'').toLowerCase()))return;
    const date=raw.publishedAt||raw.datePublished||raw.date;
    if(!date||!Number.isFinite(Date.parse(date))||Date.parse(date)>now.getTime())return;
    const url=safeCanonical(raw.url||ORIGIN+raw.path);
    if(!url||seen.has(url))return;
    const lang=raw.language||raw.lang||'hr';
    if(!INTRO[lang])return;
    seen.add(url);
    result.push({canonical:url,path:new URL(url).pathname,title:short(raw.title,230),summary:short(raw.description||raw.summary,225),lang,
      publishedAt:new Date(date).toISOString(),image:ownedImage(raw.image||raw.coverImage||raw.ogImage),
      sourceName:short(raw.sourceName||'',65),edition:short(raw.edition||'AKTUAL MEDIA',80),
      reviewMode:raw.reviewMode===true});
  };
  for(const x of [...(featured.items||[]),...(registry.items||[])])accept(x);
  for(const [id,lang,city] of EDITIONS){
    const items=regions[id]?.items||[];
    // At most two original-language items per edition per plan; source pictures
    // cannot be rehosted without rights — use owned editorial covers only.
    for(const item of [...items].sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0)).slice(0,2)){
      accept({...item,path:'/kanal/'+id+'/clanak/'+item.slug+'/',
        image:ORIGIN+'/assets/izdanja/'+id+'-1200.webp',
        edition:'AKTUAL MEDIA KANAL '+city,language:lang,reviewMode:true,publishedAt:item.date});
    }
  }
  return result.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)).slice(0,max);
}
export function buildCopy(item,targetLanguage=item.lang,limit=500){
  if(!INTRO[targetLanguage])throw new Error('Unsupported locale: '+targetLanguage);
  if(!safeCanonical(item.canonical))throw new Error('Invalid canonical source');
  // Never label the original article as translated. The localized text below
  // describes our distribution network, NOT a translated version of the news.
  const label=INTRO[targetLanguage];
  const source=item.sourceName?' • '+item.sourceName:'';
  const tags=TOPIC_TAGS.join(' ');
  const fixed=[BRAND+' | '+label,short(item.title,150),short(item.edition,65)+source,item.canonical,tags];
  let text=fixed.join('\n');
  while([...text].length>limit && fixed[1].length>28){fixed[1]=short(fixed[1],Math.max(28,[...fixed[1]].length-14));text=fixed.join('\n');}
  if([...text].length>limit)throw new Error('Cannot fit canonical into post');
  return {text,lang:targetLanguage,canonical:item.canonical,alt:short(item.title+' — AKTUAL MEDIA, '+item.edition,260),image:item.image||null,
    sourceLanguage:item.lang,translatedArticle:false,disclosure:item.reviewMode?'Automatski osvrt na način izvještavanja; navodi izvornika nisu neovisno potvrđeni.':null};
}
export const digest = x=>createHash('sha256').update(String(x)).digest('hex');
export const postKey = (platform,item,language)=>digest(platform+'\0'+item.canonical+'\0'+language);
export const publicUrl=(value)=>{try{const u=new URL(value);return u.protocol==='https:'&&u.hostname!==''&&!u.username&&!u.password?u.toString():null}catch{return null}};
