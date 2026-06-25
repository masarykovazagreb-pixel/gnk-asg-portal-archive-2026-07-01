import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const base = 'https://gnk-asg.hr';
const routes = [
  ['/', 'hr-home'], ['/trzista/', 'hr-trzista'], ['/objave/', 'hr-objave'], ['/vijesti/', 'hr-vijesti'],
  ['/assistant/', 'hr-assistant'], ['/contact/', 'hr-contact'], ['/downloads/', 'hr-downloads'], ['/visual-index/', 'visual-index'],
  ['/legal/', 'hr-legal'], ['/status-automatizacije/', 'hr-status'], ['/app/', 'app'], ['/en/', 'en-home'],
  ['/markets/', 'en-markets'], ['/publications/', 'en-publications'], ['/news/', 'en-news'], ['/en/assistant/', 'en-assistant'],
  ['/en/contact/', 'en-contact'], ['/en/downloads/', 'en-downloads'], ['/en/legal/', 'en-legal'], ['/automation-status/', 'en-status']
];
const views = [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]];
const out = path.resolve('visual-audit-fast-output');
fs.mkdirSync(out, { recursive: true });
const results = [];
const browser = await chromium.launch({ headless: true });
for (const [view, viewport] of views) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  for (const [route, name] of routes) {
    const item = { view, route, name, url: `${base}${route}` };
    try {
      const response = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 18000 });
      await page.waitForTimeout(1500);
      item.http = response?.status() ?? null;
      item.title = await page.title();
      item.scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      item.viewportWidth = await page.evaluate(() => innerWidth);
      item.horizontalOverflow = item.scrollWidth > item.viewportWidth + 2;
      item.headerCount = await page.locator('#gnk-asg-premium-header').count();
      item.menuCount = await page.locator('#gnk-asg-premium-menu').count();
      item.languageCount = await page.locator('#gnk-public-language').count();
      item.menuLinks = item.menuCount ? await page.locator('#gnk-asg-premium-menu a').allInnerTexts() : [];
      item.legacyNavCount = await page.locator('.top-nav, .site-nav, .main-nav, nav[aria-label="Primary"], nav[aria-label="Glavna navigacija"]').count();
      item.fixedControls = await page.evaluate(() => [...document.querySelectorAll('a,button,div')].filter(e => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().width > 25 && e.getBoundingClientRect().height > 25).map(e => `${e.tagName}#${e.id}.${String(e.className)}`).slice(0, 30));
      await page.screenshot({ path: path.join(out, `${name}-${view}.png`), fullPage: true });
      if (item.headerCount) await page.locator('#gnk-asg-premium-header').screenshot({ path: path.join(out, `${name}-${view}-header.png`) }).catch(() => {});
    } catch (error) {
      item.error = String(error);
      await page.screenshot({ path: path.join(out, `${name}-${view}-ERROR.png`), fullPage: true }).catch(() => {});
    }
    results.push(item);
    console.log(JSON.stringify(item));
  }
  await context.close();
}
await browser.close();
fs.writeFileSync(path.join(out, 'audit.json'), JSON.stringify(results, null, 2));
