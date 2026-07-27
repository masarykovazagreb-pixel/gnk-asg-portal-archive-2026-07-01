import assert from 'node:assert/strict';
import fs from 'node:fs';

const router=fs.readFileSync('apps/portal/assets/marketplace-i18n-v1.js','utf8');
const food=fs.readFileSync('apps/portal/assets/food-catalog-v1.js','utf8');
const seo=fs.readFileSync('workers/gnk-asg-direct-operator/src/sitewide-entity-seo-v1.js','utf8');

assert.match(router,/\/trgovina\/prehrana\/\?lang=en#foodCategories/);
assert.match(router,/\/trgovina\/prehrana\/\?lang=en#foodMeals/);
assert.match(router,/localUrl\(isEn \? 'en' : 'hr'\)/);
assert.match(router,/document\.documentElement\.lang = english \? 'en' : 'hr'/);
assert.match(router,/Technology\.<br><span>Food\.<\/span><br>Recipes\./);
assert.match(food,/Ingredients/);
assert.match(food,/Preparation/);
assert.match(food,/new URLSearchParams\(location\.search\)\.get\('lang'\) === 'en'/);
assert.match(seo,/marketplace-i18n-v1\.js/);
assert.match(seo,/url\.searchParams\.get\('lang'\)==='en'/);
assert.doesNotMatch(router,/href\s*=\s*['"]\/en\/['"]/);

console.log(JSON.stringify({ok:true,routes:['/trgovina/?lang=en','/trgovina/prehrana/?lang=en'],dynamicFoodEnglish:true}));
