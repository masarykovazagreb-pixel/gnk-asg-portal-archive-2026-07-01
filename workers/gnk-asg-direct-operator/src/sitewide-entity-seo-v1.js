export const VERSION='GNK_ASG_SITEWIDE_ENTITY_SEO_V1_20260831_TRUTH_CONDITIONAL';

const MARKER='data-gnk-entity-seo="v1"';
const ORIGIN='https://gnk-asg.hr';
const HR_MARKETS=`${ORIGIN}/markets/`;
const EN_MARKETS=`${ORIGIN}/en/markets/`;
const PERSON_URL=`${ORIGIN}/nermin-sefic/`;
const PERSON_URL_EN=`${ORIGIN}/en/nermin-sefic/`;
const GROUP_URL=`${ORIGIN}/group-network/`;
const GROUP_URL_EN=`${ORIGIN}/en/group-network/`;
const EDITORIAL_CSS='/assets/corporate-editorial-v2.css?v=20260830';
const AI_EDITORIAL='/objave/ai-radna-snaga-ai-workforce-u-tisku/';
const KONCAR_EDITORIAL='/objave/koncar-gnk-asg-504-milijuna-ai-radna-snaga-izvoz/';

function contentType(response){return String(response.headers.get('content-type')||'').toLowerCase();}
function canonicalFromHtml(html,fallback){const match=html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)||html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);return match?.[1]||fallback;}
function ogImageFromHtml(html){const match=html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)||html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);return match?.[1]||'';}
function hasNoIndex(html){return /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)||/<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html);}
function safeJson(value){return JSON.stringify(value).replace(/</g,'\\u003c');}
function editorialClass(pathname){if(pathname===AI_EDITORIAL)return 'corporate-editorial corporate-editorial--ai';if(pathname===KONCAR_EDITORIAL)return 'corporate-editorial corporate-editorial--koncar';return '';}
function injectBodyClass(html,classes){if(!classes)return html;return html.replace(/<body([^>]*)>/i,(full,attrs)=>{if(/\bclass=["']/i.test(attrs))return full.replace(/class=(["'])(.*?)\1/i,(m,q,value)=>`class=${q}${value} ${classes}${q}`);return `<body${attrs} class="${classes}">`;});}
function stripScriptsAndStyles(html){return String(html).replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ');}
function pageTruth(html){
 const visible=stripScriptsAndStyles(html);
 const person=/(?:Nermin\s+Sefi(?:ć|c)|Sefi(?:ć|c)\s+Nermin)/i.test(visible);
 const group=/GNK\s+DINAMO\s+(?:Ltd\.?|LTD)/i.test(visible);
 const explicitAuthor=/(?:\bautor\b|\bauthor\b)\s*:?\s*(?:<[^>]+>\s*)*(?:Nermin\s+Sefi(?:ć|c)|Sefi(?:ć|c)\s+Nermin)/i.test(visible)||/<meta[^>]+name=["']author["'][^>]+content=["'][^"']*(?:Nermin\s+Sefi(?:ć|c)|Sefi(?:ć|c)\s+Nermin)[^"']*["']/i.test(html)||/<a[^>]+rel=["'][^"']*author[^"']*["'][^>]*href=["'][^"']*nermin-sefic/i.test(html);
 return {person,group,explicitAuthor};
}

function buildBlock({canonical,image,isEnglish,editorial,truth}){
 const markets=isEnglish?EN_MARKETS:HR_MARKETS;
 const person=isEnglish?PERSON_URL_EN:PERSON_URL;
 const group=isEnglish?GROUP_URL_EN:GROUP_URL;
 const graph=[
  {'@type':'Organization','@id':`${ORIGIN}/#organization`,name:'GNK ASG',legalName:'GNK ASG d.o.o.',url:`${ORIGIN}/`},
  {'@type':'WebSite','@id':`${ORIGIN}/#website`,url:`${ORIGIN}/`,name:'GNK ASG',publisher:{'@id':`${ORIGIN}/#organization`}}
 ];
 const mentions=[{'@id':`${ORIGIN}/#organization`}];
 const related=[markets];
 if(truth.person){graph.push({'@type':'Person','@id':`${PERSON_URL}#person`,name:'Nermin Sefić',alternateName:['Nermin Sefic','Sefić Nermin','Sefic Nermin'],url:person});mentions.push({'@id':`${PERSON_URL}#person`});related.push(person);}
 if(truth.group){graph.push({'@type':'Organization','@id':`${GROUP_URL}#gnk-dinamo-ltd`,name:'GNK DINAMO Ltd.',alternateName:['GNK DINAMO LTD'],url:group});mentions.push({'@id':`${GROUP_URL}#gnk-dinamo-ltd`});related.push(group);}
 const webpage={'@type':'WebPage','@id':`${canonical}#webpage`,url:canonical,isPartOf:{'@id':`${ORIGIN}/#website`},publisher:{'@id':`${ORIGIN}/#organization`},mentions,relatedLink:related};
 graph.push(webpage);
 if(image){
  const about=[{'@id':`${ORIGIN}/#organization`}];
  if(truth.person)about.push({'@id':`${PERSON_URL}#person`});
  if(truth.group)about.push({'@id':`${GROUP_URL}#gnk-dinamo-ltd`});
  graph.push({'@type':'ImageObject','@id':`${canonical}#primaryimage`,contentUrl:image,url:image,representativeOfPage:true,about});
  webpage.primaryImageOfPage={'@id':`${canonical}#primaryimage`};
 }
 const design=editorial?`\n<link rel="stylesheet" href="${EDITORIAL_CSS}" data-gnk-corporate-editorial="v2">`:'';
 const authorMeta=truth.explicitAuthor?`\n<meta name="author" content="Nermin Sefić">\n<link rel="author" href="${person}">`:'';
 return `\n<!-- GNK ASG entity SEO -->\n<meta ${MARKER}>\n<meta name="publisher" content="GNK ASG d.o.o.">\n<link rel="related" href="${markets}">${authorMeta}${design}\n<script type="application/ld+json" id="gnk-global-entity-graph">${safeJson({'@context':'https://schema.org','@graph':graph})}</script>\n`;
}

export async function enhancePublicEntitySeo(response,request){
 if(!response||request.method!=='GET'||response.status!==200||!contentType(response).includes('text/html'))return response;
 let html=await response.text();
 const url=new URL(request.url);
 const editorial=editorialClass(url.pathname);
 if(editorial)html=injectBodyClass(html,editorial);
 if(!html||html.includes(MARKER)||hasNoIndex(html)||!/<\/head>/i.test(html))return new Response(html,{status:response.status,statusText:response.statusText,headers:response.headers});
 const isEnglish=url.pathname==='/en'||url.pathname.startsWith('/en/');
 const canonical=canonicalFromHtml(html,`${ORIGIN}${url.pathname}`);
 const image=ogImageFromHtml(html);
 const truth=pageTruth(html);
 const enriched=html.replace(/<\/head>/i,`${buildBlock({canonical,image,isEnglish,editorial:Boolean(editorial),truth})}</head>`);
 const headers=new Headers(response.headers);
 for(const name of ['content-length','content-encoding','etag','last-modified'])headers.delete(name);
 headers.set('content-type','text/html; charset=utf-8');
 headers.set('x-gnk-entity-seo',VERSION);
 if(editorial)headers.set('x-gnk-corporate-editorial','v2');
 return new Response(enriched,{status:response.status,statusText:response.statusText,headers});
}
