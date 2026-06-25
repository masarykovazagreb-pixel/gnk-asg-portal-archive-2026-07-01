import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const base = process.env.VISUAL_BASE || 'http://127.0.0.1:8787';
const routes = [
  ['/', 'hr-home', 'hr'], ['/trzista/', 'hr-trzista', 'hr'], ['/objave/', 'hr-objave', 'hr'], ['/vijesti/', 'hr-vijesti', 'hr'],
  ['/assistant/', 'hr-assistant', 'hr'], ['/contact/', 'hr-contact', 'hr'], ['/downloads/', 'hr-downloads', 'hr'],
  ['/visual-index/', 'visual-index', 'hr'], ['/legal/', 'hr-legal', 'hr'], ['/status-automatizacije/', 'hr-status', 'hr'], ['/app/', 'app', 'hr'],
  ['/en/', 'en-home', 'en'], ['/markets/', 'en-markets', 'en'], ['/publications/', 'en-publications', 'en'], ['/news/', 'en-news', 'en'],
  ['/en/assistant/', 'en-assistant', 'en'], ['/en/contact/', 'en-contact', 'en'], ['/en/downloads/', 'en-downloads', 'en'],
  ['/en/legal/', 'en-legal', 'en'], ['/automation-status/', 'en-status', 'en']
];
const expected = {
  hr: ['Profil','Financije','Tržišta','Objave','Vijesti','Auto Editor','Visual Index','PDF centar','AI pomoć','Kontakt','Legal','Admin','App'],
  en: ['Profile','Financials','Markets','Publications','News','Auto Editor','Visual Index','PDF Centre','AI Help','Contact','Legal','Admin','App']
};
const views = [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]];
const output = path.resolve('visual-v13-test-output');
fs.mkdirSync(output, { recursive: true });
const audit = [];
const failures = [];
const browser = await chromium.launch({ headless: true });

for (const [view, viewport] of views) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  for (const [route, name, locale] of routes) {
    const item = { view, route, name, locale };
    try {
      const response = await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 22000 });
      item.http = response?.status() ?? null;
      await page.waitForSelector('#gnk-asg-premium-header[data-public-menu-version="13"]');
      await page.waitForTimeout(300);
      item.headerCount = await page.locator('#gnk-asg-premium-header').count();
      item.menuCount = await page.locator('#gnk-asg-premium-menu').count();
      item.languageCount = await page.locator('#gnk-public-language').count();
      item.menuLinks = await page.locator('#gnk-asg-premium-menu a').allInnerTexts();
      item.bodyClass = await page.locator('body').getAttribute('class');
      item.horizontalOverflow = await page.evaluate(() => document.body.scrollWidth > innerWidth + 2);
      item.visibleLegacy = await page.evaluate(() => {
        const selectors = ['body > header:not(#gnk-asg-premium-header)', '.site-header', '.shell > .brand-head', '.shell > .top-nav', '.gnk-asg-full-menu-v2', '.gnk-asg-rescue-menu', '.gnk-asg-final-menu-wrap'];
        return [...document.querySelectorAll(selectors.join(','))].filter(element => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 1 && rect.height > 1;
        }).length;
      });
      item.aiBadgeCount = await page.locator('#gnk-ai-badge-v13').count();
      const checks = {
        http: item.http === 200,
        oneHeader: item.headerCount === 1,
        oneMenu: item.menuCount === 1,
        oneLanguage: item.languageCount === 1,
        exactMenu: JSON.stringify(item.menuLinks) === JSON.stringify(expected[locale]),
        bodyClass: String(item.bodyClass || '').includes('gnk-public-v13'),
        noLegacy: item.visibleLegacy === 0,
        noOverflow: item.horizontalOverflow === false,
        oneAiBadge: item.aiBadgeCount === 1
      };
      item.checks = checks;
      item.ok = Object.values(checks).every(Boolean);
      if (!item.ok) failures.push(item);
      await page.screenshot({ path: path.join(output, `${name}-${view}.png`), fullPage: false });
    } catch (error) {
      item.error = String(error?.stack || error);
      item.ok = false;
      failures.push(item);
      await page.screenshot({ path: path.join(output, `${name}-${view}-ERROR.png`), fullPage: false }).catch(() => {});
    }
    audit.push(item);
    console.log(JSON.stringify(item));
  }
  await context.close();
}

const sharedContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const sharedPage = await sharedContext.newPage();
for (const route of ['/visual-index/?lang=en', '/app/?lang=en']) {
  await sharedPage.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 22000 });
  await sharedPage.waitForSelector('#gnk-asg-premium-header[data-language="en"]');
  const links = await sharedPage.locator('#gnk-asg-premium-menu a').allInnerTexts();
  const languageTarget = await sharedPage.locator('#gnk-public-language').getAttribute('href');
  if (JSON.stringify(links) !== JSON.stringify(expected.en) || String(languageTarget || '').includes('lang=en')) {
    failures.push({ route, error: 'shared page did not preserve English navigation context' });
  }
}
await sharedContext.close();

const privatePage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await privatePage.goto(`${base}/operator-dashboard/`, { waitUntil: 'domcontentloaded', timeout: 22000 });
const privateHeader = await privatePage.locator('#gnk-asg-premium-header').count();
if (privateHeader !== 0) failures.push({ route: '/operator-dashboard/', error: 'public header present on private route' });
await privatePage.close();
await browser.close();

fs.writeFileSync(path.join(output, 'audit.json'), JSON.stringify(audit, null, 2));
fs.writeFileSync(path.join(output, 'failures.json'), JSON.stringify(failures, null, 2));
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
console.log(`PUBLIC_VISUAL_V13_OK views=${audit.length}`);
