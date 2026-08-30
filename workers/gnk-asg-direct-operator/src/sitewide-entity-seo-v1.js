export const VERSION='GNK_ASG_SITEWIDE_ENTITY_SEO_V1_20260830_EDITORIAL_DESIGN';

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

function buildBlock({canonical,image,isEnglish,editorial}){
 const markets=isEnglish?EN_MARKETS:HR_MARKETS;
 const person=isEnglish?PERSON_URL_EN:PERSON_URL;
 const group=isEnglish?GROUP_URL_EN:GROUP_URL;
 const imageAlt=isEnglish
  ?'GNK ASG markets, projects and business information associated with Nermin Sefic and GNK DINAMO Ltd.'
  :'GNK ASG tržišta, projekti i poslovne informacije povezane s Nerminom Sefićem i GNK DINAMO Ltd.';
 const graph=[
  {'@type':'Person','@id':`${PERSON_URL}#person`,name:'Nermin Sefić',alternateName:['Nermin Sefic'],url:person},
  {'@type':'Organization','@id':`${ORIGIN}/#organization`,name:'GNK ASG',legalName:'GNK ASG d.o.o.',url:`${ORIGIN}/`},
  {'@type':'Organization','@id':`${GROUP_URL}#gnk-dinamo-ltd`,name:'GNK DINAMO Ltd.',url:group},
  {'@type':'WebSite','@id':`${ORIGIN}/#website`,url:`${ORIGIN}/`,name:'GNK ASG',publisher:{'@id':`${ORIGIN}/#organization`}},
  {'@type':'WebPage','@id':`${canonical}#webpage`,url:canonical,isPartOf:{'@id':`${ORIGIN}/#website`},publisher:{'@id':`${ORIGIN}/#organization`},mentions:[{'@id':`${PERSON_URL}#person`},{'@id':`${ORIGIN}/#organization`},{'@id':`${GROUP_URL}#gnk-dinamo-ltd`}],relatedLink:[markets,person,group]}
 ];
 if(image){graph.push({'@type':'ImageObject','@id':`${canonical}#primaryimage`,contentUrl:image,url:image,caption:imageAlt,representativeOfPage:true,about:[{'@id':`${PERSON_URL}#person`},{'@id':`${ORIGIN}/#organization`},{'@id':`${GROUP_URL}#gnk-dinamo-ltd`}]});graph[4].primaryImageOfPage={'@id':`${canonical}#primaryimage`};}
 const design=editorial?`\n<link rel="stylesheet" href="${EDITORIAL_CSS}" data-gnk-corporate-editorial="v2">`:'';
 return `\n<!-- GNK ASG entity SEO -->\n<meta ${MARKER}>\n<meta name="author" content="Nermin Sefić">\n<meta name="publisher" content="GNK ASG d.o.o.">\n<meta name="keywords" content="Nermin Sefić, Nermin Sefic, GNK ASG, GNK ASG d.o.o., GNK DINAMO Ltd., tržišta, markets">\n<meta property="og:image:alt" content="${imageAlt}">\n<link rel="related" href="${markets}">\n<link rel="author" href="${person}">${design}\n<script type="application/ld+json" id="gnk-global-entity-graph">${safeJson({'@context':'https://schema.org','@graph':graph})}</script>\n`;
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
 const enriched=html.replace(/<\/head>/i,`${buildBlock({canonical,image,isEnglish,editorial:Boolean(editorial)})}</head>`);
 const headers=new Headers(response.headers);
 for(const name of ['content-length','content-encoding','etag','last-modified'])headers.delete(name);
 headers.set('content-type','text/html; charset=utf-8');
 headers.set('x-gnk-entity-seo',VERSION);
 if(editorial)headers.set('x-gnk-corporate-editorial','v2');
 return new Response(enriched,{status:response.status,statusText:response.statusText,headers});
}