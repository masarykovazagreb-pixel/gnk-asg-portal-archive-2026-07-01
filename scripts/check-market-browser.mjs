#!/usr/bin/env node
import fs from 'node:fs';
import {chromium} from 'playwright';

const base=process.env.GNK_BASE_URL||'https://gnk-asg.hr';
const output=process.argv[2]||'/tmp/gnk-market-browser/report.json';
const screenshot=process.argv[3]||'/tmp/gnk-market-browser/network-market.png';
const failures=[];
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1100},locale:'hr-HR'});
const page=await context.newPage();
const pageErrors=[];
const requestFailures=[];
page.on('pageerror',error=>pageErrors.push(String(error?.message||error)));
page.on('requestfailed',request=>{if(request.url().startsWith(base))requestFailures.push({url:request.url(),error:request.failure()?.errorText||'failed'});});
const response=await page.goto(`${base}/?browser=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(12000);
const rendered=await page.evaluate(()=>({
  title:document.title,
  h1:String(document.querySelector('h1.gnk-index-title')?.textContent||'').replace(/\s+/g,' ').trim(),
  v3Panels:document.querySelectorAll('#gnk-live-market-chart-v3').length,
  v4Panels:document.querySelectorAll('#gnk-live-market-chart-v4').length,
  v3Styles:document.querySelectorAll('#gnk-market-v3-style').length,
  marketScripts:[...document.scripts].map(script=>script.src).filter(src=>/index-live-market-chart-v[34]\.js/.test(src)),
  marketValues:[...document.querySelectorAll('#marketRows .market-value')].map(node=>String(node.textContent||'').trim()),
  v4Text:String(document.querySelector('#gnk-live-market-chart-v4')?.textContent||'').replace(/\s+/g,' ').trim(),
  canvas:{width:document.querySelector('#gnk-live-market-chart-v4 canvas')?.width||0,height:document.querySelector('#gnk-live-market-chart-v4 canvas')?.height||0},
  placeholders:/Učitavanje najnovijih vijesti|Učitavanje mreže|Učitavanje objava|class="market-value">Učitavanje/i.test(document.documentElement.innerHTML),
  horizontalOverflow:Math.max(0,document.documentElement.scrollWidth-window.innerWidth)
}));
fs.mkdirSync(new URL('.',`file://${output}`).pathname,{recursive:true});
const network=page.locator('#mreza-grupe');
if(await network.count())await network.screenshot({path:screenshot});
await browser.close();

if(response?.status()!==200)failures.push(`http=${response?.status()}`);
if(rendered.v3Panels!==0)failures.push(`v3Panels=${rendered.v3Panels}`);
if(rendered.v4Panels!==1)failures.push(`v4Panels=${rendered.v4Panels}`);
if(rendered.v3Styles!==0)failures.push(`v3Styles=${rendered.v3Styles}`);
if(rendered.marketScripts.some(src=>/v3\.js/.test(src)))failures.push(`v3Script=${JSON.stringify(rendered.marketScripts)}`);
if(rendered.marketScripts.filter(src=>/v4\.js/.test(src)).length!==1)failures.push(`v4Scripts=${JSON.stringify(rendered.marketScripts)}`);
if(rendered.marketValues.length!==4||rendered.marketValues.some(value=>!value||/Učitavanje|Nedostupno|Unavailable|^—$/.test(value)))failures.push(`marketValues=${JSON.stringify(rendered.marketValues)}`);
if(rendered.canvas.width<250||rendered.canvas.height<150)failures.push(`canvas=${JSON.stringify(rendered.canvas)}`);
if(rendered.placeholders)failures.push('placeholders_present');
if(rendered.horizontalOverflow>4)failures.push(`horizontalOverflow=${rendered.horizontalOverflow}`);
if(pageErrors.length)failures.push(`pageErrors=${pageErrors.length}`);
if(requestFailures.length)failures.push(`requestFailures=${requestFailures.length}`);

const report={ok:failures.length===0,checkedAt:new Date().toISOString(),failures,rendered,pageErrors,requestFailures};
fs.writeFileSync(output,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exit(1);
