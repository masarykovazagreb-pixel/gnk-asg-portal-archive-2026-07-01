import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const base = process.env.VISUAL_BASE || 'http://127.0.0.1:8787';
const output = new URL('../existing-media-layout-output/', import.meta.url);
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 }, deviceScaleFactor: 1 });
await page.goto(`${base}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);

const result = await page.evaluate(() => {
  const section = document.getElementById('mreza-grupe');
  const visual = document.getElementById('gnk-existing-visual-stage');
  const code = document.getElementById('gnk-existing-code-stage');
  const map = section?.querySelector('.map-card');
  const locations = section?.querySelector('.locations');
  const shell = code?.querySelector('.gnk-existing-code-shell');
  const images = [...(visual?.querySelectorAll('img') || [])];
  const rect = element => element ? element.getBoundingClientRect().toJSON() : null;
  return {
    directBottomShowcase: Boolean(document.querySelector('main > #the-code-index,main > .gnk-code-slot')),
    visualInsideMap: Boolean(visual && map?.contains(visual)),
    codeInsideLocations: Boolean(code && locations?.contains(code)),
    imageCount: images.length,
    loadedImages: images.filter(image => image.complete && image.naturalWidth > 0).length,
    visualRect: rect(visual),
    codeRect: rect(code),
    shellRect: rect(shell),
    mapRect: rect(map),
    locationsRect: rect(locations),
    iframeSource: code?.querySelector('iframe')?.getAttribute('src') || ''
  };
});

await page.locator('#mreza-grupe').screenshot({ path: new URL('group-network.png', output) });
await fs.writeFile(new URL('result.json', output), JSON.stringify(result, null, 2));

const failures = [];
if (result.directBottomShowcase) failures.push('stale bottom showcase remains');
if (!result.visualInsideMap) failures.push('visuals are not inside existing map field');
if (!result.codeInsideLocations) failures.push('THE CODE is not inside existing locations field');
if (result.imageCount !== 2 || result.loadedImages !== 2) failures.push('two supplied visuals are not loaded');
if (!result.iframeSource.startsWith('/the-code/')) failures.push('THE CODE iframe source is incorrect');
if (!result.shellRect || result.shellRect.height < 500) failures.push('THE CODE frame is not tall enough');
if (result.visualRect && result.mapRect && result.visualRect.bottom > result.mapRect.bottom + 1) failures.push('visual stage overflows existing map field');
if (result.codeRect && result.locationsRect && result.codeRect.bottom > result.locationsRect.bottom + 1) failures.push('code stage overflows existing locations field');

console.log(JSON.stringify({ result, failures }, null, 2));
await browser.close();
if (failures.length) process.exit(1);
