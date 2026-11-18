/**
 * RSS DISCOVERY SEARCH STREAMS — not 21 independent publishers.
 * Topics from Google News RSS /search are leads only, not verified articles.
 * Local-language terms are explicit where curated; unsupported languages
 * use English discovery but require local-language editorial review.
 * No fetching is performed here, so no claim that a URL is live.
 */
export const BEATS=Object.freeze([
  'politics','world','business','finance','markets','sports','football',
  'technology','artificial-intelligence','science','health','education',
  'culture','fashion','lifestyle','tourism','climate','energy','transport','local','justice'
]);
const words={
 hr:['politika','svijet međunarodno','gospodarstvo','financije banke','dionice burza','sport','nogomet liga','tehnologija','umjetna inteligencija','znanost','zdravlje medicina','obrazovanje','kultura umjetnost','moda','životni stil','turizam putovanja','klima okoliš','energetika','promet infrastruktura','lokalne vijesti','pravosuđe sudovi'],
 en:['politics government','world affairs','business economy','finance banking','stock markets','sports','football league','technology','artificial intelligence','science research','health medicine','education schools','culture arts','fashion','lifestyle','tourism travel','climate environment','energy','transport infrastructure','local community news','justice courts'],
 de:['Politik','Welt Nachrichten','Wirtschaft','Finanzen Banken','Aktien Börse','Sport','Fußball','Technologie','Künstliche Intelligenz','Wissenschaft','Gesundheit Medizin','Bildung','Kultur','Mode','Lebensstil','Tourismus Reisen','Klima Umwelt','Energie','Verkehr Infrastruktur','lokale Nachrichten','Justiz Gerichte'],
 it:['politica','notizie mondo','economia imprese','finanza banche','borsa azioni','sport','calcio','tecnologia','intelligenza artificiale','scienza','salute medicina','istruzione','cultura','moda','stile di vita','turismo viaggi','clima ambiente','energia','trasporti infrastrutture','notizie locali','giustizia tribunali'],
 fr:['politique','actualités monde','économie entreprises','finance banques','bourse actions','sport','football','technologie','intelligence artificielle','science','santé médecine','éducation','culture','mode','mode de vie','tourisme voyages','climat environnement','énergie','transport infrastructures','actualités locales','justice tribunaux'],
 es:['política','noticias mundo','economía empresas','finanzas bancos','bolsa acciones','deportes','fútbol','tecnología','inteligencia artificial','ciencia','salud medicina','educación','cultura','moda','estilo de vida','turismo viajes','clima medio ambiente','energía','transporte infraestructuras','noticias locales','justicia tribunales'],
 pt:['política','notícias mundo','economia negócios','finanças bancos','bolsa ações','esportes','futebol','tecnologia','inteligência artificial','ciência','saúde medicina','educação','cultura','moda','estilo de vida','turismo viagens','clima meio ambiente','energia','transporte infraestrutura','notícias locais','justiça tribunais'],
 sl:['politika','svet novice','gospodarstvo','finance banke','delnice borza','šport','nogomet','tehnologija','umetna inteligenca','znanost','zdravje medicina','izobraževanje','kultura','moda','življenjski slog','turizem potovanja','podnebje okolje','energija','promet infrastruktura','lokalne novice','pravosodje sodišča'],
 sr:['politika','svet vesti','privreda ekonomija','finansije banke','berza akcije','sport','fudbal','tehnologija','veštačka inteligencija','nauka','zdravlje medicina','obrazovanje','kultura','moda','stil života','turizam putovanja','klima životna sredina','energetika','saobraćaj infrastruktura','lokalne vesti','pravosuđe sudovi']
};
words.bs=words.hr;
export function topicDiscoveryStreams(country) {
  const code=String(country?.code||'');
  const lang=String(country?.language||'');
  if(!/^[A-Z]{2}$/.test(code)|| !/^[a-z]{2,3}$/.test(lang))throw Error('INVALID_COUNTRY_LOCALE');
  const curated=Object.hasOwn(words,lang);
  const searchLang=curated?lang:'en';
  const tokens=words[searchLang];
  if(tokens.length!==BEATS.length)throw Error('TOPIC_REGISTRY_DRIFT');
  return BEATS.map((beat,i)=>{
    const url=new URL('https://news.google.com/rss/search');
    url.searchParams.set('q',tokens[i]+' '+String(country.nameLocal || country.nameEn || code));
    url.searchParams.set('hl',searchLang);
    url.searchParams.set('gl',code);
    url.searchParams.set('ceid',code+':'+searchLang);
    return {beat,feed:url.toString(),aggregator:'Google News',independentPublisher:false,
      sourceEvidenceVerified:false,searchLanguage:searchLang,publicationLanguage:lang,
      needsNativeLanguageVerification:!curated,fetchStatus:'UNVERIFIED'};
  });
}
