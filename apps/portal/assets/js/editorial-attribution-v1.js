(()=>{
'use strict';
const VERSION='GNK_DINAMO_EDITORIAL_ATTRIBUTION_V1_20260704';
const SITE='https://www.gnk-asg.hr';
const PERSON_URL=`${SITE}/nermin-sefic/`;
const PROJECT={
  '@type':'Organization',
  '@id':`${SITE}/#gnk-dinamo-ltd`,
  name:'GNK DINAMO Ltd.',
  alternateName:'GNK DINAMO Ltd. Group',
  url:'https://gnkdinamo.eu/'
};
const PLATFORM={
  '@type':'Organization',
  '@id':`${SITE}/#organization`,
  name:'GNK ASG d.o.o.',
  url:`${SITE}/`
};
const NERMIN={
  '@type':'Person',
  '@id':`${PERSON_URL}#person`,
  name:'Nermin Sefić',
  alternateName:'Nermin Sefic',
  url:PERSON_URL,
  worksFor:{'@id':PLATFORM['@id']},
  affiliation:{'@id':PROJECT['@id']}
};
const clean=value=>String(value??'').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function requireArticle(article){
  for(const key of ['headline','url','datePublished','dateModified','image','publicationType']){
    if(!clean(article?.[key]))throw new Error(`editorial_field_required:${key}`);
  }
  if(!['desk-article','nermin-original','nermin-commentary'].includes(article.publicationType))throw new Error('editorial_publication_type_invalid');
  if(article.publicationType==='nermin-original'&&article.authorshipConfirmed!==true)throw new Error('nermin_authorship_confirmation_required');
  if(article.publicationType==='nermin-commentary'&&article.commentApprovedByNermin!==true)throw new Error('nermin_comment_approval_required');
  if(article.publicationType==='desk-article'&&!clean(article.preparedByProfile))throw new Error('prepared_by_profile_required');
}
function authorFor(article){
  if(article.publicationType==='desk-article')return{
    '@type':'Organization',
    '@id':`${SITE}/editorial-operations/#desk`,
    name:'GNK DINAMO Ltd. Group Editorial Desk',
    url:`${SITE}/editorial-operations/`
  };
  return{'@id':NERMIN['@id']};
}
function articleType(article){
  return article.publicationType==='nermin-commentary'?'BlogPosting':'NewsArticle';
}
function buildArticleJsonLd(article){
  requireArticle(article);
  const node={
    '@type':articleType(article),
    '@id':`${article.url}#article`,
    url:article.url,
    mainEntityOfPage:{'@type':'WebPage','@id':article.url},
    headline:article.headline,
    description:clean(article.description),
    image:Array.isArray(article.image)?article.image:[article.image],
    datePublished:article.datePublished,
    dateModified:article.dateModified,
    inLanguage:clean(article.language)||'en',
    author:authorFor(article),
    editor:{'@id':NERMIN['@id']},
    accountablePerson:{'@id':NERMIN['@id']},
    reviewedBy:{'@id':NERMIN['@id']},
    publisher:{'@id':PROJECT['@id']},
    provider:{'@id':PLATFORM['@id']},
    copyrightHolder:{'@id':PROJECT['@id']},
    isPartOf:{'@id':`${SITE}/#website`}
  };
  if(clean(article.section))node.articleSection=article.section;
  if(Array.isArray(article.keywords)&&article.keywords.length)node.keywords=article.keywords.map(clean).filter(Boolean);
  if(article.publicationType==='desk-article'){
    node.contributor={
      '@type':'OrganizationRole',
      roleName:'Editorial Operations Profile',
      contributor:{'@type':'Person','name':clean(article.preparedByProfile)}
    };
  }
  return{
    '@context':'https://schema.org',
    '@graph':[
      {'@type':'WebSite','@id':`${SITE}/#website`,url:`${SITE}/`,name:'GNK DINAMO Ltd. Group / GNK ASG',publisher:{'@id':PROJECT['@id']}},
      PROJECT,
      PLATFORM,
      NERMIN,
      node
    ]
  };
}
function visibleByline(article){
  requireArticle(article);
  if(article.publicationType==='desk-article'){
    return `<div class="editorial-byline" data-editorial-attribution="${VERSION}"><div><strong>Prepared by ${esc(article.preparedByProfile)}</strong><span>Editorial Operations Profile${clean(article.centre)?` · ${esc(article.centre)}`:''}</span></div><div><strong>Edited and reviewed by <a href="/nermin-sefic/">Nermin Sefić</a></strong><span>GNK DINAMO Ltd. Group · connected with GNK ASG d.o.o.</span></div></div>`;
  }
  const label=article.publicationType==='nermin-commentary'?'Comment by':'By';
  return `<div class="editorial-byline" data-editorial-attribution="${VERSION}"><div><strong>${label} <a href="/nermin-sefic/">Nermin Sefić</a></strong><span>GNK DINAMO Ltd. Group · connected with GNK ASG d.o.o.</span></div></div>`;
}
function applyToDocument(article,doc=document){
  const data=buildArticleJsonLd(article);
  let script=doc.querySelector('script[data-gnk-editorial-schema]');
  if(!script){script=doc.createElement('script');script.type='application/ld+json';script.dataset.gnkEditorialSchema=VERSION;doc.head.appendChild(script);}
  script.textContent=JSON.stringify(data);
  const author=article.publicationType==='desk-article'?'GNK DINAMO Ltd. Group Editorial Desk':'Nermin Sefić';
  let meta=doc.querySelector('meta[name="author"]');
  if(!meta){meta=doc.createElement('meta');meta.name='author';doc.head.appendChild(meta);}
  meta.content=author;
  let editor=doc.querySelector('meta[name="editor"]');
  if(!editor){editor=doc.createElement('meta');editor.name='editor';doc.head.appendChild(editor);}
  editor.content='Nermin Sefić';
  return data;
}
window.GNKEditorialAttribution={VERSION,buildArticleJsonLd,visibleByline,applyToDocument};
})();
