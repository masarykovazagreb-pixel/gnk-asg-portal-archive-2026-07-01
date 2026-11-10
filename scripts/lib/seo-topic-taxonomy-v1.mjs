/** Sitewide topical hashtags are human navigation, not Google ranking keywords.
 * A topic tag is permitted only when the canonical route itself establishes
 * that topic; never infer article authorship or add unverified rich snippets. */
const TOPICS=Object.freeze([
  {test:/^\/(?:en\/)?gnk-aktual\/media(?:\/|$)/,label:'#AktualMediaWorld',hr:'/gnk-aktual/media/',en:'/gnk-aktual/media/'},
  {test:/^\/(?:en\/)?gnk-aktual\/grad(?:\/|$)/,label:'#GradskaIzdanja',hr:'/gnk-aktual/media/',en:'/gnk-aktual/media/'},
  {test:/^\/(?:en\/)?gnk-aktual\/(?:tjedni|weekly)(?:\/|$)/,label:'#AktualMediaTjedni',hr:'/gnk-aktual/tjedni/',en:'/en/gnk-aktual/weekly/'},
  {test:/^\/(?:en\/)?tehnologija-buducnosti(?:\/|$)|^\/en\/future-technology(?:\/|$)/,label:'#TehnologijaBuducnosti',hr:'/tehnologija-buducnosti/',en:'/en/future-technology/'},
  {test:/^\/(?:en\/)?aktual-media(?:\/|$)/,label:'#PodatkovniDesk',hr:'/aktual-media/',en:'/en/aktual-media/'},
  {test:/^\/(?:en\/)?gnk-aktual\/(?:mreza|network)(?:\/|$)/,label:'#AktualMediaMreza',hr:'/gnk-aktual/mreza/',en:'/en/gnk-aktual/network/'},
]);
export const BRAND_HASHTAG_TARGETS=Object.freeze({
  '#AKTUALMEDIA':'/gnk-aktual/',
  '#GNKASG':'/',
  '#NerminSefić':'/nermin-sefic/'
});
export function topicTagsForRoute(route){
  if(typeof route!=='string'||!/^\/[a-z0-9\-\u00c0-\u024f\/]*\/?$/iu.test(route))return [];
  const clean=route.replace(/\/{2,}/g,'/').replace(/\/?$/,'/');
  const en=clean.startsWith('/en/');
  return TOPICS.filter(t=>t.test.test(clean)).map(t=>({label:t.label,href:en?t.en:t.hr}));
}
export function brandHashtagTarget(label){
  return BRAND_HASHTAG_TARGETS[label]||null;
}
