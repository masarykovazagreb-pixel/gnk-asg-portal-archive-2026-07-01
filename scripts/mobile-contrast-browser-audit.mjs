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

const browser = await chromium.launch({
  headless: true,
  executablePath,
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
    page.setDefaultTimeout(15000);
    const result = { ...scenario, checks: [], failures: [], errors: [] };

    try {
      const response = await page.goto(`${baseUrl}${scenario.route}?audit=${Date.now()}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      if (!response?.ok()) throw new Error(`HTTP ${response?.status() || 0}`);
      await page.waitForSelector('body.gnk-asg-premium-shell');
      await page.waitForTimeout(2800);

      const audit = await page.evaluate(({ expectedTheme }) => {
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
          return values.length >= 3 ? { r: values[0], g: values[1], b: values[2], a: values[3] ?? 1 } : null;
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
        const visible = element => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
        };
        const backgroundFor = element => {
          let current = element;
          while (current) {
            const color = parseColor(getComputedStyle(current).backgroundColor);
            if (color && color.a > 0.95) return color;
            current = current.parentElement;
          }
          return expectedTheme === 'light' ? { r:255,g:255,b:255,a:1 } : { r:5,g:13,b:25,a:1 };
        };
        const checkElement = (element, selector, index) => {
          const style = getComputedStyle(element);
          const foreground = parseColor(style.color);
          const background = backgroundFor(element);
          if (!foreground || !background) return { error:`unparsed:${selector}:${index}` };
          const value = contrast(foreground, background);
          const fontSize = Number.parseFloat(style.fontSize) || 16;
          const fontWeight = Number.parseInt(style.fontWeight,10) || 400;
          const large = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
          const required = large ? 3 : 4.5;
          return {
            selector,
            index,
            text:String(element.textContent || '').replace(/\s+/g,' ').trim().slice(0,100),
            color:style.color,
            background:`rgb(${Math.round(background.r)}, ${Math.round(background.g)}, ${Math.round(background.b)})`,
            contrast:Number(value.toFixed(2)),
            required,
            pass:value >= required
          };
        };

        const checks = [];
        const errors = [];
        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll(selector)).filter(visible);
          if (!elements.length) errors.push(`missing:${selector}`);
          elements.forEach((element,index) => {
            const item = checkElement(element,selector,index);
            if (item.error) errors.push(item.error); else checks.push(item);
          });
        }

        const aiCandidate = Array.from(document.querySelectorAll('button,a,[role="button"]')).find(element => {
          const style = getComputedStyle(element);
          const text = String(element.textContent || '').replace(/\s+/g,' ').trim();
          return visible(element) && style.position === 'fixed' && /AI|Pomoć|Help/i.test(text);
        });
        if (!aiCandidate) {
          errors.push('missing:visible-fixed-ai-badge');
        } else {
          [aiCandidate,...aiCandidate.querySelectorAll('strong,small,span')].filter(visible).forEach((element,index) => {
            const item = checkElement(element,'visible-fixed-ai-badge',index);
            if (item.error) errors.push(item.error); else checks.push(item);
          });
        }

        return {
          readiness:{
            css:Boolean(document.getElementById('gnk-final-contrast-contract-css')),
            script:Boolean(document.getElementById('gnk-final-contrast-enforcer-js')),
            runtime:window.__GNK_FINAL_CONTRAST_ENFORCER__ === true,
            theme:document.documentElement.dataset.gnkTheme
          },
          checks,
          errors
        };
      }, { expectedTheme: scenario.theme });

      result.readiness = audit.readiness;
      result.checks = audit.checks;
      result.errors = audit.errors;
      if (!audit.readiness.css || !audit.readiness.script || !audit.readiness.runtime) result.errors.push('contrast_assets_inactive');
      if (audit.readiness.theme !== scenario.theme) result.errors.push(`theme_mismatch:${audit.readiness.theme}`);
    } catch (error) {
      result.errors.push(String(error?.message || error));
    } finally {
      result.failures = result.checks.filter(item => !item.pass);
      results.push(result);
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const failures = results.flatMap(item => item.failures.map(failure => ({ language:item.language,theme:item.theme,...failure })));
const errors = results.flatMap(item => item.errors.map(error => ({ language:item.language,theme:item.theme,error })));
const report = {
  generatedAt:new Date().toISOString(),
  baseUrl,
  scenarioCount:results.length,
  totalChecks:results.reduce((sum,item) => sum + item.checks.length,0),
  totalFailures:failures.length,
  scenarioErrorCount:errors.length,
  status:results.length === 4 && failures.length === 0 && errors.length === 0 ? 'PASS' : 'FAIL',
  productionTouched:false,
  results,
  failures,
  errors
};
fs.writeFileSync(path.join(outDir,'report.json'),`${JSON.stringify(report,null,2)}\n`);
const lines = [
  '# GNK ASG mobile contrast browser audit','',
  `- Status: **${report.status}**`,
  `- Scenarios: ${report.scenarioCount}`,
  `- Text checks: ${report.totalChecks}`,
  `- Failures: ${report.totalFailures}`,
  `- Errors: ${report.scenarioErrorCount}`,
  '- Production touched: **NO**','',
  '| Language | Theme | Checks | Failures | Errors |',
  '|---|---|---:|---:|---:|',
  ...results.map(item => `| ${item.language} | ${item.theme} | ${item.checks.length} | ${item.failures.length} | ${item.errors.length} |`)
];
if (failures.length) {
  lines.push('','## Contrast failures','');
  failures.forEach(item => lines.push(`- ${item.language}/${item.theme} ${item.selector}: ${item.contrast} < ${item.required} — ${item.text}`));
}
if (errors.length) {
  lines.push('','## Errors','');
  errors.forEach(item => lines.push(`- ${item.language}/${item.theme}: ${item.error}`));
}
fs.writeFileSync(path.join(outDir,'report.md'),`${lines.join('\n')}\n`);
console.log(lines.join('\n'));
if (report.status !== 'PASS') process.exit(1);
