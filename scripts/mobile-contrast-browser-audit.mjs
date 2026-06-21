import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const baseUrl = String(process.env.PREVIEW_BASE_URL || 'https://gnk-asg-business-light-preview.beckuphome.workers.dev').replace(/\/$/, '');
const executablePath = process.env.CHROMIUM_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const outDir = path.resolve('reports/mobile-contrast-browser-audit');
fs.mkdirSync(outDir, { recursive: true });

const scenarios = [
  { language: 'hr', route: '/', theme: 'dark' },
  { language: 'hr', route: '/', theme: 'light' },
  { language: 'en', route: '/en/', theme: 'dark' },
  { language: 'en', route: '/en/', theme: 'light' }
];

const selectors = [
  '#financials .kpi .label',
  '#financials .kpi .value',
  '#financials .kpi .meaning',
  '#grupa .group-card h3',
  '#grupa .group-card dt',
  '#grupa .group-card dd',
  '#grupa .group-card a',
  '#grupa .group-kpis small',
  '#grupa .group-kpis strong'
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
const contrast = (first, second) => {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const results = [];

const addCheck = (result, selector, index, computed) => {
  const foreground = parseColor(computed.color);
  const background = parseColor(computed.background);
  if (!foreground || !background) {
    result.errors.push(`unparsed:${selector}:${index}`);
    return;
  }
  const value = contrast(foreground, background);
  const large = computed.fontSize >= 24 || (computed.fontSize >= 18.66 && computed.fontWeight >= 700);
  const required = large ? 3 : 4.5;
  result.checks.push({
    selector,
    index,
    text: computed.text,
    color: computed.color,
    background: computed.background,
    contrast: Number(value.toFixed(2)),
    required,
    pass: value >= required
  });
};

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
    page.setDefaultTimeout(15000);
    const result = { ...scenario, checks: [], failures: [], errors: [] };

    try {
      const url = `${baseUrl}${scenario.route}${scenario.route.includes('?') ? '&' : '?'}audit=${Date.now()}`;
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!response?.ok()) throw new Error(`HTTP ${response?.status() || 0}`);
      await page.waitForSelector('body.gnk-asg-premium-shell', { timeout: 15000 });
      await page.waitForTimeout(4500);

      const readiness = await page.evaluate(() => ({
        css: Boolean(document.getElementById('gnk-final-contrast-contract-css')),
        script: Boolean(document.getElementById('gnk-final-contrast-enforcer-js')),
        runtime: window.__GNK_FINAL_CONTRAST_ENFORCER__ === true,
        theme: document.documentElement.dataset.gnkTheme
      }));
      result.readiness = readiness;
      if (!readiness.css || !readiness.script || !readiness.runtime) throw new Error(`contrast_assets_inactive:${JSON.stringify(readiness)}`);
      if (readiness.theme !== scenario.theme) throw new Error(`theme_mismatch:${readiness.theme}`);

      for (const selector of selectors) {
        const nodes = page.locator(selector);
        const count = await nodes.count();
        if (!count) {
          result.errors.push(`missing:${selector}`);
          continue;
        }
        for (let index = 0; index < count; index += 1) {
          const node = nodes.nth(index);
          if (!(await node.isVisible())) continue;
          const computed = await node.evaluate(element => {
            const style = getComputedStyle(element);
            let parent = element;
            let background = style.backgroundColor;
            while (parent && background === 'rgba(0, 0, 0, 0)') {
              parent = parent.parentElement;
              if (parent) background = getComputedStyle(parent).backgroundColor;
            }
            return {
              text: String(element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100),
              color: style.color,
              background,
              fontSize: Number.parseFloat(style.fontSize) || 16,
              fontWeight: Number.parseInt(style.fontWeight, 10) || 400
            };
          });
          addCheck(result, selector, index, computed);
        }
      }

      const aiChecks = await page.evaluate(() => {
        const visible = element => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
        };
        const candidate = Array.from(document.querySelectorAll('button,a,[role="button"]')).find(element => {
          const style = getComputedStyle(element);
          const text = String(element.textContent || '').replace(/\s+/g, ' ').trim();
          return visible(element) && style.position === 'fixed' && /AI|Pomoć|Help/i.test(text);
        });
        if (!candidate) return [];
        const elements = [candidate, ...candidate.querySelectorAll('strong,small,span')].filter(visible);
        return elements.map(element => {
          const style = getComputedStyle(element);
          let parent = element;
          let background = style.backgroundColor;
          while (parent && background === 'rgba(0, 0, 0, 0)') {
            parent = parent.parentElement;
            if (parent) background = getComputedStyle(parent).backgroundColor;
          }
          return {
            text: String(element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100),
            color: style.color,
            background,
            fontSize: Number.parseFloat(style.fontSize) || 16,
            fontWeight: Number.parseInt(style.fontWeight, 10) || 400
          };
        });
      });
      if (!aiChecks.length) result.errors.push('missing:visible-fixed-ai-badge');
      aiChecks.forEach((computed, index) => addCheck(result, 'visible-fixed-ai-badge', index, computed));

      for (const section of ['financials', 'grupa']) {
        const locator = page.locator(`#${section}`).first();
        if (await locator.count()) {
          await locator.scrollIntoViewIfNeeded();
          await page.waitForTimeout(150);
          await page.screenshot({ path: path.join(outDir, `${scenario.language}-${scenario.theme}-${section}.png`), fullPage: false });
        }
      }
    } catch (error) {
      result.errors.push(String(error?.message || error));
      try {
        await page.screenshot({ path: path.join(outDir, `${scenario.language}-${scenario.theme}-error.png`), fullPage: false });
      } catch {}
    } finally {
      result.failures = result.checks.filter(item => !item.pass);
      results.push(result);
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
