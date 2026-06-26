import app from './index-admin-hub-v22-news.js';

const VERSION='GNK_ASG_ADMIN_HUB_V23_AKTUAL_V1_20260626';
const MODIFIED='2026-06-26';
const FIRST_SLUG='kljucni-faktori-motivacije-za-pokretanje-vlastitog-posla';
const HR_SLUGS=new Set([
  'kljucne-vjestine-za-uspjeh-u-poduzetnistvu',
  'unapredenje-prodaje-i-marketinga-za-uspjesno-poduzetnistvo',
  'kljucne-vjestine-za-uspjesno-financijsko-upravljanje-u-poduzetnistvu',
  'kako-pretvoriti-ideju-u-uspjesan-poduzetnicki-poduhvat',
  'istrazivanje-trzista-kljuc-uspjeha-za-nove-poduzetnike',
  'analiza-lokalnog-trzista-kljuc-uspjeha-vaseg-poslovanja',
  'izrada-upitnika-za-istrazivanje-trzista-kljuc-uspjeha'
]);

function normalizedPath(value){return String(value||'/').replace(/\/+$/,'')||'/';}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));}
function safeJson(value){return JSON.stringify(value).replace(/</g,'\\u003c');}
function cleanText(value){return String(value||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}
function extractTitle(body,slug){
  const match=body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return cleanText(match?.[1])||slug.replace(/-/g,' ').replace(/\b\w/g,char=>char.toUpperCase());
}
function publishedDate(slug){return slug===FIRST_SLUG?'2024-10-02':'2024-10-03';}
function language(slug){return HR_SLUGS.has(slug)?'hr':'sr-Latn';}
function description(title){return `${title} — autorska kolumna Nermina Sefića u GNK ASG arhivi objava, povezana s GNK DINAMO Ltd., poduzetništvom, poslovanjem i istraživanjem tržišta.`;}
function keywordText(title){
  const topic=/tržišt|trzist/i.test(title)?'istraživanje tržišta, analiza tržišta, ciljani kupci':'poduzetništvo, preduzetništvo, poslovna motivacija, poslovne ideje';
  return `Nermin Sefić, Nermin Sefic, GNK ASG, GNK ASG d.o.o., GNK DINAMO Ltd., Aktual.rs, autorska kolumna, ${topic}`;
}

function schema(slug,title,origin){
  const canonical=`${origin}/objave/aktual/${slug}/`;
  const source=`https://aktual.rs/clanak/${slug}/`;
  const image=`${origin}/assets/objave/aktual/${slug}.png`;
  const published=publishedDate(slug);
  return{
    '@context':'https://schema.org',
    '@graph':[
      {
        '@type':'Article','@id':`${canonical}#article`,headline:title,description:description(title),
        url:canonical,mainEntityOfPage:{'@type':'WebPage','@id':canonical},image:{'@id':`${image}#image`},
        author:{'@type':'Person','@id':`${origin}/nermin-sefic/#person`,name:'Nermin Sefić',alternateName:'Nermin Sefic',url:`${origin}/nermin-sefic/`},
        publisher:{'@type':'Organization','@id':`${origin}/#organization`,name:'GNK ASG d.o.o.',url:`${origin}/`},
        datePublished:published,dateModified:MODIFIED,inLanguage:language(slug),isBasedOn:source,
        articleSection:'Objave · Aktual kolumne',keywords:keywordText(title),
        about:[
          {'@type':'Person',name:'Nermin Sefić',alternateName:'Nermin Sefic'},
          {'@type':'Organization',name:'GNK ASG d.o.o.',url:`${origin}/`},
          {'@type':'Organization',name:'GNK DINAMO Ltd.'}
        ],
        copyrightHolder:{'@type':'Person',name:'Nermin Sefić'},copyrightYear:2024,
        creditText:'Autorski tekst Nermina Sefića; izvorno objavljeno na Aktual.rs.'
      },
      {
        '@type':'ImageObject','@id':`${image}#image`,contentUrl:image,url:image,name:`${title} — fotografija`,
        caption:`${title}. Autorska kolumna Nermina Sefića na GNK ASG portalu.`,
        description:`Fotografija uz kolumnu ${title}. SEO teme: Nermin Sefić, GNK ASG i GNK DINAMO Ltd.`,
        creditText:'Foto: Shutterstock, prema izvornoj objavi Aktual.rs',
        copyrightNotice:'Fotografija korištena prema licenci uz izvornu objavu.',
        representativeOfPage:true,
        about:[
          {'@type':'Person',name:'Nermin Sefić'},
          {'@type':'Organization',name:'GNK ASG d.o.o.'},
          {'@type':'Organization',name:'GNK DINAMO Ltd.'}
        ],keywords:keywordText(title)
      },
      {
        '@type':'BreadcrumbList','@id':`${canonical}#breadcrumb`,itemListElement:[
          {'@type':'ListItem',position:1,name:'GNK ASG',item:`${origin}/`},
          {'@type':'ListItem',position:2,name:'Objave',item:`${origin}/objave/`},
          {'@type':'ListItem',position:3,name:'Aktual kolumne',item:`${origin}/objave/#aktual`},
          {'@type':'ListItem',position:4,name:title,item:canonical}
        ]
      }
    ]
  };
}

function addBodyClass(body){
  return body.replace(/<body([^>]*)>/i,(full,attributes)=>{
    if(/class\s*=/.test(attributes))return `<body${attributes.replace(/class=(['"])(.*?)\1/i,(match,quote,value)=>`class=${quote}${value} gnk-aktual-archive${quote}`)}>`;
    return `<body class="gnk-aktual-archive"${attributes}>`;
  });
}

async function patchArticle(response,request,slug){
  if(!response.ok||!String(response.headers.get('content-type')||'').toLowerCase().includes('text/html'))return response;
  const origin=new URL(request.url).origin.replace(/^https:\/\/www\./,'https://');
  const canonical=`${origin}/objave/aktual/${slug}/`;
  const source=`https://aktual.rs/clanak/${slug}/`;
  const image=`${origin}/assets/objave/aktual/${slug}.png`;
  const published=publishedDate(slug);
  let body=await response.text();
  const title=extractTitle(body,slug);
  const schemaTag=`<script id="gnk-aktual-schema-v1" type="application/ld+json">${safeJson(schema(slug,title,origin))}</script>`;
  if(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i.test(body))body=body.replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i,schemaTag);
  else body=body.replace('</head>',`${schemaTag}</head>`);

  const headInjection=`<meta name="author" content="Nermin Sefić"><meta property="article:author" content="Nermin Sefić"><meta property="article:section" content="Objave · Aktual kolumne"><meta property="article:published_time" content="${published}T12:00:00+02:00"><meta property="article:modified_time" content="${MODIFIED}T21:05:00+02:00"><meta property="og:site_name" content="GNK ASG"><meta property="og:image:alt" content="${escapeHtml(title)} — Nermin Sefić, GNK ASG i GNK DINAMO Ltd."><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description(title))}"><meta name="twitter:image:alt" content="${escapeHtml(title)} — Nermin Sefić, GNK ASG i GNK DINAMO Ltd."><link rel="author" href="${origin}/nermin-sefic/"><link rel="stylesheet" href="/assets/aktual-archive-v1.css?v=20260626-v1">`;
  if(!body.includes('/assets/aktual-archive-v1.css'))body=body.replace('</head>',`${headInjection}</head>`);
  body=body.replace(/<link\s+rel=["']canonical["'][^>]*>/i,`<link rel="canonical" href="${canonical}">`);
  body=body.replace(/<meta\s+property=["']og:url["'][^>]*>/i,`<meta property="og:url" content="${canonical}">`);
  body=body.replace(/<meta\s+property=["']og:image["'][^>]*>/i,`<meta property="og:image" content="${image}">`);
  body=body.replace(/<meta\s+name=["']twitter:image["'][^>]*>/i,`<meta name="twitter:image" content="${image}">`);
  body=body.replace(/href=["']https:\/\/aktual\.rs\/clanak\/[^"']+["']/i,`href="${source}"`);
  body=addBodyClass(body);
  if(!body.includes('/assets/aktual-archive-v1.js'))body=body.replace('</body>',`<script src="/assets/aktual-archive-v1.js?v=20260626-v1" defer></script><script src="/assets/gallery-bootstrap.js?v=20260626-v3" defer></script></body>`);

  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','public, max-age=300, stale-while-revalidate=3600');
  headers.set('x-gnk-asg-aktual-archive',VERSION);
  headers.set('link',`<${canonical}>; rel="canonical", <${source}>; rel="original"`);
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const path=normalizedPath(new URL(request.url).pathname);
    const match=path.match(/^\/objave\/aktual\/([^/]+)$/i);
    const response=await app.fetch(request,env,ctx);
    if(request.method==='GET'&&match)return patchArticle(response,request,match[1]);
    const headers=new Headers(response.headers);
    headers.set('x-gnk-asg-admin-hub-v23',VERSION);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
