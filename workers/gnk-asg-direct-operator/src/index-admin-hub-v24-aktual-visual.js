const VERSION='GNK_ASG_AKTUAL_VISUAL_HELPER_V1_20260626';
const ARTICLES=Object.freeze([
  ['kljucni-faktori-motivacije-za-pokretanje-vlastitog-posla','Ključni faktori motivacije za pokretanje vlastitog posla','2024-10-02'],
  ['biti-svoj-gazda-kljucni-motivator-za-preduzetnike','Biti svoj gazda: Ključni motivator za preduzetnike','2024-10-03'],
  ['kako-pronaci-i-ostvariti-poslovnu-motivaciju','Kako pronaći i ostvariti poslovnu motivaciju','2024-10-03'],
  ['motivacija-za-pokretanje-privatnog-biznisa-kljucni-faktori','Motivacija za pokretanje privatnog biznisa: Ključni faktori','2024-10-03'],
  ['kljucni-faktori-za-uspeh-u-preduzetnistvu','Ključni faktori za uspeh u preduzetništvu','2024-10-03'],
  ['kljucne-vestine-za-uspesno-donosenje-odluka-u-preduzetnistvu','Ključne veštine za uspešno donošenje odluka u preduzetništvu','2024-10-03'],
  ['kljucne-vestine-za-uspesno-samozaposljavanje','Ključne veštine za uspešno samozapošljavanje','2024-10-03'],
  ['kljucne-vjestine-za-uspjeh-u-poduzetnistvu','Ključne vještine za uspjeh u poduzetništvu','2024-10-03'],
  ['unapredenje-prodaje-i-marketinga-za-uspjesno-poduzetnistvo','Unapređenje prodaje i marketinga za uspješno poduzetništvo','2024-10-03'],
  ['kljucne-vjestine-za-uspjesno-financijsko-upravljanje-u-poduzetnistvu','Ključne vještine za uspješno financijsko upravljanje u poduzetništvu','2024-10-03'],
  ['kako-pretvoriti-ideju-u-uspjesan-poduzetnicki-poduhvat','Kako pretvoriti ideju u uspješan poduzetnički poduhvat','2024-10-03'],
  ['kako-otkriti-i-razviti-uspesne-poslovne-ideje','Kako otkriti i razviti uspešne poslovne ideje','2024-10-03'],
  ['istrazivanje-trzista-kljuc-uspjeha-za-nove-poduzetnike','Istraživanje tržišta: Ključ uspjeha za nove poduzetnike','2024-10-03'],
  ['analiza-lokalnog-trzista-kljuc-uspjeha-vaseg-poslovanja','Analiza lokalnog tržišta: Ključ uspjeha vašeg poslovanja','2024-10-03'],
  ['izrada-upitnika-za-istrazivanje-trzista-kljuc-uspjeha','Izrada upitnika za istraživanje tržišta: Ključ uspjeha','2024-10-03'],
  ['metode-istrazivanja-trzista-licem-u-lice-i-telefonski-pristup','Metode istraživanja tržišta: Licem u lice i telefonski pristup','2024-10-03'],
  ['efikasne-metode-istrazivanja-trzista-fokus-grupe-i-ankete','Efikasne metode istraživanja tržišta: Fokus grupe i ankete','2024-10-03']
]);

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const safeJson=value=>JSON.stringify(value).replace(/</g,'\\u003c');

