'use strict';

const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

const URL = 'http://127.0.0.1:4173/objave/';
const OUTPUT_DIR = path.resolve('artifacts/key-routes-quality');
const JSON_PATH = path.join(OUTPUT_DIR, 'objave-cls-diagnostic.json');
const SCREENSHOT_PATH = path.join(OUTPUT_DIR, 'objave-cls-diagnostic.png');

function round(value) {
  return typeof value === 'number' ? Number(value.toFixed(6)) : null;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=hr-HR'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1350, height: 940, deviceScaleFactor: 1 });

    await page.evaluateOnNewDocument(() => {
      try {
        localStorage.setItem('gnk_asg_language', 'hr');
      } catch (_) {
        // The storage origin is available after navigation.
      }

      window.__gnkClsEntries = [];
      const describeNode = (node) => {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;
        const element = node;
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id || null,
          className: typeof element.className === 'string' ? element.className.slice(0, 240) : null,
          text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180) || null,
          src: element.getAttribute('src'),
          href: element.getAttribute('href'),
        };
      };

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) continue;
          window.__gnkClsEntries.push({
            value: entry.value,
            startTime: entry.startTime,
            sources: (entry.sources || []).map((source) => ({
              node: describeNode(source.node),
              previousRect: source.previousRect ? {
                x: source.previousRect.x,
                y: source.previousRect.y,
                width: source.previousRect.width,
                height: source.previousRect.height,
              } : null,
              currentRect: source.currentRect ? {
                x: source.currentRect.x,
                y: source.currentRect.y,
                width: source.currentRect.width,
                height: source.currentRect.height,
              } : null,
            })),
          });
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });

    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const observed = await page.evaluate(() => ({
      finalUrl: location.href,
      language: localStorage.getItem('gnk_asg_language'),
      entries: window.__gnkClsEntries || [],
      readyState: document.readyState,
    }));

    const entries = observed.entries
      .map((entry) => ({
        ...entry,
        value: round(entry.value),
        startTime: round(entry.startTime),
      }))
      .sort((a, b) => b.value - a.value);

    const payload = {
      ok: observed.finalUrl === URL && observed.language === 'hr',
      requestedUrl: URL,
      finalUrl: observed.finalUrl,
      language: observed.language,
      readyState: observed.readyState,
      totalObservedCls: round(entries.reduce((sum, entry) => sum + entry.value, 0)),
      entryCount: entries.length,
      entries,
      generatedAt: new Date().toISOString(),
    };

    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    fs.writeFileSync(JSON_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({
      ok: payload.ok,
      finalUrl: payload.finalUrl,
      totalObservedCls: payload.totalObservedCls,
      entryCount: payload.entryCount,
      evidence: JSON_PATH,
    }));

    if (!payload.ok) {
      throw new Error(`CLS diagnostic did not remain on the HR route: ${payload.finalUrl}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
