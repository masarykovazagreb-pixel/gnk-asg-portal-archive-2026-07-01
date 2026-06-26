import fs from 'node:fs';
import {chromium} from 'playwright';

const BASE='https://gnk-asg.hr';
const ROUTES=['/','/en/','/vijesti/','/news/','/objave/','/publications/','/visual-index/','/visual-index/?lang=en','/trzista/','/markets/','/contact/','/legal/','/assistant/','/en/assistant/','/app/'];
const cases=ROUTES.flatMap(path=>[
  {name:`desktop-${path.replace(/[^a-z0-9]+/gi,'-')||'home'}`,path,width:1440,height:1000},
  {name:`mobile-${path.replace(/[^a-z0-9]+/gi,'-')||'home'}`,path,width:390,height:844}
]);
const browser=await chromium.launch({headless:true});
const rows=[];
fs.mkdirSync('artifacts',{recursive:true});
for(const item of cases){
  const page=await browser.newPage({viewport:{width:item.width,height:item.height}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let status=0,audit={},failures=[];
  try{
    const response=await page.goto(`${BASE}${item.path}${item.path.includes('?')?'&':'?'}audit=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});
    status=response?.status()||0;await page.waitForTimeout(3500);
    audit=await page.evaluate(()=>{
      const visible=element=>{const style=getComputedStyle(element),rect=element.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0&&rect.width>0&&rect.height>0};
      const body=(document.body.innerText||'').replace(/\s+/g,' ').trim();
      return{title:document.title,lang:document.documentElement.lang,bodyLength:body.length,overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),main:[...document.querySelectorAll('main')].filter(visible).length,images:[...document.images].filter(visible).length,broken:[...document.images].filter(image=>image.complete&&image.naturalWidth===0).map(image=>image.currentSrc||image.src).slice(0,10),placeholders:(body.match(/Učitavanje|Loading latest|Loading publications|Loading network/g)||[]).length};
    });
    if(status<200||status>=400)failures.push(`http=${status}`);
    if(!audit.title)failures.push('title_missing');
    if(audit.bodyLength<80)failures.push(`body_too_short=${audit.bodyLength}`);
    if(audit.overflow>3)failures.push(`overflow=${audit.overflow}`);
    if(audit.broken.length)failures.push(`broken_images=${audit.broken.length}`);
    if(audit.placeholders)failures.push(`placeholders=${audit.placeholders}`);
    if(errors.length)failures.push(...errors.slice(0,5).map(error=>`pageerror:${error}`));
  }catch(error){failures.push(`browser_exception:${error.message}`)}
  if(failures.length||['/','/objave/','/publications/','/visual-index/','/visual-index/?lang=en'].includes(item.path)){
    try{await page.screenshot({path:`artifacts/${item.name}.png`,fullPage:true,timeout:30000})}catch{}
  }
  rows.push({...item,status,audit,errors,failures});await page.close();
}
await browser.close();
const report={base:BASE,cases:rows.length,failed:rows.filter(row=>row.failures.length).length,ok:rows.every(row=>!row.failures.length),rows};
fs.writeFileSync('artifacts/public-browser-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({ok:report.ok,cases:report.cases,failed:report.failed,failures:rows.filter(row=>row.failures.length)},null,2));
if(!report.ok)process.exitCode=1;
