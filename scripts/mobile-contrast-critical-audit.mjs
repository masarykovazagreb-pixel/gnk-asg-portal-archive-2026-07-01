import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const baseUrl = String(process.env.PREVIEW_BASE_URL || 'https://gnk-asg-business-light-preview.beckuphome.workers.dev').replace(/\/$/, '');
const chromiumPath = process.env.CHROMIUM_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const outDir = path.resolve('reports/mobile-contrast-critical-audit');
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

const browser = await chromium.launch({
  headless: true,
  executablePath: chromiumPath,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});

const toColor = value => {
  const match = String(value || '').match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const values = match[1].split(',').map(item => Number(item.trim()));
  if (values.length < 3) return null;
  return { r: values[0], g: values[1], b: values[2], a: values[3] ?? 1 };
};

const linear = channel => {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};
const luminance = color => 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
const contrast = (first, second) => {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

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
    const record = { ...scenario, checks: [], errors: [] };

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
          const item = elements.nth(index);
          if (!(await item.isVisible())) continue;
          const data = await item.evaluate(element => {
            const style = getComputedStyle(element);
            let current = element;
            let background = style.backgroundColor;
            while (current && /rgba?\(0, 0, 0, 0\)/.test(background)) {
              current = current.parentElement;
              if (current) background = getComputedStyle(current).backgroundColor;
            }
            return {
              text: String(element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100),
              color: style.color,
              background,
              fontSize: Number.parseFloat(style.fontSize) || 16,
              fontWeight: Number.parseInt(style.fontWeight, 10) || 400
            };
          });
          const foreground = toColor(data.color);
          const background = toColor(data.background);
          if (!foreground || !background) {
            record.errors.push(`unparsed:${selector}:${index}`);
            continue;
          }
          const ratio = contrast(foreground, background);
          const large = data.fontSize >= 24 || (data.fontSize >= 18.66 && data.fontWeight >= 700);
          const required = large ? 3 : 4.5;
          record.checks.push({
            selector,
            index,
            text: data.text,
            color: data.color,
            background: data.background,
            ratio: Number(ratio.toFixed(2)),
            required,
            pass: ratio >= required
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
  scenarios: results.length,
  checks: results.reduce((sum, item) => sum + item.checks.length, 0),
  failures: failures.length,
  errors: errors.length,
  status: results.length === 4 && failures.length === 0 && errors.length === 0 ? 'PASS' : 'FAIL',
  productionTouched: false,
  results,
  failureDetails: failures,
  errorDetails: errors
};
fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
const markdown = [
  '# GNK ASG critical mobile contrast audit',
  '',
  `- Status: **${report.status}**`,
  `- Scenarios: ${report.scenarios}`,
  `- Checks: ${report.checks}`,
  `- Contrast failures: ${report.failures}`,
  `- Errors: ${report.errors}`,
  '- Production touched: **NO**',
  '',
  '| Language | Theme | Checks | Failures | Errors |',
  '|---|---|---:|---:|---:|',
  ...results.map(item => `| ${item.language} | ${item.theme} | ${item.checks.length} | ${item.failures.length} | ${item.errors.length} |`)
];
if (failures.length) {
  markdown.push('', '## Contrast failures', '');
  failures.forEach(item => markdown.push(`- ${item.language}/${item.theme} ${item.selector}: ${item.ratio} < ${item.required} — ${item.text}`));
}
if (errors.length) {
  markdown.push('', '## Errors', '');
  errors.forEach(item => markdown.push(`- ${item.language}/${item.theme}: ${item.error}`));
}
fs.writeFileSync(path.join(outDir, 'report.md'), `${markdown.join('\n')}\n`);
console.log(markdown.join('\n'));
if (report.status !== 'PASS') process.exit(1);
