import fs from 'node:fs';

const bodyPath=process.argv[2]||'deploy-verification/news-fallback.json';
const headerPath=process.argv[3]||`${bodyPath}.headers`;
const minimum=Number(process.argv[4]||100);
const fail=(message,detail='')=>{console.error(`ASSERT fallback news failed: ${message}`);if(detail)console.error(detail);process.exit(1)};
if(!fs.existsSync(bodyPath))fail(`missing body ${bodyPath}`);
if(!fs.existsSync(headerPath))fail(`missing headers ${headerPath}`);
const headers=fs.readFileSync(headerPath,'utf8');
if(!/^content-type:\s*application\/json\b/im.test(headers))fail('response is not application/json',headers.slice(0,1200));
const raw=fs.readFileSync(bodyPath,'utf8');
let parsed;try{parsed=JSON.parse(raw)}catch(error){fail(`invalid JSON: ${error.message}`,raw.slice(0,800))}
const items=Array.isArray(parsed)?parsed:Array.isArray(parsed?.items)?parsed.items:Array.isArray(parsed?.posts)?parsed.posts:Array.isArray(parsed?.news)?parsed.news:null;
if(!items)fail('unsupported JSON shape',JSON.stringify(parsed).slice(0,800));
console.log(`ASSERT fallback news count >= ${minimum}; actual=${items.length}`);
if(items.length<minimum)fail(`expected at least ${minimum} items, received ${items.length}`);
console.log(JSON.stringify({ok:true,count:items.length,minimum,shape:Array.isArray(parsed)?'array':Array.isArray(parsed.items)?'items':Array.isArray(parsed.posts)?'posts':'news'},null,2));
