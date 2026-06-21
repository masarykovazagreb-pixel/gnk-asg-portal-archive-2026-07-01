import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = String(process.env.PREVIEW_BASE_URL || 'https://gnk-asg-business-light-preview.beckuphome.workers.dev').replace(/\/$/, '');
const outDir = path.resolve('reports/mobile-contrast-browser-audit');
fs.mkdirSync(outDir, { recursive: true });

const routes = [
  { key: 'hr', path: '/' },
  { key: 'en', path: '/en/' }
];
const themes = ['dark', 'light'];

const browser = await chromium.launch({ headless: true });
const results = [];

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

      for (const section of ['financials', 'grupa']) {
        const locator = page.locator(`#${section}`);
        if (await locator.count()) {
          await locator.screenshot({ path: path.join(outDir, `${route.key}-${theme}-${section}.png`) });
        }
      }

      results.push({ url, ...audit });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const failures = results.flatMap(result => result.failures.map(item => ({ route: result.route, theme: result.theme, ...item })));
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  viewport: { width: 390, height: 844, mobile: true },
  scenarioCount: results.length,
  totalChecks: results.reduce((sum, result) => sum + result.checkCount, 0),
  totalFailures: failures.length,
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  productionTouched: false,
  results,
  failures
};

fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
const lines = [
  '# GNK ASG mobile contrast browser audit',
  '',
  `- Status: **${report.status}**`,
  `- Preview: ${baseUrl}`,
  `- Scenarios: ${report.scenarioCount}`,
  `- Text checks: ${report.totalChecks}`,
  `- Failures: ${report.totalFailures}`,
  '- Production touched: **NO**',
  '',
  '| Route | Theme | Containers | Checks | Failures |',
  '|---|---:|---:|---:|---:|',
  ...results.map(item => `| ${item.route} | ${item.theme} | ${item.containerCount} | ${item.checkCount} | ${item.failCount} |`)
];
if (failures.length) {
  lines.push('', '## Failures', '', '| Route | Theme | Text | Contrast | Required | Color | Background |', '|---|---|---|---:|---:|---|---|');
  failures.slice(0, 100).forEach(item => lines.push(`| ${item.route} | ${item.theme} | ${item.text.replace(/\|/g, '\\|')} | ${item.contrast} | ${item.required} | ${item.color} | ${item.background} |`));
}
fs.writeFileSync(path.join(outDir, 'report.md'), `${lines.join('\n')}\n`);
console.log(lines.join('\n'));
if (failures.length) process.exit(1);
