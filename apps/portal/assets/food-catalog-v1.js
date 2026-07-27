(() => {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const categoriesEl = document.getElementById('foodCategories');
  const mealsEl = document.getElementById('foodMeals');
  const recipeEl = document.getElementById('foodRecipe');
  if (!categoriesEl || !mealsEl || !recipeEl) return;
  async function get(url){const r=await fetch(url,{headers:{accept:'application/json'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}
  async function showCategories(){try{const data=await get('/api/public-catalog/food/categories');categoriesEl.innerHTML=(data.categories||[]).map(c=>`<button class="food-category" data-category="${esc(c.name)}"><img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy"><span>${esc(c.name)}</span></button>`).join('');}catch{categoriesEl.innerHTML='<p class="food-empty">Kategorije trenutačno nisu dostupne.</p>';}}
  async function showMeals(category){mealsEl.innerHTML='<p class="food-empty">Učitavanje jela…</p>';recipeEl.hidden=true;try{const data=await get(`/api/public-catalog/food/meals?category=${encodeURIComponent(category)}`);mealsEl.innerHTML=(data.meals||[]).map(m=>`<button class="food-meal" data-id="${esc(m.id)}"><img src="${esc(m.image)}" alt="${esc(m.name)}" loading="lazy"><span>${esc(m.name)}</span></button>`).join('')||'<p class="food-empty">Nema dostupnih jela.</p>';}catch{mealsEl.innerHTML='<p class="food-empty">Jela trenutačno nisu dostupna.</p>';}}
  async function showRecipe(id){recipeEl.hidden=false;recipeEl.innerHTML='<p class="food-empty">Učitavanje recepta…</p>';try{const data=await get(`/api/public-catalog/food/recipe?id=${encodeURIComponent(id)}`);const r=data.recipe;recipeEl.innerHTML=`<button class="food-close" type="button" aria-label="Zatvori recept">×</button><div class="food-recipe-grid"><img src="${esc(r.image)}" alt="${esc(r.name)}"><div><p class="gnk-eyebrow">${esc(r.category)} · ${esc(r.area)}</p><h2>${esc(r.name)}</h2><h3>Sastojci</h3><ul>${(r.ingredients||[]).map(i=>`<li><strong>${esc(i.measure)}</strong> ${esc(i.ingredient)}</li>`).join('')}</ul></div></div><h3>Priprema</h3><p>${esc(r.instructions)}</p>`;recipeEl.scrollIntoView({behavior:'smooth',block:'start'});}catch{recipeEl.innerHTML='<p class="food-empty">Recept trenutačno nije dostupan.</p>';}}
  categoriesEl.addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b)showMeals(b.dataset.category);});
  mealsEl.addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)showRecipe(b.dataset.id);});
  recipeEl.addEventListener('click',e=>{if(e.target.closest('.food-close'))recipeEl.hidden=true;});
  showCategories();
})();
