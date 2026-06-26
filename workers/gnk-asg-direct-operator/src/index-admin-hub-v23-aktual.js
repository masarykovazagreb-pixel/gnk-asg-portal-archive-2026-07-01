import app from './index-admin-hub-v22-news.js';

const VERSION='GNK_ASG_ADMIN_HUB_V23_AKTUAL_V1_20260626';
const MODIFIED='2026-06-26';
const ARTICLES=Object.freeze({
  'kljucni-faktori-motivacije-za-pokretanje-vlastitog-posla':{title:'Ključni faktori motivacije za pokretanje vlastitog posla',published:'2024-10-02',language:'sr-Latn'},
  'biti-svoj-gazda-kljucni-motivator-za-preduzetnike':{title:'Biti svoj gazda: Ključni motivator za preduzetnike',published:'2024-10-03',language:'sr-Latn'},
  'kako-pronaci-i-ostvariti-poslovnu-motivaciju':{title:'Kako pronaći i ostvariti poslovnu motivaciju',published:'2024-10-03',language:'sr-Latn'},
  'motivacija-za-pokretanje-privatnog-biznisa-kljucni-faktori':{title:'Motivacija za pokretanje privatnog biznisa: Ključni faktori',published:'2024-10-03',language:'sr-Latn'},
  'kljucni-faktori-za-uspeh-u-preduzetnistvu':{title:'Ključni faktori za uspeh u preduzetništvu',published:'2024-10-03',language:'sr-Latn'},
  'kljucne-vestine-za-uspesno-donosenje-odluka-u-preduzetnistvu':{title:'Ključne veštine za uspešno donošenje odluka u preduzetništvu',published:'2024-10-03',language:'sr-Latn'},
  'kljucne-vestine-za-uspesno-samozaposljavanje':{title:'Ključne veštine za uspešno samozapošljavanje',published:'2024-10-03',language:'sr-Latn'},
  'kljucne-vjestine-za-uspjeh-u-poduzetnistvu':{title:'Ključne vještine za uspjeh u poduzetništvu',published:'2024-10-03',language:'hr'},
  'unapredenje-prodaje-i-marketinga-za-uspjesno-poduzetnistvo':{title:'Unapređenje prodaje i marketinga za uspješno poduzetništvo',published:'2024-10-03',language:'hr'},
  'kljucne-vjestine-za-uspjesno-financijsko-upravljanje-u-poduzetnistvu':{title:'Ključne vještine za uspješno financijsko upravljanje u poduzetništvu',published:'2024-10-03',language:'hr'},
  'kako-pretvoriti-ideju-u-uspjesan-poduzetnicki-poduhvat':{title:'Kako pretvoriti ideju u uspješan poduzetnički poduhvat',published:'2024-10-03',language:'hr'},
  'kako-otkriti-i-razviti-uspesne-poslovne-ideje':{title:'Kako otkriti i razviti uspešne poslovne ideje',published:'2024-10-03',language:'sr-Latn'},
  'istrazivanje-trzista-kljuc-uspjeha-za-nove-poduzetnike':{title:'Istraživanje tržišta: Ključ uspjeha za nove poduzetnike',published:'2024-10-03',language:'hr'},
  'analiza-lokalnog-trzista-kljuc-uspjeha-vaseg-poslovanja':{title:'Analiza lokalnog tržišta: Ključ uspjeha vašeg poslovanja',published:'2024-10-03',language:'hr'},
  'izrada-upitnika-za-istrazivanje-trzista-kljuc-uspjeha':{title:'Izrada upitnika za istraživanje tržišta: Ključ uspjeha',published:'2024-10-03',language:'hr'},
  'metode-istrazivanja-trzista-licem-u-lice-i-telefonski-pristup':{title:'Metode istraživanja tržišta: Licem u lice i telefonski pristup',published:'2024-10-03',language:'sr-Latn'},
  'efikasne-metode-istrazivanja-trzista-fokus-grupe-i-ankete':{title:'Efikasne metode istraživanja tržišta: Fokus grupe i ankete',published:'2024-10-03',language:'sr-Latn'}
});

