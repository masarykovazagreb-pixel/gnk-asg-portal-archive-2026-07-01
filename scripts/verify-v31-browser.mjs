import fs from 'node:fs';
import { chromium } from 'playwright';

const base='https://gnk-asg.hr';
const cases=[
  {name:'hr-desktop',path:'/',viewport:{width:1440,height:1100}},
  {name:'hr-mobile',path:'/',viewport:{width:390,height:844}},
  {name:'en-desktop',path:'/en/',viewport:{width:1440,height:1100}},
  {name:'en-mobile',path:'/en/',viewport:{width:390,height:844}}
];
const results=[];
let browser;
try{
  browser=await chromium.launch({headless:true});
  for(const item of cases){
    const page=await browser.newPage({viewport:item.viewport});
    const pageErrors=[];
    page.on('pageerror',error=>pageErrors.push(error.message));
    let response;
    let audit;
    const failures=[];
    try{
      response=await page.goto(`${base}${item.path}?v31browser=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});
      await page.waitForTimeout(6500);
      audit=await page.evaluate(()=>{
        const visible=element=>{const s=getComputedStyle(element),r=element.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&r.width>0&&r.height>0};
        const count=selector=>[...document.querySelectorAll(selector)].filter(visible).length;
        const text=selector=>(document.querySelector(selector)?.innerText||'').replace(/\s+/g,' ').trim();
        const styles=[...document.querySelectorAll('link[rel="stylesheet"]')].map(link=>link.href);
        const blankSections=[...document.querySelectorAll('main>.section')].map((section,index)=>({index,height:Math.round(section.getBoundingClientRect().height),textLength:(section.innerText||'').replace(/\s+/g,' ').trim().length,title:section.querySelector('h2,h3')?.textContent?.trim()||''})).filter(section=>section.height>700&&section.textLength<80);
        return {
          title:document.title,lang:document.documentElement.lang,bodyClass:document.body.className,
          viewportWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,
          horizontalOverflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),
          visiblePremiumHeaders:count('#gnk-asg-premium-header'),visibleLegacyHeaders:count('.brand-head,.top-nav'),
          visibleMain:count('main'),visibleHero:count('main>.hero'),
          coreV31Loaded:styles.some(url=>url.includes('index-redesign-production.css')&&url.includes('stable-v31')),
          criticalV31Loaded:styles.some(url=>url.includes('index-critical-v31.css')&&url.includes('20260626-v31')),
          legacyPolishLoaded:styles.some(url=>url.includes('index-polish-v1.css')),
          galleryAutoImages:document.querySelectorAll('.gnk-gallery-auto-image').length,
          profileCards:count('.profile-grid .profile-card'),financeCards:count('.finance-grid .company-card'),liveCards:count('.live-grid .live-card'),
          profileTextLength:text('.profile-grid').length,financeTextLength:text('.finance-grid').length,latestNews:text('#latestNews'),blankSections
        };
      });
      if(!response||response.status()!==200)failures.push(`http=${response?.status()||0}`);
      if(audit.horizontalOverflow>2)failures.push(`horizontalOverflow=${audit.horizontalOverflow}`);
      if(audit.visiblePremiumHeaders!==1)failures.push(`visiblePremiumHeaders=${audit.visiblePremiumHeaders}`);
      if(audit.visibleLegacyHeaders!==0)failures.push(`visibleLegacyHeaders=${audit.visibleLegacyHeaders}`);
      if(audit.visibleMain!==1||audit.visibleHero!==1)failures.push('main_or_hero_not_visible');
      if(!audit.bodyClass.includes('gnk-index-v31'))failures.push(`body_v31_missing=${audit.bodyClass}`);
      if(/gnk-public-v7|gnk-public-home-v7/.test(audit.bodyClass))failures.push(`legacy_v7_body=${audit.bodyClass}`);
      if(!audit.coreV31Loaded)failures.push('core_v31_css_missing');
      if(!audit.criticalV31Loaded)failures.push('critical_v31_css_missing');
      if(audit.legacyPolishLoaded)failures.push('legacy_polish_loaded');
      if(audit.galleryAutoImages!==0)failures.push(`galleryAutoImages=${audit.galleryAutoImages}`);
      if(audit.profileCards<2||audit.profileTextLength<120)failures.push(`profile_incomplete=${audit.profileCards}:${audit.profileTextLength}`);
      if(audit.financeCards<2||audit.financeTextLength<100)failures.push(`finance_incomplete=${audit.financeCards}:${audit.financeTextLength}`);
      if(audit.liveCards<3)failures.push(`liveCards=${audit.liveCards}`);
      if(!audit.latestNews||/Učitavanje|Loading latest/i.test(audit.latestNews))failures.push('latestNews_placeholder_or_empty');
      if(audit.blankSections.length)failures.push(`blankSections=${JSON.stringify(audit.blankSections)}`);
      if(pageErrors.length)failures.push(...pageErrors.slice(0,5).map(error=>`pageerror:${error}`));
    }catch(error){failures.push(`audit_exception:${error.message}`)}
    try{await page.screenshot({path:`artifacts/${item.name}.png`,fullPage:true,timeout:30000})}catch(error){failures.push(`screenshot_exception:${error.message}`)}
    results.push({...item,http:response?.status()||0,audit,pageErrors,failures});
    await page.close().catch(()=>{});
  }
}catch(error){results.push({name:'fatal',failures:[`browser_exception:${error.message}`]})}
finally{
  if(browser)await browser.close().catch(()=>{});
  const report={checkedAt:new Date().toISOString(),commit:process.env.GITHUB_SHA,ok:results.length===cases.length&&results.every(result=>result.failures.length===0),results};
  fs.mkdirSync('artifacts',{recursive:true});
  fs.writeFileSync('artifacts/report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(!report.ok)process.exitCode=1;
}
