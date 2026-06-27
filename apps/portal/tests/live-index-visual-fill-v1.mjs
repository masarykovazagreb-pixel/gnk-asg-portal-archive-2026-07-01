import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const base=process.env.LIVE_BASE||'https://gnk-asg.hr';
const output='live-index-visual-fill-output';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});

async function checkIndex(path,name,viewport){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error.message||error)));
  const response=await page.goto(`${base}${path}?cb=${Date.now()}`,{waitUntil:'networkidle',timeout:60000});
  if(!response?.ok())throw new Error(`${name}: HTTP ${response?.status()}`);
  await page.waitForSelector('[data-gnk-activation]',{timeout:30000});
  await page.waitForSelector('.gnk-activation__code iframe',{timeout:30000});
  await page.waitForTimeout(1500);
  const result=await page.evaluate(()=>{
    const visible=element=>{if(!element)return false;const s=getComputedStyle(element);const r=element.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&r.width>1&&r.height>1;};
    const slide=document.querySelector('.gnk-activation__slide:first-child');
    const film=document.querySelector('.gnk-activation__film-screen');
    const expansion=document.querySelector('#mreza-grupe .expansion');
    const code=document.querySelector('.gnk-activation__code');
    const frame=code?.querySelector('iframe');
    const frameRect=frame?.getBoundingClientRect();
    const codeRect=code?.getBoundingClientRect();
    const badLinks=[...document.querySelectorAll('a')].filter(a=>!a.getAttribute('href')||/^javascript:/i.test(a.getAttribute('href'))).length;
    return{
      activation:Boolean(document.querySelector('[data-gnk-activation]')),
      newYork:getComputedStyle(slide).backgroundImage.includes('index-new-york-2026.svg'),
      globalCommand:getComputedStyle(film).backgroundImage.includes('index-global-command-square.svg'),
      operations:getComputedStyle(expansion,'::after').backgroundImage.includes('index-operations-portrait.svg'),
      iframe:Boolean(frame)&&visible(frame),
      iframeHeight:Math.round(frameRect?.height||0),
      codeContainsFrame:Boolean(frameRect&&codeRect&&codeRect.bottom+1>=frameRect.bottom),
      externalPlateVisible:[...document.querySelectorAll('.gnk-activation__code-open,.gnk-activation__code>.gnk-activation__label')].some(visible),
      badLinks,
      navLinks:document.querySelectorAll('nav a[href]').length,
      horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+3
    };
  });
  await page.screenshot({path:`${output}/${name}.png`,fullPage:true});
  if(!result.activation||!result.newYork||!result.globalCommand||!result.operations||!result.iframe||result.iframeHeight<400||!result.codeContainsFrame||result.externalPlateVisible||result.badLinks||result.navLinks<8||result.horizontalOverflow||errors.length){
    throw new Error(`${name}: ${JSON.stringify({result,errors})}`);
  }
  await page.close();
  return result;
}

async function checkCode(){
  const page=await browser.newPage({viewport:{width:430,height:900}});
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error.message||error)));
  const response=await page.goto(`${base}/the-code/?cb=${Date.now()}`,{waitUntil:'networkidle',timeout:60000});
  if(!response?.ok())throw new Error(`THE CODE HTTP ${response?.status()}`);
  const enter=page.locator('[data-gnk-code-enter]');
  const sound=page.locator('[data-gnk-code-sound]');
  await enter.waitFor({state:'visible',timeout:20000});
  await sound.waitFor({state:'visible',timeout:20000});
  await enter.click();
  await sound.click();
  await page.waitForTimeout(500);
  const result={enterVisible:await enter.isVisible(),soundVisible:await sound.isVisible(),sceneCount:await page.locator('[data-scene]').count(),errors};
  await page.screenshot({path:`${output}/the-code-mobile.png`,fullPage:true});
  if(!result.enterVisible||!result.soundVisible||result.sceneCount<6||errors.length)throw new Error(`THE CODE: ${JSON.stringify(result)}`);
  await page.close();
  return result;
}

async function checkAssets(){
  const page=await browser.newPage();
  const paths=['/assets/index-new-york-2026.svg','/assets/index-global-command-square.svg','/assets/index-operations-portrait.svg','/assets/index-map-film-v1.css'];
  const result={};
  for(const path of paths){const response=await page.request.get(`${base}${path}?cb=${Date.now()}`);result[path]={status:response.status(),type:response.headers()['content-type']||'',bytes:(await response.body()).length};if(!response.ok()||result[path].bytes<500)throw new Error(`Asset ${path}: ${JSON.stringify(result[path])}`);}
  await page.close();
  return result;
}

const report={
  hrDesktop:await checkIndex('/','hr-desktop',{width:1440,height:1100}),
  enDesktop:await checkIndex('/en/','en-desktop',{width:1440,height:1100}),
  hrMobile:await checkIndex('/','hr-mobile',{width:390,height:844}),
  code:await checkCode(),
  assets:await checkAssets()
};
await fs.writeFile(`${output}/result.json`,JSON.stringify({ok:true,...report},null,2));
console.log(JSON.stringify({ok:true,...report},null,2));
await browser.close();