function buildCollection(origin){
  const items=ARTICLES.map(([slug,title,published],index)=>({
    slug,title,published,index:index+1,
    page:`${origin}/objave/aktual/${slug}/`,
    image:`${origin}/assets/objave/aktual/${slug}.png`,
    description:`Fotografija uz autorsku kolumnu „${title}” autora Nermina Sefića, u GNK ASG arhivi objava povezanoj s GNK DINAMO Ltd.`
  }));
  return{
    items,
    graph:{
      '@context':'https://schema.org',
      '@graph':[
        {
          '@type':'CollectionPage','@id':`${origin}/visual-index/#nermin-sefic-aktual`,
          name:'Fotografije autorskih kolumni Nermina Sefića',url:`${origin}/visual-index/`,
          description:'Indeksirana galerijska zbirka fotografija uz 17 autorskih kolumni Nermina Sefića.',
          about:[{'@type':'Person',name:'Nermin Sefić',alternateName:'Nermin Sefic'},{'@type':'Organization',name:'GNK ASG d.o.o.'},{'@type':'Organization',name:'GNK DINAMO Ltd.'}],
          mainEntity:{'@type':'ItemList',numberOfItems:items.length,itemListElement:items.map(item=>({'@type':'ListItem',position:item.index,item:{'@id':`${item.image}#image`}}))}
        },
        ...items.map(item=>({
          '@type':'ImageObject','@id':`${item.image}#image`,name:item.title,description:item.description,
          contentUrl:item.image,thumbnailUrl:item.image,mainEntityOfPage:item.page,
          isBasedOn:`https://aktual.rs/clanak/${item.slug}/`,datePublished:item.published,
          creditText:'Foto: Shutterstock, prema izvornoj objavi Aktual.rs',
          copyrightNotice:'Fotografija korištena prema licenci uz izvornu objavu.',
          representativeOfPage:true,
          about:[{'@type':'Person',name:'Nermin Sefić',alternateName:'Nermin Sefic'},{'@type':'Organization',name:'GNK ASG d.o.o.'},{'@type':'Organization',name:'GNK DINAMO Ltd.'}],
          keywords:'Nermin Sefić, Nermin Sefic, GNK ASG, GNK DINAMO Ltd., Aktual kolumne, poduzetništvo, preduzetništvo, istraživanje tržišta'
        }))
      ]
    }
  };
}

export async function patchAktualVisualIndex(response,request){
  if(!response.ok||!String(response.headers.get('content-type')||'').toLowerCase().includes('text/html'))return response;
  const origin=new URL(request.url).origin.replace(/^https:\/\/www\./,'https://');
  const {items,graph}=buildCollection(origin);
  const cards=items.map(item=>`<article class="item gnk-aktual-visual-card"><a href="${item.page}"><img src="${item.image}" alt="${esc(item.title)} — Nermin Sefić, GNK ASG i GNK DINAMO Ltd." loading="lazy" decoding="async"></a><div class="body"><h2><a href="${item.page}">${esc(item.title)}</a></h2><p>${esc(item.description)}</p><small>Objavljeno ${item.published} · Foto: Shutterstock, prema izvornoj objavi Aktual.rs</small><div class="tags"><span>Nermin Sefić</span><span>GNK ASG</span><span>GNK DINAMO Ltd.</span><span>Aktual kolumne</span></div></div></article>`).join('');
  const block=`<section class="gnk-aktual-visual" aria-labelledby="gnkAktualVisualTitle"><small>Autorska arhiva · 17 objava</small><h2 id="gnkAktualVisualTitle">Kolumne Nermina Sefića</h2><p>Fotografije i poveznice uz autorske tekstove Nermina Sefića, SEO povezane s GNK ASG i GNK DINAMO Ltd.</p><div class="grid gnk-aktual-visual-grid">${cards}</div></section>`;
  const style=`<style id="gnk-aktual-visual-style-v1">.gnk-aktual-visual{margin:0 0 28px;padding:22px;border:1px solid rgba(212,175,55,.28);border-radius:24px;background:rgba(255,255,255,.72)}.gnk-aktual-visual>small{color:#9b7620;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.gnk-aktual-visual>h2{margin:8px 0;font-size:clamp(1.7rem,4vw,3rem)}.gnk-aktual-visual>p{color:#526174;line-height:1.55}.gnk-aktual-visual-card h2 a{color:inherit;text-decoration:none}.gnk-aktual-visual-card .body small{display:block;margin-top:8px;color:#64748b;line-height:1.45}</style>`;
  const schema=`<script id="gnk-aktual-visual-schema-v1" type="application/ld+json">${safeJson(graph)}</script>`;
  let body=await response.text();
  if(!body.includes('gnk-aktual-visual-style-v1'))body=body.replace('</head>',`${style}${schema}</head>`);
  if(!body.includes('gnk-aktual-visual-grid'))body=body.replace('<section class="grid" id="visualGrid"',`${block}<section class="grid" id="visualGrid"`);
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','public, max-age=300, stale-while-revalidate=3600');
  headers.set('x-gnk-asg-aktual-visual',VERSION);
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}
