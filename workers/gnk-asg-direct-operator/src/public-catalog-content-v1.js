// Cached public catalogue providers for technology and food content.
export const VERSION='GNK_ASG_PUBLIC_CATALOG_CONTENT_V1_20260727';
const TECH='/api/public-catalog/technology';
const FOOD_CATEGORIES='/api/public-catalog/food/categories';
const FOOD_MEALS='/api/public-catalog/food/meals';
const FOOD_RECIPE='/api/public-catalog/food/recipe';
const json=(data,status=200,ttl=3600)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${ttl}, stale-while-revalidate=${ttl*2}`,'x-content-type-options':'nosniff','x-gnk-public-catalog':VERSION}});
const clean=(v,max=300)=>String(v??'').replace(/\u0000/g,'').trim().slice(0,max);
async function fetchJson(url,ttl=3600){const r=await fetch(url,{headers:{accept:'application/json'},cf:{cacheEverything:true,cacheTtl:ttl}});if(!r.ok)throw new Error(`upstream_${r.status}`);return r.json();}
function normalizeTech(p){return {id:`DUMMY-${p.id}`,sku:`DUMMY-${p.id}`,name:clean(p.title,220),description:clean(p.description,1200),category:clean(p.category,100),brand:clean(p.brand,100),image:clean(p.images?.[0]||p.thumbnail,1200),priceUsd:Number.isFinite(Number(p.price))?Number(p.price):null,currency:'USD',priceEur:null,availability:Number(p.stock)>0?'in_stock':'out_of_stock',availabilityLabel:Number(p.stock)>0?'Ogledno dostupno':'Nije dostupno',rating:Number.isFinite(Number(p.rating))?Number(p.rating):null,sourceLabel:'DummyJSON ogledni katalog',market:'demo',tags:['Ogledni podaci','Informativni sadržaj'],legalNote:'Ogledni proizvod iz javnog testnog API-ja. Nije prodajna ponuda GNK ASG-a.'};}
function ingredients(meal){const out=[];for(let i=1;i<=20;i++){const ingredient=clean(meal?.[`strIngredient${i}`],120);const measure=clean(meal?.[`strMeasure${i}`],120);if(ingredient)out.push({ingredient,measure});}return out;}
async function translateRecipe(env,recipe){
 const apiKey=env?.OPENAI_API_KEY;
 if(!apiKey)throw new Error('OPENAI_API_KEY not configured');
 const payload={name:recipe.name,category:recipe.category,area:recipe.area,instructions:recipe.instructions,ingredients:recipe.ingredients.map(i=>({ingredient:i.ingredient,measure:i.measure}))};
 const response=await fetch('https://api.openai.com/v1/chat/completions',{
  method:'POST',
  headers:{'content-type':'application/json',authorization:`Bearer ${apiKey}`},
  body:JSON.stringify({
   model:'gpt-4o-mini',
   max_tokens:1500,
   temperature:0.2,
   response_format:{type:'json_object'},
   messages:[
    {role:'system',content:'Ti si prevoditelj recepata s engleskog na hrvatski jezik. Prevedi SVA polja u JSON objektu koji dobiješ na prirodan, tečan hrvatski jezik uobičajen u kuharicama. Zadrži TOČNO istu JSON strukturu (isti ključevi: name, category, area, instructions, ingredients kao niz objekata s ingredient i measure). Ne dodavaj nikakve druge ključeve niti tekst izvan JSON-a. Mjerne jedinice (tbsp, cup, oz, itd.) prevedi na uobičajene hrvatske ekvivalente (žlica, šalica, itd.) gdje je prirodno, inače zadrži broj i jedinicu.'},
    {role:'user',content:JSON.stringify(payload)}
   ]
  }),
 });
 if(!response.ok)throw new Error(`openai_${response.status}`);
 const data=await response.json();
 const raw=data?.choices?.[0]?.message?.content;
 if(!raw)throw new Error('openai_empty_response');
 const parsed=JSON.parse(raw);
 return {
  ...recipe,
  name:clean(parsed.name,180)||recipe.name,
  category:clean(parsed.category,100)||recipe.category,
  area:clean(parsed.area,100)||recipe.area,
  instructions:clean(parsed.instructions,12000)||recipe.instructions,
  ingredients:Array.isArray(parsed.ingredients)?parsed.ingredients.map((i,idx)=>({ingredient:clean(i?.ingredient,120)||recipe.ingredients[idx]?.ingredient||'',measure:clean(i?.measure,120)||recipe.ingredients[idx]?.measure||''})):recipe.ingredients,
 };
}
async function cachedTranslateRecipe(env,recipe){
 const kv=env?.GNK_ASG_CONFIG_KV;
 const cacheKey=`recipe-hr:${recipe.id}`;
 if(kv){
  try{const cached=await kv.get(cacheKey);if(cached)return JSON.parse(cached);}catch{}
 }
 const translated=await translateRecipe(env,recipe);
 if(kv){try{await kv.put(cacheKey,JSON.stringify(translated),{expirationTtl:2592000});}catch{}}
 return translated;
}
export async function handlePublicCatalogContent(request,env){const u=new URL(request.url);const path=u.pathname.replace(/\/+$/,'')||'/';if(!['GET','HEAD'].includes(request.method))return null;try{
 if(path===TECH){const category=clean(u.searchParams.get('category'),80);const endpoint=category?`https://dummyjson.com/products/category/${encodeURIComponent(category)}`:'https://dummyjson.com/products?limit=30';const data=await fetchJson(endpoint,21600);const products=(data.products||[]).map(normalizeTech);return json({ok:true,source:'DummyJSON',demo:true,total:products.length,products},200,21600);}
 if(path===FOOD_CATEGORIES){const data=await fetchJson('https://www.themealdb.com/api/json/v1/1/categories.php',86400);const categories=(data.categories||[]).map(c=>({id:clean(c.idCategory,30),name:clean(c.strCategory,100),image:clean(c.strCategoryThumb,1200),description:clean(c.strCategoryDescription,900)}));return json({ok:true,source:'TheMealDB',categories},200,86400);}
 if(path===FOOD_MEALS){const category=clean(u.searchParams.get('category'),100);if(!category)return json({ok:false,error:'category_required'},400,0);const data=await fetchJson(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`,21600);const meals=(data.meals||[]).map(m=>({id:clean(m.idMeal,30),name:clean(m.strMeal,180),image:clean(m.strMealThumb,1200),category}));return json({ok:true,source:'TheMealDB',category,meals},200,21600);}
 if(path===FOOD_RECIPE){const id=clean(u.searchParams.get('id'),30);if(!/^\d+$/.test(id))return json({ok:false,error:'valid_id_required'},400,0);const lang=clean(u.searchParams.get('lang'),10).toLowerCase();const data=await fetchJson(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`,21600);const meal=data.meals?.[0];if(!meal)return json({ok:false,error:'not_found'},404,0);let recipe={id,name:clean(meal.strMeal,180),category:clean(meal.strCategory,100),area:clean(meal.strArea,100),image:clean(meal.strMealThumb,1200),instructions:clean(meal.strInstructions,12000),ingredients:ingredients(meal),youtube:clean(meal.strYoutube,1200),sourceUrl:clean(meal.strSource,1200)};let translated=false;if(lang!=='en'){try{recipe=await cachedTranslateRecipe(env,recipe);translated=true;}catch(error){console.error('recipe-translation-failed',error);}}return json({ok:true,source:'TheMealDB',lang:lang==='en'?'en':'hr',translated,recipe},200,translated?2592000:21600);}
 return null;
 }catch(error){return json({ok:false,error:'upstream_unavailable',message:clean(error?.message,160)},502,60);}}
