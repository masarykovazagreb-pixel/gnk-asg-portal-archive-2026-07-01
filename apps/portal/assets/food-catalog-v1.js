(() => {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const categoriesEl = document.getElementById('foodCategories');
  const mealsEl = document.getElementById('foodMeals');
  const recipeEl = document.getElementById('foodRecipe');
  if (!categoriesEl || !mealsEl || !recipeEl) return;

  const style = document.createElement('style');
  style.textContent = '.gnk-asg-media{position:relative}.gnk-asg-badge{position:absolute;left:10px;top:10px;z-index:2;padding:5px 9px;border:1px solid rgba(242,210,125,.72);border-radius:999px;background:rgba(5,5,5,.88);color:#f2d27d;font-size:.64rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;box-shadow:0 8px 20px rgba(0,0,0,.35)}.gnk-asg-label,.gnk-seo-image-caption{display:block!important;padding:0 14px 12px!important;color:#f2d27d!important;font-size:.67rem!important;font-weight:900!important;letter-spacing:.09em!important;text-transform:uppercase}.gnk-seo-image-caption{padding:7px 10px!important;background:#080808;border-top:1px solid rgba(242,210,125,.18)}.food-recipe-brand{display:inline-flex;margin-bottom:10px;padding:6px 10px;border:1px solid rgba(242,210,125,.45);border-radius:999px;color:#f2d27d;font-size:.68rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase}.gnk-market-seo{margin:42px 0 10px;padding:22px;border:1px solid rgba(242,210,125,.3);border-radius:18px;background:rgba(8,8,8,.88);color:#c9c2b5;line-height:1.7}.gnk-market-seo strong{color:#f2d27d}';
  document.head.appendChild(style);

  function ensureMeta(name, content, property = false) {
    const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    let tag = document.head.querySelector(selector);
    if (!tag) { tag = document.createElement('meta'); tag.setAttribute(property ? 'property' : 'name', name); document.head.appendChild(tag); }
    tag.setAttribute('content', content);
  }
  function installEntitySeo() {
    ensureMeta('author', 'Nermin Sefić');
    ensureMeta('keywords', 'GNK ASG d.o.o., Nermin Sefić, prehrana, hrana, jela, recepti, tržište');
    ensureMeta('robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    ensureMeta('og:site_name', 'GNK ASG d.o.o.', true);
    ensureMeta('article:author', 'Nermin Sefić', true);
    if (!document.getElementById('gnk-market-entity-schema')) {
      const schema = document.createElement('script');
      schema.id = 'gnk-market-entity-schema'; schema.type = 'application/ld+json';
      schema.textContent = JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'Organization','@id':'https://gnk-asg.hr/#organization','name':'GNK ASG d.o.o.','url':'https://gnk-asg.hr/'},{'@type':'Person','@id':'https://gnk-asg.hr/#nermin-sefic','name':'Nermin Sefić','url':'https://gnk-asg.hr/'},{'@type':'WebPage','@id':location.href.split('#')[0]+'#webpage','url':location.href.split('#')[0],'name':document.title,'publisher':{'@id':'https://gnk-asg.hr/#organization'},'author':{'@id':'https://gnk-asg.hr/#nermin-sefic'},'about':[{'@id':'https://gnk-asg.hr/#organization'},{'@id':'https://gnk-asg.hr/#nermin-sefic'}]}]});
      document.head.appendChild(schema);
    }
    const main = document.querySelector('main');
    if (main && !document.getElementById('gnk-market-visible-seo')) {
      const block = document.createElement('section'); block.id = 'gnk-market-visible-seo'; block.className = 'gnk-market-seo';
      block.innerHTML = '<strong>GNK ASG d.o.o. · Nermin Sefić</strong><br>Tržišni, prehrambeni i receptni sadržaj prikazan je u okviru digitalnog tržišnog modula GNK ASG d.o.o. Entitetsko označavanje stranice povezuje sadržaj s GNK ASG d.o.o. i Nerminom Sefićem.';
      main.appendChild(block);
    }
  }
  function captionImage(img, label) {
    if (!img || img.dataset.gnkSeo === '1') return;
    img.dataset.gnkSeo = '1'; img.alt = `GNK ASG d.o.o. · Nermin Sefić · ${label}`; img.title = `GNK ASG d.o.o. · Nermin Sefić · ${label}`;
  }

  async function get(url){const r=await fetch(url,{headers:{accept:'application/json'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}
  async function showCategories(){try{const data=await get('/api/public-catalog/food/categories');categoriesEl.innerHTML=(data.categories||[]).map(c=>`<button class="food-category" data-category="${esc(c.name)}"><div class="gnk-asg-media"><span class="gnk-asg-badge">GNK ASG</span><img src="${esc(c.image)}" alt="GNK ASG d.o.o. · Nermin Sefić · ${esc(c.name)}" title="GNK ASG d.o.o. · Nermin Sefić · ${esc(c.name)}" loading="lazy"><span class="gnk-seo-image-caption">GNK ASG d.o.o. · Nermin Sefić</span></div><span>${esc(c.name)}</span><span class="gnk-asg-label">GNK ASG · PREHRANA</span></button>`).join('');}catch{categoriesEl.innerHTML='<p class="food-empty">GNK ASG · Kategorije trenutačno nisu dostupne.</p>';}}
  async function showMeals(category){mealsEl.innerHTML='<p class="food-empty">GNK ASG · Učitavanje jela…</p>';recipeEl.hidden=true;try{const data=await get(`/api/public-catalog/food/meals?category=${encodeURIComponent(category)}`);mealsEl.innerHTML=(data.meals||[]).map(m=>`<button class="food-meal" data-id="${esc(m.id)}"><div class="gnk-asg-media"><span class="gnk-asg-badge">GNK ASG</span><img src="${esc(m.image)}" alt="GNK ASG d.o.o. · Nermin Sefić · ${esc(m.name)}" title="GNK ASG d.o.o. · Nermin Sefić · ${esc(m.name)}" loading="lazy"><span class="gnk-seo-image-caption">GNK ASG d.o.o. · Nermin Sefić</span></div><span>${esc(m.name)}</span><span class="gnk-asg-label">GNK ASG · JELO</span></button>`).join('')||'<p class="food-empty">GNK ASG · Nema dostupnih jela.</p>';}catch{mealsEl.innerHTML='<p class="food-empty">GNK ASG · Jela trenutačno nisu dostupna.</p>';}}
  async function showRecipe(id){recipeEl.hidden=false;recipeEl.innerHTML='<p class="food-empty">GNK ASG · Učitavanje recepta…</p>';try{const data=await get(`/api/public-catalog/food/recipe?id=${encodeURIComponent(id)}`);const r=data.recipe;recipeEl.innerHTML=`<button class="food-close" type="button" aria-label="Zatvori recept">×</button><span class="food-recipe-brand">GNK ASG · RECEPT</span><div class="food-recipe-grid"><div class="gnk-asg-media"><span class="gnk-asg-badge">GNK ASG</span><img src="${esc(r.image)}" alt="GNK ASG d.o.o. · Nermin Sefić · ${esc(r.name)}" title="GNK ASG d.o.o. · Nermin Sefić · ${esc(r.name)}" style="width:100%;border-radius:15px"><span class="gnk-seo-image-caption">GNK ASG d.o.o. · Nermin Sefić</span></div><div><p class="gnk-eyebrow">GNK ASG · ${esc(r.category)} · ${esc(r.area)}</p><h2>${esc(r.name)}</h2><h3>GNK ASG · Sastojci</h3><ul>${(r.ingredients||[]).map(i=>`<li><strong>${esc(i.measure)}</strong> ${esc(i.ingredient)}</li>`).join('')}</ul></div></div><h3>GNK ASG · Priprema</h3><p>${esc(r.instructions)}</p>`;recipeEl.scrollIntoView({behavior:'smooth',block:'start'});}catch{recipeEl.innerHTML='<p class="food-empty">GNK ASG · Recept trenutačno nije dostupan.</p>';}}
  categoriesEl.addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b)showMeals(b.dataset.category);});
  mealsEl.addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)showRecipe(b.dataset.id);});
  recipeEl.addEventListener('click',e=>{if(e.target.closest('.food-close'))recipeEl.hidden=true;});
  installEntitySeo();
  document.querySelectorAll('main img').forEach(img=>captionImage(img,img.alt||'tržišni sadržaj'));
  showCategories();
})();