function normalizedPath(value){return String(value||'/').replace(/\/+$/,'')||'/';}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));}
function safeJson(value){return JSON.stringify(value).replace(/</g,'\\u003c');}
function description(meta){return `${meta.title} — autorska kolumna Nermina Sefića u GNK ASG arhivi objava, povezana s GNK DINAMO Ltd., poduzetništvom, poslovanjem i istraživanjem tržišta.`;}
function keywordText(meta){
  const topic=/tržišt|trzist/i.test(meta.title)?'istraživanje tržišta, analiza tržišta, ciljani kupci':'poduzetništvo, preduzetništvo, poslovna motivacija, poslovne ideje';
  return `Nermin Sefić, Nermin Sefic, GNK ASG, GNK ASG d.o.o., GNK DINAMO Ltd., Aktual.rs, autorska kolumna, ${topic}`;
}

function schema(slug,meta,origin){
  const canonical=`${origin}/objave/aktual/${slug}/`;
  const source=`https://aktual.rs/clanak/${slug}/`;
  const image=`${origin}/assets/objave/aktual/${slug}.png`;
  const author=`${origin}/nermin-sefic/#person`;
  const organization=`${origin}/#organization`;
  return{
    '@context':'https://schema.org',
    '@graph':[
      {
        '@type':'Article','@id':`${canonical}#article`,headline:meta.title,description:description(meta),
        url:canonical,mainEntityOfPage:{'@type':'WebPage','@id':canonical},image:{'@id':`${image}#image`},
        author:{'@type':'Person','@id':author,name:'Nermin Sefić',alternateName:'Nermin Sefic',url:`${origin}/nermin-sefic/`},
        publisher:{'@type':'Organization','@id':organization,name:'GNK ASG d.o.o.',url:`${origin}/`},
        datePublished:meta.published,dateModified:MODIFIED,inLanguage:meta.language,isBasedOn:source,
        articleSection:'Objave · Aktual kolumne',keywords:keywordText(meta),
        about:[
          {'@type':'Person',name:'Nermin Sefić',alternateName:'Nermin Sefic'},
          {'@type':'Organization',name:'GNK ASG d.o.o.',url:`${origin}/`},
          {'@type':'Organization',name:'GNK DINAMO Ltd.'}
        ],
        copyrightHolder:{'@type':'Person',name:'Nermin Sefić'},copyrightYear:2024,
        creditText:'Autorski tekst Nermina Sefića; izvorno objavljeno na Aktual.rs.'
      },
      {
        '@type':'ImageObject','@id':`${image}#image`,contentUrl:image,url:image,name:`${meta.title} — fotografija`,
        caption:`${meta.title}. Autorska kolumna Nermina Sefića na GNK ASG portalu.`,
        description:`Fotografija uz kolumnu ${meta.title}. SEO teme: Nermin Sefić, GNK ASG i GNK DINAMO Ltd.`,
        creditText:'Foto: Shutterstock, prema izvornoj objavi Aktual.rs',
        copyrightNotice:'Licencirana fotografija korištena uz izvornu objavu.',
        representativeOfPage:true,about:[
          {'@type':'Person',name:'Nermin Sefić'},
          {'@type':'Organization',name:'GNK ASG d.o.o.'},
          {'@type':'Organization',name:'GNK DINAMO Ltd.'}
        ],keywords:keywordText(meta)
      },
      {
        '@type':'BreadcrumbList','@id':`${canonical}#breadcrumb`,itemListElement:[
          {'@type':'ListItem',position:1,name:'GNK ASG',item:`${origin}/`},
          {'@type':'ListItem',position:2,name:'Objave',item:`${origin}/objave/`},
          {'@type':'ListItem',position:3,name:'Aktual kolumne',item:`${origin}/objave/#aktual`},
          {'@type':'ListItem',position:4,name:meta.title,item:canonical}
        ]
      }
    ]
  };
}

