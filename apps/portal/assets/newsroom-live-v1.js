(()=>{
  const english=document.documentElement.lang?.toLowerCase().startsWith('en')||location.pathname.startsWith('/en/');
  const endpoint=`/api/public-news?limit=60&lang=${english?'en':'hr'}`;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const date=value=>{try{return new Intl.DateTimeFormat(english?'en-GB':'hr-HR',{year:'numeric',month:'long',day:'numeric'}).format(new Date(value));}catch{return'';}};
  const href=post=>`${english?'/en':''}/newsroom/${encodeURIComponent(post.slug)}/`;
  const host=document.querySelector('main.wrap')||document.querySelector('main')||document.body;
  const section=document.createElement('section');section.id='newsroom-live';section.className='card';
  section.innerHTML=`<h2>${english?'Latest published news':'Najnovije objavljene vijesti'}</h2><p>${english?'Loading published content…':'Učitavanje objavljenog sadržaja…'}</p>`;
  const contact=[...host.querySelectorAll('section.card')].pop();host.insertBefore(section,contact||null);
  fetch(endpoint,{headers:{accept:'application/json'}}).then(response=>response.ok?response.json():Promise.reject(new Error('feed'))).then(data=>{
    const posts=Array.isArray(data.posts)?data.posts:[];
    if(!posts.length){section.innerHTML=`<h2>${english?'Latest published news':'Najnovije objavljene vijesti'}</h2><p>${english?'No published articles are available yet.':'Još nema objavljenih članaka.'}</p>`;return;}
    section.innerHTML=`<h2>${english?'Latest published news':'Najnovije objavljene vijesti'}</h2><div class="grid3">${posts.map(post=>`<article class="card"><p class="eyebrow">${esc(post.category||'News')}</p><h3>${esc(post.title)}</h3><p>${esc(post.summary)}</p><p><small>${esc(date(post.publishedAt||post.createdAt))}</small></p><p><a class="btn gold" href="${href(post)}">${english?'Read article':'Otvori članak'}</a></p></article>`).join('')}</div>`;
  }).catch(()=>{section.innerHTML=`<h2>${english?'Latest published news':'Najnovije objavljene vijesti'}</h2><p>${english?'Published content is temporarily unavailable.':'Objavljeni sadržaj trenutačno nije dostupan.'}</p>`;});
})();