import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const fail=message=>{throw new Error(message)};
const manifest=JSON.parse(read('apps/portal/assets/data/multilingual-review-manifest.json'));

if(manifest.status!=='controlled-review')fail('multilingual manifest must remain controlled-review');
if(manifest.defaultLanguage!=='hr'||manifest.fallbackLanguage!=='en')fail('default or fallback language invalid');
const expected=[
  ['hr','/','ltr','primary-full'],
  ['en','/en/','ltr','primary-full'],
  ['de','/de/','ltr','secondary-corporate'],
  ['it','/it/','ltr','secondary-corporate'],
  ['ar','/arabic/','rtl','secondary-corporate'],
  ['zh','/cn/','ltr','secondary-corporate']
];
const locales=manifest.locales||[];
if(locales.length!==expected.length)fail(`expected ${expected.length} locales, got ${locales.length}`);
for(const [code,route,direction,coverage] of expected){
  const locale=locales.find(item=>item.code===code);
  if(!locale)fail(`missing locale ${code}`);
  if(locale.route!==route||locale.direction!==direction||locale.coverage!==coverage)fail(`locale contract mismatch ${code}`);
}
for(const code of ['sl','sr','hu'])if(!(manifest.notIncludedInThisRelease||[]).includes(code))fail(`excluded locale missing ${code}`);

const routeFiles={de:'apps/portal/de/index.html',it:'apps/portal/it/index.html',ar:'apps/portal/arabic/index.html',zh:'apps/portal/cn/index.html'};
for(const [code,file] of Object.entries(routeFiles)){
  if(!exists(file))fail(`missing locale file ${file}`);
  const html=read(file);
  if(!/noindex,nofollow,noarchive/i.test(html))fail(`${code} must remain noindex`);
  if(!html.includes('GNK ASG d.o.o.')||!html.includes('GNK DINAMO Ltd.'))fail(`${code} corporate names missing`);
  if(!html.includes('/en/'))fail(`${code} English fallback missing`);
}
const arabic=read(routeFiles.ar);
if(!/<html[^>]+lang="ar"[^>]+dir="rtl"/i.test(arabic))fail('Arabic page must be lang=ar and dir=rtl');
if(!arabic.includes('localized-rtl-cjk-v1.css'))fail('Arabic RTL stylesheet missing');
const chinese=read(routeFiles.zh);
if(!/<html[^>]+lang="zh-CN"/i.test(chinese))fail('Chinese page must use zh-CN');
if(!chinese.includes('localized-rtl-cjk-v1.css'))fail('Chinese CJK stylesheet missing');

const menu=read('apps/portal/assets/public-menu-v18.js');
for(const token of ["ar:'/arabic/'","zh:'/cn/'","hreflang=\"${code==='zh'?'zh-Hans':code}\"",'document.documentElement.dir']){
  if(!menu.includes(token))fail(`public menu missing ${token}`);
}
const review=read('apps/portal/language-review/index.html');
for(const route of ['/','/en/','/de/','/it/','/arabic/','/cn/'])if(!review.includes(`href="${route}"`))fail(`language review missing ${route}`);
if(!/noindex,nofollow,noarchive/i.test(review))fail('language review must remain noindex');

for(const file of ['apps/portal/assets/localized-corporate-home-v1.css','apps/portal/assets/localized-rtl-cjk-v1.css'])if(!exists(file))fail(`missing stylesheet ${file}`);
console.log('MULTILINGUAL_REVIEW_OK');
