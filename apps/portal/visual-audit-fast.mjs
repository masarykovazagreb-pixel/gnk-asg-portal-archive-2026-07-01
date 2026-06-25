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
const tasks = views.flatMap(([view, viewport]) => routes.map(([route, name]) => ({ view, viewport, route, name })));
const out = path.resolve('visual-audit-fast-output');
fs.mkdirSync(out, { recursive: true });
const results = [];
const browser = await chromium.launch({ headless: true });

async function capture(task) {
  const { view, viewport, route, name } = task;
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  const item = { view, route, name, url: `${base}${route}` };
  try {
    const response = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 12000 });
    await page.waitForTimeout(1000);
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
    await page.screenshot({ path: path.join(out, `${name}-${view}.png`), fullPage: true });
    if (item.headerCount) await page.locator('#gnk-asg-premium-header').screenshot({ path: path.join(out, `${name}-${view}-header.png`) }).catch(() => {});
  } catch (error) {
    item.error = String(error);
    await page.screenshot({ path: path.join(out, `${name}-${view}-ERROR.png`), fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
  results.push(item);
  console.log(JSON.stringify(item));
}

const pool = 6;
for (let index = 0; index < tasks.length; index += pool) await Promise.all(tasks.slice(index, index + pool).map(capture));
await browser.close();
results.sort((a, b) => `${a.view}:${a.name}`.localeCompare(`${b.view}:${b.name}`));
fs.writeFileSync(path.join(out, 'audit.json'), JSON.stringify(results, null, 2));