function addBodyClass(body){
  return body.replace(/<body([^>]*)>/i,(full,attributes)=>{
    if(/class\s*=/.test(attributes))return `<body${attributes.replace(/class=(['"])(.*?)\1/i,(m,q,value)=>`class=${q}${value} gnk-aktual-archive${q}`)}>`;
    return `<body class="gnk-aktual-archive"${attributes}>`;
  });
}

async function patchArticle(response,request,slug,meta){
  if(!response.ok||!String(response.headers.get('content-type')||'').toLowerCase().includes('text/html'))return response;
  const url=new URL(request.url);
  const origin=url.origin.replace(/^https:\/\/www\./,'https://');
  const canonical=`${origin}/objave/aktual/${slug}/`;
  const image=`${origin}/assets/objave/aktual/${slug}.png`;
  const source=`https://aktual.rs/clanak/${slug}/`;
  const graph=schema(slug,meta,origin);
  let body=await response.text();

  const schemaTag=`<script id="gnk-aktual-schema-v1" type="application/ld+json">${safeJson(graph)}</script>`;
  if(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i.test(body)){
    body=body.replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i,schemaTag);
  }else{
    body=body.replace('</head>',`${schemaTag}</head>`);
  }

  const headInjection=`
<meta name="author" content="Nermin Sefić">
<meta property="article:author" content="Nermin Sefić">
<meta property="article:section" content="Objave · Aktual kolumne">
<meta property="article:published_time" content="${meta.published}T12:00:00+02:00">
<meta property="article:modified_time" content="${MODIFIED}T20:00:00+02:00">
<meta property="og:site_name" content="GNK ASG">
<meta property="og:image:alt" content="${escapeHtml(meta.title)} — Nermin Sefić, GNK ASG i GNK DINAMO Ltd.">
<meta name="twitter:title" content="${escapeHtml(meta.title)}">
<meta name="twitter:description" content="${escapeHtml(description(meta))}">
<meta name="twitter:image:alt" content="${escapeHtml(meta.title)} — Nermin Sefić, GNK ASG i GNK DINAMO Ltd.">
<link rel="author" href="${origin}/nermin-sefic/">
<link rel="stylesheet" href="/assets/aktual-archive-v1.css?v=20260626-v1">`;
  if(!body.includes('/assets/aktual-archive-v1.css'))body=body.replace('</head>',`${headInjection}\n</head>`);

  body=body.replace(/<link\s+rel=["']canonical["'][^>]*>/i,`<link rel="canonical" href="${canonical}">`);
  body=body.replace(/<meta\s+property=["']og:url["'][^>]*>/i,`<meta property="og:url" content="${canonical}">`);
  body=body.replace(/<meta\s+property=["']og:image["'][^>]*>/i,`<meta property="og:image" content="${image}">`);
  body=body.replace(/<meta\s+name=["']twitter:image["'][^>]*>/i,`<meta name="twitter:image" content="${image}">`);
  body=body.replace(/href=["']https:\/\/aktual\.rs\/clanak\/[^"']+["']/i,`href="${source}"`);
  body=addBodyClass(body);

  const scriptInjection=`<script src="/assets/aktual-archive-v1.js?v=20260626-v1" defer></script><script src="/assets/gallery-bootstrap.js?v=20260626-v3" defer></script>`;
  if(!body.includes('/assets/aktual-archive-v1.js'))body=body.replace('</body>',`${scriptInjection}</body>`);

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
    const url=new URL(request.url);
    const path=normalizedPath(url.pathname);
    const match=path.match(/^\/objave\/aktual\/([^/]+)$/i);
    const response=await app.fetch(request,env,ctx);
    if(request.method==='GET'&&match&&ARTICLES[match[1]])return patchArticle(response,request,match[1],ARTICLES[match[1]]);
    const headers=new Headers(response.headers);
    headers.set('x-gnk-asg-admin-hub-v23',VERSION);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
