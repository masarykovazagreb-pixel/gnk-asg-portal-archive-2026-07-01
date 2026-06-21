import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const baseUrl = String(process.env.PREVIEW_BASE_URL || 'https://gnk-asg-business-light-preview.beckuphome.workers.dev').replace(/\/$/, '');
const outDir = path.resolve('reports/mobile-contrast-browser-audit');
fs.mkdirSync(outDir, { recursive: true });

const routes = [
  { key: 'hr', path: '/' },
  { key: 'en', path: '/en/' }
];
const themes = ['dark', 'light'];
const executablePath = process.env.CHROMIUM_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const results = [];

const screenshotViewport = async (page, selector, targetPath) => {
  const locator = page.locator(selector).first();
  if (!(await locator.count())) return false;
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.screenshot({ path: targetPath, fullPage: false });
  return true;
};

try {
  for (const route of routes) {
    for (const theme of themes) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
        reducedMotion: 'reduce'
      });
      await context.addInitScript(value => localStorage.setItem('gnk-asg-theme', value), theme);
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      const url = `${baseUrl}${route.path}`;
      const scenario = {
        route: route.key,
        theme,
        url,
        htmlTheme: null,
        contractLoaded: false,
        containerCount: 0,
        checkCount: 0,
        passCount: 0,
        failCount: 0,
        failures: [],
        checks: [],
        error: null
      };

      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        if (!response || !response.ok()) throw new Error(`${url} returned ${response?.status() || 'no response'}`);

        await page.waitForSelector('body.gnk-asg-premium-shell');
        await page.waitForSelector('#gnk-final-contrast-contract-css');
        await page.waitForSelector('#financials .kpi, #grupa .group-card');
        await page.waitForTimeout(2200);

        const audit = await page.evaluate(({ routeKey, themeName }) => {
          const parse = value => {
            const match = String(value || '').match(/rgba?\(([^)]+)\)/i);
            if (!match) return null;
            const parts = match[1].split(',').map(item => Number(item.trim()));
            if (parts.length < 3 || parts.some((item, index) => index < 3 && Number.isNaN(item))) return null;
            return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
          };
          const channel = value => {
            const normalized = value / 255;
            return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
          };
          const luminance = color => 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
          const ratio = (a, b) => {
            const l1 = luminance(a);
            const l2 = luminance(b);
            return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          };
          const blend = (foreground, background) => {
            const alpha = foreground.a ?? 1;
            return {
              r: foreground.r * alpha + background.r * (1 - alpha),
              g: foreground.g * alpha + background.g * (1 - alpha),
              b: foreground.b * alpha + background.b * (1 - alpha),
              a: 1
            };
          };
          const backgroundFor = element => {
            let current = element;
            let result = { r: 255, g: 255, b: 255, a: 1 };
            const layers = [];
            while (current && current !== document.documentElement) {
              const color = parse(getComputedStyle(current).backgroundColor);
              if (color && color.a > 0) layers.push(color);
              current = current.parentElement;
            }
            for (let index = layers.length - 1; index >= 0; index -= 1) result = blend(layers[index], result);
            return result;
          };
          const isVisible = element => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
          };
          const containers = Array.from(document.querySelectorAll('#financials .kpi, #grupa .group-card, #grupa .group-kpis > div, #o-nama .card, #dokumenti .doc'))
            .filter(isVisible);
          const textSelector = 'h1,h2,h3,h4,p,span,strong,small,dt,dd,a,.value,.label,.meaning,.eyebrow,.tag';
          const checks = [];
          containers.forEach((container, containerIndex) => {
            const elements = Array.from(container.querySelectorAll(textSelector)).filter(element => {
              if (!isVisible(element)) return false;
              const text = String(element.textContent || '').replace(/\s+/g, ' ').trim();
              if (!text) return false;
              return !Array.from(element.children).some(child => String(child.textContent || '').trim() === text);
            });
            elements.forEach((element, elementIndex) => {
              const style = getComputedStyle(element);
              const foreground = parse(style.color);
              const background = backgroundFor(element);
              if (!foreground || !background) return;
              const actualForeground = blend(foreground, background);
              const contrast = ratio(actualForeground, background);
              const fontSize = Number.parseFloat(style.fontSize) || 16;
              const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
              const large = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
              const required = large ? 3 : 4.5;
              checks.push({
                id: `${routeKey}-${themeName}-${containerIndex}-${elementIndex}`,
                container: container.className || container.tagName,
                selector: element.className || element.tagName.toLowerCase(),
                text: String(element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
                color: style.color,
                background: `rgb(${Math.round(background.r)}, ${Math.round(background.g)}, ${Math.round(background.b)})`,
                fontSize,
                fontWeight,
                contrast: Number(contrast.toFixed(2)),
                required,
                pass: contrast >= required
              });
            });
          });
          const failures = checks.filter(item => !item.pass);
          return {
            route: routeKey,
            theme: themeName,
            htmlTheme: document.documentElement.dataset.gnkTheme,
            contractLoaded: Boolean(document.getElementById('gnk-final-contrast-contract-css')),
            containerCount: containers.length,
            checkCount: checks.length,
            passCount: checks.length - failures.length,
            failCount: failures.length,
            failures,
            checks
          };
        }, { routeKey: route.key, themeName: theme });

        Object.assign(scenario, audit);
        await screenshotViewport(page, '#financials', path.join(outDir, `${route.key}-${theme}-financials.png`));
        await screenshotViewport(page, '#grupa', path.join(outDir, `${route.key}-${theme}-grupa.png`));
      } catch (error) {
        scenario.error = String(error?.stack || error?.message || error);
        try {
          await page.screenshot({ path: path.join(outDir, `${route.key}-${theme}-error.png`), fullPage: false });
        } catch {}
      } finally {
        results.push(scenario);
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

const failures = results.flatMap(result => result.failures.map(item => ({ route: result.route, theme: result.theme, ...item })));
const scenarioErrors = results.filter(result => result.error).map(result => ({ route: result.route, theme: result.theme, error: result.error }));
const status = failures.length === 0 && scenarioErrors.length === 0 && results.length === 4 ? 'PASS' : 'FAIL';
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  viewport: { width: 390, height: 844, mobile: true },
  scenarioCount: results.length,
  totalChecks: results.reduce((sum, result) => sum + result.checkCount, 0),
  totalFailures: failures.length,
  scenarioErrorCount: scenarioErrors.length,
  status,
  productionTouched: false,
  results,
  failures,
  scenarioErrors
};

fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
const lines = [
  '# GNK ASG mobile contrast browser audit',
  '',
  `- Status: **${report.status}**`,
  `- Preview: ${baseUrl}`,
  `- Scenarios: ${report.scenarioCount}`,
  `- Text checks: ${report.totalChecks}`,
  `- Contrast failures: ${report.totalFailures}`,
  `- Scenario errors: ${report.scenarioErrorCount}`,
  '- Production touched: **NO**',
  '',
  '| Route | Theme | Containers | Checks | Failures | Error |',
  '|---|---:|---:|---:|---:|---|',
  ...results.map(item => `| ${item.route} | ${item.theme} | ${item.containerCount} | ${item.checkCount} | ${item.failCount} | ${item.error ? item.error.split('\n')[0].replace(/\|/g, '\\|') : ''} |`)
];
if (failures.length) {
  lines.push('', '## Contrast failures', '', '| Route | Theme | Text | Contrast | Required | Color | Background |', '|---|---|---|---:|---:|---|---|');
  failures.slice(0, 100).forEach(item => lines.push(`| ${item.route} | ${item.theme} | ${item.text.replace(/\|/g, '\\|')} | ${item.contrast} | ${item.required} | ${item.color} | ${item.background} |`));
}
if (scenarioErrors.length) {
  lines.push('', '## Scenario errors', '');
  scenarioErrors.forEach(item => lines.push(`- ${item.route}/${item.theme}: ${item.error.split('\n')[0]}`));
}
fs.writeFileSync(path.join(outDir, 'report.md'), `${lines.join('\n')}\n`);
console.log(lines.join('\n'));
if (status !== 'PASS') process.exit(1);
