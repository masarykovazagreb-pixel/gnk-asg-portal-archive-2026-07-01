import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const baseUrl = String(process.env.PREVIEW_BASE_URL || 'https://gnk-asg-business-light-preview.beckuphome.workers.dev').replace(/\/$/, '');
const chromiumPath = process.env.CHROMIUM_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const outDir = path.resolve('reports/mobile-contrast-browser-audit');
fs.mkdirSync(outDir, { recursive: true });

const scenarios = [
  { language: 'hr', route: '/', theme: 'dark' },
  { language: 'hr', route: '/', theme: 'light' },
  { language: 'en', route: '/en/', theme: 'dark' },
  { language: 'en', route: '/en/', theme: 'light' }
];

const targets = [
  '#financials .kpi .label',
  '#financials .kpi .value',
  '#financials .kpi .meaning',
  '#grupa .group-card h3',
  '#grupa .group-card dt',
  '#grupa .group-card dd',
  '#grupa .group-card a',
  '#grupa .group-kpis small',
  '#grupa .group-kpis strong',
  '#gnk-asg-float-ai strong',
  '#gnk-asg-float-ai small'
];

const parseColor = value => {
  const match = String(value || '').match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const values = match[1].split(',').map(item => Number(item.trim()));
  return values.length >= 3 ? { r: values[0], g: values[1], b: values[2] } : null;
};
const linear = channel => {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};
const luminance = color => 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
const ratio = (first, second) => {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

const browser = await chromium.launch({
  headless: true,
  executablePath: chromiumPath,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const results = [];

try {
  for (const scenario of scenarios) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce'
    });
    await context.addInitScript(theme => localStorage.setItem('gnk-asg-theme', theme), scenario.theme);
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const record = { ...scenario, checks: [], failures: [], errors: [] };

    try {
      const response = await page.goto(`${baseUrl}${scenario.route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      if (!response?.ok()) throw new Error(`HTTP ${response?.status() || 0}`);
      await page.waitForSelector('body.gnk-asg-premium-shell');
      await page.waitForSelector('#gnk-final-contrast-contract-css', { state: 'attached' });
      await page.waitForSelector('#gnk-final-contrast-enforcer-js', { state: 'attached' });
      await page.waitForFunction(() => window.__GNK_FINAL_CONTRAST_ENFORCER__ === true);
      await page.waitForTimeout(3600);

      for (const selector of targets) {
        const elements = page.locator(selector);
        const count = await elements.count();
        if (!count) {
          record.errors.push(`missing:${selector}`);
          continue;
        }
        for (let index = 0; index < count; index += 1) {
          const element = elements.nth(index);
          if (!(await element.isVisible())) continue;
          const styleData = await element.evaluate(node => {
            const style = getComputedStyle(node);
            let current = node;
            let background = style.backgroundColor;
            while (current && background === 'rgba(0, 0, 0, 0)') {
              current = current.parentElement;
              if (current) background = getComputedStyle(current).backgroundColor;
            }
            return {
              text: String(node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100),
              color: style.color,
              background,
              fontSize: Number.parseFloat(style.fontSize) || 16,
              fontWeight: Number.parseInt(style.fontWeight, 10) || 400
            };
          });
          const foreground = parseColor(styleData.color);
          const background = parseColor(styleData.background);
          if (!foreground || !background) {
            record.errors.push(`unparsed:${selector}:${index}`);
            continue;
          }
          const contrast = ratio(foreground, background);
          const large = styleData.fontSize >= 24 || (styleData.fontSize >= 18.66 && styleData.fontWeight >= 700);
          const required = large ? 3 : 4.5;
          record.checks.push({
            selector,
            index,
            text: styleData.text,
            color: styleData.color,
            background: styleData.background,
            contrast: Number(contrast.toFixed(2)),
            required,
            pass: contrast >= required
          });
        }
      }

      for (const section of ['financials', 'grupa']) {
        const locator = page.locator(`#${section}`).first();
        if (await locator.count()) {
          await locator.scrollIntoViewIfNeeded();
          await page.waitForTimeout(200);
          await page.screenshot({ path: path.join(outDir, `${scenario.language}-${scenario.theme}-${section}.png`), fullPage: false });
        }
      }
    } catch (error) {
      record.errors.push(String(error?.message || error));
      try {
        await page.screenshot({ path: path.join(outDir, `${scenario.language}-${scenario.theme}-error.png`), fullPage: false });
      } catch {}
    } finally {
      record.failures = record.checks.filter(item => !item.pass);
      results.push(record);
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const failures = results.flatMap(item => item.failures.map(failure => ({ language: item.language, theme: item.theme, ...failure })));
const errors = results.flatMap(item => item.errors.map(error => ({ language: item.language, theme: item.theme, error })));
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  scenarioCount: results.length,
  totalChecks: results.reduce((sum, item) => sum + item.checks.length, 0),
  totalFailures: failures.length,
  scenarioErrorCount: errors.length,
  status: results.length === 4 && failures.length === 0 && errors.length === 0 ? 'PASS' : 'FAIL',
  productionTouched: false,
  results,
  failures,
  errors
};
fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
const lines = [
  '# GNK ASG mobile contrast browser audit',
  '',
  `- Status: **${report.status}**`,
  `- Scenarios: ${report.scenarioCount}`,
  `- Text checks: ${report.totalChecks}`,
  `- Failures: ${report.totalFailures}`,
  `- Errors: ${report.scenarioErrorCount}`,
  '- Production touched: **NO**',
  '',
  '| Language | Theme | Checks | Failures | Errors |',
  '|---|---|---:|---:|---:|',
  ...results.map(item => `| ${item.language} | ${item.theme} | ${item.checks.length} | ${item.failures.length} | ${item.errors.length} |`)
];
if (failures.length) {
  lines.push('', '## Contrast failures', '');
  failures.forEach(item => lines.push(`- ${item.language}/${item.theme} ${item.selector}: ${item.contrast} < ${item.required} — ${item.text}`));
}
if (errors.length) {
  lines.push('', '## Errors', '');
  errors.forEach(item => lines.push(`- ${item.language}/${item.theme}: ${item.error}`));
}
fs.writeFileSync(path.join(outDir, 'report.md'), `${lines.join('\n')}\n`);
console.log(lines.join('\n'));
if (report.status !== 'PASS') process.exit(1);
