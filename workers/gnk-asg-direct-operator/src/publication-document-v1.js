import {validatePublicationReadiness,publicationAttribution,VERSION as READINESS_VERSION} from './publication-readiness-v1.js';

export const VERSION=`GNK_DINAMO_PUBLICATION_DOCUMENT_V1_20260704_${READINESS_VERSION}`;

const clean=value=>String(value??'').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const json=value=>JSON.stringify(value).replace(/</g,'\\u003c');
const paragraphs=value=>clean(value).split(/\n{2,}/u).map(part=>`<p>${esc(part).replace(/\n/g,'<br>')}</p>`).join('');

function articleAuthor(attribution){
  if(attribution.author.type==='Person')return{'@type':'Person','@id':'https://gnk-asg.hr/nermin-sefic/#person',name:attribution.author.name,url:'https://gnk-asg.hr/nermin-sefic/'};
  return{'@type':'Organization','@id':'https://gnk-asg.hr/the-code/intelligence/#editorial-desk',name:attribution.author.name,url:'https://gnk-asg.hr/the-code/intelligence/'};
}

export function renderPublicationDocument(input={}){
  const readiness=validatePublicationReadiness(input);
  if(!readiness.ok){
    const error=new Error('publication_not_ready');
    error.readiness=readiness;
    throw error;
  }
  const attribution=publicationAttribution(input);
  const sourceUrls=[clean(input.primarySource),...(Array.isArray(input.supportingSources)?input.supportingSources.map(clean):[])].filter(Boolean);
  const author=articleAuthor(attribution);
  const datePublished=clean(input.datePublished||input.dateReviewed||input.dateCreated);
  const dateModified=clean(input.dateModified||input.dateReviewed||datePublished);
  const schema={
    '@context':'https://schema.org',
    '@graph':[
      {
        '@type':'NewsArticle',
        '@id':`${clean(input.canonical)}#article`,
        headline:clean(input.title),
        description:clean(input.summary),
        image:{'@type':'ImageObject',url:clean(input.image),caption:clean(input.imageAlt)},
        datePublished,
        dateModified,
        inLanguage:clean(input.language),
        mainEntityOfPage:{'@type':'WebPage','@id':clean(input.canonical)},
        author,
        editor:{'@type':'Person','@id':'https://gnk-asg.hr/nermin-sefic/#person',name:'Nermin Sefić',url:'https://gnk-asg.hr/nermin-sefic/'},
        publisher:{'@type':'Organization','@id':'https://gnk-asg.hr/#gnk-dinamo-ltd',name:'GNK DINAMO Ltd.',url:'https://gnkdinamo.eu/'},
        provider:{'@type':'Organization','@id':'https://gnk-asg.hr/#organization',name:'GNK ASG d.o.o.',url:'https://gnk-asg.hr/'},
        articleSection:clean(input.category),
        isBasedOn:sourceUrls,
        accountablePerson:{'@id':'https://gnk-asg.hr/nermin-sefic/#person'},
        reviewedBy:{'@id':'https://gnk-asg.hr/nermin-sefic/#person'}
      },
      {
        '@type':'BreadcrumbList',
        '@id':`${clean(input.canonical)}#breadcrumb`,
        itemListElement:[
          {'@type':'ListItem',position:1,name:'GNK DINAMO Ltd.',item:'https://gnk-asg.hr/'},
          {'@type':'ListItem',position:2,name:'THE CODE Intelligence',item:'https://gnk-asg.hr/the-code/intelligence/'},
          {'@type':'ListItem',position:3,name:clean(input.title),item:clean(input.canonical)}
        ]
      }
    ]
  };
  const sourceList=sourceUrls.map((url,index)=>`<li><a href="${esc(url)}" rel="nofollow noopener" target="_blank">${index===0?'Primary source':`Supporting source ${index}`}</a></li>`).join('');
  const authorLabel=attribution.author.type==='Person'?`By <a href="/nermin-sefic/">${esc(attribution.author.name)}</a>`:`Prepared by <a href="/the-code/intelligence/">${esc(attribution.author.name)}</a>`;
  const disclosure=clean(input.processDisclosure);
  return`<!doctype html>
<html lang="${esc(input.language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(input.title)} | THE CODE Intelligence</title>
<meta name="description" content="${esc(input.summary)}">
<meta name="robots" content="noindex,nofollow,noarchive">
<link rel="canonical" href="${esc(input.canonical)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(input.title)}">
<meta property="og:description" content="${esc(input.summary)}">
<meta property="og:url" content="${esc(input.canonical)}">
<meta property="og:site_name" content="THE CODE Intelligence">
<meta property="og:image" content="${esc(input.image)}">
<meta property="og:image:alt" content="${esc(input.imageAlt)}">
<meta property="article:published_time" content="${esc(datePublished)}">
<meta property="article:modified_time" content="${esc(dateModified)}">
<meta property="article:section" content="${esc(input.category)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(input.title)}">
<meta name="twitter:description" content="${esc(input.summary)}">
<meta name="twitter:image" content="${esc(input.image)}">
<script type="application/ld+json">${json(schema)}</script>
<style>:root{--gold:#c9a84c;--gold2:#f0d88a;--line:rgba(201,168,76,.36);--muted:#a8a8a8}*{box-sizing:border-box}body{margin:0;background:#000;color:#fff;font-family:Inter,Arial,sans-serif}main{width:min(1080px,calc(100% - 28px));margin:auto;padding:24px 0 72px}.top{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:18px}.top a{padding:9px 13px;border:1px solid var(--line);border-radius:999px;color:var(--gold2);text-decoration:none;font-weight:800}.article{padding:clamp(22px,5vw,58px);border:1px solid var(--line);border-radius:26px;background:linear-gradient(145deg,#111,#030303)}.eyebrow{color:var(--gold);font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}h1{font:800 clamp(2.35rem,6vw,5rem)/1.03 Georgia,serif;margin:14px 0}.lead{color:#d5d5d5;font-size:1.16rem;line-height:1.7}.meta,.credit{color:var(--muted);font-size:.9rem;line-height:1.6}.hero{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:18px;margin:22px 0 9px}.content{max-width:850px;margin:30px auto 0}.content p{font:1.12rem/1.9 Georgia,serif;color:#ededed}.box{margin-top:30px;padding:20px;border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.035)}.box h2{font-family:Georgia,serif;color:var(--gold2);margin-top:0}.box li{margin:.7rem 0}.box a{color:var(--gold2);overflow-wrap:anywhere}.approval{margin-top:20px;border-left:4px solid var(--gold);padding:12px 16px;background:rgba(201,168,76,.08);color:#e8e0c8}@media(max-width:620px){main{width:calc(100% - 12px);padding-top:8px}.article{padding:22px 17px;border-radius:16px}}</style>
</head>
<body>
<main>
<nav class="top"><a href="/the-code/intelligence/">← THE CODE Intelligence</a><a href="/nermin-sefic/">Editor profile</a><a href="/">GNK ASG platform</a></nav>
<article class="article" data-publication-type="${esc(input.publicationType)}" data-readiness="controlled-preview">
<div class="eyebrow">${esc(input.category)} · THE CODE Intelligence · Controlled preview</div>
<h1>${esc(input.title)}</h1>
<p class="lead">${esc(input.summary)}</p>
<p class="meta">${authorLabel} · Edited and reviewed by <a href="/nermin-sefic/" style="color:var(--gold2)">Nermin Sefić</a></p>
<img class="hero" src="${esc(input.image)}" alt="${esc(input.imageAlt)}">
<p class="credit">Publisher: GNK DINAMO Ltd. · Publishing platform/provider: GNK ASG d.o.o.</p>
<div class="content">${paragraphs(input.body)}</div>
<section class="box"><h2>Sources</h2><ol>${sourceList}</ol></section>
<section class="box"><h2>Editorial process</h2><p>${esc(disclosure)}</p><p>Fact check complete · Source review complete · Final human approval recorded.</p></section>
<p class="approval">This preview is intentionally noindex. Public publication requires a separate controlled release action.</p>
</article>
</main>
</body>
</html>`;
}
