import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const base=process.env.VISUAL_BASE||'http://127.0.0.1:8787';
const output='operations-suite-visual-output';
await fs.mkdir(output,{recursive:true});
const options={headless:true};
if(process.env.CHROME_PATH)options.executablePath=process.env.CHROME_PATH;
const browser=await chromium.launch(options);

async function mediaKitTest(){
  const page=await browser.newPage({viewport:{width:1440,height:1200},deviceScaleFactor:1});
  await page.goto(`${base}/media-kit-2026/`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.kit-card',{timeout:15000});
  await page.waitForTimeout(1500);
  const result=await page.evaluate(()=>({
    kits:document.querySelectorAll('.kit-card').length,
    workspace:Boolean(document.querySelector('.kit-workspace')),
    messages:document.querySelectorAll('.message-list li').length,
    assets:document.querySelectorAll('.asset-card').length,
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2
  }));
  await page.screenshot({path:`${output}/media-kit-desktop.png`,fullPage:true});
  const ny=page.locator('[data-kit="new-york"]');
  await ny.click();
  await page.waitForTimeout(500);
  await page.locator('#kitWorkspace').screenshot({path:`${output}/media-kit-new-york.png`});
  if(result.kits!==3||!result.workspace||result.messages<5||result.assets<4||result.overflow)throw new Error(`Media kit validation failed: ${JSON.stringify(result)}`);
  await page.close();
  return result;
}

async function dashboardTest(){
  const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
  await page.route('**/api/media-command-center/status**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,live:false,autoAcknowledgement:true,contacts:{total:112},readiness:{ready:12},bindings:{d1:true,r2:true,email:true}})}));
  await page.route('**/api/media-command-center/applications**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,applications:[{humanDecision:'PENDING'},{humanDecision:'APPROVED'},{humanDecision:'APPROVED'}]})}));
  await page.route('**/api/media-application/config**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,decision:'HUMAN_ONLY'})}));
  await page.route('**/data/portal-version.json**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,version:'visual-test'})}));
  await page.goto(`${base}/admin-center/`,{waitUntil:'domcontentloaded'});
  await page.addStyleTag({url:`${base}/assets/admin-operations-v1.css`});
  await page.addScriptTag({url:`${base}/assets/admin-operations-v1.js`});
  await page.waitForSelector('#operationsCockpit',{timeout:15000});
  await page.waitForTimeout(1200);
  const result=await page.evaluate(()=>({
    cockpit:Boolean(document.getElementById('operationsCockpit')),
    score:document.querySelector('.ops-score-card.primary strong')?.textContent||'',
    gates:document.querySelectorAll('.ops-gate').length,
    actions:document.querySelectorAll('.ops-action').length,
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2
  }));
  await page.screenshot({path:`${output}/admin-operations-desktop.png`,fullPage:true});
  if(!result.cockpit||result.score!=='100%'||result.gates<5||result.actions!==4||result.overflow)throw new Error(`Dashboard validation failed: ${JSON.stringify(result)}`);
  await page.close();
  return result;
}

const mediaKit=await mediaKitTest();
const dashboard=await dashboardTest();
await fs.writeFile(`${output}/result.json`,JSON.stringify({ok:true,mediaKit,dashboard},null,2));
console.log(JSON.stringify({ok:true,mediaKit,dashboard},null,2));
await browser.close();
